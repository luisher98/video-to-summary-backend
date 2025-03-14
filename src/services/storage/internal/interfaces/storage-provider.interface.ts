import { Readable } from 'stream';
import { StorageFile, UploadUrlResult } from './storage-file.interface.js';

export interface StorageProvider {
    initialize(): Promise<void>;
    generateUploadUrl(fileName: string, options?: { metadata?: Record<string, string> }): Promise<UploadUrlResult>;
    uploadFile(
        file: Buffer | Readable,
        fileName: string,
        fileSize?: number,
        options?: { onProgress?: (progress: number) => void }
    ): Promise<string>;
    downloadFile(blobName: string): Promise<Readable>;
    deleteFile(blobName: string): Promise<void>;
    getFileInfo(blobName: string): Promise<StorageFile>;
    fileExists(blobName: string): Promise<boolean>;
    listFiles(prefix?: string): Promise<StorageFile[]>;
} 