import * as security from './security/index.js';
import * as validation from './validation/index.js';
import { handleError } from '@/utils/errors/index.js';

// Re-export all middleware
export { security, validation };
export const errors = { handler: handleError };

// Common middleware chains
export const commonMiddleware = [
    security.headers.basic,
    security.headers.csp,
    security.headers.cors,
    security.rateLimit.basic
];

// Processing middleware chain
export const processingMiddleware = [
    ...commonMiddleware,
    security.rateLimit.processing
];

// Development middleware chain
export const developmentMiddleware = [
    ...commonMiddleware,
    security.rateLimit.development
]; 