/**
 * Progress update for long-running operations
 */
export interface ProgressUpdate {
    /** Current status of the operation */
    status: 'pending' | 'done' | 'error';
    /** Progress message or result */
    message: string;
    error?: string;
}

/**
 * Configuration for video processing operations
 */
export interface VideoProcessingConfig {
    /** Maximum concurrent downloads */
    maxConcurrentDownloads: number;
    /** Temporary file directory */
    tempDir: string;
    /** Output file format */
    outputFormat: 'mp3' | 'wav';
}
