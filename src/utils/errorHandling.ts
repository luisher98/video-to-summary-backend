import { Server } from 'http';

enum HttpStatusCode {
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: HttpStatusCode, message: string) {
      super(message);
      this.statusCode = statusCode;
      Object.setPrototypeOf(this, new.target.prototype); // to avoid errors when extending built-in classes
  }
}

/**
 * Custom error classes for specific error scenarios
 */

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

export class CustomError extends InternalServerError {
  constructor(message: string, statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR) {
      super(message);
      this.statusCode = statusCode; // Only set if different from default
  }
}

export function handleUncaughtErrors(server: Server | null) {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    if (server?.listening) {
      server.close(() => {
        process.kill(process.pid, 'SIGTERM');
      });
    }
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    if (server?.listening) {
      server.close(() => {
        process.kill(process.pid, 'SIGTERM');
      });
    }
  });
}

