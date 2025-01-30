import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';

// Temporary directory configuration
export const TEMP_BASE_DIR = path.join(process.cwd(), 'tmp');
export const TEMP_DIRS = {
    uploads: path.join(TEMP_BASE_DIR, 'uploads'),
    audios: path.join(TEMP_BASE_DIR, 'audios'),
    transcripts: path.join(TEMP_BASE_DIR, 'savedTranscriptsAndSummaries')
} as const;

// For backward compatibility
export const VIDEO_DOWNLOAD_PATH = TEMP_DIRS.audios;

/**
 * Initialize all temporary directories
 */
export async function initializeTempDirs(): Promise<void> {
    await Promise.all(
        Object.values(TEMP_DIRS).map(dir => 
            fs.mkdir(dir, { recursive: true })
        )
    );
}

/**
 * Clear files from a specific temporary directory
 * @param directory - The directory to clear
 * @param maxAge - Maximum age in milliseconds before file is deleted (default: 1 hour)
 */
export async function clearTempDir(directory: string, maxAge: number = 3600000): Promise<void> {
    try {
        const files = await glob.sync('*', { cwd: directory });
        const now = Date.now();
        
        await Promise.all(files.map(async (file: string) => {
            const filePath = path.join(directory, file);
            try {
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Deleted old temp file: ${filePath}`);
                }
            } catch (error) {
                console.error(`Error processing temp file ${filePath}:`, error);
            }
        }));
    } catch (error) {
        console.error(`Error clearing temp directory ${directory}:`, error);
    }
}

/**
 * Clear all temporary directories
 * @param maxAge - Maximum age in milliseconds before file is deleted (default: 1 hour)
 */
export async function clearAllTempDirs(maxAge: number = 3600000): Promise<void> {
    await Promise.all(
        Object.values(TEMP_DIRS).map(dir => clearTempDir(dir, maxAge))
    );
}

export function getFfmpegPath(): string {
    // Handle both string and module type
    const path = (ffmpegPath as unknown) as string;
    if (!path) {
        // Fallback to system ffmpeg if available
        return process.env.FFMPEG_PATH || 'ffmpeg';
    }
    return path;
}

export function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not set.`);
    }
    return value;
}

export async function checkVideoExists(url: string) {
    try {
        const response = await fetch(url);
        return response.status === 200;
    } catch {
        return false;
    }
}

export async function clearDownloadFolder() {

}

/**
 * Sanitizes a filename by removing or replacing invalid characters
 * @param input - The filename to sanitize
 * @returns The sanitized filename
 */
export function sanitizeFileName(input: string | number | boolean | undefined | null): string {
    const str = String(input || '').trim();
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

export const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
  
    return `${day}_${month}_${year}___${hours}_${minutes}`;
  };
  
interface Cookie {
    domain: string;
    path?: string;
    secure?: boolean;
    expirationDate?: number;
    name: string;
    value: string;
}

/**
 * Converts JSON cookies to Netscape/Mozilla format.
 * Required format:
 * # Netscape HTTP Cookie File
 * domain  domain_flag  path  secure_flag  expiry  name  value
 * 
 * @param cookies - Array of cookie objects
 * @returns Cookies in Netscape format
 */
export function convertJsonCookiesToNetscape(cookies: Cookie[]): string {
    const header = '# Netscape HTTP Cookie File\n';
    const cookieLines = cookies.map(cookie => {
        return [
            cookie.domain,
            'FALSE',                    // domain_flag (Host only)
            cookie.path || '/',         // path
            cookie.secure ? 'TRUE' : 'FALSE', // secure_flag
            cookie.expirationDate || '0', // expiry
            cookie.name,                // name
            cookie.value               // value
        ].join('\t');
    });
    
    return header + cookieLines.join('\n');
}
  