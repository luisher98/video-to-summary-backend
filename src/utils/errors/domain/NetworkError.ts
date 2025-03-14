import { ApplicationError } from '../base/ApplicationError.js';

/**
 * Error codes for network-related errors
 */
export enum NetworkErrorCode {
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    TIMEOUT = 'TIMEOUT',
    DNS_FAILED = 'DNS_FAILED',
    TLS_ERROR = 'TLS_ERROR',
    PROXY_ERROR = 'PROXY_ERROR'
}

/**
 * Error class for network-related errors
 */
export class NetworkError extends ApplicationError {
    constructor(
        message: string,
        code: NetworkErrorCode,
        details?: unknown
    ) {
        super(message, `NETWORK_${code}`, details);
    }
} 