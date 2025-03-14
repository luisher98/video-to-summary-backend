import { Request, Response } from 'express';
import { StorageProvider } from '@/services/storage/StorageService.js';
import { withErrorHandling } from '@/utils/errors/index.js';
import { EventEmitter } from 'events';
import { logProcessStep } from '@/utils/logging/logger.js';

interface UploadRequest {
    fileName: string;
    fileSize: number;
}

interface UploadOptions {
    onProgress?: (bytesTransferred: number) => void;
}

interface UploadResult {
    url: string;
    blobName: string;
    [key: string]: any;
}

/**
 * Creates route handlers with the provided storage instance
 */
export function createRouteHandlers(storage: StorageProvider) {
    /**
     * Step 1: Initiate upload and get pre-signed URL
     */
    const initiateUpload = withErrorHandling(async (req: Request, res: Response) => {
        const { fileName, fileSize } = req.body as UploadRequest;
        
        if (!fileName || !fileSize) {
            throw new Error('fileName and fileSize are required');
        }

        const uploadUrl = await storage.generateUploadUrl(fileName, {
            metadata: {
                originalName: fileName,
                size: fileSize.toString(),
                uploadedAt: new Date().toISOString()
            }
        });

        return {
            data: {
                uploadUrl,
                fileName,
                fileSize
            }
        };
    });

    /**
     * Step 2: Handle direct file upload
     */
    const uploadContent = withErrorHandling(async (req: Request, res: Response) => {
        const { file } = req;
        if (!file) {
            throw new Error('No file provided');
        }

        // Create an event emitter for progress updates
        const progressEmitter = new EventEmitter();
        let uploadProgress = 0;

        // Set up progress tracking
        progressEmitter.on('progress', (progress: number) => {
            uploadProgress = progress;
            logProcessStep('File Upload', 'start', { progress });
        });

        // Start the upload
        logProcessStep('File Upload', 'start', { size: file.size });
        
        const uploadResult = await storage.uploadFile(
            file.buffer,
            file.originalname,
            file.size,
            {
                onProgress: (progress: number) => {
                    progressEmitter.emit('progress', progress);
                }
            }
        );

        // Log completion
        logProcessStep('File Upload', 'complete', { size: file.size });

        return {
            data: {
                url: uploadResult,
                blobName: file.originalname,
                progress: 100,
                status: 'completed',
                message: 'Upload completed successfully'
            }
        };
    });

    /**
     * Step 3: Process the uploaded file
     */
    const processVideo = withErrorHandling(async (req: Request, res: Response) => {
        const { blobName } = req.body;
        if (!blobName) {
            throw new Error('blobName is required');
        }

        // Get the file URL
        const url = await storage.uploadFile(blobName, '', 0); // This will return the URL without uploading

        return {
            data: {
                blobName,
                url,
                status: 'pending',
                message: 'Video processing queued'
            }
        };
    });

    return {
        initiateUpload,
        uploadContent,
        processVideo
    };
} 