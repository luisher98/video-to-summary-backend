import fs from 'fs/promises';
import { FILE_SIZE } from '../constants/fileSize.js';

/**
 * Check if a file is executable
 */
export async function checkExecutable(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath, fs.constants.X_OK);
        return true;
    } catch {
        return false;
    }
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