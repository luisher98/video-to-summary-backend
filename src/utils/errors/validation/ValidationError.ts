import { HttpError } from '../base/HttpError.js';

/**
 * Error class for validation errors
 */
export class ValidationError extends HttpError {
    constructor(
        message: string,
        validationErrors: Record<string, string[]>,
        code: string = 'VALIDATION_ERROR'
    ) {
        super(message, 400, code, { validationErrors });
    }

    /**
     * Get validation errors
     */
    get errors(): Record<string, string[]> {
        return (this.details as { validationErrors: Record<string, string[]> }).validationErrors;
    }
} 