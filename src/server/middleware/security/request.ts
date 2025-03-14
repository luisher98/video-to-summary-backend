import { Request, Response, NextFunction } from 'express';
import { rateLimit as createRateLimit } from 'express-rate-limit';
import { SERVER_CONFIG } from '@/config/server.js';

/**
 * Rate limiting middleware configurations
 */
export const rateLimiting = {
    basic: createRateLimit(SERVER_CONFIG.rateLimit.standard),
    processing: createRateLimit(SERVER_CONFIG.rateLimit.processing),
    development: createRateLimit({
        ...SERVER_CONFIG.rateLimit.standard,
        max: SERVER_CONFIG.environment === 'development' ? 1000 : 100
    })
};

/**
 * API key authentication middleware
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