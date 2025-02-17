import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/utils/errors/errorHandling.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';
import { FILE_SIZE } from '@/utils/constants/fileSize.js';

export function validateInitiateUpload(req: Request, res: Response, next: NextFunction): void {
    const { fileName, fileSize } = req.body;

    if (!fileName || !fileSize) {
        throw new BadRequestError('fileName and fileSize are required');
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
        throw new BadRequestError('fileSize must be a positive number');
    }

    if (fileSize > FILE_SIZE.MAX_FILE_SIZE) {
        throw new BadRequestError(`File size ${fileSize} exceeds maximum allowed size ${FILE_SIZE.MAX_FILE_SIZE}`);
    }

    next();
}

export function validateFileUpload(req: Request, res: Response, next: NextFunction): void {
    const { file } = req;

    if (!file) {
        throw new BadRequestError('No file provided');
    }

    if (file.size === 0) {
        throw new BadRequestError('File is empty');
    }

    if (file.size > FILE_SIZE.MAX_FILE_SIZE) {
        throw new BadRequestError(`File size ${file.size} exceeds maximum allowed size ${FILE_SIZE.MAX_FILE_SIZE}`);
    }

    next();
}

export function validateFileType(req: Request, res: Response, next: NextFunction): void {
    const { file } = req;

    if (!file) {
        throw new BadRequestError('No file provided');
    }

    if (!AZURE_STORAGE_CONFIG.allowedFileTypes.includes(file.mimetype)) {
        throw new BadRequestError(
            `Unsupported file type: ${file.mimetype}. Allowed types: ${AZURE_STORAGE_CONFIG.allowedFileTypes.join(', ')}`
        );
    }

    next();
}

export function validateWordCount(req: Request, res: Response, next: NextFunction): void {
    const words = Number(req.query.words);

    if (req.query.words && (isNaN(words) || words < 50 || words > 1000)) {
        throw new BadRequestError('Word count must be between 50 and 1000');
    }

    next();
} 