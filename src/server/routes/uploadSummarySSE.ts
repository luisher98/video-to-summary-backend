import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { promises as fsPromises } from "fs";
import { processUploadedFile } from "../../services/summary/fileUploadSummary.js";
import { ProgressUpdate } from "../../types/global.types.js";
import { BadRequestError } from "../../utils/errorHandling.js";
import { Readable } from "stream";
import { FILE_SIZE, TEMP_DIRS } from "../../utils/utils.js";
import { promises as fs } from 'fs';
import fs_sync from 'fs';

// Constants for file size limits and chunking
const MEMORY_LIMIT = 200 * 1024 * 1024; // 200MB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
}

interface ProgressMessage {
    status: 'uploading' | 'processing' | 'done' | 'error';
    message: string;
    progress: number;
}

// Configure storage based on file size
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fsPromises.mkdir(TEMP_DIRS.uploads, { recursive: true });
            cb(null, TEMP_DIRS.uploads);
        } catch (error) {
            cb(error as Error, TEMP_DIRS.uploads);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: FILE_SIZE.MAX_FILE_SIZE,
    },
    fileFilter: (req: Request, file: MulterFile, cb: multer.FileFilterCallback) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new BadRequestError('Only video files are allowed'));
        }
    }
});

/**
 * Formats a progress update message in a memory-efficient way
 */
function formatProgressMessage(data: ProgressMessage): string {
    return `data: ${JSON.stringify({
        status: data.status,
        message: data.message,
        progress: Math.round(data.progress)
    })}\n\n`;
}

/**
 * Debounce function to limit the frequency of progress updates
 */
function debounce(
    func: (data: ProgressMessage) => void,
    _wait: number
): (data: ProgressMessage) => void {
    let lastProgress = -1;

    return (data: ProgressMessage) => {
        const progress = data.progress;
        
        if (progress === 0 || progress === 100 || 
            lastProgress === -1 || 
            progress - lastProgress >= 5) {
            
            func(data);
            lastProgress = progress;
        }
    };
}

/**
 * Creates a readable stream from a file, handling chunking for large files
 */
async function createFileStream(file: MulterFile): Promise<Readable> {
    if (!file.path) {
        throw new Error('File path is required for chunked upload');
    }

    const fileSize = file.size;
    
    if (fileSize <= FILE_SIZE.MEMORY_LIMIT) {
        const buffer = await fs.readFile(file.path);
        return Readable.from(buffer);
    } else {
        return fs_sync.createReadStream(file.path, {
            highWaterMark: FILE_SIZE.CHUNK_SIZE
        });
    }
}

/**
 * Server-Sent Events endpoint for generating summaries from uploaded video files with real-time progress updates.
 * 
 * @param {Request} req - Express request object with query parameters:
 *   - words: (optional) Maximum words in summary, defaults to 400
 * @param {Response} res - Express response object for SSE stream
 * 
 * @example
 * POST /api/upload-summary-sse?words=300
 * Content-Type: multipart/form-data
 * 
 * // SSE Response Events:
 * data: {"status": "pending", "message": "Processing uploaded file..."}
 * data: {"status": "pending", "message": "Generating transcript..."}
 * data: {"status": "done", "message": "Summary text..."}
 */
export default function uploadSummarySSE(req: Request, res: Response): void {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no"); // Prevents Azure from buffering

    let uploadedBytes = 0;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    // Create debounced progress sender
    const sendProgress = debounce((data: ProgressMessage) => {
        try {
            const message = formatProgressMessage(data);
            res.write(message);
        } catch (error) {
            console.error('Error sending progress update:', error);
        }
    }, 500);

    // Track upload progress
    req.on('data', (chunk: Buffer) => {
        uploadedBytes += chunk.length;
        if (contentLength > 0) {
            const progress = Math.min((uploadedBytes / contentLength) * 100, 100);
            sendProgress({
                status: 'uploading',
                message: `Uploading: ${Math.round(progress)}%`,
                progress
            });
        }
    });

    // Handle file upload
    upload.single('video')(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            sendProgress({
                status: "error",
                message: err instanceof multer.MulterError 
                    ? `Upload error: ${err.message}` 
                    : err instanceof Error 
                        ? err.message 
                        : 'Unknown upload error',
                progress: 0
            });
            return res.end();
        }

        const file = (req as Request & { file?: MulterFile }).file;
        if (!file) {
            console.error('No file in request');
            sendProgress({
                status: "error",
                message: "No file uploaded",
                progress: 0
            });
            return res.end();
        }

        console.log('File received:', {
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            path: file.path
        });

        let words = Number(req.query.words);
        if (isNaN(words)) words = 400;

        try {
            // Create file stream for processing
            const fileStream = await createFileStream(file);

            sendProgress({ 
                status: 'processing',
                message: 'Starting file processing...',
                progress: 0
            });

            const summary = await processUploadedFile({
                file: fileStream,
                originalFilename: file.originalname,
                fileSize: file.size,
                words: words || 400,
                additionalPrompt: req.query.prompt as string,
                requestInfo: {
                    ip: req.ip || req.socket.remoteAddress || 'unknown',
                    userAgent: req.get('user-agent')
                },
                updateProgress: (progress: ProgressUpdate) => {
                    sendProgress({
                        status: progress.status,
                        message: progress.message || 'Processing...',
                        progress: progress.progress
                    });
                },
            });

            // Send final summary
            sendProgress({ 
                status: "done", 
                message: summary,
                progress: 100
            });
        } catch (error) {
            console.error('Processing error:', error);
            sendProgress({
                status: "error",
                message: error instanceof Error 
                    ? `Processing error: ${error.message}` 
                    : 'Unknown processing error',
                progress: 0
            });
        } finally {
            // Clean up temporary file
            if (file?.path) {
                try {
                    await fs.unlink(file.path);
                } catch (cleanupError) {
                    console.error('Error cleaning up temporary file:', cleanupError);
                }
            }
            res.end();
        }
    });
} 

