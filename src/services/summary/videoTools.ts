import fs from 'fs/promises';
import ytdl from '@distube/ytdl-core';
import youtubedl from 'youtube-dl-exec';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH, checkVideoExists } from '../../utils/utils.js';
import { ConversionError, DeletionError, DownloadError } from '../../utils/errorHandling.js';
import { sanitizeFileName } from '../../utils/utils.js';
import { PassThrough } from 'stream';

ffmpeg.setFfmpegPath(getFfmpegPath());

/**
 * Creates a YouTube agent with cookies for authenticated requests.
 * This helps bypass some rate limiting and region restrictions.
 * 
 * @returns {ytdl.Agent | null} A configured agent if cookies are available, null otherwise
 * @private
 */
function createYoutubeAgent() {
    try {
        const cookiesString = process.env.YOUTUBE_COOKIES;
        if (!cookiesString) {
            console.warn('No YouTube cookies found in environment variables');
            return null;
        }

        console.log('Found YouTube cookies, creating agent...');
        const cookies = JSON.parse(cookiesString);
        return ytdl.createAgent(cookies);
    } catch (error) {
        console.error('Error creating YouTube agent:', error);
        return null;
    }
}

/**
 * Downloads a YouTube video and converts it to MP3 format using ytdl-core.
 * @deprecated Use downloadVideoWithExec instead. This function uses ytdl-core which has issues with server deployments.
 * 
 * @param {string} videoUrl - The URL of the YouTube video to download
 * @returns {Promise<string>} A promise that resolves with the file ID of the downloaded audio
 * @throws {Error} If the input is invalid or video doesn't exist
 * @throws {DownloadError} If the download fails
 * @throws {ConversionError} If the audio conversion fails
 */
export async function downloadVideo(
    videoUrl: string,
): Promise<string> {
    if (typeof videoUrl !== 'string') {
        throw new Error('Invalid input types');
    }

    const videoExists = await checkVideoExists(videoUrl);
    if (!videoExists) {
        throw new Error('Video does not exist');
    }
    const fileId = sanitizeFileName(videoUrl.split("=")[1].split("?")[0]);

    const outputFilePath = `${VIDEO_DOWNLOAD_PATH}/${fileId}.mp3`;

    // Create YouTube agent with cookies if available
    const agent = createYoutubeAgent();

    // Download the video stream with agent if available
    const videoStream = ytdl(videoUrl, { 
        filter: 'audioonly',
        ...(agent && { agent }) // Only include agent if it exists
    }).on('error', (error: Error) => {
        console.error(`Error downloading the video: ${error.message}`);
        throw new DownloadError(error.message);
    });

    return new Promise<string>((resolve, reject) => {
        // Use FFmpeg to convert the audio stream to MP3 and save it to the output file
        ffmpeg(videoStream)
            .audioCodec('libmp3lame')
            .toFormat('mp3')
            .save(outputFilePath)
            .on('error', async (error: Error) => {
                console.error(`Error during conversion: ${error.message}`);
                await deleteVideo(fileId);
                reject(new ConversionError(error.message));
            })
            .on('end', () => {
                console.log(
                    `Successfully downloaded and converted: ${outputFilePath}`,
                );
                resolve(fileId);
            });
    }).catch(async (error) => {
        console.error('Error in download process:', error.message);
        await deleteVideo(fileId);
        throw new DownloadError(error.message);
    });
}

/**
 * Downloads and saves audio from a YouTube video using youtube-dl-exec.
 * This is the preferred method for server deployments as it better handles YouTube restrictions.
 * 
 * @param {string} videoUrl - The URL of the YouTube video
 * @returns {Promise<string>} A promise that resolves with the file ID
 * @throws {DownloadError} If download fails or input is invalid
 * @throws {ConversionError} If audio conversion fails
 * 
 * @example
 * const fileId = await downloadVideoWithExec('https://youtube.com/watch?v=...');
 * // fileId can be used to access the audio file or for cleanup
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
        // Use youtube-dl-exec to download directly to mp3
        await youtubedl.exec(videoUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: outputFilePath,
            quiet: true,
            noWarnings: true,
            preferFreeFormats: true,
            ffmpegLocation: getFfmpegPath(),
        });

        return fileId;
    } catch (error) {
        console.error('Error downloading the video:', error);
        throw new DownloadError(error instanceof Error ? error.message : 'Unknown error during download');
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
        } else {
            console.error('Unknown error:', error);
            throw new Error('An unknown error occurred');
            // --- notify error. this can be a problem with the server
        }
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
        const subprocess = youtubedl.exec(url, {
            extractAudio: true,
            audioFormat: 'mp3',
            output: '-',
            quiet: true,
            noWarnings: true,
            preferFreeFormats: true,
        });

        if (!subprocess.stdout) {
            throw new DownloadError('No stdout available from youtube-dl process');
        }

        subprocess.stdout.pipe(stream);

        subprocess.stderr?.on('data', (data: Buffer) => {
            const error = new DownloadError(data.toString());
            stream.emit('error', error);
        });

        subprocess.on('error', (err: Error) => {
            const error = new DownloadError(err.message);
            stream.emit('error', error);
        });

        return stream;
    } catch (error) {
        const downloadError = error instanceof Error ? 
            new DownloadError(error.message) : 
            new DownloadError('Unknown error during download');
        stream.emit('error', downloadError);
        return stream;
    }
}
