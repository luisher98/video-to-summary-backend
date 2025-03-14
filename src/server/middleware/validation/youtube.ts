import { Request } from 'express';
import { BadRequestError } from '@/utils/errors/index.js';

/**
 * YouTube URL validation patterns
 */
const YOUTUBE_PATTERNS = {
    WATCH: 'youtube.com/watch?v=',
    SHORT: 'youtu.be/'
} as const;

/**
 * Validates if a string is a valid YouTube URL
 * @param url - URL to validate
 */
function isValidYouTubeUrl(url: string): boolean {
    if (!url) return false;
    return url.includes(YOUTUBE_PATTERNS.WATCH) || url.includes(YOUTUBE_PATTERNS.SHORT);
}

/**
 * Validates YouTube URL from request query parameter
 * @throws BadRequestError if URL is invalid or missing
 */
export function validateYouTubeUrl(req: Request): void {
    const url = req.query.url as string;
    if (!isValidYouTubeUrl(url)) {
        throw new BadRequestError('Invalid or missing YouTube URL');
    }
}
