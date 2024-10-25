import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.ts";
import { ProgressUpdate } from "../../types/global.types.ts";

export default async function getSummarySSE(req: Request, res: Response) {
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
            // Send progress update to client
            res.write(`data: ${JSON.stringify(updateProgress)}\n\n`);
          }
        );
        yield { status: "done", message: summary };
      } catch (error) {
        yield { status: "error", error: (error as Error).message };
      } finally {
        // -- delete any temporary files -- ? or/and maybe do it on index.ts?
        res.end();
      }
    }
  
    (async () => {
      for await (const data of generateSummary()) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    })();
  }