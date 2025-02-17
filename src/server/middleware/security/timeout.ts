import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../../config.js';

/**
 * Request timeout middleware.
 * Sets a timeout for non-SSE requests.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
    // Don't set timeout for SSE endpoints
    if (req.headers.accept === 'text/event-stream') {
        return next();
    }

    const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                error: 'Request timeout'
            });
        }
    }, SERVER_CONFIG.queue.requestTimeoutMs);

    // Clear timeout when request finishes
    res.on('finish', () => {
        clearTimeout(timeoutId);
    });

    next();
} 