import fs from 'fs/promises';
import glob from 'glob';
import path from 'path';
import { TEMP_DIRS } from '../constants/paths.js';

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