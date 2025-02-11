import { YouTubeVideoSummary } from "../../services/summary/providers/youtube/youtubeSummaryService.js";
import { Request, Response } from "express";
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
export default async function getTranscript(req: Request, res: Response): Promise<void> {
    try {
        const url = req.query.url as string;
        
        if (!url) {
            throw new BadRequestError('URL is required');
        }

        const processor = new YouTubeVideoSummary();
        const summary = await processor.process({
            url,
            returnTranscriptOnly: true,
            requestInfo: {
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent')
            }
        });

        res.json({ summary });
    } catch (error) {
        console.error('Error getting transcript:', error);
        res.status(error instanceof BadRequestError ? 400 : 500).json({
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}