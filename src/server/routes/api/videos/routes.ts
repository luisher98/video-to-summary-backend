import { Request, Response } from 'express';
import { createStorageService } from '@/services/storage/StorageService.js';
import { SummaryServiceFactory, MediaSource } from '@/services/summary/SummaryService.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';
import { handleError } from '@/utils/errors/errorHandling.js';
import { v4 as uuidv4 } from 'uuid';
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

// Create storage service instance
const storage = createStorageService(AZURE_STORAGE_CONFIG);
let isInitialized = false;

// Ensure storage is initialized
async function ensureStorageInitialized() {
    if (!isInitialized) {
        await storage.initialize();
        isInitialized = true;
    }
}

interface UploadRequest {
    fileName: string;
    fileSize: number;
}

// Helper to generate the full blob name
function generateBlobName(fileId: string, fileName?: string): string {
    return fileName ? `${fileId}-${fileName}` : fileId;
}

/**
 * Step 1: Initiate the upload process and get a pre-signed URL
 */
export async function initiateUpload(req: Request, res: Response) {
    try {
        await ensureStorageInitialized();
        
        const { fileName, fileSize } = req.body as UploadRequest;
        const fileId = uuidv4();
        const blobName = generateBlobName(fileId, fileName);
        
        // Generate upload URL with metadata
        const uploadUrl = await storage.generateUploadUrl(blobName, {
            metadata: {
                originalName: fileName,
                size: fileSize.toString(),
                uploadedAt: new Date().toISOString(),
                fileId // Store the original fileId in metadata
            }
        });

        // Return a consistent response structure
        res.json({
            fileId,
            uploadUrl: {
                ...uploadUrl,
                sasUrl: uploadUrl.url // Add sasUrl for clarity
            },
            fileName,
            fileSize,
            blobName
        });
    } catch (error) {
        handleError(error, res);
    }
}

/**
 * Step 2: Handle the actual file upload
 */
export async function uploadContent(req: Request, res: Response) {
    try {
        await ensureStorageInitialized();
        
        const { fileId } = req.params;
        const { file } = req;

        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        // Upload the file
        const uploadResult = await storage.uploadFile(
            file.buffer,
            fileId,
            file.size
        );

        res.json({
            fileId,
            url: uploadResult,
            status: 'uploaded'
        });
    } catch (error) {
        handleError(error, res);
    }
}

/**
 * Step 3: Process the uploaded video with progress streaming
 */
export async function processVideo(req: Request, res: Response) {
    const { fileId } = req.params;

    try {
        await ensureStorageInitialized();
        
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Get the file directly using the fileId as the blob name
        const blobName = generateBlobName(fileId, 'test-video.mp4');
        console.log('Looking for blob:', blobName);

        // Check if file exists
        const exists = await storage.fileExists(blobName);
        if (!exists) {
            throw new Error(`File ${blobName} not found`);
        }

        // Get the file stream
        const fileStream = await storage.downloadFile(blobName);
        
        const summaryService = SummaryServiceFactory.createFileUploadService();
        
        // Set up progress tracking
        summaryService.onProgress((progress) => {
            if (progress.status !== 'done') {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        });

        const source: MediaSource = {
            type: 'file',
            data: {
                file: fileStream,
                filename: fileId,
                size: 0 // Size will be determined from the stream
            }
        };

        const summary = await summaryService.process(source, {
            maxWords: Number(req.query.words) || 400,
            additionalPrompt: req.query.prompt as string
        });

        // Send final summary
        res.write(`data: ${JSON.stringify({
            status: 'done',
            message: summary.content,
            progress: 100
        })}\n\n`);
        res.end();
    } catch (error) {
        // Send error through SSE if possible
        if (!res.headersSent) {
            res.write(`data: ${JSON.stringify({
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                progress: 0
            })}\n\n`);
            res.end();
        }
    }
} 