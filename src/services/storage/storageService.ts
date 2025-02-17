import { Readable } from 'stream';
import { StorageProvider } from './internal/interfaces/storage-provider.interface.js';
import { StorageProviderFactory } from './internal/providers/storage-provider.js';
import { StorageFile, UploadUrlResult, AzureStorageConfiguration } from './internal/interfaces/storage-file.interface.js';
import { StorageError, StorageErrorCode } from './internal/errors/storage.error.js';

/**
 * Progress callback for storage operations
 */
export type StorageProgress = (progress: number) => void;

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

export class StorageServiceImpl implements StorageProvider {
    private provider: StorageProvider | null = null;

    constructor(private readonly config: AzureStorageConfiguration) {}

    async initialize(): Promise<void> {
        this.provider = await StorageProviderFactory.createAzureProvider(this.config);
        if (!this.provider) {
            throw new StorageError('Failed to create storage provider', StorageErrorCode.INITIALIZATION_FAILED);
        }
        await this.provider.initialize();
    }

    async generateUploadUrl(fileName: string, options?: { metadata?: Record<string, string> }): Promise<UploadUrlResult> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.generateUploadUrl(fileName, options);
    }

    async uploadFile(file: Buffer | Readable, fileName: string, fileSize?: number): Promise<string> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.uploadFile(file, fileName, fileSize);
    }

    async downloadFile(blobName: string): Promise<Readable> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.downloadFile(blobName);
    }

    async deleteFile(blobName: string): Promise<void> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.deleteFile(blobName);
    }

    async getFileInfo(blobName: string): Promise<StorageFile> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.getFileInfo(blobName);
    }

    async fileExists(blobName: string): Promise<boolean> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.fileExists(blobName);
    }

    async listFiles(prefix?: string): Promise<StorageFile[]> {
        if (!this.provider) throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        return this.provider.listFiles(prefix);
    }
}

// Factory function to create storage service
export function createStorageService(config: AzureStorageConfiguration): StorageProvider {
    return new StorageServiceImpl(config);
}

// Export types and errors for external use
export type { StorageProvider, StorageFile, UploadUrlResult, AzureStorageConfiguration };
export { StorageError, StorageErrorCode }; 