import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/environment.js';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Queue management
const CONFIG = {
    queue: {
        maxConcurrentRequests: 2
    }
} as const;

export const activeRequests = new Map<string, QueueEntry>();

interface QueueEntry {
    timestamp: number;
    ip: string;
}

/**
 * Enhanced rate limiting middleware configuration.
 * Restricts number of requests from a single IP.
 */
export const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
    keyGenerator: (req) => {
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (typeof xForwardedFor === 'string') {
            return xForwardedFor.split(',')[0].trim();
        }
        return req.socket.remoteAddress || 'unknown';
    }
});

/**
 * Enhanced CORS middleware configuration.
 */
export const corsMiddleware = cors({
    origin: config.isProduction 
        ? config.security.corsOrigins 
        : ['http://localhost:3000', 'http://localhost:5050'], // Allow local development
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', config.security.apiKeyHeader, 'x-ms-blob-type', 'x-ms-version'],
    exposedHeaders: ['ETag'],
    maxAge: 86400,
    credentials: true
});

/**
 * Request queue middleware.
 * Manages concurrent request limits.
 */
export const requestQueueMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = uuidv4();
    
    if (activeRequests.size >= CONFIG.queue.maxConcurrentRequests) {
        res.status(503).json({
            error: 'Server is busy. Please try again later.'
        });
        return;
    }

    activeRequests.set(requestId, {
        timestamp: Date.now(),
        ip: req.ip || 'unknown'
    });

    res.once('finish', () => {
        activeRequests.delete(requestId);
    });

    next();
};

/**
 * API key authentication middleware.
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
    // Log current environment state
    console.log('Current environment:', {
        NODE_ENV: process.env.NODE_ENV,
        isProduction: config.isProduction,
        isDevelopment: config.isDevelopment
    });

    // Skip API key check in development or test
    if (config.isDevelopment || config.isTest) {
        console.log('Skipping API key check in development/test mode');
        return next();
    }

    const apiKey = req.header(config.security.apiKeyHeader);
    
    if (!apiKey || !config.security.apiKeys.includes(apiKey)) {
        return res.status(401).json({
            error: 'Invalid or missing API key'
        });
    }
    next();
};

/**
 * Request timeout middleware.
 */
export const requestTimeout = (req: Request, res: Response, next: NextFunction) => {
    // For SSE endpoints, don't set a timeout
    if (req.headers.accept === 'text/event-stream') {
        return next();
    }

    // For regular endpoints, set timeout
    const timeoutId = setTimeout(() => {
        // Only send timeout response if headers haven't been sent
        if (!res.headersSent) {
            res.status(408).json({
                error: 'Request timeout'
            });
        }
    }, config.queue.requestTimeoutMs);

    // Clear timeout when request finishes
    res.on('finish', () => {
        clearTimeout(timeoutId);
    });

    next();
};

/**
 * Security headers middleware using helmet.
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