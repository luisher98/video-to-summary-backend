import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../../config.js';

/**
 * API key authentication middleware.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
    // Skip API key check in development
    if (SERVER_CONFIG.environment === 'development') {
        return next();
    }

    const apiKey = req.header(SERVER_CONFIG.security.apiKeyHeader);
    
    if (!apiKey || !SERVER_CONFIG.security.apiKeys.includes(apiKey)) {
        res.status(401).json({
            error: 'Invalid or missing API key'
        });
        return;
    }

    next();
} 