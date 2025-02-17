import { Request, Response, NextFunction } from 'express';
import { SERVER_CONFIG } from '../../config.js';
import { v4 as uuidv4 } from 'uuid';

interface QueueEntry {
    timestamp: number;
    ip: string;
}

// Track active requests
const activeRequests = new Map<string, QueueEntry>();

/**
 * Request queue middleware.
 * Manages concurrent request limits.
 */
export function requestQueue(req: Request, res: Response, next: NextFunction): void {
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
 * Get current queue status
 */
export function getQueueStatus(): { active: number, limit: number } {
    return {
        active: activeRequests.size,
        limit: SERVER_CONFIG.queue.maxConcurrentRequests
    };
} 