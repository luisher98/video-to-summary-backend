import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import glob from 'glob';
import os from 'os';

// File size constants
export const FILE_SIZE = {
    MB: 1024 * 1024,
    MEMORY_LIMIT: 200 * 1024 * 1024, // 200MB
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    CHUNK_SIZE: 50 * 1024 * 1024, // 50MB chunks
    MAX_LOCAL_SIZE: Number(process.env.MAX_LOCAL_FILESIZE_MB || 100) * 1024 * 1024 // Default 100MB
} as const;

// Temporary directory configuration
export const TEMP_DIRS = {
    base: process.env.TEMP_DIR ? 
        path.resolve(process.env.TEMP_DIR) : 
        path.join(process.cwd(), 'tmp'),
    get uploads() { return path.join(this.base, 'uploads') },
    get audios() { return path.join(this.base, 'audios') },
    get transcripts() { return path.join(this.base, 'transcripts') },
    get cookies() { return path.join(this.base, 'cookies') },
    get sessions() { return path.join(this.base, 'sessions') }
} as const;

// For backward compatibility
export const VIDEO_DOWNLOAD_PATH = TEMP_DIRS.audios;

/**
 * Initialize all temporary directories
 */
export async function initializeTempDirs(): Promise<void> {
    try {
        await Promise.all(
            Object.values(TEMP_DIRS)
                .filter(dir => typeof dir === 'string')
                .map(dir => fs.mkdir(dir, { recursive: true }))
        );
        console.log('Temporary directories initialized:', Object.values(TEMP_DIRS));
    } catch (error) {
        console.error('Failed to initialize temporary directories:', error);
        throw error;
    }
}

/**
 * Clear files from a specific temporary directory
 */
export async function clearTempDir(directory: string, maxAge: number = 3600000): Promise<void> {
    try {
        // Check if directory exists and is accessible
        try {
            await fs.access(directory, fs.constants.W_OK | fs.constants.R_OK);
        } catch (error) {
            console.log(`Directory ${directory} is not accessible:`, error);
            return;
        }

        const files = await new Promise<string[]>((resolve, reject) => {
            glob('*', { cwd: directory }, (err, matches) => {
                if (err) reject(err);
                else resolve(matches);
            });
        });
        
        const now = Date.now();
        
        await Promise.all(files.map(async (file: string) => {
            const filePath = path.join(directory, file);
            try {
                // Check if file is accessible before attempting operations
                await fs.access(filePath, fs.constants.W_OK);
                
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    try {
                        await fs.unlink(filePath);
                        console.log(`Deleted old temp file: ${filePath}`);
                    } catch (unlinkError: any) {
                        if (unlinkError.code === 'EPERM') {
                            console.log(`Permission denied deleting ${filePath} - will be handled by OS cleanup`);
                        } else {
                            throw unlinkError;
                        }
                    }
                }
            } catch (error: any) {
                if (error.code === 'EPERM' || error.code === 'EACCES') {
                    console.log(`Skipping inaccessible file ${filePath}`);
                } else {
                    console.error(`Error processing temp file ${filePath}:`, error);
                }
            }
        }));
    } catch (error) {
        console.error(`Error clearing temp directory ${directory}:`, error);
    }
}

/**
 * Clear all temporary directories
 */
export async function clearAllTempDirs(maxAge: number = 3600000): Promise<void> {
    const directories = Object.values(TEMP_DIRS).filter(dir => typeof dir === 'string');
    await Promise.all(directories.map(dir => clearTempDir(dir, maxAge)));
}

/**
 * Create a temporary file with automatic cleanup
 */
export async function createTempFile(
    content: string | Buffer,
    extension: string,
    directory: string = TEMP_DIRS.base,
    maxAge: number = 3600000 // 1 hour default
): Promise<string> {
    const timestamp = Date.now();
    const filename = `temp_${timestamp}_${Math.random().toString(36).slice(2)}${extension}`;
    const filepath = path.join(directory, filename);
    
    await fs.writeFile(filepath, content);
    
    // Schedule cleanup
    setTimeout(async () => {
        try {
            await fs.unlink(filepath);
            console.log(`Cleaned up temporary file: ${filepath}`);
        } catch (error) {
            console.error(`Failed to clean up temporary file ${filepath}:`, error);
        }
    }, maxAge);
    
    return filepath;
}

export async function checkExecutable(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

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
                require('child_process').execSync(`chmod +x "${localFfmpegPath}"`, { stdio: 'ignore' });
                fsSync.accessSync(localFfmpegPath, fsSync.constants.X_OK);
                console.log('Fixed permissions for local FFmpeg binary');
                return localFfmpegPath;
            } catch {
                console.log('Could not fix FFmpeg permissions');
            }
        }

        // Third try: Use system FFmpeg
        try {
            require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
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

/**
 * Validate a video file before processing
 */
export async function validateVideoFile(filePath: string): Promise<boolean> {
    try {
        // Check if file exists and is readable
        await fs.access(filePath, fs.constants.R_OK);
        
        // Check file size
        const stats = await fs.stat(filePath);
        if (stats.size === 0) {
            throw new Error('File is empty');
        }
        if (stats.size > FILE_SIZE.MAX_FILE_SIZE) {
            throw new Error(`File size ${stats.size} exceeds maximum allowed size ${FILE_SIZE.MAX_FILE_SIZE}`);
        }

        // Basic header check for common video formats
        const buffer = Buffer.alloc(12);
        const fileHandle = await fs.open(filePath, 'r');
        try {
            await fileHandle.read(buffer, 0, 12, 0);
            
            // Check for common video format signatures
            const signatures = {
                mp4: ['ftyp', 'moov'],
                webm: [0x1A, 0x45, 0xDF, 0xA3],
                avi: ['RIFF'],
                mov: ['ftyp', 'moov', 'mdat']
            };

            const header = buffer.toString('hex');
            const isValidFormat = Object.values(signatures).some(sig => 
                sig.some(marker => 
                    typeof marker === 'string' 
                        ? header.includes(Buffer.from(marker).toString('hex'))
                        : buffer.includes(marker)
                )
            );

            if (!isValidFormat) {
                throw new Error('Unsupported or invalid video format');
            }

            return true;
        } finally {
            await fileHandle.close();
        }
    } catch (error) {
        console.error(`Video file validation failed for ${filePath}:`, error);
        return false;
    }
}
  