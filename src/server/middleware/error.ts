import { Request, Response, NextFunction } from 'express';
import { ApplicationError, HttpError } from '@/utils/errors/index.js';

/**
 * Error handling middleware for routes
 */
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    console.error('Route error:', {
        path: req.path,
        error: error.message,
        stack: error.stack
    });

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
            name: error.name,
            message: error.message,
            code: 'INTERNAL_SERVER_ERROR'
        }
    });
} 