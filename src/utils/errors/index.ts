// Types
export * from './types/error.types.js';

// Base error classes
export * from './base/ApplicationError.js';
export * from './base/HttpError.js';

// HTTP errors
export * from './http/BadRequestError.js';
export * from './http/InternalServerError.js';
export * from './http/RateLimitError.js';

// Domain-specific errors
export * from './domain/MediaError.js';
export * from './domain/NetworkError.js';
export * from './domain/StorageError.js';

// Validation
export { ValidationError } from './validation/ValidationError.js';

// Error handling middleware and utilities
export {
    createErrorMiddleware,
    handleError,
    withErrorHandling,
    sendErrorResponse,
    type RouteResponse,
    type AsyncRouteHandler
} from './middleware/errorMiddleware.js';

// Global error handlers
export { handleUncaughtErrors } from './handlers/index.js';

// Constants
export * from './constants/httpStatus.js';

// Error handler type
export type ErrorHandler = (error: Error) => void; 