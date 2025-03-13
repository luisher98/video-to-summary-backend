import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider } from '../../interfaces/storage-provider.interface.js';
import { StorageError, StorageErrorCode } from '@/utils/errors/index.js';
import { StorageFile, UploadUrlResult, AzureStorageConfiguration, ServicePrincipalCredentials, UploadConfiguration } from '../../interfaces/storage-file.interface.js';
import { AuthStrategy } from '../../interfaces/auth-strategy.interface.js';
import { AzureServicePrincipalAuthStrategy } from './auth-strategy/service-principal-auth.js';
import { AzureConnectionStringAuthStrategy } from './auth-strategy/connection-string-auth.js';

export class AzureBlobStorageProvider implements StorageProvider {
    private blobServiceClient: BlobServiceClient | null = null;
    private containerClient: ContainerClient | null = null;
    private authStrategy: AuthStrategy;

    constructor(private config: AzureStorageConfiguration) {
        this.authStrategy = this.createAuthStrategy(config.auth);
    }

    private createAuthStrategy(auth: AzureStorageConfiguration['auth']): AuthStrategy {
        switch (auth.type) {
            case 'servicePrincipal':
                return new AzureServicePrincipalAuthStrategy(auth.config as ServicePrincipalCredentials);
            case 'connectionString':
                return new AzureConnectionStringAuthStrategy(auth.config as string);
            default:
                throw new Error(`Unsupported auth type: ${auth.type}`);
        }
    }

    async initialize(): Promise<void> {
        try {
            console.log('Initializing Azure Storage Provider with config:', {
                authType: this.config.auth.type,
                containerName: this.config.containerName
            });

            await this.authStrategy.initialize();
            
            const accountName = this.getAccountName();
            this.blobServiceClient = await this.authStrategy.getClient(accountName);
            if (!this.blobServiceClient) {
                throw new StorageError('Failed to initialize blob service client', StorageErrorCode.INITIALIZATION_FAILED);
            }
            this.containerClient = this.blobServiceClient.getContainerClient(this.config.containerName);
            
            await this.ensureContainer();
            console.log('Azure Storage Provider initialization complete');
        } catch (error) {
            console.error('Azure Storage initialization failed:', error);
            throw this.handleError(error, 'Failed to initialize Azure Storage');
        }
    }

    private getAccountName(): string {
        if (this.config.auth.type === 'servicePrincipal') {
            return (this.config.auth.config as ServicePrincipalCredentials).accountName;
        }
        // For connection string, the account name is embedded in the string
        // and handled by the ConnectionStringAuth class
        return '';
    }

    private async ensureContainer(): Promise<void> {
        if (!this.containerClient) {
            throw new Error('Container client not initialized');
        }
        console.log('Checking if container exists...');
        await this.containerClient.createIfNotExists();
        console.log('Container initialization complete');
    }

    async generateUploadUrl(fileName: string, options?: UploadConfiguration): Promise<UploadUrlResult> {
        this.validateInitialization();
        
        try {
            const blobName = fileName;
            const blobClient = this.getBlobClient(blobName);
            const { url, expiresAt } = await this.authStrategy.generateUploadUrl(blobClient);
            
            return this.createUploadResponse(url, blobName, blobName, expiresAt, options);
        } catch (error) {
            throw this.handleError(error, 'Failed to generate upload URL');
        }
    }

    private validateInitialization(): void {
        if (!this.containerClient) {
            throw new StorageError('Provider not initialized', StorageErrorCode.NOT_INITIALIZED);
        }
    }

    private getBlobClient(blobName: string): BlockBlobClient {
        return this.containerClient!.getBlockBlobClient(blobName);
    }

    private createUploadResponse(
        url: string,
        fileId: string,
        blobName: string,
        expiresAt: Date,
        options?: UploadConfiguration
    ): UploadUrlResult {
        return {
            url,
            fileId,
            blobName,
            expiresAt,
            maxSize: this.config.maxSizeBytes,
            metadata: options?.metadata
        };
    }

