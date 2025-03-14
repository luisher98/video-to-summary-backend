import { Request, Response } from 'express';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { processTimer } from '@/utils/logging/logger.js';
import { withErrorHandling } from '@/utils/errors/index.js';

interface ProgressUpdate {
    status: string;
    progress: number;
    message?: string;
}

/**
 * Generate a summary from an uploaded video file
 */
export const generateSummary = withErrorHandling(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
        throw new Error('No file uploaded');
    }

    const words = Number(req.query.words) || 400;
    processTimer.startProcess('upload_summary');

    const summaryService = SummaryServiceFactory.createFileUploadService();
    const source: MediaSource = {
        type: 'file',
        data: {
            file: file.buffer,
            filename: file.originalname,
            size: file.size
        }
    };

    const summary = await summaryService.process(source, {
        maxWords: words,
        additionalPrompt: req.query.prompt as string
    });

    processTimer.endProcess('upload_summary');

    return {
        data: summary.content,
        meta: {
            filename: file.originalname,
            words
        }
    };
});

/**
 * Stream summary generation progress for an uploaded video file
 */
export const streamSummary = withErrorHandling(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
        throw new Error('No file uploaded');
    }

    const words = Number(req.query.words) || 400;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    processTimer.startProcess('upload_summary_stream');

    const summaryService = SummaryServiceFactory.createFileUploadService();
    
    // Set up progress tracking
    summaryService.onProgress((progress: ProgressUpdate) => {
        if (!res.headersSent && progress.status !== 'done') {
            res.write(`data: ${JSON.stringify(progress)}\n\n`);
        }
    });

    const source: MediaSource = {
        type: 'file',
        data: {
            file: file.buffer,
            filename: file.originalname,
            size: file.size
        }
    };

    const summary = await summaryService.process(source, {
        maxWords: words,
        additionalPrompt: req.query.prompt as string
    });

    processTimer.endProcess('upload_summary_stream');

    // Send final summary
    if (!res.headersSent) {
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: summary.content,
            progress: 100
        })}\n\n`);
        res.end();
    }

    return {
        meta: {
            filename: file.originalname,
            words,
            streaming: true
        }
    };
});

/**
 * Get the transcript of an uploaded video file
 */
export const getTranscript = withErrorHandling(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
        throw new Error('No file uploaded');
    }

    processTimer.startProcess('upload_transcript');

    const summaryService = SummaryServiceFactory.createFileUploadService();
    const source: MediaSource = {
        type: 'file',
        data: {
            file: file.buffer,
            filename: file.originalname,
            size: file.size
        }
    };

    const result = await summaryService.process(source, {
        returnTranscriptOnly: true
    });

    processTimer.endProcess('upload_transcript');

    return {
        data: result.content,
        meta: {
            filename: file.originalname
        }
    };
}); 