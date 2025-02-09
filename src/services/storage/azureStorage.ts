import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { DefaultAzureCredential, EnvironmentCredential } from '@azure/identity';
import { Readable, PassThrough } from 'stream';
import { InternalServerError } from '../../utils/errorHandling.js';
import crypto from 'crypto';
import { config } from '../../config/environment.js';

// Configuration constants
const CONFIG = {
    maxLocalFileSizeMB: Number(process.env.MAX_LOCAL_FILESIZE_MB) || 100,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'video-uploads',
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    maxBlockSize: 8 * 1024 * 1024, // 8MB per block (optimal for most networks)
    maxBlocks: 50000, // Maximum number of blocks allowed by Azure
    maxConcurrentUploads: 4, // Number of concurrent block uploads
} as const;

// Type declarations for external use
export type { Readable };
export interface AzureStorageProgress {
    (progress: number): void;
}

let containerClient: ContainerClient | null = null;

/**
 * Initializes the Azure Blob Storage container client
 */
async function initializeStorage(): Promise<ContainerClient> {
  if (!containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      config.azure.connectionString
    );
    containerClient = blobServiceClient.getContainerClient(
      config.azure.containerName
    );

    // Create container if it doesn't exist
    await containerClient.createIfNotExists({
      access: 'blob'
    });
  }
  return containerClient;
}

/**
 * Gets a blob client for the specified blob name
 * 
 * @param {string} blobName - Name of the blob
 * @returns {Promise<BlockBlobClient>} Blob client for the specified blob
 */
export async function getBlobClient(blobName: string): Promise<BlockBlobClient> {
  const container = await initializeStorage();
  return container.getBlockBlobClient(blobName);
}

/**
 * Deletes a blob if it exists
 * 
 * @param {string} blobName - Name of the blob to delete
 * @returns {Promise<boolean>} True if blob was deleted, false if it didn't exist
 */
