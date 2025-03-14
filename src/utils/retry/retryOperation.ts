import { NetworkError } from '../errors/domain/NetworkError.js';
import { RetryError, RetryErrorCode, RetryErrorDetails } from '../errors/domain/RetryError.js';
import { processTimer, logProcessStep } from '../logging/logger.js';

/**
 * Configuration options for retry operations
 */
export interface RetryOptions {
    /** Maximum number of retry attempts */
    maxAttempts?: number;
    /** Initial delay between retries in milliseconds */
    initialDelay?: number;
    /** Maximum delay between retries in milliseconds */
    maxDelay?: number;
    /** Total timeout for all retry attempts in milliseconds */
    timeout?: number;
    /** Function to determine if an error should trigger a retry */
    shouldRetry?: (error: Error) => boolean;
    /** Operation name for logging and monitoring */
    operationName?: string;
}

const defaultOptions: Required<Omit<RetryOptions, 'operationName'>> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    timeout: 30000,
    shouldRetry: (error: Error) => error instanceof NetworkError
};

/**
 * Retries an operation with exponential backoff and enhanced error handling
 * @param operation The operation to retry
 * @param options Retry options
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const config = { ...defaultOptions, ...options };
    const operationName = config.operationName || 'retry-operation';
    const startTime = Date.now();
    
    let lastError: Error | undefined;
    let delay = config.initialDelay;
    let attemptsMade = 0;

    // Start timing the retry operation
    processTimer.startProcess(operationName);
    logProcessStep(operationName, 'start', { maxAttempts: config.maxAttempts });

    try {
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            attemptsMade = attempt;
            
            try {
                // Check if we've exceeded the total timeout
                if (Date.now() - startTime > config.timeout) {
                    throw new RetryError(
                        'Retry operation timed out',
                        RetryErrorCode.RETRY_TIMEOUT,
                        {
                            attemptsMade,
                            maxAttempts: config.maxAttempts,
                            totalDuration: Date.now() - startTime,
                            lastError: lastError
                        }
                    );
                }

                // Log attempt
                logProcessStep(
                    `${operationName}-attempt-${attempt}`,
                    'start',
                    { attempt, maxAttempts: config.maxAttempts }
                );

                // Attempt the operation
                const result = await operation();

                // Log success
                logProcessStep(
                    `${operationName}-attempt-${attempt}`,
                    'complete',
                    { attempt, successful: true }
                );

                // Operation succeeded
                processTimer.endProcess(operationName);
                return result;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Log failure
                logProcessStep(
                    `${operationName}-attempt-${attempt}`,
                    'error',
                    { 
                        attempt,
                        error: lastError.message
                    }
                );

                // Check if we should retry
                if (attempt === config.maxAttempts || !config.shouldRetry(lastError)) {
                    throw new RetryError(
                        `Operation failed after ${attempt} attempts`,
                        RetryErrorCode.MAX_ATTEMPTS_EXCEEDED,
                        {
                            attemptsMade,
                            maxAttempts: config.maxAttempts,
                            totalDuration: Date.now() - startTime,
                            lastError
                        }
                    );
                }

                // Wait with exponential backoff
                const backoffDelay = Math.min(delay * Math.pow(2, attempt - 1), config.maxDelay);
                logProcessStep(
                    `${operationName}-backoff`,
                    'start',
                    { delay: backoffDelay }
                );
                
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }

        // This shouldn't be reached due to the throw in the loop
        throw lastError!;

    } catch (error) {
        // End timing on error
        processTimer.endProcess(operationName, error as Error);
        throw error;
    }
} 