import { HttpError } from '../base/HttpError.js';

/**
 * Error class for 500 Internal Server Error
 */
export class InternalServerError extends HttpError {
    constructor(message: string, code: string = 'INTERNAL_SERVER_ERROR', details?: unknown) {
        super(message, 500, code, details);
    }
} 