export async function deleteBlob(blobName: string): Promise<boolean> {
  try {
    const container = await initializeStorage();
    const blobClient = container.getBlockBlobClient(blobName);
    const exists = await blobClient.exists();
    
    if (exists) {
      await blobClient.delete();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete blob:', error);
    throw new InternalServerError('Failed to delete blob from storage');
  }
}

/**
 * Azure Blob Storage service for handling large file uploads
 */
export class AzureStorageService {
    private blobServiceClient: BlobServiceClient;
    private static instance: AzureStorageService;

    private constructor() {
        if (!CONFIG.accountName) {
            throw new Error('Azure Storage account name not configured');
        }

        const blobServiceUrl = `https://${CONFIG.accountName}.blob.core.windows.net`;
        
        try {
            // In production (Azure), this will use Managed Identity
            // In development, it will use environment credentials
            const credential = new DefaultAzureCredential();
            this.blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
        } catch (error) {
            console.error('Failed to initialize Azure Storage:', error);
            throw new InternalServerError('Failed to initialize storage service');
        }
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AzureStorageService {
        if (!AzureStorageService.instance) {
            AzureStorageService.instance = new AzureStorageService();
        }
        return AzureStorageService.instance;
    }

    /**
     * Initialize the storage container
     */
    async initialize(): Promise<void> {
        try {
            await containerClient.createIfNotExists();
        } catch (error) {
            console.error('Failed to initialize Azure storage:', error);
            throw new InternalServerError('Failed to initialize storage');
        }
    }

    /**
     * Generate a unique block ID
     */
    private generateBlockId(index: number): string {
        // Base64 encode a string that combines the index with a random value
        return Buffer.from(`${index}-${crypto.randomBytes(16).toString('hex')}`).toString('base64');
    }

    /**
     * Upload blocks concurrently
     */
    private async uploadBlocksConcurrently(
        blocks: { id: string; buffer: Buffer }[],
        blockBlobClient: BlockBlobClient,
        totalSize: number,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        let uploadedBytes = 0;
        const concurrentUploads = CONFIG.maxConcurrentUploads;
        
        // Process blocks in batches
        for (let i = 0; i < blocks.length; i += concurrentUploads) {
            const batch = blocks.slice(i, i + concurrentUploads);
            const uploadStartTime = Date.now();
            
            // Upload batch concurrently
            await Promise.all(batch.map(async (block, index) => {
                const blockNum = i + index + 1;
                let retries = 3;
                
                while (retries > 0) {
                    try {
                        const start = Date.now();
                        await blockBlobClient.stageBlock(block.id, block.buffer, block.buffer.length);
                        const uploadTime = Date.now() - start;
                        uploadedBytes += block.buffer.length;
                        
                        const speed = (block.buffer.length / 1024 / 1024) / (uploadTime / 1000); // MB/s
                        console.log(`Block ${blockNum}/${blocks.length} upload stats:
                            - Upload time: ${uploadTime}ms
                            - Speed: ${speed.toFixed(2)} MB/s
                            - Size: ${(block.buffer.length / 1024 / 1024).toFixed(2)} MB`);

                        if (onProgress) {
                            const progress = (uploadedBytes / totalSize) * 100;
                            onProgress(progress);
                        }
                        break;
                    } catch (error) {
                        retries--;
                        if (retries === 0) throw error;
                        console.log(`Retrying block ${blockNum}, ${retries} attempts remaining`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }));
            
            const batchUploadTime = Date.now() - uploadStartTime;
            const currentBatchSize = batch.reduce((sum, block) => sum + block.buffer.length, 0);
            const batchSpeed = (currentBatchSize / 1024 / 1024) / (batchUploadTime / 1000);
            console.log(`Batch ${Math.ceil((i + 1) / concurrentUploads)}/${Math.ceil(blocks.length / concurrentUploads)} complete:
                - Time: ${batchUploadTime}ms
                - Speed: ${batchSpeed.toFixed(2)} MB/s`);
        }
    }

    /**
     * Upload a large file to Azure Blob Storage using blocks
     */
    public async uploadLargeFile(
        containerName: string,
        blobName: string,
        fileStream: Readable,
        fileSize: number,
        onProgress?: (progress: number) => void
    ): Promise<string> {
        const startTime = Date.now();
        const maxBlockSize = 8 * 1024 * 1024; // 8MB blocks for optimal network performance
        const blockCount = Math.ceil(fileSize / maxBlockSize);
        
        console.log(`Starting large file upload:
            - File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
            - Block size: ${(maxBlockSize / 1024 / 1024).toFixed(2)} MB
            - Number of blocks: ${blockCount}`);

        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const blocks: { id: string; buffer: Buffer }[] = [];

        // Read file in blocks
        let blockNum = 0;
        let totalReadTime = 0;

        while (true) {
            const readStart = Date.now();
            const chunk = fileStream.read(maxBlockSize);
            if (chunk === null) break;

            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            const bytesRead = buffer.length;
            const readTime = Date.now() - readStart;
            totalReadTime += readTime;
            blockNum++;

            const blockId = Buffer.from(`block-${String(blockNum).padStart(8, '0')}`).toString('base64');
            blocks.push({
                id: blockId,
                buffer
            });

            const readSpeed = (bytesRead / 1024 / 1024) / (readTime / 1000);
            console.log(`Block ${blockNum} read:
                - Size: ${(bytesRead / 1024 / 1024).toFixed(2)} MB
                - Time: ${readTime}ms
                - Speed: ${readSpeed.toFixed(2)} MB/s`);
        }

        // Upload blocks concurrently
        console.log('\nUploading blocks concurrently...');
        await this.uploadBlocksConcurrently(blocks, blockBlobClient, fileSize, onProgress);

        console.log('\nAll blocks uploaded, committing block list');
        await blockBlobClient.commitBlockList(blocks.map(b => b.id));

        const totalTime = Date.now() - startTime;
        const averageSpeed = (fileSize / 1024 / 1024) / (totalTime / 1000);
        console.log(`\nUpload complete:
            - Total size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
            - Total time: ${totalTime}ms
            - Average speed: ${averageSpeed.toFixed(2)} MB/s
            - Read time: ${totalReadTime}ms (${((totalReadTime / totalTime) * 100).toFixed(1)}% of total)`);

        return blockBlobClient.url;
    }

    /**
     * Upload a file to Azure Blob Storage with progress tracking
     */
    async uploadFile(fileBuffer: Buffer | Readable, fileName: string, fileSize?: number, onProgress?: (progress: number) => void): Promise<string> {
        try {
            console.log('Starting file upload:', { fileName, fileSize, isBuffer: Buffer.isBuffer(fileBuffer) });
            const blockBlobClient = this.blobServiceClient.getContainerClient(CONFIG.containerName).getBlockBlobClient(fileName);
            
            if (Buffer.isBuffer(fileBuffer)) {
                console.log('Converting buffer to stream');
                // Create a Readable stream from the buffer for large files
                const stream = Readable.from(fileBuffer);
                await this.uploadLargeFile(CONFIG.containerName, fileName, stream, fileBuffer.length, onProgress);
            } else {
                if (!fileSize) {
                    throw new Error('File size is required for stream upload');
                }
                console.log('Processing stream upload');
                await this.uploadLargeFile(CONFIG.containerName, fileName, fileBuffer as Readable, fileSize, onProgress);
            }

            console.log('Upload completed successfully');
            return blockBlobClient.url;
        } catch (error) {
            console.error('Failed to upload file to Azure:', error);
            throw new InternalServerError('Failed to upload file');
        }
    }

    /**
     * Download a file from Azure Blob Storage
     * @param blobName - The name of the blob to download
     * @returns A readable stream of the file
     */
    async downloadFile(blobName: string): Promise<Readable> {
        try {
            const blockBlobClient = this.blobServiceClient.getContainerClient(CONFIG.containerName).getBlockBlobClient(blobName);
            const downloadResponse = await blockBlobClient.download(0);
            
            if (!downloadResponse.readableStreamBody) {
                throw new Error('No readable stream available');
            }

            const passThrough = new PassThrough();
            
            // Handle the stream properly
            downloadResponse.readableStreamBody.pipe(passThrough);
            
            downloadResponse.readableStreamBody.on('error', (error) => {
                passThrough.emit('error', error);
            });

            return passThrough;
        } catch (error) {
            console.error('Failed to download file from Azure:', error);
            throw new InternalServerError('Failed to download file');
        }
    }

    /**
     * Check if a file exists in Azure Blob Storage
     * @param blobName - The name of the blob to check
     * @returns Whether the blob exists
     */
    async fileExists(blobName: string): Promise<boolean> {
        try {
            const blockBlobClient = this.blobServiceClient.getContainerClient(CONFIG.containerName).getBlockBlobClient(blobName);
            return await blockBlobClient.exists();
        } catch (error) {
            console.error('Failed to check file existence in Azure:', error);
            throw new InternalServerError('Failed to check file existence');
        }
    }

    /**
     * Check if a file should be stored in Azure based on its size
     * @param sizeInBytes - The size of the file in bytes
     * @returns Whether the file should be stored in Azure
     */
    static shouldUseAzureStorage(sizeInBytes: number): boolean {
        return sizeInBytes > CONFIG.maxLocalFileSizeMB * 1024 * 1024;
    }
}

// Export singleton instance
export const azureStorage = AzureStorageService.getInstance(); 
