import { spawn } from 'child_process';
import { Readable, Transform } from 'stream';
import { getFfmpegPath } from '@/utils/media/ffmpeg.js';
import { CookieHandler } from './cookies/cookieHandler.js';
import { YOUTUBE_CONFIG } from '@/config/youtube.js';
import { MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import { logProcessStep } from '@/utils/logging/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { AdaptiveBuffer } from '@/utils/streaming/AdaptiveBuffer.js';

/**
 * Proxy manager for handling residential proxy rotation and fallback
 */
class ProxyManager {
    private static currentIndex = 0;
    private static failedProxies = new Set<string>();
    private static lastRotation = 0;
    private static readonly ROTATION_INTERVAL = 60000; // 1 minute

    /**
     * Get the next available proxy based on rotation strategy
     */
    static getProxy(): string | null {
        if (!YOUTUBE_CONFIG.proxy.enabled || YOUTUBE_CONFIG.proxy.endpoints.length === 0) {
            return null;
        }

        const availableEndpoints = YOUTUBE_CONFIG.proxy.endpoints.filter(
            endpoint => !this.failedProxies.has(endpoint)
        );

        if (availableEndpoints.length === 0) {
            console.warn('All proxies failed, clearing failure list for retry');
            this.failedProxies.clear();
            return YOUTUBE_CONFIG.proxy.endpoints[0];
        }

        let selectedEndpoint: string;

        if (YOUTUBE_CONFIG.proxy.rotationStrategy === 'round-robin') {
            selectedEndpoint = availableEndpoints[this.currentIndex % availableEndpoints.length];
            this.currentIndex++;
        } else {
            // Random strategy
            const randomIndex = Math.floor(Math.random() * availableEndpoints.length);
            selectedEndpoint = availableEndpoints[randomIndex];
        }

        // Build proxy URL with authentication
        if (YOUTUBE_CONFIG.proxy.username && YOUTUBE_CONFIG.proxy.password) {
            return `http://${YOUTUBE_CONFIG.proxy.username}:${YOUTUBE_CONFIG.proxy.password}@${selectedEndpoint}`;
        }

        return `http://${selectedEndpoint}`;
    }

    /**
     * Mark a proxy as failed
     */
    static markProxyFailed(proxyUrl: string): void {
        // Extract endpoint from full URL
        const endpoint = proxyUrl.replace(/^https?:\/\//, '').replace(/^[^@]+@/, '');
        this.failedProxies.add(endpoint);
        console.warn(`Marked proxy as failed: ${endpoint}`);
    }

    /**
     * Reset proxy failure tracking periodically
     */
    static resetFailures(): void {
        const now = Date.now();
        if (now - this.lastRotation > this.ROTATION_INTERVAL) {
            this.failedProxies.clear();
            this.lastRotation = now;
            console.log('Reset proxy failure tracking');
        }
    }
}

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

        // Reset proxy failures periodically
        ProxyManager.resetFailures();

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

            // Get proxy configuration
            const proxyUrl = ProxyManager.getProxy();
            if (proxyUrl) {
                console.log('✅ Using residential proxy for YouTube download');
                logProcessStep('Proxy Setup', 'start', { proxyEnabled: true, fileId });
            } else {
                console.log('❌ No proxy configured - may encounter IP-based blocking');
                logProcessStep('Proxy Setup', 'start', { proxyEnabled: false, fileId });
            }

            // Prepare yt-dlp arguments with anti-detection measures and proxy support
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
                
                // Network settings with proxy support
                '--socket-timeout', YOUTUBE_CONFIG.proxy.timeout.toString(),
                '--retries', YOUTUBE_CONFIG.proxy.maxRetries.toString(),
                '--fragment-retries', '3',
                '--retry-sleep', 'exp=1:2:10',
                
                // Reduce verbosity but keep some output for debugging
                '--no-warnings'
            ];

            // Add proxy if available
            if (proxyUrl) {
                ytDlpArgs.push('--proxy', proxyUrl);
                console.log('✅ Added proxy to yt-dlp arguments');
            }

            console.log('Cookie processing result:', cookieOptions);
            if (cookieOptions.cookies) {
                ytDlpArgs.push('--cookies', cookieOptions.cookies);
                console.log('✅ Using cookies file:', cookieOptions.cookies);
                
                // Log cookie file size for debugging
                try {
                    const fs = await import('fs');
                    const stats = await fs.promises.stat(cookieOptions.cookies);
                    console.log(`Cookie file size: ${stats.size} bytes`);
                } catch (error) {
                    console.warn('Could not read cookie file stats:', error);
                }
            } else {
                console.log('❌ No cookies available - may encounter bot detection');
            }

            return await this.executeDownloadWithFallback(ytDlpArgs, ffmpegPath, url, fileId, progressCallback, proxyUrl, cookieOptions);
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

    /**
     * Execute download with proxy fallback on failure
     */
    private static async executeDownloadWithFallback(
        ytDlpArgs: string[],
        ffmpegPath: string,
        url: string,
        fileId: string,
        progressCallback?: (progress: number) => void,
        currentProxy?: string | null,
        cookieOptions?: any
    ): Promise<{ stream: Readable; fileId: string; cleanup: () => Promise<void>; }> {
        let attempt = 0;
        const maxAttempts = YOUTUBE_CONFIG.proxy.enabled ? YOUTUBE_CONFIG.proxy.maxRetries + 1 : 1;

        while (attempt < maxAttempts) {
            try {
                return await this.attemptDownload(ytDlpArgs, ffmpegPath, url, fileId, progressCallback, cookieOptions);
            } catch (error) {
                attempt++;
                console.error(`Download attempt ${attempt} failed:`, error);

                if (attempt >= maxAttempts) {
                    throw error;
                }

                // If we're using a proxy and the download failed, try a different one
                if (currentProxy && YOUTUBE_CONFIG.proxy.enabled) {
                    ProxyManager.markProxyFailed(currentProxy);
                    const newProxy = ProxyManager.getProxy();
                    
                    if (newProxy && newProxy !== currentProxy) {
                        console.log(`🔄 Retrying with different proxy (attempt ${attempt + 1}/${maxAttempts})`);
                        
                        // Update proxy in arguments
                        const proxyIndex = ytDlpArgs.findIndex(arg => arg === '--proxy');
                        if (proxyIndex !== -1 && proxyIndex + 1 < ytDlpArgs.length) {
                            ytDlpArgs[proxyIndex + 1] = newProxy;
                        } else {
                            ytDlpArgs.push('--proxy', newProxy);
                        }
                        
                        currentProxy = newProxy;
                    } else {
                        console.warn('No alternative proxy available for retry');
                    }
                }

                // Wait before retry
                if (attempt < maxAttempts) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    console.log(`Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        throw new MediaError(
            'All download attempts failed',
            MediaErrorCode.DOWNLOAD_FAILED
        );
    }

    /**
     * Attempt a single download execution
     */
    private static async attemptDownload(
        ytDlpArgs: string[],
        ffmpegPath: string,
        url: string,
        fileId: string,
        progressCallback?: (progress: number) => void,
        cookieOptions?: any
    ): Promise<{ stream: Readable; fileId: string; cleanup: () => Promise<void>; }> {
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
        ytDlp.on('exit', async (code, signal) => {
            console.log(`yt-dlp exited with code: ${code}, signal: ${signal}, bytes received: ${ytDlpBytesReceived}`);
            
            // Handle specific exit codes
            if (code === 1 && ytDlpBytesReceived === 0) {
                console.error('yt-dlp failed - likely due to YouTube bot detection, access restrictions, or proxy issues');
                console.error('Attempting fallback strategies...');
                
                // Try to get fresh cookies if the current ones failed
                if (cookieOptions.cookies) {
                    console.log('Current cookies may be expired, attempting to refresh...');
                    try {
                        const { CookieHandler } = await import('./cookies/cookieHandler.js');
                        await CookieHandler.cleanupOldCookies();
                    } catch (error) {
                        console.warn('Cookie cleanup failed:', error);
                    }
                }
                
                logProcessStep('YouTube Download', 'error', { 
                    code, 
                    url,
                    message: 'Bot detection, access restriction, or proxy issue detected',
                    cookiesUsed: !!cookieOptions?.cookies,
                    proxyUsed: YOUTUBE_CONFIG.proxy.enabled,
                    bytesReceived: ytDlpBytesReceived
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
    }
} 