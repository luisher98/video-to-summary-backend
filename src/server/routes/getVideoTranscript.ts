import { Request, Response } from "express";
import { BadRequestError } from "../../utils/errors/errorHandling.js";
import { SummaryServiceFactory, MediaSource } from "../../services/summary/SummaryService.js";

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
            returnTranscriptOnly: true
        });

        res.json({ transcript: summary.content });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestError(errorMessage);
    }
}