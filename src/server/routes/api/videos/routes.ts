import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createStorageService } from '@/services/storage/StorageService.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';
import { processTimer } from '@/utils/logging/logger.js';
import { withErrorHandling } from '@/utils/errors/index.js';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { Readable } from 'stream';

/**
 * Video Upload and Processing API
 * 
 * Flow:
 * 1. POST /api/videos/upload/initiate
 *    - Request: { fileName: string, fileSize: number }
 *    - Response: { 
 *        fileId: string, 
 *        uploadUrl: { 
 *          url: string,      // Base URL
 *          sasUrl: string,   // URL with SAS token for upload
 *          blobName: string,
 *          expiresAt: string,
 *          maxSize: number,
 *          metadata: object
 *        }, 
 *        fileName: string, 
 *        fileSize: number,
 *        blobName: string
 *      }
 * 
 * 2. PUT to Azure Storage directly using uploadUrl.sasUrl
 *    - Request: PUT to sasUrl with video content and required headers
 *    - Headers: 
 *      * x-ms-blob-type: BlockBlob
 *      * Content-Type: video/mp4 (or appropriate mime type)
 * 
 * 3. POST /api/videos/{fileId}/process
 *    - Request: query params: words?: number, prompt?: string
 *    - Response: Server-Sent Events with progress and final summary
 *    - Events: 
 *      * progress: { status: string, progress: number, ... }
 *      * done: { status: 'done', message: string, progress: 100 }
 *      * error: { status: 'error', message: string, progress: 0 }
 */

let storage: Awaited<ReturnType<typeof createStorageService>>;

async function ensureStorageInitialized() {
    if (!storage) {
        storage = await createStorageService(AZURE_STORAGE_CONFIG);
        await storage.initialize();
    }
    return storage;
}

interface UploadRequest {
    fileName: string;
    fileSize: number;
}

function generateBlobName(fileId: string, fileName?: string): string {
    const extension = fileName ? fileName.split('.').pop() : '';
    return `${fileId}${extension ? `.${extension}` : ''}`;
}

/**
 * Step 1: Get upload URL
 */
export const initiateUpload = withErrorHandling(async (req: Request, res: Response) => {
    const { fileName, fileSize } = req.body as UploadRequest;
    
    processTimer.startProcess('initiate_upload');
    const storage = await ensureStorageInitialized();

    const fileId = uuidv4();
    const blobName = generateBlobName(fileId, fileName);
    
    const uploadUrl = await storage.generateUploadUrl(blobName, {
        metadata: {
            originalName: fileName,
            size: fileSize.toString(),
            uploadedAt: new Date().toISOString()
        }
    });

    processTimer.endProcess('initiate_upload');

    return {
        data: {
            fileId,
            uploadUrl: {
                ...uploadUrl,
                sasUrl: uploadUrl.url // Add sasUrl for clarity
            },
            fileName,
            fileSize,
            blobName
        }
    };
});

/**
 * Step 2: Handle the actual file upload
 */
export const uploadContent = withErrorHandling(async (req: Request, res: Response) => {
    const { fileId, blobName } = req.body;
    if (!fileId || !blobName) {
        throw new Error('fileId and blobName are required');
    }

    processTimer.startProcess('upload_content');
    const storage = await ensureStorageInitialized();

    const uploadResult = await storage.uploadFile(
        req.file!.buffer,
        blobName,
        req.file!.size
    );

    processTimer.endProcess('upload_content');

    return {
        data: {
            fileId,
            blobName,
            url: uploadResult
        }
    };
});

/**
 * Step 3: Process the uploaded video
 */
export const processVideo = withErrorHandling(async (req: Request, res: Response) => {
    const { fileId, blobName } = req.body;
    if (!fileId || !blobName) {
        throw new Error('fileId and blobName are required');
    }

    processTimer.startProcess('process_video');
    const storage = await ensureStorageInitialized();

    // Get the file URL from the storage provider
    const url = await storage.uploadFile(blobName, '', 0); // This will return the URL without uploading

    // TODO: Add video processing logic here
    const result = {
        fileId,
        blobName,
        url,
        status: 'pending',
        message: 'Video processing queued'
    };

    processTimer.endProcess('process_video');

    return { data: result };
}); 