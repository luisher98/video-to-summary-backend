import fs from 'fs/promises';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH, checkVideoExists } from '../../utils/utils.js';
import { ConversionError, DeletionError, DownloadError } from '../../utils/errorHandling.js';
import { sanitizeFileName } from '../../utils/utils.js';

ffmpeg.setFfmpegPath(getFfmpegPath());

/**
 * Downloads and converts a YouTube video to mp3.
 * @param videoUrl - The URL of the YouTube video.
 * @param id - The unique identifier for the mp3 file.
 * @returns A promise that resolves when the download and conversion are complete.
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

    // Download the video stream
    const videoStream = ytdl(videoUrl, { filter: 'audioonly' })
        .on('error', (error: Error) => {
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
 * Deletes the downloaded mp3 file.
 * @param id - The unique identifier for the mp3 file.
 * @returns A promise that resolves when the file is deleted.
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
