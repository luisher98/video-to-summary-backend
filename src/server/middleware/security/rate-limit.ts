import rateLimit from 'express-rate-limit';
import { SERVER_CONFIG } from '../../../config/server.js';

// Basic rate limiting
export const basic = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Stricter rate limiting for processing endpoints
export const processing = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // limit each IP to 10 requests per windowMs
});

// Development mode has higher limits
export const development = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: SERVER_CONFIG.environment === 'development' ? 1000 : 100
}); 