import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError } from '../../utils/errors/errorHandling.js';
import { azureStorage } from '../../services/storage/azure/azureStorageService.js';
import { SummaryServiceFactory } from '../../services/summary/factories/SummaryServiceFactory.js';
import { MediaSource } from '../../services/summary/core/interfaces/IMediaProcessor.js';

const router = Router();

interface UploadUrlRequest {
    fileName: string;
    fileSize: number;
}

/**
 * Get a pre-signed URL for uploading files to Azure Blob Storage.
 * 
 * @param {Request} req - Express request object with body:
 *   - fileName: Name of the file to upload
 *   - fileSize: Size of the file in bytes
 * @param {Response} res - Express response object
 * 
 * @example
 * POST /api/azure/upload/url
 * Content-Type: application/json
 * 
 * {
 *   "fileName": "video.mp4",
 *   "fileSize": 1024
 * }
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        console.log('Received upload URL request:', {
            body: req.body,
            headers: req.headers,
            method: req.method
        });

        const { fileName, fileSize } = req.body as UploadUrlRequest;

        if (!fileName || !fileSize) {
            throw new BadRequestError('fileName and fileSize are required');
        }

        if (typeof fileSize !== 'number' || fileSize <= 0) {
            throw new BadRequestError('Invalid file size');
        }

        // Generate a unique ID for the file
        const fileId = uuidv4();
        const blobName = `${fileId}-${fileName}`;

        console.log('Generating SAS URL for blob:', {
            fileId,
            blobName,
            fileSize
        });

        // Get SAS URL for upload
        const url = await azureStorage.generateUploadUrl(blobName);

        console.log('Generated SAS URL:', {
            url: url.substring(0, 100) + '...', // Log only the beginning for security
            fileId,
            blobName
        });

        res.json({
            data: {
                url,
                fileId,
                blobName
            }
        });
    } catch (error) {
        console.error('Error processing URL:', error);
        res.status(400).json({ 
            error: { 
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            } 
        });
    }
});

export default router; 