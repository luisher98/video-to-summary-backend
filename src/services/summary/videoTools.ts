import fs from 'fs/promises';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH, checkVideoExists } from '../../utils/utils.ts';
import { ConversionError, DeletionError, DownloadError } from '../../utils/errorHandling.ts';

ffmpeg.setFfmpegPath(getFfmpegPath());

/**
 * Downloads and converts a YouTube video to mp3.
 * @param videoUrl - The URL of the YouTube video.
 * @param id - The unique identifier for the mp3 file.
 * @returns A promise that resolves when the download and conversion are complete.
 */
export async function downloadVideo(
    videoUrl: string,
    id: string,
): Promise<void> {

    if (typeof videoUrl !== 'string' || typeof id !== 'string') {
        throw new Error('Invalid input types');
    }

    const videoExists = await checkVideoExists(id);
    if (!videoExists) {
        throw new Error('Video does not exist');
    }

    const outputFilePath = `${VIDEO_DOWNLOAD_PATH}/${id}.mp3`;

    // Download the video stream
    const videoStream = ytdl(videoUrl, { filter: 'audioonly' })
        .on('error', (error: Error) => {
            console.error(`Error downloading the video: ${error.message}`);
            throw new DownloadError(error.message);
        });

    return new Promise<void>((resolve, reject) => {
        // Use FFmpeg to convert the audio stream to MP3 and save it to the output file
        ffmpeg(videoStream)
            .audioCodec('libmp3lame')
            .toFormat('mp3')
            .save(outputFilePath)
            .on('error', async (error: Error) => {
                console.error(`Error during conversion: ${error.message}`);
                await deleteVideo(id);
                reject(new ConversionError(error.message));
            })
            .on('end', resolve);
    }).catch(async (error) => {
        console.error('Error in download process:', error.message);
        await deleteVideo(id);
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
