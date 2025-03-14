import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ErrorHandlerOptions, ErrorContext } from '../types/error.types.js';
import { ApplicationError } from '../base/ApplicationError.js';
import { HttpError } from '../base/HttpError.js';
import { HttpStatus } from '../constants/httpStatus.js';
import { processTimer, logRequest, ProcessTiming } from '@/utils/logging/logger.js';

/**
 * Type for route handler response to ensure consistent API responses
 */
export interface RouteResponse<T = unknown> {
    data?: T;
    meta?: Record<string, unknown>;
}

/**
 * Type for async route handler with proper response typing
 */
export type AsyncRouteHandler<T = unknown> = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<RouteResponse<T>>;

/**
 * Default error logger with structured logging
 */
function defaultErrorLogger(error: unknown, context?: ErrorContext): void {
    logRequest({
        event: 'error',
        error: error instanceof Error ? error.message : String(error),
        ...context,
        processTimings: processTimer.getTimings()
    });
}

/**
 * Creates an error response object with consistent format
 */
function createErrorResponse(error: unknown, context: ErrorContext, includeStack = false) {
    if (error instanceof HttpError) {
        return {
            success: false,
            error: {
                ...error.toJSON(),
                context,
                ...(includeStack && { stack: error.stack })
            },
            meta: {
                processTimings: processTimer.getTimings()
            }
        };
    }

    if (error instanceof ApplicationError) {
        return {
            success: false,
            error: {
                ...error.toJSON(),
                context,
                ...(includeStack && { stack: error.stack })
            },
            meta: {
                processTimings: processTimer.getTimings()
            }
        };
    }

    return {
        success: false,
        error: {
            name: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            code: 'INTERNAL_SERVER_ERROR',
            context,
            ...(includeStack && error instanceof Error && { stack: error.stack })
        },
        meta: {
            processTimings: processTimer.getTimings()
        }
    };
}

/**
 * Wraps an async route handler with error handling (preventive approach)
 */
export const withErrorHandling = <T>(fn: AsyncRouteHandler<T>) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const operationName = fn.name || 'anonymous_operation';
        processTimer.startProcess(operationName);
        
        try {
            const result = await fn(req, res, next);
            processTimer.endProcess(operationName);
            
            // If headers are already sent, don't attempt to send response
            if (res.headersSent) return;
            
            // Log successful request
            logRequest({
                event: 'request_success',
                path: req.path,
                method: req.method,
                processTimings: processTimer.getTimings()
            });
            
            // Send successful response with consistent format
            res.json({
                success: true,
                ...result,
                meta: {
                    ...(result.meta || {}),
                    processTimings: processTimer.getTimings()
                }
            });
        } catch (error) {
            processTimer.endProcess(operationName, error as Error);
            next(error);
        }
    };
};

/**
 * Sends an error response (reactive approach)
 */
export const sendErrorResponse = (error: unknown, res: Response): void => {
    // Don't do anything if headers are already sent
    if (res.headersSent) return;

    const context: ErrorContext = {
        timestamp: new Date(),
        requestId: res.locals.requestId,
        path: res.req.path,
        userId: res.locals.userId,
        additionalInfo: {
            method: res.req.method,
            ip: res.req.ip,
            userAgent: res.req.get('user-agent')
        }
    };

    // Log error
    defaultErrorLogger(error, context);

    // Determine status code
    const statusCode = error instanceof HttpError 
        ? error.statusCode 
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Send error response
    const response = createErrorResponse(
        error,
        context,
        process.env.NODE_ENV === 'development'
    );
    res.status(statusCode).json(response);
};

/**
 * Creates an error handling middleware with configurable options
 */
export function createErrorMiddleware(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
    const {
        includeStack = process.env.NODE_ENV === 'development',
        logErrors = true,
        logger = defaultErrorLogger
    } = options;

    return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
        // Don't do anything if headers are already sent
        if (res.headersSent) {
            return next(error);
        }

        // Build error context
        const context: ErrorContext = {
            timestamp: new Date(),
            requestId: res.locals.requestId,
            path: req.path,
            userId: res.locals.userId,
            additionalInfo: {
                method: req.method,
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        };

        // Log error if enabled
        if (logErrors) {
            logger(error, context);
        }

        // Send error response
        const response = createErrorResponse(error, context, includeStack);
        const statusCode = error instanceof HttpError 
            ? error.statusCode 
            : HttpStatus.INTERNAL_SERVER_ERROR;
            
        res.status(statusCode).json(response);
    };
}

// Maintain backward compatibility
export const handleError = withErrorHandling; 