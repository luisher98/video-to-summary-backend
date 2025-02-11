import { BlobServiceClient, ContainerClient, BlockBlobClient, BlobSASPermissions, generateBlobSASQueryParameters, SASProtocol } from '@azure/storage-blob';
import { Readable, PassThrough } from 'stream';
import { InternalServerError } from '../../../utils/errorHandling.js';
import { StorageService, StorageProgress } from '../storageService.js';
import { getAzureClient, AZURE_CONFIG } from '../../../lib/azureClient.js';

// Configuration constants
const CONFIG = {
    maxLocalFileSizeMB: Number(process.env.MAX_LOCAL_FILESIZE_MB) || 100,
    containerName: AZURE_CONFIG.containerName,
    accountName: AZURE_CONFIG.accountName,
    maxBlockSize: 8 * 1024 * 1024, // 8MB per block (optimal for most networks)
    maxBlocks: 50000, // Maximum number of blocks allowed by Azure
    maxConcurrentUploads: 4, // Number of concurrent block uploads
} as const;

/**
 * Comprehensive Azure Blob Storage service implementation.
 * Handles large file uploads with concurrent blocks, progress tracking,
 * and cleanup operations.
 */
export class AzureStorageService implements StorageService {
    private blobServiceClient: BlobServiceClient;
    private containerClient: ContainerClient;
    private static instance: AzureStorageService;

    public static shouldUseAzureStorage(fileSize?: number): boolean {
        // If Azure Storage is not configured, don't use it
        if (!CONFIG.accountName) {
            return false;
        }
        
        // If file size is provided, only use Azure for files larger than the local file size limit
        if (fileSize !== undefined) {
            const fileSizeMB = fileSize / (1024 * 1024);
            return fileSizeMB > CONFIG.maxLocalFileSizeMB;
        }
        
        // If no file size provided, use Azure if it's configured
        return true;
    }

    private constructor() {
        try {
            const blobServiceClient = getAzureClient();
            this.blobServiceClient = blobServiceClient;
            this.containerClient = blobServiceClient.getContainerClient(CONFIG.containerName);
            console.log('Using DefaultAzureCredential for Azure Storage');
            
            // Silently try to set up CORS
            void this.setupCors();
        } catch (error) {
            console.error('Failed to initialize Azure Storage:', error);
            throw new InternalServerError('Failed to initialize storage service');
        }
    }

    public static getInstance(): AzureStorageService {
        if (!AzureStorageService.instance) {
            AzureStorageService.instance = new AzureStorageService();
        }
        return AzureStorageService.instance;
    }

    private async setupCors(): Promise<void> {
        try {
            await this.blobServiceClient.setProperties({
                cors: [{
                    allowedHeaders: '*',
                    allowedMethods: 'OPTIONS,GET,HEAD,POST,PUT',
                    allowedOrigins: '*',
                    exposedHeaders: '*',
                    maxAgeInSeconds: 86400,
                }]
            });
        } catch (error) {
            // Silently handle CORS setup errors in development
            if (process.env.NODE_ENV === 'development') {
                console.debug('Note: CORS setup skipped - requires Storage Blob Data Owner role');
            }
        }
    }

