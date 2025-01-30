import fs from 'fs/promises';  // Keep promises version for async operations
import youtubedl from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH, checkVideoExists } from '../../utils/utils.js';
import { DeletionError, DownloadError } from '../../utils/errorHandling.js';
import { sanitizeFileName } from '../../utils/utils.js';
import { PassThrough } from 'stream';
import { CookieHandler } from '../../utils/cookieHandler.js';

ffmpeg.setFfmpegPath(getFfmpegPath());

// Define types for youtube-dl-exec options
interface DownloadOptions extends Record<string, unknown> {
    extractAudio?: boolean;
    audioFormat?: string;
    output?: string;
    quiet?: boolean;
    verbose?: boolean;
    preferFreeFormats?: boolean;
    ffmpegLocation?: string;
    cookies?: string;
}

/**
 * Converts camelCase object keys to kebab-case for yt-dlp
 */
function toYtDlpOptions(options: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(options).reduce((acc, [key, value]) => {
        const kebabKey = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        acc[kebabKey] = value;
        return acc;
    }, {} as Record<string, unknown>);
}

/**
 * Common download logic used by both download methods
 * @internal
 */
async function downloadWithOptions(videoUrl: string, outputFilePath: string): Promise<void> {
    const cookieOptions = await CookieHandler.processYouTubeCookies();
    
    const options: DownloadOptions = {
        extractAudio: true,
        audioFormat: 'mp3',
        output: outputFilePath,
        preferFreeFormats: true,
        ffmpegLocation: getFfmpegPath(),
        verbose: true, // Enable verbose output for debugging
        quiet: false,
        ...(cookieOptions.cookies ? cookieOptions : {}) // Only add cookies if they exist
    };

    // Simplified logging
    console.log('Starting download:', {
        url: videoUrl,
        output: outputFilePath,
        hasCookies: Boolean(cookieOptions.cookies)
    });

    try {
        const ytDlpOptions = toYtDlpOptions(options);
        
        // Add debug info
        console.log('Using yt-dlp options:', ytDlpOptions);
        
        // Execute with stderr pipe to capture error details
        const process = youtubedl.exec(videoUrl, ytDlpOptions);
        
        // Log stderr for debugging
        process.stderr?.on('data', (data: Buffer) => {
            console.log('yt-dlp stderr:', data.toString());
        });

        await process;
        
        // Verify file exists
        await fs.access(outputFilePath);
        console.log(`Successfully downloaded: ${outputFilePath}`);
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        
        // Only log error once
        console.error('Download failed:', {
            error: errorMsg,
            videoUrl,
            outputPath: outputFilePath
        });

        // Handle specific error cases
        if (errorMsg.includes('Sign in') || errorMsg.includes('cookie') || errorMsg.includes('Private video')) {
            if (cookieOptions.cookies) {
                throw new DownloadError('YouTube requires authentication. Please check your cookies configuration.');
            } else {
                throw new DownloadError('This video requires authentication. Please provide YouTube cookies.');
            }
        }
        
        if (errorMsg.includes('no such option')) {
            throw new DownloadError('Configuration error: Invalid yt-dlp options');
        }
        
        // Include any stderr output in the error message
        throw new DownloadError(`Download failed: ${errorMsg}`);
    }
}

/**
 * @deprecated This method is temporarily disabled due to YouTube restrictions.
 * Will be re-enabled when YouTube relaxes their policies.
 * Use downloadVideoWithExec() instead.
 */
export async function downloadVideo(videoUrl: string): Promise<string> {
    console.warn('Warning: Using deprecated downloadVideo method. Consider using downloadVideoWithExec instead.');
    
    if (typeof videoUrl !== 'string') {
        throw new DownloadError('Invalid input type');
    }

    const videoExists = await checkVideoExists(videoUrl);
    if (!videoExists) {
        throw new DownloadError('Video does not exist');
    }

    const fileId = sanitizeFileName(videoUrl.split("=")[1].split("?")[0]);
    const outputFilePath = `${VIDEO_DOWNLOAD_PATH}/${fileId}.mp3`;

    try {
        await fs.mkdir(VIDEO_DOWNLOAD_PATH, { recursive: true });
        await downloadWithOptions(videoUrl, outputFilePath);
        return fileId;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during download';
        throw new DownloadError(`Failed to download video (deprecated method): ${message}`);
    }
}

