import path from 'path';

/**
 * Temporary directory configuration used throughout the application
 */
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