import { Request, Response } from 'express';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { logRequest } from '@/utils/logging/logger.js';
import { withErrorHandling, sendErrorResponse } from '@/utils/errors/index.js';
import { MediaError } from '@/utils/errors/index.js';
import videoInfo from '@/services/info/videoInfo.js';


/**
 * Stream summary generation for a YouTube video using piping/streaming for efficiency
 * This provides faster processing by starting transcription before download completes
 */
export async function streamingSummary(req: Request, res: Response) {
    const url = req.query.url as string;

    try {
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Important: Use the streaming service instead of regular service
        const summaryService = SummaryServiceFactory.createStreamingYouTubeService();
        
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

        const source: MediaSource = {
            type: 'youtube',
            data: { url }
        };

        // Log the start of streaming processing
        logRequest({
            event: 'streaming_summary_started',
            url,
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
            event: 'streaming_summary_completed',
            url,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            duration: Date.now() - metrics.startTime,
            words: Number(req.query.words) || 400
        });
    } catch (error) {
        // Log the error
        logRequest({
            event: 'streaming_summary_error',
            url,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('user-agent'),
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Send error through SSE if possible
        if (!res.headersSent) {
            let errorMessage = 'An error occurred while processing your request. Please try again.';
            let errorCode = 'UNKNOWN_ERROR';
            let detailedError = 'Unknown error';
            
            if (error instanceof MediaError) {
                errorMessage = error.message;
                errorCode = error.code;
                detailedError = error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
                detailedError = error.message;
                
                // Provide more specific error messages based on common issues
                if (error.message.includes('Failed to extract any player response')) {
                    errorMessage = 'YouTube video could not be accessed. This may be due to region restrictions or the video being private.';
                } else if (error.message.includes('proxy')) {
                    errorMessage = 'Proxy connection failed. Please try again or contact support.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Request timed out. Please try again.';
                } else if (error.message.includes('bot detection')) {
                    errorMessage = 'YouTube has blocked this request. Please try again later.';
                }
            }

            console.error('Streaming error details:', {
                errorMessage,
                errorCode,
                detailedError,
                stack: error instanceof Error ? error.stack : 'No stack available'
            });

            res.write(`data: ${JSON.stringify({
                status: 'error',
                message: errorMessage,
                code: errorCode,
                progress: 35,
                error: errorMessage,
                details: detailedError
            })}\n\n`);
            res.end();
        }
    }
}

/**
 * Get transcript using the streaming API (often faster for long videos)
 */
export async function streamingTranscript(req: Request, res: Response) {
    const url = req.query.url as string;

    try {
        const summaryService = SummaryServiceFactory.createStreamingYouTubeService();
        
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

        const source: MediaSource = {
            type: 'youtube',
            data: { url }
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
            event: 'streaming_transcript_completed',
            url,
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

/**
 * Retrieve metadata for a YouTube video
 */
export async function getMetadata(req: Request, res: Response) {
    const url = req.query.url as string;

    try {
        // Get metadata from YouTube API using the videoInfo service
        const videoData = await videoInfo(url);
        
        // Return the video metadata in the expected format
        res.json({
            success: true,
            data: {
                id: videoData.id,
                title: videoData.title,
                thumbnail: {
                    url: videoData.thumbnailUrl,
                    width: 1280,
                    height: 720
                },
                channel: videoData.channel,
                description: videoData.description,
                duration: videoData.duration
            }
        });
    } catch (error) {
        console.error('Error fetching video metadata:', error);
        
        // Return error response in the expected format
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch video info',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
} 