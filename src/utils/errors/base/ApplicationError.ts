import { ErrorContext } from '../types/error.types.js';

/**
 * Base error class for all application errors
 */
export class ApplicationError extends Error {
    public readonly timestamp: Date;

    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: unknown,
        public readonly context: Omit<ErrorContext, 'timestamp'> = {}
    ) {
        super(message);
        this.name = this.constructor.name;
        this.timestamp = new Date();
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
            details: this.details,
            context: {
                timestamp: this.timestamp,
                ...this.context
            }
        };
    }

    /**
     * Creates a string representation of the error
     */
    toString(): string {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
} 