import { logRequest } from '@/utils/logging/logger.js';

/**
 * Gracefully shuts down the application after ensuring cleanup
 */
async function gracefulShutdown(exitCode: number = 1): Promise<void> {
    console.error('Initiating graceful shutdown...');
    
    try {
        // Set a maximum timeout for graceful shutdown (10 seconds)
        const shutdownTimeout = setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(exitCode);
        }, 10000);

        // Allow time for logging and cleanup operations
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clean up any pending operations
        if (process.stdout.writableNeedDrain || process.stderr.writableNeedDrain) {
            await new Promise(resolve => {
                const checkStreams = () => {
                    if (!process.stdout.writableNeedDrain && !process.stderr.writableNeedDrain) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkStreams, 50);
                    }
                };
                checkStreams();
            });
        }

        clearTimeout(shutdownTimeout);
        console.error('Graceful shutdown completed');
        process.exit(exitCode);
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(exitCode);
    }
}

/**
 * Handles uncaught errors in the application with proper async cleanup
 */
export function handleUncaughtErrors(): void {
    // Prevent multiple error handlers from triggering
    let isShuttingDown = false;

    // Handle uncaught promise rejections
    process.on('unhandledRejection', async (reason: unknown) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.error('Unhandled Promise Rejection:', reason);
        
        try {
            logRequest({
                event: 'unhandled_rejection',
                error: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined
            });
            
            // Wait a moment for logging to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (logError) {
            console.error('Error while logging unhandled rejection:', logError);
        }
        
        await gracefulShutdown(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error: Error) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.error('Uncaught Exception:', error);
        
        try {
            logRequest({
                event: 'uncaught_exception',
                error: error.message,
                stack: error.stack
            });
            
            // Wait a moment for logging to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (logError) {
            console.error('Error while logging uncaught exception:', logError);
        }
        
        await gracefulShutdown(1);
    });

    // Handle graceful shutdown signals
    process.on('SIGTERM', async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        console.log('Received SIGTERM, shutting down gracefully...');
        await gracefulShutdown(0);
    });

    process.on('SIGINT', async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        console.log('Received SIGINT, shutting down gracefully...');
        await gracefulShutdown(0);
    });
} 