import { Request, Response } from "express";
import { SummaryServiceFactory } from "../../services/summary/SummaryService.js";
import { MediaSource } from "../../services/summary/SummaryService.js";
import { BadRequestError } from "../../utils/errors/errorHandling.js";
import { validateVideoFile } from "../../utils/file/fileValidation.js";
import { ProcessingStatus } from "../../services/summary/SummaryService.js";
import { azureStorage } from "../../services/storage/azure/azureStorageService.js";

interface ProgressMessage {
    status: ProcessingStatus;
    message: string;
    progress: number;
}

/**
 * Maps internal processing status to client-facing status
 */
function mapStatus(status: ProcessingStatus): ProcessingStatus {
    // If we need to map any statuses differently for the client, do it here
    return status;
}

/**
 * Formats a progress update message in a memory-efficient way
 */
function formatProgressMessage(data: ProgressMessage): string {
    return `data: ${JSON.stringify({
        status: mapStatus(data.status),
        message: data.message,
        progress: Math.round(data.progress)
    })}\n\n`;
}

/**
 * Server-Sent Events endpoint for getting summaries from Azure Blob Storage.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - words: (optional) Maximum words in summary, defaults to 400
 *   - fileId: ID of the file in Azure Blob Storage
 *   - blobName: Name of the blob in Azure Storage
 * @param {Response} res - Express response object for SSE stream
 * 
 * @example
 * GET /api/get-azure-summary-sse?fileId=xxx&blobName=xxx&words=400
 */
export default async function getAzureSummarySSE(req: Request, res: Response): Promise<void> {
    try {
        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("X-Accel-Buffering", "no");

        const fileId = req.query.fileId as string;
        const blobName = req.query.blobName as string;
        let words = Number(req.query.words);
        if (isNaN(words)) words = 400;

        if (!fileId || !blobName) {
            throw new BadRequestError('fileId and blobName are required');
        }

        // Send initial progress
        res.write(formatProgressMessage({ 
            status: 'processing',
            message: 'Starting file processing from Azure Blob Storage...',
            progress: 0
        }));

        // Get file stream from Azure
        const fileStream = await azureStorage.downloadFile(blobName);
        const fileSize = await azureStorage.fileExists(blobName) ? 0 : 0; // Size not critical here

        const summaryService = SummaryServiceFactory.createFileUploadService();
        
        // Set up progress tracking
        summaryService.onProgress((progress) => {
            res.write(formatProgressMessage({
                status: progress.status,
                message: progress.message || 'Processing...',
                progress: progress.progress
            }));
        });

        // Process file
        const source: MediaSource = {
            type: 'file',
            data: {
                file: fileStream,
                filename: blobName,
                size: fileSize
            }
        };

        const summary = await summaryService.process(source, {
            maxWords: words,
            additionalPrompt: req.query.prompt as string
        });

        // Send final summary
        res.write(formatProgressMessage({ 
            status: "done", 
            message: summary.content,
            progress: 100
        }));

    } catch (error) {
        console.error('Azure blob processing error:', error);
        res.write(formatProgressMessage({
            status: "error",
            message: error instanceof Error 
                ? `Azure processing error: ${error.message}` 
                : 'Unknown processing error',
            progress: 0
        }));
    } finally {
        res.end();
    }
} 