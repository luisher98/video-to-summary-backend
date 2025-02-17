/**
 * File-related types for storage operations
 */

export interface StorageFile {
    id: string;
    name: string;
    size: number;
    contentType: string;
    url: string;
    metadata?: Record<string, string>;
    createdAt: Date;
    expiresAt?: Date;
}

export interface UploadUrlResult {
    url: string;
    fileId: string;
    blobName: string;
    expiresAt: Date;
    maxSize: number;
    metadata?: Record<string, string>;
}

export interface ServicePrincipalCredentials {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    accountName: string;
}

export interface AzureStorageConfiguration {
    containerName: string;
    maxSizeBytes: number;
    allowedFileTypes: readonly string[];
    tempDirectory: string;
    retryOptions?: {
        maxRetries: number;
        delayMs: number;
    };
    auth: {
        type: 'servicePrincipal' | 'connectionString';
        config: ServicePrincipalCredentials | string;
    };
}

export interface UploadConfiguration {
    metadata?: Record<string, string>;
} 