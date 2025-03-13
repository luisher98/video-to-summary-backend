// Base errors
export { ApplicationError } from './base/ApplicationError.js';
export { HttpError } from './base/HttpError.js';

// HTTP errors
export { BadRequestError } from './http/BadRequestError.js';
export { InternalServerError } from './http/InternalServerError.js';

// Domain errors
export { StorageError, StorageErrorCode } from './domain/StorageError.js';
export { MediaError, MediaErrorCode } from './domain/MediaError.js';

// Validation errors
export { ValidationError } from './validation/ValidationError.js';

// Error handlers
export { handleError, handleUncaughtErrors } from './handlers.js';

// Error handler type
export type ErrorHandler = (error: Error) => void; 