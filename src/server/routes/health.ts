import { Request, Response } from "express";
import { checkOpenAIConnection } from "../../lib/openAI.js";

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