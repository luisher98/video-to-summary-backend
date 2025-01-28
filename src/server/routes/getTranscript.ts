import { Request, Response } from "express";
import { outputSummary } from "../../services/summary/outputSummary.js";
import { BadRequestError } from "../../utils/errorHandling.js";

/**
 * Endpoint to generate a transcript from a YouTube video.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - url: YouTube video URL
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with transcript
 * 
 * @example
 * GET /api/transcript?url=https://youtube.com/watch?v=...
 * 
 * // Success Response:
 * {
 *   "content": "Full transcript text..."
 * }
 * 
 * // Error Response:
 * {
 *   "error": "Error message",
 *   "code": "TRANSCRIPT_GENERATION_ERROR"
 * }
 */
export default async function getTranscript(req: Request, res: Response) {
    const inputUrl = req.query.url as string;

    if (!inputUrl || !inputUrl.includes("?v=")) {
      return new BadRequestError("Invalid YouTube URL");
    }
  
    try {
      const summary = await outputSummary({
        url: inputUrl,
        returnTranscriptOnly: true,
        requestInfo: {
          ip: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent')
        }
      });
      res.json({ transcript: summary });
      console.log("Transcript generated successfully.");
    } catch (error) {
      console.error('Transcript generation error:', error);
      res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'TRANSCRIPT_GENERATION_ERROR'
      });
    }
  }