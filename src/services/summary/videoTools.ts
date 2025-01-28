import fs from 'fs/promises';  // Keep promises version for async operations
import youtubedl from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH, checkVideoExists } from '../../utils/utils.js';
import { ConversionError, DeletionError, DownloadError } from '../../utils/errorHandling.js';
import { sanitizeFileName } from '../../utils/utils.js';
import { PassThrough } from 'stream';
import path from 'path';
import os from 'os';
import { CookieHandler } from '../../utils/cookieHandler.js';

ffmpeg.setFfmpegPath(getFfmpegPath());

/**
 * Downloads and saves audio from a YouTube video using youtube-dl-exec.
 * This is the preferred method for server deployments as it better handles YouTube restrictions.
 * 
 * @param {string} videoUrl - The URL of the YouTube video
 * @returns {Promise<string>} A promise that resolves with the file ID
 * @throws {DownloadError} If download fails or input is invalid
 * @throws {ConversionError} If audio conversion fails
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
        const cookieOptions = await CookieHandler.processYouTubeCookies();

        await youtubedl.exec(videoUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: outputFilePath,
            quiet: true,
            noWarnings: true,
            preferFreeFormats: true,
            ffmpegLocation: getFfmpegPath(),
            ...cookieOptions
        });

        console.log(`Successfully downloaded and converted: ${outputFilePath}`);
        return fileId;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during download';
        if (message.includes('Sign in to confirm')) {
            throw new DownloadError(
                'YouTube requires authentication. Please configure YOUTUBE_COOKIES environment variable ' +
                'with valid cookies in JSON format.'
            );
        }
        throw new DownloadError(`Failed to download video: ${message}`);
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
        // Get cookie options using CookieHandler
        const cookieOptions = await CookieHandler.processYouTubeCookies();

        const subprocess = youtubedl.exec(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: '-',
            quiet: true,
            noWarnings: true,
            preferFreeFormats: true,
            ...cookieOptions
        });

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
