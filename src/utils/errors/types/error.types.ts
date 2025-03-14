/**
 * Common error types and interfaces
 */

/**
 * Context information for errors
 */
export interface ErrorContext {
    /** When the error occurred */
    timestamp: Date;
    /** Unique identifier for the request */
    requestId?: string;
    /** Request path where the error occurred */
    path?: string;
    /** User identifier if authenticated */
    userId?: string;
    /** Any additional context-specific information */
    additionalInfo?: Record<string, unknown>;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
    error: {
        name: string;
        message: string;
        code: string;
        statusCode?: number;
        details?: unknown;
        context?: ErrorContext;
    };
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
    /** Whether to include error stack traces in responses */
    includeStack?: boolean;
    /** Whether to log errors */
    logErrors?: boolean;
    /** Custom error logger function */
    logger?: (error: unknown, context?: ErrorContext) => void;
} 