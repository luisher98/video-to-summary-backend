import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { checkExecutable } from '../file/fileValidation.js';
import fsSync from 'fs';

const execAsync = promisify(exec);

/**
 * Get the path to the FFmpeg executable
 */
export function getFfmpegPath(): string {
    try {
        // First try: Use ffmpeg-static module
        const staticFfmpegPath = (ffmpegPath as unknown) as string;
        if (staticFfmpegPath) {
            console.log('Using ffmpeg-static module');
            return staticFfmpegPath;
        }

        // Second try: Use our local FFmpeg binary
        const localFfmpegPath = path.join(process.cwd(), 'src', 'lib', 'FFmpeg', 'ffmpeg', 'ffmpeg');
        try {
            // Synchronously check if file exists and is executable
            fsSync.accessSync(localFfmpegPath, fsSync.constants.X_OK);
            console.log('Using local FFmpeg binary:', localFfmpegPath);
            return localFfmpegPath;
        } catch (error: any) {
            console.log('Local FFmpeg not accessible:', error?.message);
            // Try to fix permissions
            try {
                execAsync(`chmod +x "${localFfmpegPath}"`);
                fsSync.accessSync(localFfmpegPath, fsSync.constants.X_OK);
                console.log('Fixed permissions for local FFmpeg binary');
                return localFfmpegPath;
            } catch {
                console.log('Could not fix FFmpeg permissions');
            }
        }

        // Third try: Use system FFmpeg
        try {
            execAsync('ffmpeg -version');
            console.log('Using system FFmpeg');
            return 'ffmpeg';
        } catch {
            console.log('System FFmpeg not available');
        }

        // Last resort: Use FFMPEG_PATH environment variable
        const envPath = process.env.FFMPEG_PATH;
        if (envPath) {
            console.log('Using FFmpeg from environment variable');
            return envPath;
        }

        console.log('Falling back to system FFmpeg');
        return 'ffmpeg';
    } catch (error) {
        console.warn('Error finding FFmpeg:', error);
        return 'ffmpeg'; // Default to system as last resort
    }
} 