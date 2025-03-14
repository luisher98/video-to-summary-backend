import { logRequest } from '@/utils/logging/logger.js';

/**
 * Handles uncaught errors in the application
 */
export function handleUncaughtErrors(): void {
    // Handle uncaught promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
        logRequest({
            event: 'unhandled_rejection',
            error: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined
        });
        
        // Give time for logging before exiting
        setTimeout(() => process.exit(1), 100);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
        logRequest({
            event: 'uncaught_exception',
            error: error.message,
            stack: error.stack
        });
        
        // Give time for logging before exiting
        setTimeout(() => process.exit(1), 100);
    });
} 