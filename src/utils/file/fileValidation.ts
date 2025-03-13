import fs from 'fs/promises';
import { FILE_SIZE } from '@/config/fileSize.js';

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
 * Validate a video file or buffer before processing
 */
export async function validateVideoFile(input: string | Buffer): Promise<boolean> {
    try {
        let buffer: Buffer;
        let fileSize: number;

        if (Buffer.isBuffer(input)) {
            buffer = input.slice(0, 12);
            fileSize = input.length;
        } else {
            // Check if file exists and is readable
            await fs.access(input, fs.constants.R_OK);
            
            // Check file size
            const stats = await fs.stat(input);
            fileSize = stats.size;

            // Read file header
            buffer = Buffer.alloc(12);
            const fileHandle = await fs.open(input, 'r');
            try {
                await fileHandle.read(buffer, 0, 12, 0);
            } finally {
                await fileHandle.close();
            }
        }

        // Size validation
        if (fileSize === 0) {
            throw new Error('File is empty');
        }
        if (fileSize > FILE_SIZE.MAX_FILE_SIZE) {
            throw new Error(`File size ${fileSize} exceeds maximum allowed size ${FILE_SIZE.MAX_FILE_SIZE}`);
        }

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
    } catch (error) {
        console.error('Video file validation failed:', error);
        return false;
    }
} 