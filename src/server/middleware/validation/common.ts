import { Request } from 'express';
import { BadRequestError } from '@/utils/errors/index.js';

/**
 * Word count validation configuration
 */
export const WORD_COUNT_LIMITS = {
    MIN: 50,
    MAX: 1000
} as const;

/**
 * Validates if a word count is within acceptable range
 * @param count - Number of words to validate
 * @param min - Minimum allowed words (default: 50)
 * @param max - Maximum allowed words (default: 1000)
 */
function isValidWordCount(
    count: number,
    min: number = WORD_COUNT_LIMITS.MIN,
    max: number = WORD_COUNT_LIMITS.MAX
): boolean {
    return !isNaN(count) && count >= min && count <= max;
}

/**
 * Validates word count from request query parameter
 * @throws BadRequestError if word count is invalid
 */
export function validateRequestWordCount(req: Request): void {
    if (!req.query.words) return;
    
    const words = Number(req.query.words);
    if (!isValidWordCount(words)) {
        throw new BadRequestError(
            `Word count must be between ${WORD_COUNT_LIMITS.MIN} and ${WORD_COUNT_LIMITS.MAX}`
        );
    }
} 