import { Request, Response } from 'express';
import { getServerStatus } from '../../server.js';

/**
 * Get server health status
 */
export function getStatus(req: Request, res: Response) {
    const status = getServerStatus();
    res.json({ data: status });
} 