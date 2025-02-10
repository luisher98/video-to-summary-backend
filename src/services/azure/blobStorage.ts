import { BlobServiceClient, ContainerClient, BlockBlobClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME } from "../../config/azure.js";

let containerClient: ContainerClient | null = null;

/**
 * Gets or creates the Azure Blob Storage container client
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
 * Gets a blob client for the specified blob name
 * @param blobName The name of the blob
 * @returns BlockBlobClient for the specified blob
 */
export function getBlobClient(blobName: string): BlockBlobClient {
    const container = getContainerClient();
    return container.getBlockBlobClient(blobName);
} 