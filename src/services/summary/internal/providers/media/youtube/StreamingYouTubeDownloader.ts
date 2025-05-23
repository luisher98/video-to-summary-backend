import { spawn } from 'child_process';
import { Readable, Transform } from 'stream';
import { getFfmpegPath } from '@/utils/media/ffmpeg.js';
import { CookieHandler } from './cookies/cookieHandler.js';
import { MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import { logProcessStep } from '@/utils/logging/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { AdaptiveBuffer } from '@/utils/streaming/AdaptiveBuffer.js';

/**
 * Service for streaming YouTube videos using yt-dlp and piping directly to FFmpeg
 */
export class StreamingYouTubeDownloader {
    /**
     * Creates a streaming pipeline for downloading and processing YouTube videos
     * @param url YouTube URL to process
     * @param progressCallback Optional callback for progress updates
     * @returns A promise with the processed audio stream and metadata
     */
    static async createStreamingPipeline(
        url: string,
        progressCallback?: (progress: number) => void
    ): Promise<{ 
        stream: Readable; 
        fileId: string;
        cleanup: () => Promise<void>;
    }> {
        // Generate a unique ID for this download
        const fileId = uuidv4();
        logProcessStep('YouTube Download', 'start', { url, fileId });

        try {
            // Get cookie configuration
            const cookieOptions = await CookieHandler.processYouTubeCookies();
            const ffmpegPath = getFfmpegPath();

            // Prepare yt-dlp arguments
            const ytDlpArgs = [
                url,
                '--extract-audio',
                '--audio-format', 'mp3',
                '--prefer-free-formats',
                '--output', '-', // Output to stdout
                '--quiet'        // Reduce console output
            ];

            if (cookieOptions.cookies) {
                ytDlpArgs.push('--cookies', cookieOptions.cookies);
            }

            // Start yt-dlp process
            const ytDlp = spawn('yt-dlp', ytDlpArgs);
            
            // Track progress
            let totalBytes = 0;
            let lastProgressUpdate = 0;
            
            ytDlp.stderr.on('data', (data) => {
                const output = data.toString();
                // Log errors but don't abort unless process fails
                console.error('yt-dlp stderr:', output);
            });

            // Create FFmpeg process for audio conversion
            const ffmpeg = spawn(ffmpegPath, [
                '-i', 'pipe:0',          // Take input from stdin
                '-f', 'mp3',             // Output format
                '-ab', '128k',           // Audio bitrate
                '-ac', '2',              // Audio channels
                '-ar', '44100',          // Audio sample rate
                '-vn',                   // No video
                '-loglevel', 'warning',  // Reduce logging
                'pipe:1'                 // Output to stdout
            ]);

            // Setup error handlers
            ytDlp.on('error', (error) => {
                logProcessStep('YouTube Download', 'error', { error: error.message, url });
                throw new MediaError(
                    `Failed to start YouTube download: ${error.message}`,
                    MediaErrorCode.DOWNLOAD_FAILED
                );
            });

            ffmpeg.on('error', (error) => {
                logProcessStep('Audio Processing', 'error', { error: error.message, url });
                throw new MediaError(
                    `Failed to process audio: ${error.message}`,
                    MediaErrorCode.PROCESSING_FAILED
                );
            });

            // Create progress monitoring transform stream
            const progressStream = new Transform({
                transform(chunk, encoding, callback) {
                    totalBytes += chunk.length;
                    
                    // Only update progress every 500ms
                    const now = Date.now();
                    if (now - lastProgressUpdate > 500 && progressCallback) {
                        lastProgressUpdate = now;
                        // We don't know the total size, so we report based on data received
                        progressCallback(totalBytes / 1024); // KB received
                    }
                    
                    // Pass the chunk through unchanged
                    callback(null, chunk);
                }
            });

            // Create adaptive buffer for better performance
            const adaptiveBuffer = new AdaptiveBuffer({
                initialBufferSize: 128 * 1024, // 128KB initial buffer
                maxBufferSize: 2 * 1024 * 1024, // 2MB max buffer
                onBufferSizeChange: (newSize, reason) => {
                    logProcessStep('Adaptive Buffer', 'start', { 
                        newSize: `${Math.round(newSize / 1024)}KB`, 
                        reason, 
                        fileId 
                    });
                }
            });

            // Connect the streams: yt-dlp output -> ffmpeg input
            ytDlp.stdout.pipe(ffmpeg.stdin);

            // Create cleanup function
            const cleanup = async () => {
                try {
                    // Kill processes if they're still running
                    ytDlp.kill();
                    ffmpeg.kill();
                    
                    logProcessStep('Cleanup', 'complete', { fileId });
                } catch (error) {
                    console.error('Error during cleanup:', error);
                }
            };

            // Set up process completion handlers
            ytDlp.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    logProcessStep('YouTube Download', 'error', { code, url });
                    ffmpeg.stdin.end(); // Close FFmpeg input if yt-dlp fails
                }
            });

            // Return the ffmpeg output stream with adaptive buffering
            return {
                stream: ffmpeg.stdout.pipe(progressStream).pipe(adaptiveBuffer),
                fileId,
                cleanup
            };
        } catch (error) {
            logProcessStep('YouTube Download', 'error', { 
                error: error instanceof Error ? error.message : String(error), 
                url 
            });
            
            if (error instanceof MediaError) {
                throw error;
            }
            
            throw new MediaError(
                `Failed to create streaming pipeline: ${error instanceof Error ? error.message : String(error)}`,
                MediaErrorCode.DOWNLOAD_FAILED
            );
        }
    }
} 