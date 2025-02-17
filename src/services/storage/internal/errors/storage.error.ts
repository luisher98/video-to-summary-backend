export enum StorageErrorCode {
    UNKNOWN = 'UNKNOWN',
    NOT_INITIALIZED = 'NOT_INITIALIZED',
    INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    CONTAINER_NOT_FOUND = 'CONTAINER_NOT_FOUND',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
    DELETE_FAILED = 'DELETE_FAILED'
}

export class StorageError extends Error {
    constructor(
        message: string,
        public readonly code: StorageErrorCode,
        public readonly cause?: Error
    ) {
        super(message);
        this.name = 'StorageError';
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, StorageError);
        }

        if (cause) {
            this.message = `${message}: ${cause.message}`;
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }
} 