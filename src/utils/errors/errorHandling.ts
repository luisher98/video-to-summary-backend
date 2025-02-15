import { Server } from 'http';
import { Response } from 'express';

/**
 * HTTP status codes used in the application
 */
export enum HttpStatusCode {
    BAD_REQUEST = 400,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500
}

/**
 * Base HTTP error class
 */
export class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: HttpStatusCode, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Error thrown when video download fails
 */
export class DownloadError extends HttpError {
    constructor(message: string) {
        super(HttpStatusCode.INTERNAL_SERVER_ERROR, message);
        this.name = 'DownloadError';
    }
}

/**
 * Error thrown when audio conversion fails
 */
export class ConversionError extends HttpError {
    constructor(message: string) {
        super(HttpStatusCode.INTERNAL_SERVER_ERROR, message);
        this.name = 'ConversionError';
    }
}

/**
 * Error thrown when file deletion fails
 */
export class DeletionError extends HttpError {
    constructor(message: string) {
        super(HttpStatusCode.INTERNAL_SERVER_ERROR, message);
        this.name = 'DeletionError';
    }
}

/**
 * Error thrown for invalid request parameters
 */
export class BadRequestError extends HttpError {
    constructor(message: string) {
        super(HttpStatusCode.BAD_REQUEST, message);
        this.name = 'BadRequestError';
    }
}

/**
 * Error thrown for server-side failures
 */
export class InternalServerError extends HttpError {
    constructor(message: string) {
        super(HttpStatusCode.INTERNAL_SERVER_ERROR, message);
        this.name = 'InternalServerError';
    }
}

/**
 * Custom error with configurable status code
 */
export class CustomError extends InternalServerError {
    constructor(message: string, statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Handles errors in route handlers and sends appropriate response
 */
export function handleError(error: unknown, res: Response): void {
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({
            error: error.message,
            code: error.name
        });
    } else {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            error: message,
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
}

/**
 * Sets up global error handlers for the server
 */
export function handleUncaughtErrors(server: Server): void {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        gracefulShutdown(server);
    });

    process.on('unhandledRejection', (error) => {
        console.error('Unhandled rejection:', error);
        gracefulShutdown(server);
    });
}

/**
 * Performs graceful shutdown of the server
 */
function gracefulShutdown(server: Server): void {
    if (server?.listening) {
        server.close(() => {
            process.kill(process.pid, 'SIGTERM');
        });
    }
} 