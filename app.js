import express from "express";
import { createServer } from "http";

import outputSummary from "./src/summary/outputSummary.mjs";
import videoInfo from "./src/info/videoInfo.mjs";

const port = process.env.PORT || 5000;

const app = express();
const server = createServer(app);

app.use(express.json());


export const errorHandler = (err, req, res, next) => {
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
    console.error(error);
  }
});

app.get("/api/summary-updates", async (req, res) => {
  const inputUrl = req.query.url;
  const words = req.query.words;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const summary = await outputSummary(inputUrl, words, (updateProgress) => {
      res.write(`data: ${JSON.stringify(updateProgress)}\n\n`);
    });
    // Send the final summary to the client
    res.write(`data: ${JSON.stringify({ status: "done", summary })}\n\n`);
    res.end();
    console.log("Summary generated successfully.");
  } catch (error) {
    console.error(error);
    res.write(`data: ${JSON.stringify({ status: "error", error: error.message })}\n\n`);
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
    console.error(error);
  }
});

webSocketServer.on("connection", (socket) => {
  socket.on("message", (message) => {
    console.log("Message client connected: " + message);
  });
  socket.on("close", () => {
    console.log("Client disconnected");
  });
});

app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
