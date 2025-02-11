import { Readable } from 'stream';

/**
 * Progress callback for storage operations
 */
export interface StorageProgress {
    (progress: number): void;
}

/**
 * Base interface for storage service implementations.
 * This allows for different storage providers (Azure, Local, S3, etc.)
 * while maintaining a consistent interface.
 */
export interface StorageService {
    /**
     * Upload a file to storage
     * @param file - The file to upload (buffer or stream)
     * @param fileName - Name to store the file as
     * @param fileSize - Size of the file in bytes
     * @param onProgress - Optional callback for upload progress
     */
    uploadFile(
        file: Buffer | Readable,
        fileName: string,
        fileSize?: number,
        onProgress?: StorageProgress
    ): Promise<string>;

    /**
     * Download a file from storage
     * @param fileName - Name of the file to download
     */
    downloadFile(fileName: string): Promise<Readable>;

    /**
     * Delete a file from storage
     * @param fileName - Name of the file to delete
     */
    deleteFile(fileName: string): Promise<void>;

    /**
     * Check if a file exists in storage
     * @param fileName - Name of the file to check
     */
    fileExists(fileName: string): Promise<boolean>;

    /**
     * Generate a URL for direct upload to storage
     * @param fileName - Name of the file to be uploaded
     * @param expiryMinutes - How long the URL should be valid
     */
    generateUploadUrl?(fileName: string, expiryMinutes?: number): Promise<string>;
}

/**
 * Determines if a file should use cloud storage based on its size
 */
export function shouldUseCloudStorage(sizeInBytes: number): boolean {
    const maxLocalSize = Number(process.env.MAX_LOCAL_FILESIZE_MB || 100) * 1024 * 1024;
    return sizeInBytes > maxLocalSize;
} 