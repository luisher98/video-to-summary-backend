
import { AzureStorageConfiguration } from '@/services/storage/internal/interfaces/storage-file.interface.js';
import { FILE_SIZE } from './fileSize.js';
import { TempPaths } from './paths.js';

// Azure Storage Configuration
export const AZURE_STORAGE_CONFIG: AzureStorageConfiguration = {
    auth: {
        type: 'servicePrincipal',
        config: {
            tenantId: process.env.AZURE_TENANT_ID!,
            clientId: process.env.AZURE_CLIENT_ID!,
            clientSecret: process.env.AZURE_CLIENT_SECRET!,
            accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME!
        }
    },
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads',
    maxSizeBytes: FILE_SIZE.MAX_FILE_SIZE,
    allowedFileTypes: ['video/mp4', 'video/webm', 'video/quicktime'] as const,
    tempDirectory: TempPaths.UPLOADS,
    retryOptions: {
        maxRetries: 3,
        delayMs: 1000
    }
};