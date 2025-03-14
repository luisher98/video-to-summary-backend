import { Request, Response } from 'express';

/**
 * Test endpoint for Server-Sent Events functionality.
 * This is a test endpoint to ensure that the SSE is working without any issues.
 * Sends numbered events every second for 10 seconds.
 */
export function getTestSSE(req: Request, res: Response): void {
    // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
  
    let counter = 0;
    const intervalId = setInterval(() => {
        counter++;
        if (counter >= 10) {
            clearInterval(intervalId);
            res.end();
            return;
        }
        res.write(`data: ${JSON.stringify({ num: counter })}\n\n`);
    }, 1000);
  
    // Clean up on client disconnect
    res.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
} 