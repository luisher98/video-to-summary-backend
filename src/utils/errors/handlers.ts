import { Response } from 'express';
import { ApplicationError } from './base/ApplicationError.js';
import { HttpError } from './base/HttpError.js';

/**
 * Standard error handler for API routes
 */
export function handleError(error: unknown, res: Response): void {
    console.error('Error:', error);

    if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.toJSON() });
        return;
    }

    if (error instanceof ApplicationError) {
        res.status(500).json({ error: error.toJSON() });
        return;
    }

    // Default error response
    res.status(500).json({
        error: {
            name: error instanceof Error ? error.name : 'Error',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            code: 'INTERNAL_SERVER_ERROR'
        }
    });
}

/**
 * Handler for uncaught errors in the application
 */
export function handleUncaughtErrors(): void {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
} 