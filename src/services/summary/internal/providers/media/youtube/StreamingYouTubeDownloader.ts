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
            // Check if yt-dlp is available
            console.log('Checking yt-dlp availability...');
            try {
                const ytDlpTest = spawn('yt-dlp', ['--version']);
                ytDlpTest.on('error', (error) => {
                    console.error('yt-dlp not found or not executable:', error);
                    throw new MediaError(
                        'yt-dlp is not available in this environment',
                        MediaErrorCode.DOWNLOAD_FAILED
                    );
                });
                
                let versionOutput = '';
                ytDlpTest.stdout.on('data', (data) => {
                    versionOutput += data.toString();
                });
                
                await new Promise<void>((resolve, reject) => {
                    ytDlpTest.on('exit', (code) => {
                        if (code === 0) {
                            console.log('yt-dlp version:', versionOutput.trim());
                            resolve();
                        } else {
                            reject(new Error(`yt-dlp version check failed with code ${code}`));
                        }
                    });
                });
            } catch (error) {
                console.error('yt-dlp availability check failed:', error);
                throw error;
            }
            
            // Get cookie configuration
            const cookieOptions = await CookieHandler.processYouTubeCookies();
            const ffmpegPath = getFfmpegPath();
            console.log('Using FFmpeg path:', ffmpegPath);

            // Prepare yt-dlp arguments with anti-detection measures
            const ytDlpArgs = [
                url,
                '--extract-audio',
                '--audio-format', 'mp3',
                '--prefer-free-formats',
                '--output', '-', // Output to stdout
                
                // Anti-detection measures
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--referer', 'https://www.youtube.com/',
                '--add-header', 'Accept-Language:en-US,en;q=0.9',
                '--add-header', 'Accept-Encoding:gzip, deflate, br',
                '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                '--add-header', 'Connection:keep-alive',
                '--add-header', 'Upgrade-Insecure-Requests:1',
                
                // Format and quality settings
                '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
                '--audio-quality', '0', // Best quality
                '--no-playlist',
                
                // Network settings
                '--socket-timeout', '60',
                '--retries', '3',
                '--fragment-retries', '3',
                '--retry-sleep', 'exp=1:2:10',
                
                // Reduce verbosity but keep some output for debugging
                '--no-warnings'
            ];

            console.log('Cookie options:', cookieOptions);
            if (cookieOptions.cookies) {
                ytDlpArgs.push('--cookies', cookieOptions.cookies);
                console.log('Using cookies file:', cookieOptions.cookies);
            } else {
                console.log('No cookies available - may encounter bot detection');
            }

            // Start yt-dlp process
            console.log('Starting yt-dlp with args:', ytDlpArgs);
            const ytDlp = spawn('yt-dlp', ytDlpArgs);
            
            // Track progress
            let totalBytes = 0;
            let lastProgressUpdate = 0;
            let ytDlpBytesReceived = 0;
            
            ytDlp.stdout.on('data', (chunk) => {
                ytDlpBytesReceived += chunk.length;
                console.log(`yt-dlp stdout data: ${chunk.length} bytes (total: ${ytDlpBytesReceived})`);
            });
            
            ytDlp.stderr.on('data', (data) => {
                const output = data.toString();
                console.log('yt-dlp stderr:', output);
            });

            // Create FFmpeg process for audio conversion
            const ffmpeg = spawn(ffmpegPath, [
                '-i', 'pipe:0',          // Take input from stdin
                '-f', 'mp3',             // Output format
                '-ab', '128k',           // Audio bitrate
                '-ac', '2',              // Audio channels
                '-ar', '44100',          // Audio sample rate
                '-vn',                   // No video
                '-loglevel', 'info',     // Increase logging for debugging
                'pipe:1'                 // Output to stdout
            ]);
            
            // Add more detailed FFmpeg logging
            let ffmpegBytesOutput = 0;
            
            ffmpeg.stdout.on('data', (chunk) => {
                ffmpegBytesOutput += chunk.length;
                console.log(`FFmpeg stdout data: ${chunk.length} bytes (total: ${ffmpegBytesOutput})`);
            });
            
            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();
                console.log('FFmpeg stderr:', output);
            });

            // Track if we need to retry with different parameters
            let hasErrored = false;
            
            // Setup error handlers
            ytDlp.on('error', (error) => {
                console.error('yt-dlp process error:', error);
                hasErrored = true;
                logProcessStep('YouTube Download', 'error', { error: error.message, url });
                throw new MediaError(
                    `Failed to start YouTube download: ${error.message}`,
                    MediaErrorCode.DOWNLOAD_FAILED
                );
            });

            ffmpeg.on('error', (error) => {
                console.error('FFmpeg process error:', error);
                logProcessStep('Audio Processing', 'error', { error: error.message, url });
                throw new MediaError(
                    `Failed to process audio: ${error.message}`,
                    MediaErrorCode.PROCESSING_FAILED
                );
            });
            
            // Add exit handlers for better debugging
            ytDlp.on('exit', (code, signal) => {
                console.log(`yt-dlp exited with code: ${code}, signal: ${signal}, bytes received: ${ytDlpBytesReceived}`);
                
                // Handle specific exit codes
                if (code === 1 && ytDlpBytesReceived === 0) {
                    console.error('yt-dlp failed - likely due to YouTube bot detection or access restrictions');
                    console.error('Consider:');
                    console.error('1. Using cookies for authentication');
                    console.error('2. Using a different video URL for testing');
                    console.error('3. Checking if the video is accessible from this region');
                    
                    logProcessStep('YouTube Download', 'error', { 
                        code, 
                        url,
                        message: 'Bot detection or access restriction detected'
                    });
                }
            });
            
            ffmpeg.on('exit', (code, signal) => {
                console.log(`FFmpeg exited with code: ${code}, signal: ${signal}, bytes output: ${ffmpegBytesOutput}`);
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