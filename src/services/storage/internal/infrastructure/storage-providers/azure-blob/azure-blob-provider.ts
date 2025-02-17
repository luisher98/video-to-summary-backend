import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider } from '../../../../interfaces/storage-provider.interface.js';
import { StorageError, StorageErrorCode } from '../../../../errors/storage.error.js';
import { StorageFile, UploadUrlResult } from '../../../../interfaces/storage-file.interface.js';
import { AuthStrategy } from '../../../../interfaces/auth-strategy.interface.js';
import { 
    AzureStorageConfiguration, 
    ServicePrincipalCredentials, 
    UploadConfiguration 
} from '../../../../interfaces/storage-file.interface.js';
import { AzureServicePrincipalAuthStrategy } from './auth/strategies/service-principal-auth.strategy.js';
import { AzureConnectionStringAuthStrategy } from './auth/strategies/connection-string-auth.strategy.js';

// ... rest of the file stays the same ... 