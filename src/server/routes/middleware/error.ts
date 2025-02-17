import { Request, Response, NextFunction } from 'express';
import { StorageError } from '@/services/storage/StorageService.js';
import { APIError, BadRequestError, handleError } from '@/utils/errors/errorHandling.js';

export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error('Route error:', {
        path: req.path,
        error: error.message,
        stack: error.stack
    });

    if (error instanceof StorageError) {
        res.status(400).json({
            error: {
                code: error.code,
                message: error.message
            }
        });
        return;
    }

    if (error instanceof BadRequestError) {
        res.status(400).json({
            error: error.message
        });
        return;
    }

    if (error instanceof APIError) {
        res.status(error.statusCode).json({
            error: error.message
        });
        return;
    }

    // Default error handler for unknown errors
    res.status(500).json({
        error: 'Internal server error',
        details: error.message
    });
} 