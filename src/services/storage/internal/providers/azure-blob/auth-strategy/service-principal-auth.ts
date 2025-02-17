import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { AuthStrategy } from '../../../interfaces/auth-strategy.interface.js';
import { ServicePrincipalCredentials } from '../types/azure-storage.types.js';

export class AzureServicePrincipalAuthStrategy implements AuthStrategy {
    private credential: DefaultAzureCredential | null = null;

    constructor(private config: ServicePrincipalCredentials) {}

    async initialize(): Promise<void> {
        try {
            this.credential = new DefaultAzureCredential();
        } catch (error) {
            console.error('Failed to initialize service principal credentials:', error);
            throw error;
        }
    }

    async getClient(accountName: string): Promise<BlobServiceClient> {
        if (!this.credential) {
            throw new Error('Service principal not initialized');
        }

        const url = `https://${accountName}.blob.core.windows.net`;
        return new BlobServiceClient(url, this.credential);
    }

    async generateUploadUrl(blobClient: BlockBlobClient): Promise<{ url: string; expiresAt: Date }> {
        // For service principal auth, we use the direct URL as authentication is handled by Azure AD
        return {
            url: blobClient.url,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiration
        };
    }
} 