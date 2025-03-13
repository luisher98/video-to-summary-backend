import { HttpError } from '../base/HttpError.js';

/**
 * Error class for 400 Bad Request errors
 */
export class BadRequestError extends HttpError {
    constructor(message: string, code: string = 'BAD_REQUEST', details?: unknown) {
        super(message, 400, code, details);
    }
} 