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
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimit, // Limit each IP to N requests per window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * CORS middleware configuration.
 * Controls which origins can access the API.
 */
export const corsMiddleware = cors({
    origin: '*', // In production, this should be restricted to specific domains
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
});

/**
 * Request timeout middleware.
 * Terminates requests that exceed configured timeout.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const timeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Set timeout to 30 seconds
    res.setTimeout(30000, () => {
        res.status(408).json({
            error: {
                message: 'Request timeout',
                code: 'REQUEST_TIMEOUT'
            }
        });
    });
    next();
};

/**
 * Security headers middleware using helmet.
 * Configures various HTTP headers for security.
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: config.nodeEnv === 'production',
    crossOriginEmbedderPolicy: config.nodeEnv === 'production',
    crossOriginOpenerPolicy: config.nodeEnv === 'production',
    crossOriginResourcePolicy: config.nodeEnv === 'production',
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: config.nodeEnv === 'production',
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: true,
    xssFilter: true,
}); 