import { Request, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { validateVideoFile } from '../../utils/file/fileValidation.js';
import { SummaryServiceFactory } from '../../services/summary/factories/SummaryServiceFactory.js';
import { MediaSource } from '../../services/summary/core/interfaces/IMediaProcessor.js';
import { ProcessingStatus } from '../../services/summary/core/types/progress.types.js';
import { FILE_SIZE } from '../../utils/constants/fileSize.js';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: FILE_SIZE.MAX_FILE_SIZE
    }
}).single('file');

/**
 * @swagger
 * /api/upload/summary/stream:
 *   post:
 *     summary: Upload a video file and get a summary with SSE progress updates
 *     tags: [Upload]
 *     parameters:
 *       - in: query
 *         name: words
 *         schema:
 *           type: integer
 *         description: Maximum number of words in the summary
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video summary with progress updates
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 progress:
 *                   type: number
 */
export default async function summarizeUploadStream(req: Request, res: Response): Promise<void> {
    // Track if response has ended to prevent duplicate writes
    let hasEnded = false;

    // Helper to safely write SSE data
    const writeSSE = (data: any) => {
        if (!hasEnded && !res.writableEnded) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };

    // Helper to safely end the response
    const endResponse = () => {
        if (!hasEnded && !res.writableEnded) {
            hasEnded = true;
            res.end();
        }
    };

    try {
        // Set headers for SSE before any potential writes
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Handle file upload
        await new Promise<void>((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.file) {
            writeSSE({
                status: 'error',
                message: 'No file uploaded',
                progress: 0
            });
            return endResponse();
        }

        // Validate file type
        const isValid = await validateVideoFile(req.file.buffer);
        if (!isValid) {
            writeSSE({
                status: 'error',
                message: 'Invalid file type. Supported types: MP4, WebM, QuickTime',
                progress: 0
            });
            return endResponse();
        }

        // Create a readable stream from the buffer
        const fileStream = Readable.from(req.file.buffer);

        // Get words parameter
        const words = parseInt(req.query.words as string) || 300;

        // Initialize summary service
        const summaryService = SummaryServiceFactory.createFileUploadService();

        // Set up progress tracking
        summaryService.onProgress((progress) => {
            if (progress.status === 'done') {
                // For final summary, include the content
                writeSSE({
                    status: 'done',
                    message: progress.message,
                    progress: 100
                });
                endResponse();
            } else {
                // For other updates, ensure progress never goes backwards
                // and transitions smoothly between stages
                const currentProgress = Math.max(
                    progress.progress,
                    progress.status === 'processing' ? 5 :
                    progress.status === 'converting' ? 35 : 45
                );

                writeSSE({
                    status: progress.status,
                    message: progress.message || 'Processing...',
                    progress: Math.min(currentProgress, 99) // Never reach 100 until done
                });
            }
        });

        // Process file
        const source: MediaSource = {
            type: 'file',
            data: {
                file: fileStream,
                filename: req.file.originalname,
                size: req.file.size
            }
        };

        // Process the file - the summary will be sent via the progress handler
        await summaryService.process(source, {
            maxWords: words,
            additionalPrompt: req.query.prompt as string
        });

        // Ensure response is ended if not already
        endResponse();
    } catch (error: any) {
        console.error('Error processing upload:', error);
        writeSSE({
            status: 'error',
            message: `Failed to process uploaded file: ${error.message}`,
            progress: 0
        });
        endResponse();
    }
} 

