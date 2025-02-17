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

export interface UploadUrlResponse {
    url: string;
    fileId: string;
    blobName: string;
    expiresAt: Date;
    maxSize: number;
    metadata?: Record<string, string>;
} 