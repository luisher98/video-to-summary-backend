export class StorageError extends Error {
    constructor(message: string, public originalError?: Error) {
        super(message);
        this.name = 'StorageError';
        
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, StorageError);
        }

        // If there's an original error, append its message and stack
        if (originalError) {
            this.message = `${message}: ${originalError.message}`;
            this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
        }
    }
} 