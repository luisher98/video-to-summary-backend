import { Request, Response } from "express";
import { BadRequestError } from "../../utils/errors/errorHandling.js";
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { logRequest } from '../../utils/logging/logger.js';
import { handleError } from '../../utils/errors/errorHandling.js';

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
export default async function getYouTubeSummary(req: Request, res: Response) {
    const startTime = Date.now();
    const url = req.query.url as string;

    if (!url || !url.includes("?v=")) {
      throw new BadRequestError("Invalid YouTube URL");
    }
  
    const summaryService = SummaryServiceFactory.createYouTubeService();

    try {
      const source: MediaSource = {
        type: 'youtube',
        data: { url }
      };

      const summary = await summaryService.process(source, {
        maxWords: Number(req.query.words) || 400,
        additionalPrompt: req.query.prompt as string
      });

      logRequest({
        event: 'summary_generated',
        url: url,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        duration: Date.now() - startTime,
        words: Number(req.query.words) || 400
      });

      res.json({ summary: summary.content });
      console.log("Summary generated successfully.");
    } catch (error) {
      logRequest({
        event: 'summary_error',
        url: url,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      handleError(error, res);
    }
}