import { Request, Response } from "express";
import { checkOpenAIConnection } from "../../lib/openAI.js";

/**
 * Health check endpoint to monitor service status.
 * Verifies connection to OpenAI API and reports server uptime.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with health status
 * 
 * @example
 * GET /health
 * 
 * // Success Response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-28T12:00:00.000Z",
 *   "openai": "connected",
 *   "uptime": 3600
 * }
 * 
 * // Error Response:
 * {
 *   "status": "unhealthy",
 *   "error": "Failed to connect to OpenAI"
 * }
 */
export default async function healthCheck(req: Request, res: Response) {
    try {
        const openAIStatus = await checkOpenAIConnection();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            openai: openAIStatus ? 'connected' : 'disconnected',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 