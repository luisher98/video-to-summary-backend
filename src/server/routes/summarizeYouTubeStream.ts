import { Request, Response } from "express";
import { BadRequestError } from "../../utils/errors/errorHandling.js";
import { SummaryServiceFactory } from "../../services/summary/factories/SummaryServiceFactory.js";
import { MediaSource } from "../../services/summary/core/interfaces/IMediaProcessor.js";

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
    console.log('Received SSE request:', {
        url: req.query.url,
        words: req.query.words,
        prompt: req.query.prompt
    });

    const url = req.query.url as string;
    
    if (!url || !url.includes("?v=")) {
        console.error('Invalid YouTube URL:', url);
        throw new BadRequestError("Invalid YouTube URL");
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevents nginx buffering

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        status: 'connected',
        message: 'SSE connection established',
        progress: 0
    })}\n\n`);

    const summaryService = SummaryServiceFactory.createYouTubeService();
    summaryService.onProgress((progress) => {
        console.log('Progress update:', progress);
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });

    try {
        console.log('Starting video processing for:', url);
        const source: MediaSource = {
            type: 'youtube',
            data: { url }
        };

        const result = await summaryService.process(source, {
            maxWords: Number(req.query.words) || 400,
            additionalPrompt: req.query.prompt as string
        });

        // Send final success message
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: result.content,
            progress: 100
        })}\n\n`);
    } catch (error) {
        console.error('Error processing video:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.write(`data: ${JSON.stringify({
            status: 'error',
            message: errorMessage,
            error: errorMessage
        })}\n\n`);
    } finally {
        console.log('Ending SSE connection for:', url);
        res.end();
    }
}
