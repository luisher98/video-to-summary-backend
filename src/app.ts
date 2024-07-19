import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import { outputSummary } from "./components/summary/outputSummary.js";
import videoInfo from "./components/info/videoInfo.js";

import { ProgressUpdate } from "./types/global.types.js";

const port = process.env.PORT || 5050;
const url = process.env.URL || "http://localhost";

const app = express();

app.use(bodyParser.json());

app.get("/api/summary", async (req: Request, res: Response) => {
  const inputUrl = req.query.url as string;
  const words = Number(req.query.words) as number;

  try {
    const summary = await outputSummary(inputUrl, words);
    res.json({ content: summary });
    console.log("Summary generated successfully.");
  } catch (error) {
    console.error(error);
    // code 500 is internal server error
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/api/summary-sse", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const inputUrl = req.query.url as string;
  const words = Number(req.query.words) as number;

  async function* generateSummary() {
    try {
      const summary = await outputSummary(
        inputUrl,
        words,
        (updateProgress: ProgressUpdate) => {
          // Send progress update to the client
          res.write(`data: ${JSON.stringify(updateProgress)}\n\n`);
        }
      );
      yield { status: "done", message: summary };
    } catch (error) {
      yield { status: "error", error: (error as Error).message };
    } finally {
      res.end();
    }
  }

  (async () => {
    for await (const data of generateSummary()) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  })();
});

app.get("/api/info", async (req, res) => {
  const inputUrl = req.query.url as string;

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

app.get("/api/test-sse", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");

  let counter = 0;
  let interValID = setInterval(() => {
    counter++;
    if (counter >= 10) {
      clearInterval(interValID);
      res.end();
      return;
    }
    res.write(`data: ${JSON.stringify({ num: counter })}\n\n`);
  }, 1000);

  res.on("close", () => {
    console.log("client dropped me");
    clearInterval(interValID);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server running on ${url}:${port}`);
});
