import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/utils/errors/index.js';

export function validateUrl(req: Request, res: Response, next: NextFunction): void {
    const url = req.query.url as string;

    if (!url) {
        throw new BadRequestError('YouTube URL is required');
    }

    if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
        throw new BadRequestError('Invalid YouTube URL format');
    }

    next();
}

export function validateWordCount(req: Request, res: Response, next: NextFunction): void {
    // If no word count provided, skip validation
    if (!req.query.words) {
        return next();
    }

    const words = Number(req.query.words);

    if (isNaN(words) || words < 50 || words > 1000) {
        throw new BadRequestError('Word count must be between 50 and 1000');
    }

    next();
} 