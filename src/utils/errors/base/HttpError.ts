import { ApplicationError } from './ApplicationError.js';

/**
 * Base error class for all HTTP errors
 */
export class HttpError extends ApplicationError {
    constructor(
        message: string,
        public readonly statusCode: number,
        code: string = 'HTTP_ERROR',
        details?: unknown
    ) {
        super(message, code, details);
    }

    /**
     * Creates a JSON representation of the error including HTTP status code
     */
    toJSON() {
        return {
            ...super.toJSON(),
            statusCode: this.statusCode
        };
    }
} 