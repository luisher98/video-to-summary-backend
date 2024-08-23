import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, ytVideoExists } from '../../utils/utils.ts';

// Set FFmpeg path
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

    const videoExists = await ytVideoExists(id);
    if (!videoExists) {
        throw new Error('Video does not exist');
    }

    const outputFilePath = `./src/tmp/videos/${id}.mp3`;

    // Download the video stream
    const videoStream = ytdl(videoUrl, { filter: 'audioonly' })
        .on('error', (error: Error) => {
            console.error(`Error downloading the video: ${error.message}`);
            throw new Error(`Error downloading the video: ${error.message}`);
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
                reject(new Error(`Error during conversion: ${error.message}`));
            })
            .on('end', resolve);
    }).catch(async (error) => {
        console.error('Error in download process:', error.message);
        await deleteVideo(id);
        throw new Error(
            `An error occurred during the download process (${error.message})`,
        );
    });
}

/**
 * Deletes the downloaded mp3 file.
 * @param id - The unique identifier for the mp3 file.
 * @returns A promise that resolves when the file is deleted.
 */
export async function deleteVideo(id: string): Promise<void> {
    try {
        await fs.unlink(`./src/tmp/videos/${id}.mp3`);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error deleting the video:', error.message);
            throw error;
        } else {
            console.error('Unknown error:', error);
            throw new Error('An unknown error occurred');
            // notify error. this can be a problem with the server
        }
    }
}
