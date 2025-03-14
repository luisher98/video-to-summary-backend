import { Request, Response } from 'express';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { logRequest } from '@/utils/logging/logger.js';
import { withErrorHandling, sendErrorResponse } from '@/utils/errors/index.js';
import { MediaError } from '@/utils/errors/index.js';

/**
 * Generate a summary from a YouTube video
 */
export async function generateSummary(req: Request, res: Response) {
    const startTime = Date.now();
    const url = req.query.url as string;

    try {
        const summaryService = SummaryServiceFactory.createYouTubeService();
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
            url,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - startTime,
            words: Number(req.query.words) || 400
        });

        res.json({ data: summary.content });
    } catch (error) {
        logRequest({
            event: 'summary_error',
            url,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        sendErrorResponse(error, res);
    }
}

/**
 * Stream summary generation progress for a YouTube video
 */
export async function streamSummary(req: Request, res: Response) {
    const url = req.query.url as string;

    try {
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const summaryService = SummaryServiceFactory.createYouTubeService();
        
        // Set up progress tracking
        summaryService.onProgress((progress) => {
            // Only send progress updates, not the final summary
            if (progress.status !== 'done') {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        });

        const source: MediaSource = {
            type: 'youtube',
            data: { url }
        };

        const summary = await summaryService.process(source, {
            maxWords: Number(req.query.words) || 400,
            additionalPrompt: req.query.prompt as string
        });

        // Send final summary only once
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: summary.content,
            progress: 100
        })}\n\n`);
        res.end();
    } catch (error) {
        // Send error through SSE if possible
        if (!res.headersSent) {
            let errorMessage = 'An unexpected error occurred';
            let errorCode = 'UNKNOWN_ERROR';
            
            if (error instanceof MediaError) {
                errorMessage = error.message;
                errorCode = error.code;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            res.write(`data: ${JSON.stringify({
                status: 'error',
                message: errorMessage,
                code: errorCode,
                progress: 0,
                error: errorMessage
            })}\n\n`);
            res.end();
        }
    }
}

/**
 * Get the transcript of a YouTube video
 */
export async function getTranscript(req: Request, res: Response) {
    const url = req.query.url as string;

    try {
        const summaryService = SummaryServiceFactory.createYouTubeService();
        const source: MediaSource = {
            type: 'youtube',
            data: { url }
        };

        const result = await summaryService.process(source, {
            returnTranscriptOnly: true
        });

        res.json({ data: result.content });
    } catch (error) {
        sendErrorResponse(error, res);
    }
}

/**
 * Get metadata about a YouTube video
 */
export async function getMetadata(req: Request, res: Response) {
    const url = req.query.url as string;

    try {
        // For now, just return basic info since getMetadata is not implemented
        res.json({ 
            data: {
                url,
                timestamp: new Date()
            }
        });
    } catch (error) {
        sendErrorResponse(error, res);
    }
} 