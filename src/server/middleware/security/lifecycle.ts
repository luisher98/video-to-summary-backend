import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SERVER_CONFIG } from '@/config/server.js';

interface QueueEntry {
    timestamp: number;
    ip: string;
}

// Track active requests
const activeRequests = new Map<string, QueueEntry>();

/**
 * Queue management middleware
 */
export function queueMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    
    if (activeRequests.size >= SERVER_CONFIG.queue.maxConcurrentRequests) {
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
}

/**
 * Timeout management middleware
 */
export function timeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
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

// Cleanup old queue entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of activeRequests.entries()) {
        if (now - entry.timestamp > SERVER_CONFIG.queue.requestTimeoutMs) {
            activeRequests.delete(id);
        }
    }
}, SERVER_CONFIG.queue.cleanupIntervalMs);

/**
 * Gets current queue status
 */
export const getQueueStatus = () => ({
    active: activeRequests.size,
    limit: SERVER_CONFIG.queue.maxConcurrentRequests
}); 