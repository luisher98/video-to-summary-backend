import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.js";
import { BadRequestError } from "../../utils/errorHandling.js";

/**
 * Endpoint for generating video summaries.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - url: YouTube video URL
 *   - words: (optional) Maximum words in summary
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with summary
 * 
 * @example
 * GET /api/summary?url=https://youtube.com/watch?v=...&words=300
 * 
 * // Success Response:
 * {
 *   "content": "Summary text..."
 * }
 */
export default async function getSummary(req: Request, res: Response) {
    const inputUrl = req.query.url as string;
    const words = Number(req.query.words) as number;

    if (!inputUrl || !inputUrl.includes("?v=")) {
      throw new BadRequestError("Invalid YouTube URL");
    }
  
    try {
      const summary = await outputSummary({url: inputUrl, words});
      res.json({ content: summary });
      console.log("Summary generated successfully.");
    } catch (error) {
      console.error(error);
      // Add proper error response
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
}