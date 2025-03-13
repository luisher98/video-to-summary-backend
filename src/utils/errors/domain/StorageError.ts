import { ApplicationError } from '../base/ApplicationError.js';

/**
 * Error codes for storage-related errors
 */
export enum StorageErrorCode {
    INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
    NOT_INITIALIZED = 'NOT_INITIALIZED',
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
    DELETE_FAILED = 'DELETE_FAILED',
    INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    NOT_FOUND = 'NOT_FOUND',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    UNKNOWN = 'UNKNOWN',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    CONTAINER_NOT_FOUND = 'CONTAINER_NOT_FOUND'
}

/**
 * Error class for storage-related errors
 */
export class StorageError extends ApplicationError {
    constructor(
        message: string,
        code: StorageErrorCode,
        details?: unknown
    ) {
        super(message, `STORAGE_${code}`, details);
    }
} 