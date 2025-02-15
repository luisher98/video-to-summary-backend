/**
 * Interface for structured logging information
 */
export interface LogInfo {
    /** Event type or name */
    event: string;
    /** Request URL */
    url: string;
    /** Client IP address */
    ip: string;
    /** User agent string */
    userAgent?: string;
    /** Request duration in milliseconds */
    duration?: number;
    /** Error message if any */
    error?: string;
    /** Additional custom fields */
    [key: string]: any;
}

/**
 * Logs a request with structured information
 * @param info - Request information to log
 */
export function logRequest(info: LogInfo): void {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...info,
        environment: process.env.NODE_ENV
    }));
} 