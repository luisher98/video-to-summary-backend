import { Request, Response } from "express";
import { YouTubeVideoSummary } from "../../services/summary/providers/youtube/youtubeSummaryService.js";
import { ProgressUpdate } from "../../types/global.types.js";
import { BadRequestError } from "../../utils/errors/errorHandling.js";

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
export default async function getYouTubeSummarySSE(req: Request, res: Response) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevents nginx buffering

    const url = req.query.url as string;
    if (!url || !url.includes('?v=')) {
        res.write(`data: ${JSON.stringify({
            status: 'error',
            message: 'Invalid YouTube URL'
        })}\n\n`);
        res.end();
        return;
    }

    const words = Number(req.query.words) || 400;

    try {
        // Create processor instance
        const processor = new YouTubeVideoSummary();

        // Process video
        const summary = await processor.process({
            url,
            words,
            additionalPrompt: req.query.prompt as string,
            requestInfo: {
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent')
            },
            updateProgress: (progress: ProgressUpdate) => {
                res.write(`data: ${JSON.stringify({
                    status: progress.status,
                    message: progress.message,
                    progress: Math.round(progress.progress)
                })}\n\n`);
            }
        });

        // Send final summary
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: summary,
            progress: 100
        })}\n\n`);

    } catch (error) {
        console.error('Error processing YouTube video:', error);
        res.write(`data: ${JSON.stringify({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`);
    } finally {
        res.end();
    }
}
