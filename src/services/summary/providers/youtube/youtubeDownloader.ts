import { promises as fs } from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { TEMP_DIRS } from '../../../../utils/constants/paths.js';
import { getFfmpegPath } from '../../../../utils/media/ffmpeg.js';
import { CookieHandler } from '../../../auth/cookieHandler.js';
import { DeletionError, DownloadError } from '../../../../utils/errors/errorHandling.js';

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
        
        console.log('Starting download:', {
            url,
            output: outputPath.replace('%(ext)s', 'mp3')
        });

        try {
            // Always try to get cookies first
            const cookieOptions = await CookieHandler.processYouTubeCookies();

            // Get ffmpeg path from utils
            const ffmpegPath = getFfmpegPath();
            console.log('Using ffmpeg from:', ffmpegPath);

            // Use the exact format yt-dlp expects
            const ytDlpOptions: YtDlpOptions = {
                'extract-audio': true,
                'audio-format': 'mp3',
                'output': outputPath,
                'prefer-free-formats': true,
                'verbose': true,
                'quiet': false
            };

            // Add ffmpeg location if available
            if (ffmpegPath) {
                ytDlpOptions['ffmpeg-location'] = ffmpegPath;
                console.log('Added ffmpeg location:', ffmpegPath);
            }

            // Add cookies if available
            if (cookieOptions.cookies) {
                ytDlpOptions['cookies'] = cookieOptions.cookies;
            }

            console.log('Using yt-dlp options:', {
                ...ytDlpOptions,
                cookies: ytDlpOptions['cookies'] ? 'present' : undefined
            });

            // Execute youtube-dl with raw options
            const result = await youtubedl.exec(url, ytDlpOptions);
            
            if (result.stderr) {
                console.log('yt-dlp stderr:', result.stderr);
            }

            // Verify file exists
            const downloadedPath = path.join(TEMP_DIRS.audios, `${fileId}.mp3`);
            await fs.access(downloadedPath);
            console.log('Successfully downloaded:', downloadedPath);
            
            return fileId;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            console.error('Download failed:', {
                error: errorMsg,
                videoUrl: url,
                outputPath: outputPath.replace('%(ext)s', 'mp3')
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
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error deleting video:', error.message);
                throw new DeletionError(error.message);
            }
            throw new Error('An unknown error occurred during deletion');
        }
    }
} 