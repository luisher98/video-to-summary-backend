import { 
    BlobServiceClient, 
    BlockBlobClient, 
    BlobSASPermissions, 
    SASProtocol,
    UserDelegationKey,
    generateBlobSASQueryParameters,
    BlobSASSignatureValues
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { AuthStrategy } from '../../../interfaces/auth-strategy.interface.js';
import { ServicePrincipalCredentials } from '../types/azure-storage.types.js';

export class AzureServicePrincipalAuthStrategy implements AuthStrategy {
    private credential: DefaultAzureCredential | null = null;
    private blobServiceClient: BlobServiceClient | null = null;
    private userDelegationKey: UserDelegationKey | null = null;

    constructor(private config: ServicePrincipalCredentials) {}

    async initialize(): Promise<void> {
        try {
            this.credential = new DefaultAzureCredential();
            const url = `https://${this.config.accountName}.blob.core.windows.net`;
            this.blobServiceClient = new BlobServiceClient(url, this.credential);

            // Get user delegation key for SAS generation
            const startsOn = new Date();
            const expiresOn = new Date(startsOn);
            expiresOn.setHours(startsOn.getHours() + 24); // Get a key valid for 24 hours

            this.userDelegationKey = await this.blobServiceClient.getUserDelegationKey(startsOn, expiresOn);
            console.log('User delegation key obtained successfully');
        } catch (error) {
            console.error('Failed to initialize service principal credentials:', error);
            throw error;
        }
    }

    async getClient(accountName: string): Promise<BlobServiceClient> {
        if (!this.blobServiceClient) {
            throw new Error('Service principal not initialized');
        }
        return this.blobServiceClient;
    }

    async generateUploadUrl(blobClient: BlockBlobClient): Promise<{ url: string; expiresAt: Date }> {
        if (!this.userDelegationKey || !this.blobServiceClient) {
            throw new Error('Service principal or user delegation key not initialized');
        }

        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setMinutes(startsOn.getMinutes() + 15); // 15 minutes expiration

        const sasValues: BlobSASSignatureValues = {
            containerName: blobClient.containerName,
            blobName: blobClient.name,
            permissions: BlobSASPermissions.parse("racwd"),
            startsOn,
            expiresOn,
            protocol: SASProtocol.Https
        };

        const sasQueryParameters = generateBlobSASQueryParameters(
            sasValues,
            this.userDelegationKey,
            this.config.accountName
        );

        const sasToken = `${blobClient.url}?${sasQueryParameters.toString()}`;

        return {
            url: sasToken,
            expiresAt: expiresOn
        };
    }
} 