import { Request, Response } from "express";

/**
 * Test endpoint for Server-Sent Events functionality.
 * Sends numbered events every second for 10 seconds.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} SSE stream of numbered events
 * 
 * @example
 * GET /api/test-sse
 * 
 * // SSE Response Events:
 * data: {"num": 1}
 * data: {"num": 2}
 * ...
 * data: {"num": 10}
 */
export default async function getTestSSE(req: Request, res: Response) {
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
  }