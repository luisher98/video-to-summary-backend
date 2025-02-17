import { 
    AzureStorageConfiguration 
} from '@/services/storage/StorageService.js';
import { FILE_SIZE } from '../utils/constants/fileSize.js';
import { TEMP_DIRS } from '../utils/constants/paths.js';

// Azure Storage Configuration
export const AZURE_STORAGE_CONFIG: AzureStorageConfiguration = {
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads',
    maxSizeBytes: FILE_SIZE.MAX_FILE_SIZE,
    allowedFileTypes: ['video/mp4', 'video/webm', 'video/quicktime'] as const,
    tempDirectory: TEMP_DIRS.uploads,
    retryOptions: {
        maxRetries: 3,
        delayMs: 1000
    },
    auth: {
        type: 'servicePrincipal',
        config: {
            tenantId: process.env.AZURE_TENANT_ID!,
            clientId: process.env.AZURE_CLIENT_ID!,
            clientSecret: process.env.AZURE_CLIENT_SECRET!,
            accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME!
        }
    }
};