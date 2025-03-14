import { basicHeaders, cspHeaders, corsHeaders } from './security/headers.js';
import { rateLimiting, apiKeyAuth } from './security/request.js';
import { queueMiddleware, timeoutMiddleware } from './security/lifecycle.js';
import { validateYouTubeUrl } from './validation/youtube.js';
import { validateUploadInit, validateUploadedFile, validateFileTypeFromRequest } from './validation/upload.js';
import { validateRequestWordCount } from './validation/common.js';
import { handleError } from '@/utils/errors/index.js';
import { compose, composeValidation, composeSecurity } from './composers/compose.js';
import { RequestHandler } from 'express';

/**
 * YouTube validation middleware interface
 */
interface YouTubeValidation {
    validateUrl: RequestHandler;
    validateWordCount: RequestHandler;
    full: RequestHandler;
}

/**
 * Upload validation middleware interface
 */
interface UploadValidation {
    validateFileUpload: RequestHandler;
    validateFileType: RequestHandler;
    validateInitiateUpload: RequestHandler;
    validateWordCount: RequestHandler;
    full: RequestHandler;
}

/**
 * Security headers middleware interface
 */
interface SecurityHeaders {
    basic: RequestHandler;
    csp: RequestHandler;
    cors: RequestHandler;
    full: RequestHandler;
}

/**
 * Rate limiting middleware interface
 */
interface RateLimiting {
    basic: RequestHandler;
    processing: RequestHandler;
    development: RequestHandler;
}

/**
 * Request security middleware interface
 */
interface RequestSecurity {
    rateLimit: RateLimiting;
    auth: RequestHandler;
    full: RequestHandler;
}

/**
 * Lifecycle middleware interface
 */
interface LifecycleSecurity {
    queue: RequestHandler;
    timeout: RequestHandler;
    full: RequestHandler;
}

/**
 * Security middleware configuration
 */
interface SecurityConfig {
    headers: SecurityHeaders;
    request: RequestSecurity;
    lifecycle: LifecycleSecurity;
}

/**
 * Validation middleware configuration
 */
interface ValidationConfig {
    youtube: YouTubeValidation;
    upload: UploadValidation;
}

// Export error handler
export const errors = { handler: handleError };

// Compose validation middleware
export const validation: ValidationConfig = {
    youtube: {
        validateUrl: composeValidation(validateYouTubeUrl),
        validateWordCount: composeValidation(validateRequestWordCount),
        full: composeValidation(validateYouTubeUrl, validateRequestWordCount)
    },
    upload: {
        validateFileUpload: composeValidation(validateUploadedFile),
        validateFileType: composeValidation(validateFileTypeFromRequest),
        validateInitiateUpload: composeValidation(validateUploadInit),
        validateWordCount: composeValidation(validateRequestWordCount),
        full: composeValidation(validateUploadInit, validateUploadedFile, validateFileTypeFromRequest)
    }
};

// Compose security middleware
export const security: SecurityConfig = {
    headers: {
        basic: composeSecurity(basicHeaders),
        csp: composeSecurity(cspHeaders),
        cors: composeSecurity(corsHeaders),
        full: composeSecurity(basicHeaders, cspHeaders, corsHeaders)
    },
    request: {
        rateLimit: {
            basic: composeSecurity(rateLimiting.basic),
            processing: composeSecurity(rateLimiting.processing),
            development: composeSecurity(rateLimiting.development)
        },
        auth: composeSecurity(apiKeyAuth),
        full: composeSecurity(apiKeyAuth, rateLimiting.basic)
    },
    lifecycle: {
        queue: composeSecurity(queueMiddleware),
        timeout: composeSecurity(timeoutMiddleware),
        full: composeSecurity(queueMiddleware, timeoutMiddleware)
    }
};

// Define common middleware
const commonMiddleware = [
    security.headers.basic,
    security.headers.csp,
    security.headers.cors,
    security.request.rateLimit.basic
];

// Export middleware chains
export const middlewareChains = {
    common: commonMiddleware,
    processing: [
        ...commonMiddleware,
        security.request.rateLimit.processing,
        security.lifecycle.queue,
        security.lifecycle.timeout,
        validation.youtube.validateWordCount
    ],
    development: [
        ...commonMiddleware,
        security.request.rateLimit.development
    ]
}; 