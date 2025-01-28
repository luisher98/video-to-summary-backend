import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment.js';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware configuration.
 * Restricts number of requests from a single IP.
 */
export const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later'
});

/**
 * CORS middleware configuration.
 * Controls which origins can access the API.
 */
export const corsMiddleware = cors({
    origin: config.security.corsOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', config.security.apiKeyHeader],
});

/**
 * API key authentication middleware.
 * Validates requests against configured API keys.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
    if (config.isProduction) {
        const apiKey = req.header(config.security.apiKeyHeader);
        
        if (!apiKey || !config.security.apiKeys.includes(apiKey)) {
            return res.status(401).json({
                error: 'Invalid or missing API key'
            });
        }
    }
    next();
};

/**
 * Request timeout middleware.
 * Terminates requests that exceed configured timeout.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const requestTimeout = (req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(config.queue.requestTimeoutMs, () => {
        res.status(408).json({
            error: 'Request timeout'
        });
    });
    next();
};

/**
 * Security headers middleware using helmet.
 * Configures various HTTP headers for security.
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: config.isProduction,
    crossOriginEmbedderPolicy: config.isProduction,
    crossOriginOpenerPolicy: config.isProduction,
    crossOriginResourcePolicy: config.isProduction,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: config.isProduction,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: true,
    xssFilter: true,
}); 