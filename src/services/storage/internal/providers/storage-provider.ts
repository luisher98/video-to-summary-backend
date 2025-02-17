import { StorageProvider } from '../interfaces/storage-provider.interface.js';
import { AzureBlobStorageProvider } from './azure-blob/azure-blob-provider.js';
import { AzureStorageConfiguration } from '../interfaces/storage-file.interface.js';

export class StorageProviderFactory {
    static async createAzureProvider(config: AzureStorageConfiguration): Promise<StorageProvider> {
        const provider = new AzureBlobStorageProvider(config);
        await provider.initialize();
        return provider;
    }

    // Add more provider factories as needed (e.g., AWS S3, Google Cloud Storage)
} 