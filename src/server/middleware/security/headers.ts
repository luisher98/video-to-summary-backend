import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SERVER_CONFIG } from '@/config/server.js';

/**
 * Basic security headers middleware using helmet
 */
export const basicHeaders = helmet();

/**
 * Content Security Policy middleware
 */
export const cspHeaders = helmet.contentSecurityPolicy({
    directives: {
        ...SERVER_CONFIG.security.csp,
        upgradeInsecureRequests: [] // Empty array means enabled
    }
});

/**
 * CORS headers middleware
 */
export function corsHeaders(req: Request, res: Response, next: NextFunction): void {
    const { methods, allowedHeaders } = SERVER_CONFIG.security.cors;
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', methods.join(', '));
    res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    
    if (SERVER_CONFIG.security.cors.credentials) {
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    next();
} 