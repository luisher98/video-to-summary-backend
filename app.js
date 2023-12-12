import express from "express";
import { Server } from "ws";
import http from "http";

import outputSummary from "./src/summary/outputSummary.mjs";
import videoInfo from "./src/info/videoInfo.mjs";

const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());

const server = http.createServer(app);
const webSocketServer = new Server({ server });

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: `Internal Server Error ${err}` });
};

app.get("/api/summary", async (req, res) => {
  const inputUrl = req.query.url;
  const words = req.query.words;

  try {
    const summary = await outputSummary(inputUrl, words);
    res.json({ content: summary });
    console.log("Summary generated successfully.");
  } catch (error) {
    next(error);
  }
});

app.get("/api/info", async (req, res) => {
  const inputUrl = req.query.url;

  try {
    const { id, title, mediumThumbnail, trimmedDescription, channelTitle } =
      await videoInfo(inputUrl);
    res.json({
      id: id,
      title: title,
      description: trimmedDescription,
      thumbnail: mediumThumbnail,
      channel: channelTitle,
    });
    console.log("Youtube info generated successfully.");
  } catch (error) {
    next(error);
  }
});

webSocketServer.on("connection", (socket) => {
  socket.on("message", (message) => {
    console.log("Message client connected: " + message);
    webSocketServer.on("close", () => console.log("Client disconnected"));
  });
});

app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
