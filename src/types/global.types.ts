/**
 * Progress update for long-running operations
 */
export interface ProgressUpdate {
    /** Current status of the operation */
    status: 'uploading' | 'processing' | 'done' | 'error';
    /** Progress message or result */
    message?: string;
    error?: string;
    progress: number; // Percentage of completion (0-100)
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
