import { Request, Response } from 'express';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { logRequest } from '@/utils/logging/logger.js';
import { sendErrorResponse } from '@/utils/errors/index.js';
import { MediaError } from '@/utils/errors/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stream summary generation for an uploaded file using piping/streaming for efficiency
 */
export async function streamingSummary(req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Use streaming service
        const summaryService = SummaryServiceFactory.createStreamingFileUploadService();
        
        // Set up progress tracking
        summaryService.onProgress((progress) => {
            // Only send progress updates, not the final summary
            if (progress.status !== 'done') {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        });

        // Create metrics object to track performance
        const metrics = {
            startTime: Date.now(),
            processingStartTime: 0,
            processingEndTime: 0,
            transcriptionStartTime: 0,
            transcriptionEndTime: 0,
            summarizationStartTime: 0,
            summarizationEndTime: 0,
            memoryBefore: process.memoryUsage().heapUsed,
            memoryPeak: process.memoryUsage().heapUsed,
        };

        // Create source object for the file
        const source: MediaSource = {
            type: 'file',
            data: {
                path: req.file.path,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype
            }
        };

        // Log the start of streaming processing
        logRequest({
            event: 'streaming_file_summary_started',
            filename: req.file.originalname,
            filesize: req.file.size,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent')
        });

        // Update metrics for memory usage during processing
        let memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
        let summary;
        
        try {
            memoryCheckInterval = setInterval(() => {
                const currentMemory = process.memoryUsage().heapUsed;
                if (currentMemory > metrics.memoryPeak) {
                    metrics.memoryPeak = currentMemory;
                }
            }, 1000);

            // Set processing start time
            metrics.processingStartTime = Date.now();

            // Process the file
            summary = await summaryService.process(source, {
                maxWords: Number(req.query.words) || 400,
                additionalPrompt: req.query.prompt as string
            });

            // Stop memory tracking
            if (memoryCheckInterval) {
                clearInterval(memoryCheckInterval);
                memoryCheckInterval = null;
            }
        } catch (error) {
            // CRITICAL: Always clear interval on error
            if (memoryCheckInterval) {
                clearInterval(memoryCheckInterval);
                memoryCheckInterval = null;
            }
            throw error;
        }
        
        // Set metrics for summarization end
        metrics.summarizationEndTime = Date.now();

        // Calculate final metrics
        const finalMetrics = {
            processingTime: metrics.processingEndTime - metrics.processingStartTime,
            transcriptionTime: metrics.transcriptionEndTime - metrics.transcriptionStartTime,
            summarizationTime: metrics.summarizationEndTime - metrics.summarizationStartTime,
            totalTime: Date.now() - metrics.startTime,
            memoryUsage: `${Math.round((metrics.memoryPeak - metrics.memoryBefore) / (1024 * 1024))} MB`,
            peakMemory: `${Math.round(metrics.memoryPeak / (1024 * 1024))} MB`
        };

        // Send final summary with metrics
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: summary.content,
            progress: 100,
            metrics: finalMetrics
        })}\n\n`);
        res.end();

        // Log the completion
        logRequest({
            event: 'streaming_file_summary_completed',
            filename: req.file.originalname,
            filesize: req.file.size,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - metrics.startTime,
            words: Number(req.query.words) || 400
        });
    } catch (error) {
        // Log the error
        logRequest({
            event: 'streaming_file_summary_error',
            filename: req.file?.originalname,
            filesize: req.file?.size,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            error: error instanceof Error ? error.message : 'Unknown error'
        });

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
 * Get transcript using the streaming API for an uploaded file
 */
export async function streamingTranscript(req: Request, res: Response) {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const summaryService = SummaryServiceFactory.createStreamingFileUploadService();
        
        // Set up SSE for progress updates
        if (req.query.stream === 'true') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            summaryService.onProgress((progress) => {
                if (progress.status !== 'done') {
                    res.write(`data: ${JSON.stringify(progress)}\n\n`);
                }
            });
        }

        // Create metrics object
        const metrics = {
            startTime: Date.now(),
            processingTime: 0,
            transcriptionTime: 0,
            memoryBefore: process.memoryUsage().heapUsed,
            memoryPeak: process.memoryUsage().heapUsed
        };

        // Create source object for the file
        const source: MediaSource = {
            type: 'file',
            data: {
                path: req.file.path,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype
            }
        };

        // Track memory usage during processing
        let memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
        let result;
        
        try {
            memoryCheckInterval = setInterval(() => {
                const currentMemory = process.memoryUsage().heapUsed;
                if (currentMemory > metrics.memoryPeak) {
                    metrics.memoryPeak = currentMemory;
                }
            }, 1000);

            // Process for transcript only
            result = await summaryService.process(source, {
                returnTranscriptOnly: true
            });

            // Stop memory tracking and calculate metrics
            if (memoryCheckInterval) {
                clearInterval(memoryCheckInterval);
                memoryCheckInterval = null;
            }
        } catch (error) {
            // CRITICAL: Always clear interval on error
            if (memoryCheckInterval) {
                clearInterval(memoryCheckInterval);
                memoryCheckInterval = null;
            }
            throw error;
        }
        const finalMetrics = {
            totalTime: Date.now() - metrics.startTime,
            memoryUsage: `${Math.round((metrics.memoryPeak - metrics.memoryBefore) / (1024 * 1024))} MB`,
            peakMemory: `${Math.round(metrics.memoryPeak / (1024 * 1024))} MB`
        };

        // If streaming, send final response with metrics
        if (req.query.stream === 'true') {
            res.write(`data: ${JSON.stringify({
                status: 'done',
                message: result.content,
                progress: 100,
                metrics: finalMetrics
            })}\n\n`);
            res.end();
        } else {
            // Otherwise send as regular JSON response with metrics
            res.json({ 
                data: result.content,
                metrics: finalMetrics
            });
        }

        // Log completion
        logRequest({
            event: 'streaming_file_transcript_completed',
            filename: req.file.originalname,
            filesize: req.file.size,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - metrics.startTime
        });
    } catch (error) {
        if (req.query.stream === 'true' && !res.headersSent) {
            // Send error through SSE
            let errorMessage = 'An unexpected error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            res.write(`data: ${JSON.stringify({
                status: 'error',
                message: errorMessage,
                progress: 0,
                error: errorMessage
            })}\n\n`);
            res.end();
        } else {
            // Send as regular error response
            sendErrorResponse(error, res);
        }
    }
} 