/**
 * Downloads and saves audio from a YouTube video using youtube-dl-exec.
 * Currently the preferred method due to better handling of YouTube restrictions.
 * 
 * @param {string} videoUrl - The URL of the YouTube video
 * @returns {Promise<string>} A promise that resolves with the file ID
 * @throws {DownloadError} If download fails or input is invalid
 */
export async function downloadVideoWithExec(videoUrl: string): Promise<string> {
    if (typeof videoUrl !== 'string') {
        throw new DownloadError('Invalid input type');
    }

    const videoExists = await checkVideoExists(videoUrl);
    if (!videoExists) {
        throw new DownloadError('Video does not exist');
    }

    const fileId = sanitizeFileName(videoUrl.split("=")[1].split("?")[0]);
    const outputFilePath = `${VIDEO_DOWNLOAD_PATH}/${fileId}.mp3`;

    try {
        await fs.mkdir(VIDEO_DOWNLOAD_PATH, { recursive: true });
        await downloadWithOptions(videoUrl, outputFilePath);
        return fileId;
    } catch (error) {
        // Simplified error logging
        console.error('Download failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            videoUrl,
            outputPath: outputFilePath
        });

        throw error instanceof Error ? error : new DownloadError('Unknown error during download');
    }
}

/**
 * Deletes a downloaded audio file from the filesystem.
 * Used for cleanup after processing is complete or if an error occurs.
 * 
 * @param {string} id - The unique identifier for the audio file
 * @returns {Promise<void>} A promise that resolves when the file is deleted
 * @throws {DeletionError} If the file deletion fails
 * 
 * @example
 * try {
 *   await deleteVideo('video123');
 * } catch (error) {
 *   console.error('Failed to cleanup file:', error);
 * }
 */
export async function deleteVideo(id: string): Promise<void> {
    try {
        await fs.unlink(`${VIDEO_DOWNLOAD_PATH}/${id}.mp3`);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error deleting the video:', error.message);
            throw new DeletionError(error.message);
        }
        console.error('Unknown error:', error);
        throw new Error('An unknown error occurred');
    }
}

/**
 * Downloads audio from a YouTube video and returns it as a stream.
 * Uses youtube-dl-exec for better compatibility with YouTube's restrictions.
 * 
 * @param {string} url - The URL of the YouTube video
 * @returns {Promise<PassThrough>} A stream containing the audio data
 * @throws {DownloadError} If the youtube-dl process fails or has no stdout
 * 
 * @example
 * const audioStream = await downloadAudio('https://youtube.com/watch?v=...');
 * audioStream.pipe(someWritableStream);
 */
export async function downloadAudio(url: string): Promise<PassThrough> {
    const stream = new PassThrough();
    
    try {
        const cookieOptions = await CookieHandler.processYouTubeCookies();

        const options: Record<string, unknown> = {
            extractAudio: true,
            audioFormat: 'mp3',
            output: '-',
            quiet: true,
            preferFreeFormats: true,
            ...cookieOptions
        };

        // Convert camelCase to kebab-case for yt-dlp
        const ytDlpOptions = Object.entries(options).reduce((acc, [key, value]) => {
            const kebabKey = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            acc[kebabKey] = value;
            return acc;
        }, {} as Record<string, unknown>);

        const subprocess = youtubedl.exec(url, ytDlpOptions);

        if (!subprocess.stdout) {
            throw new DownloadError('No stdout available from youtube-dl process');
        }

        subprocess.stdout.pipe(stream);

        subprocess.stderr?.on('data', (data: Buffer) => {
            console.error('YouTube-DL Error:', data.toString());
            const error = new DownloadError(data.toString());
            stream.emit('error', error);
        });

        subprocess.on('error', (err: Error) => {
            console.error('Process Error:', err.message);
            const error = new DownloadError(err.message);
            stream.emit('error', error);
        });

        return stream;
    } catch (error) {
        console.error('Download Error:', error);
        const downloadError = error instanceof Error ? 
            new DownloadError(error.message) : 
            new DownloadError('Unknown error during download');
        stream.emit('error', downloadError);
        return stream;
    }
}
