import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware function type
 */
export type ExpressMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => void | Promise<void>;

/**
 * Express request validator function type
 */
export type RequestValidator = (req: Request) => void | Promise<void>;

/**
 * Converts a request validator to an Express middleware
 */
const asMiddleware = (validator: RequestValidator): ExpressMiddleware => {
    return async (req, res, next) => {
        try {
            await validator(req);
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Composes multiple middleware functions into a single middleware.
 * Automatically converts validators to middleware.
 * 
 * @param fns Array of middleware or validation functions to compose
 * @returns Express middleware function
 * 
 * @example
 * // Simple validation
 * app.post('/upload', compose(validateFileSize), uploadHandler);
 * 
 * @example
 * // Multiple validations
 * const validateUpload = compose(validateFileSize, validateFileType);
 * app.post('/upload', validateUpload, uploadHandler);
 * 
 * @example
 * // Mix of validations and middleware
 * const secureUpload = compose(
 *   validateFileSize,    // validator
 *   checkAuth,          // middleware
 *   rateLimit           // middleware
 * );
 */
export const compose = (
    ...fns: Array<ExpressMiddleware | RequestValidator>
): ExpressMiddleware => {
    // Convert validators to middleware and flatten the array
    const middleware = fns.map(fn => 
        fn.length === 1 ? asMiddleware(fn as RequestValidator) : fn as ExpressMiddleware
    );

    return async (req, res, next) => {
        const runner = async (index: number): Promise<void> => {
            if (index === middleware.length) {
                return next();
            }

            try {
                await new Promise<void>((resolve, reject) => {
                    middleware[index](req, res, (error?: any) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });
                await runner(index + 1);
            } catch (error) {
                next(error);
            }
        };

        await runner(0);
    };
};

// Semantic aliases for specific use cases
export const composeValidation = compose;
export const composeSecurity = compose; 