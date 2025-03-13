/**
 * Base error class for all application errors
 */
export class ApplicationError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Creates a JSON representation of the error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details
        };
    }
} 