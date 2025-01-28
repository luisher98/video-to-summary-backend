import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.js";
import { ProgressUpdate } from "../../types/global.types.js";

/**
 * Server-Sent Events endpoint for generating video summaries with real-time progress updates.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - url: YouTube video URL
 *   - words: (optional) Maximum words in summary, defaults to 400
 * @param {Response} res - Express response object for SSE stream
 * 
 * @example
 * GET /api/summary-sse?url=https://youtube.com/watch?v=...&words=300
 * 
 * // SSE Response Events:
 * data: {"status": "pending", "message": "Downloading video..."}
 * data: {"status": "pending", "message": "Generating transcript..."}
 * data: {"status": "done", "message": "Summary text..."}
 */
export default async function getSummarySSE(req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no"); // Prevents Azure from buffering

  const inputUrl = req.query.url as string;
  let words = Number(req.query.words);
  if (isNaN(words)) words = 400; // Default to 400 words if parsing fails

  /**
   * Generator function that handles the summary generation process
   * and yields progress updates.
   * 
   * @param {string} inputUrl - YouTube video URL
   * @param {number} words - Maximum words in summary
   * @yields {Object} Progress updates and final summary
   * @private
   */
  async function* generateSummary() {
    try {
      const summary = await outputSummary({
        url: inputUrl,
        words,
        additionalPrompt: req.query.prompt as string,
        requestInfo: {
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent')
        },
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
