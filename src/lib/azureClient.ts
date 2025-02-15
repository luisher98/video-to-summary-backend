import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

// Configuration constants
const CONFIG = {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'video-uploads',
} as const;

let blobServiceClient: BlobServiceClient | null = null;

/**
 * Gets or creates the Azure Blob Service client.
 * Uses Azure Managed Identity in production and environment credentials in development.
 */
export function getAzureClient(): BlobServiceClient {
    if (!blobServiceClient) {
        if (!CONFIG.accountName) {
            throw new Error('Azure Storage account name not configured');
        }

        const blobServiceUrl = `https://${CONFIG.accountName}.blob.core.windows.net`;
        const credential = new DefaultAzureCredential();
        blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
    }
    return blobServiceClient;
}

export { CONFIG as AZURE_CONFIG }; 