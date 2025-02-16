import { promises as fs } from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { TEMP_DIRS } from '@/utils/constants/paths.js';
import { getFfmpegPath } from '@/utils/media/ffmpeg.js';
import { CookieHandler } from './cookies/cookieHandler.js';
import { DeletionError, DownloadError } from '@/utils/errors/errorHandling.js';
import { logProcessStep } from '@/utils/logging/logger.js';

interface YtDlpOptions {
    'extract-audio': boolean;
    'audio-format': string;
    'output': string;
    'prefer-free-formats': boolean;
    'ffmpeg-location'?: string;
    'cookies'?: string;
    'verbose'?: boolean;
    'quiet'?: boolean;
}

/**
 * Service for downloading and managing YouTube videos
 */
export class YouTubeDownloader {
    /**
     * Downloads a video using youtube-dl and returns the file ID
     */
    static async downloadVideo(url: string): Promise<string> {
        const fileId = path.basename(url).replace(/[^a-z0-9]/gi, '_');
        const outputPath = path.join(TEMP_DIRS.audios, `${fileId}.%(ext)s`);
        
        logProcessStep('YouTube Download', 'start', { url });

        try {
            const cookieOptions = await CookieHandler.processYouTubeCookies();
            const ffmpegPath = getFfmpegPath();

            const ytDlpOptions: YtDlpOptions = {
                'extract-audio': true,
                'audio-format': 'mp3',
                'output': outputPath,
                'prefer-free-formats': true,
                'verbose': true,
                'quiet': false
            };

            if (ffmpegPath) {
                ytDlpOptions['ffmpeg-location'] = ffmpegPath;
            }

            if (cookieOptions.cookies) {
                ytDlpOptions['cookies'] = cookieOptions.cookies;
            }

            await youtubedl.exec(url, ytDlpOptions);
            
            const downloadedPath = path.join(TEMP_DIRS.audios, `${fileId}.mp3`);
            await fs.access(downloadedPath);
            logProcessStep('YouTube Download', 'complete', { fileId });
            
            return fileId;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            logProcessStep('YouTube Download', 'error', {
                error: errorMsg,
                videoUrl: url
            });

            if (errorMsg.includes('Sign in') || errorMsg.includes('cookie') || errorMsg.includes('Private video')) {
                throw new DownloadError('YouTube requires authentication. Please check your cookies configuration.');
            }
            
            throw new DownloadError(`Failed to download video: ${errorMsg}`);
        }
    }

    /**
     * Deletes a downloaded video file
     */
    static async deleteVideo(fileId: string): Promise<void> {
        try {
            const filePath = path.join(TEMP_DIRS.audios, `${fileId}.mp3`);
            await fs.unlink(filePath);
            logProcessStep('Delete Video', 'complete', { fileId });
        } catch (error) {
            if (error instanceof Error) {
                logProcessStep('Delete Video', 'error', { error: error.message });
                throw new DeletionError(error.message);
            }
            throw new Error('An unknown error occurred during deletion');
        }
    }
} 