    async uploadFile(file: Buffer | Readable, fileName: string, fileSize?: number): Promise<string> {
        this.validateInitialization();

        try {
            const blockBlobClient = this.containerClient!.getBlockBlobClient(fileName);
            
            if (Buffer.isBuffer(file)) {
                await blockBlobClient.uploadData(file);
            } else {
                await blockBlobClient.uploadStream(file, undefined, undefined, {
                    blobHTTPHeaders: {
                        blobContentType: 'application/octet-stream'
                    }
                });
            }

            return blockBlobClient.url;
        } catch (error) {
            throw this.handleError(error, 'Failed to upload file');
        }
    }

    async downloadFile(blobName: string): Promise<Readable> {
        this.validateInitialization();

        try {
            const blobClient = this.containerClient!.getBlockBlobClient(blobName);
            const exists = await blobClient.exists();
            
            if (!exists) {
                throw new StorageError(
                    `File ${blobName} not found`,
                    StorageErrorCode.FILE_NOT_FOUND
                );
            }

            const downloadResponse = await blobClient.download(0);
            return downloadResponse.readableStreamBody as Readable;
        } catch (error) {
            if (error instanceof StorageError) throw error;
            throw this.handleError(error, 'Failed to download file');
        }
    }

    async deleteFile(blobName: string): Promise<void> {
        this.validateInitialization();

        try {
            const blobClient = this.containerClient!.getBlockBlobClient(blobName);
            await blobClient.delete();
        } catch (error) {
            throw this.handleError(error, 'Failed to delete file');
        }
    }

    async getFileInfo(blobName: string): Promise<StorageFile> {
        this.validateInitialization();

        try {
            const blobClient = this.containerClient!.getBlockBlobClient(blobName);
            const properties = await blobClient.getProperties();

            return {
                id: blobName.split('-')[0],
                name: blobName.split('-').slice(1).join('-'),
                size: properties.contentLength || 0,
                contentType: properties.contentType || 'application/octet-stream',
                url: blobClient.url,
                metadata: properties.metadata,
                createdAt: properties.createdOn || new Date(),
                expiresAt: properties.expiresOn
            };
        } catch (error) {
            throw this.handleError(error, 'Failed to get file info');
        }
    }

    async fileExists(blobName: string): Promise<boolean> {
        this.validateInitialization();

        try {
            const blobClient = this.containerClient!.getBlockBlobClient(blobName);
            return await blobClient.exists();
        } catch (error) {
            throw this.handleError(error, 'Failed to check file existence');
        }
    }

    async listFiles(prefix?: string): Promise<StorageFile[]> {
        this.validateInitialization();

        try {
            const files: StorageFile[] = [];
            const options = prefix ? { prefix } : undefined;
            
            for await (const blob of this.containerClient!.listBlobsFlat(options)) {
                const blobClient = this.containerClient!.getBlockBlobClient(blob.name);
                const properties = await blobClient.getProperties();
                
                files.push({
                    id: blob.name.split('-')[0],
                    name: blob.name.split('-').slice(1).join('-'),
                    size: properties.contentLength || 0,
                    contentType: properties.contentType || 'application/octet-stream',
                    url: blobClient.url,
                    metadata: properties.metadata,
                    createdAt: properties.createdOn || new Date(),
                    expiresAt: properties.expiresOn
                });
            }
            
            return files;
        } catch (error) {
            throw this.handleError(error, 'Failed to list files');
        }
    }

    private handleError(error: unknown, message: string): StorageError {
        if (error instanceof StorageError) return error;
        
        return new StorageError(
            message,
            this.determineErrorCode(error),
            error instanceof Error ? error : undefined
        );
    }

    private determineErrorCode(error: unknown): StorageErrorCode {
        if (error instanceof Error) {
            if (error.message.includes('not initialized')) {
                return StorageErrorCode.NOT_INITIALIZED;
            }
            if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
                return StorageErrorCode.UNAUTHORIZED;
            }
            if (error.message.includes('not found')) {
                return StorageErrorCode.FILE_NOT_FOUND;
            }
        }
        return StorageErrorCode.UNKNOWN;
    }
} 