    /**
     * Upload a file to Azure Blob Storage with progress tracking
     */
    public async uploadFile(
        file: Buffer | Readable,
        fileName: string,
        fileSize?: number,
        onProgress?: StorageProgress
    ): Promise<string> {
        try {
            console.log('Starting file upload:', { fileName, fileSize, isBuffer: Buffer.isBuffer(file) });
            const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
            
            if (Buffer.isBuffer(file)) {
                console.log('Converting buffer to stream');
                const stream = Readable.from(file);
                await this.uploadLargeFile(fileName, stream, file.length, onProgress);
            } else {
                if (!fileSize) {
                    throw new Error('File size is required for stream upload');
                }
                console.log('Processing stream upload');
                await this.uploadLargeFile(fileName, file as Readable, fileSize, onProgress);
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
     */
    public async downloadFile(fileName: string): Promise<Readable> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
            const downloadResponse = await blockBlobClient.download(0);
            
            if (!downloadResponse.readableStreamBody) {
                throw new Error('No readable stream available');
            }

            const passThrough = new PassThrough();
            
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
     * Delete a file from Azure Blob Storage
     */
    public async deleteFile(fileName: string): Promise<void> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
            await blockBlobClient.delete();
        } catch (error) {
            console.error('Failed to delete file from Azure:', error);
            throw new InternalServerError('Failed to delete file');
        }
    }

    /**
     * Check if a file exists in Azure Blob Storage
     */
    public async fileExists(fileName: string): Promise<boolean> {
        try {
            const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
            return await blockBlobClient.exists();
        } catch (error) {
            console.error('Failed to check file existence in Azure:', error);
            throw new InternalServerError('Failed to check file existence');
        }
    }

    /**
     * Generate a SAS (Shared Access Signature) URL for uploading a blob.
     * 
     * A SAS URL is a secure way to provide limited access to Azure Storage resources
     * without sharing the storage account keys. The URL contains:
     * - A token with encoded permissions (read, write, delete, etc.)
     * - Time restrictions (when the URL expires)
     * - Allowed operations (in this case, upload permissions)
     * - The specific resource that can be accessed
     * 
     * This is useful for:
     * - Allowing direct uploads to Azure Storage from the client
     * - Providing temporary access to specific blobs
     * - Maintaining security without exposing storage account credentials
     * 
     * @param fileName - Name of the blob to generate URL for
     * @param expiryMinutes - How long the URL should remain valid (default: 30 minutes)
     * @returns A temporary URL that can be used to upload the file
     * 
     * @example
     * ```typescript
     * // Generate a URL that's valid for 1 hour
     * const uploadUrl = await storage.generateUploadUrl('video.mp4', 60);
     * 
     * // The client can then use this URL to upload directly to Azure
     * await fetch(uploadUrl, {
     *   method: 'PUT',
     *   body: fileContent,
     *   headers: { 'x-ms-blob-type': 'BlockBlob' }
     * });
     * ```
     */
    public async generateUploadUrl(fileName: string, expiryMinutes = 30): Promise<string> {
        try {
            if (!CONFIG.accountName) {
                throw new Error('Azure Storage account name not configured');
            }

            const startsOn = new Date();
            const expiresOn = new Date(startsOn);
            expiresOn.setMinutes(startsOn.getMinutes() + expiryMinutes);

            const userDelegationKey = await this.blobServiceClient.getUserDelegationKey(startsOn, expiresOn);
            const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
            
            const sasOptions = {
                containerName: CONFIG.containerName,
                blobName: fileName,
                permissions: BlobSASPermissions.parse("racw"),
                startsOn: startsOn,
                expiresOn: expiresOn,
                protocol: SASProtocol.Https
            };

            const sasToken = generateBlobSASQueryParameters(
                sasOptions,
                userDelegationKey,
                CONFIG.accountName
            ).toString();

            return `${blockBlobClient.url}?${sasToken}`;
        } catch (error) {
            console.error('Error generating upload URL:', error);
            throw new InternalServerError('Failed to generate upload URL');
        }
    }

    /**
     * Upload a large file using concurrent block uploads
     */
    private async uploadLargeFile(
        blobName: string,
        fileStream: Readable,
        fileSize: number,
        onProgress?: StorageProgress
    ): Promise<void> {
        const startTime = Date.now();
        const maxBlockSize = CONFIG.maxBlockSize;
        const blockCount = Math.ceil(fileSize / maxBlockSize);
        
        console.log(`Starting large file upload:
            - File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
            - Block size: ${(maxBlockSize / 1024 / 1024).toFixed(2)} MB
            - Number of blocks: ${blockCount}`);

        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        const blocks: { id: string; buffer: Buffer }[] = [];

        // Read file in blocks
        let blockNum = 0;
        let totalReadTime = 0;
        let uploadedBytes = 0;

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
            blocks.push({ id: blockId, buffer });

            const readSpeed = (bytesRead / 1024 / 1024) / (readTime / 1000);
            console.log(`Block ${blockNum} read:
                - Size: ${(bytesRead / 1024 / 1024).toFixed(2)} MB
                - Time: ${readTime}ms
                - Speed: ${readSpeed.toFixed(2)} MB/s`);
        }

        // Upload blocks concurrently
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
                        
                        if (onProgress) {
                            const progress = (uploadedBytes / fileSize) * 100;
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
        }

        // Commit all blocks
        await blockBlobClient.commitBlockList(blocks.map(b => b.id));
    }
}

// Export singleton instance
export const azureStorage = AzureStorageService.getInstance(); 