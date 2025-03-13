import fs from 'fs/promises';
import path from 'path';
import { Paths } from '@/config/paths.js';

/**
 * Initializes all temporary directories needed by the application
 */
export async function initializeTempDirs(): Promise<void> {
    const tempDirs = [
        Paths.TEMP.ROOT,
        Paths.TEMP.UPLOADS,
        Paths.TEMP.AUDIOS,
        Paths.TEMP.TRANSCRIPTS,
        Paths.TEMP.COOKIES,
        Paths.TEMP.SESSIONS
    ];

    for (const dir of tempDirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`Created temp directory: ${dir}`);
        } catch (error) {
            console.error(`Failed to create temp directory ${dir}:`, error);
            throw error;
        }
    }
}

/**
 * Clears all temporary directories
 * @param maxAge Maximum age of files to keep in milliseconds. If 0, deletes all files.
 */
export async function clearAllTempDirs(maxAge: number = 0): Promise<void> {
    const tempDirs = [
        Paths.TEMP.UPLOADS,
        Paths.TEMP.AUDIOS,
        Paths.TEMP.TRANSCRIPTS,
        Paths.TEMP.COOKIES,
        Paths.TEMP.SESSIONS
    ];

    const now = Date.now();

    for (const dir of tempDirs) {
        try {
            const files = await fs.readdir(dir);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = await fs.stat(filePath);

                if (maxAge === 0 || now - stats.mtimeMs > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Deleted temp file: ${filePath}`);
                }
            }
        } catch (error) {
            console.error(`Failed to clear temp directory ${dir}:`, error);
            // Continue with other directories even if one fails
        }
    }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(directory: string): Promise<void> {
    try {
        await fs.access(directory, fs.constants.F_OK);
    } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(directory, { recursive: true });
        console.log(`Created directory: ${directory}`);
    }
}

/**
 * Create a temporary file with automatic cleanup
 */
export async function createTempFile(
    content: string | Buffer,
    extension: string,
    directory: string = Paths.TEMP.ROOT,
    maxAge: number = 3600000 // 1 hour default
): Promise<string> {
    await ensureDir(directory);
    
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