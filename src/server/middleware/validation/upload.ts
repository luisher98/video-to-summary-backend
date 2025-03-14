import { Request } from 'express';
import { BadRequestError } from '@/utils/errors/index.js';
import { FILE_SIZE } from '@/config/fileSize.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';

/**
 * Validates if a file size is within acceptable range
 */
function isValidFileSize(size: number): boolean {
    return typeof size === 'number' && 
           size > 0 && 
           size <= FILE_SIZE.MAX_FILE_SIZE;
}

/**
 * Validates if a file type is allowed
 */
function isValidFileType(mimeType: string): boolean {
    return AZURE_STORAGE_CONFIG.allowedFileTypes.includes(mimeType);
}

/**
 * Validates file metadata
 */
function isValidFileMetadata(fileName?: string, fileSize?: number): boolean {
    return Boolean(fileName) && 
           typeof fileSize === 'number' && 
           isValidFileSize(fileSize);
}

/**
 * Validates file upload initiation request
 */
export function validateUploadInit(req: Request): void {
    const { fileName, fileSize } = req.body;
    if (!isValidFileMetadata(fileName, fileSize)) {
        throw new BadRequestError('Invalid or missing file metadata');
    }
}

/**
 * Validates uploaded file
 */
export function validateUploadedFile(req: Request): void {
    const { file } = req;
    if (!file) {
        throw new BadRequestError('No file provided');
    }
    if (!isValidFileSize(file.size)) {
        throw new BadRequestError(`File size ${file.size} exceeds maximum allowed size`);
    }
}

/**
 * Validates file type from request
 */
export function validateFileTypeFromRequest(req: Request): void {
    const { file } = req;
    if (!file) {
        throw new BadRequestError('No file provided');
    }
    if (!isValidFileType(file.mimetype)) {
        throw new BadRequestError('Unsupported file type');
    }
} 