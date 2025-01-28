import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.js";
import { ProgressUpdate } from "../../types/global.types.js";

export default async function getSummarySSE(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no"); // Prevents Azure from buffering

  const inputUrl = req.query.url as string;
  let words = Number(req.query.words);
  if (isNaN(words)) words = 400; // Default to 400 words if parsing fails

  async function* generateSummary() {
    try {
      const summary = await outputSummary({
        url: inputUrl,
        words,
        updateProgress: (updateProgress: ProgressUpdate) => {
          res.write(`data: ${JSON.stringify(updateProgress)}\n\n`);
        },
      });
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
}
