import { ApplicationError } from '../base/ApplicationError.js';

/**
 * Error codes for media-related errors
 */
export enum MediaErrorCode {
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
    CONVERSION_FAILED = 'CONVERSION_FAILED',
    INVALID_FORMAT = 'INVALID_FORMAT',
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    PROCESSING_FAILED = 'PROCESSING_FAILED',
    DELETION_FAILED = 'DELETION_FAILED'
}

/**
 * Error class for media-related errors
 */
export class MediaError extends ApplicationError {
    constructor(
        message: string,
        code: MediaErrorCode,
        details?: unknown
    ) {
        super(message, `MEDIA_${code}`, details);
    }
} 