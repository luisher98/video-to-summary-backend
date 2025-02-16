/**
 * Global type definitions
 */

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
