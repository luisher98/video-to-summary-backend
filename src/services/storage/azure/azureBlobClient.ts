import { BlobServiceClient, ContainerClient, BlockBlobClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME } from "../../../config/azure.js";

let containerClient: ContainerClient | null = null;

/**
 * Simple Azure Blob Storage client for basic blob operations.
 * This is a lightweight client that only provides basic blob access functionality,
 * primarily used for reading existing blobs. For full storage operations 
 * (uploads, downloads, management), use AzureStorageService instead.
 * 
 * Key differences from AzureStorageService:
 * - No state management (uses module-level singleton)
 * - No progress tracking
 * - No concurrent upload handling
 * - No cleanup operations
 * - No CORS setup
 * - Just basic blob access
 */

/**
 * Gets or creates the Azure Blob Storage container client.
 * Uses Azure Managed Identity in production and environment credentials in development.
 * @private
 */
function getContainerClient(): ContainerClient {
    if (!containerClient) {
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
            `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
            credential
        );
        containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    }
    return containerClient;
}

/**
 * Gets a blob client for accessing an existing blob.
 * This is a lightweight operation that doesn't perform any network calls.
 * 
 * @param blobName - The name of the blob to access
 * @returns BlockBlobClient for the specified blob
 * 
 * @example
 * ```typescript
 * const blobClient = getBlobClient('video123.mp4');
 * const properties = await blobClient.getProperties();
 * const downloadResponse = await blobClient.download();
 * ```
 */
export function getBlobClient(blobName: string): BlockBlobClient {
    const container = getContainerClient();
    return container.getBlockBlobClient(blobName);
} 