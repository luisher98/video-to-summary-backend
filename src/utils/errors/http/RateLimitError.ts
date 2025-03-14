import { HttpError } from '../base/HttpError.js';
import { HttpStatus } from '../constants/httpStatus.js';

interface RateLimitDetails {
    retryAfter?: number;
    limit?: number;
    remaining?: number;
    [key: string]: unknown;
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends HttpError {
    constructor(
        message = 'Too many requests',
        retryAfter?: number,
        details?: RateLimitDetails
    ) {
        super(
            message,
            HttpStatus.TOO_MANY_REQUESTS,
            'RATE_LIMIT_EXCEEDED',
            {
                retryAfter,
                ...(details || {})
            }
        );
    }

    /**
     * Get retry-after value in seconds
     */
    get retryAfter(): number | undefined {
        return (this.details as RateLimitDetails)?.retryAfter;
    }

    /**
     * Get rate limit value
     */
    get limit(): number | undefined {
        return (this.details as RateLimitDetails)?.limit;
    }

    /**
     * Get remaining requests allowed
     */
    get remaining(): number | undefined {
        return (this.details as RateLimitDetails)?.remaining;
    }
} 