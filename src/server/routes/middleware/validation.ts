import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/utils/errors/errorHandling.js';

export function validateFileUpload(req: Request, res: Response, next: NextFunction): void {
    const { fileName, fileSize } = req.body;

    if (!fileName || !fileSize) {
        throw new BadRequestError('fileName and fileSize are required');
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
        throw new BadRequestError('Invalid file size');
    }

    next();
}

export function validateYouTubeUrl(req: Request, res: Response, next: NextFunction): void {
    const url = req.query.url as string;

    if (!url || !url.includes('?v=')) {
        throw new BadRequestError('Invalid YouTube URL');
    }

    next();
}

export function validateWordCount(req: Request, res: Response, next: NextFunction): void {
    const words = Number(req.query.words);

    if (isNaN(words) || words < 50 || words > 1000) {
        throw new BadRequestError('Word count must be between 50 and 1000');
    }

    next();
} 