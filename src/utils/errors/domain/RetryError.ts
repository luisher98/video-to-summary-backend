import { ApplicationError } from '../base/ApplicationError.js';
import { ErrorContext } from '../types/error.types.js';

export enum RetryErrorCode {
    MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
    RETRY_TIMEOUT = 'RETRY_TIMEOUT',
    NON_RETRYABLE_ERROR = 'NON_RETRYABLE_ERROR'
}

export interface RetryErrorDetails {
    attemptsMade: number;
    maxAttempts: number;
    totalDuration: number;
    lastError?: Error;
}

/**
 * Error thrown when retry operations fail
 */
export class RetryError extends ApplicationError {
    constructor(
        message: string,
        public readonly retryCode: RetryErrorCode,
        public readonly retryDetails: RetryErrorDetails,
        context?: Omit<ErrorContext, 'timestamp'>
    ) {
        super(
            message,
            `RETRY_${retryCode}`,
            retryDetails,
            context
        );
    }

    /**
     * Creates a JSON representation of the error
     */
    toJSON() {
        return {
            ...super.toJSON(),
            retryDetails: this.retryDetails
        };
    }
} 