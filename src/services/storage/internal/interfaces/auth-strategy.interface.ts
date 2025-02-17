import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';

export interface AuthStrategy {
    initialize(): Promise<void>;
    getClient(accountName: string): Promise<BlobServiceClient>;
    generateUploadUrl(blobClient: BlockBlobClient): Promise<{
        url: string;
        expiresAt: Date;
    }>;
} 