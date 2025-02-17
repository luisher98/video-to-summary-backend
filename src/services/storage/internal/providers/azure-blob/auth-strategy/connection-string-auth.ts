import { 
    BlobServiceClient, 
    BlockBlobClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions
} from '@azure/storage-blob';
import { AuthStrategy } from '../../../interfaces/auth-strategy.interface.js';

export class AzureConnectionStringAuthStrategy implements AuthStrategy {
    private sharedKeyCredential: StorageSharedKeyCredential | null = null;
    private blobServiceClient: BlobServiceClient | null = null;

    constructor(private connectionString: string) {}

    async initialize(): Promise<void> {
        try {
            const connectionStringParts = this.connectionString.split(';');
            const accountName = connectionStringParts.find(part => part.startsWith('AccountName='))?.split('=')[1];
            const accountKey = connectionStringParts.find(part => part.startsWith('AccountKey='))?.split('=')[1];

            if (!accountName || !accountKey) {
                throw new Error('Invalid connection string format');
            }

            this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
            this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
        } catch (error) {
            console.error('Failed to initialize connection string credentials:', error);
            throw error;
        }
    }

    async getClient(accountName: string): Promise<BlobServiceClient> {
        if (!this.blobServiceClient) {
            throw new Error('Connection string client not initialized');
        }
        return this.blobServiceClient;
    }

    async generateUploadUrl(blobClient: BlockBlobClient): Promise<{ url: string; expiresAt: Date }> {
        if (!this.sharedKeyCredential) {
            throw new Error('Connection string credentials not initialized');
        }

        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setMinutes(startsOn.getMinutes() + 5); // 5 minutes expiration

        const permissions = BlobSASPermissions.parse("racwd");
        const sasToken = generateBlobSASQueryParameters({
            containerName: blobClient.containerName,
            blobName: blobClient.name,
            permissions: permissions,
            startsOn: startsOn,
            expiresOn: expiresOn,
        }, this.sharedKeyCredential).toString();

        return {
            url: `${blobClient.url}?${sasToken}`,
            expiresAt: expiresOn
        };
    }
} 