import { Readable } from 'stream';
import { AzureStorageService, azureStorage } from '../storage/azureStorage.js';
import { generateTranscript, generateSummary } from '../../lib/openAI.js';
import { ProgressUpdate } from '../../types/global.types.js';
import { InternalServerError } from '../../utils/errorHandling.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';
import fs_sync from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, TEMP_DIRS, validateVideoFile } from '../../utils/utils.js';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

// Initialize ffmpeg with proper path
const ffmpegBinaryPath = getFfmpegPath();
console.log('Using ffmpeg from:', ffmpegBinaryPath);
ffmpeg.setFfmpegPath(ffmpegBinaryPath);

interface FileUploadSummaryOptions {
    /** The uploaded file stream */
    file: Readable;
    /** Original filename */
    originalFilename: string;
    /** File size in bytes */
    fileSize: number;
    /** Number of words for the summary (default: 400) */
    words?: number;
    /** Callback function to report progress updates */
    updateProgress?: (progress: ProgressUpdate) => void;
    /** Additional instructions for the AI summarizer */
    additionalPrompt?: string;
    /** Whether to return only the transcript without summarizing */
    returnTranscriptOnly?: boolean;
    /** Request information */
    requestInfo?: {
        ip: string;
        userAgent?: string;
    };
}

/**
 * Clean up temporary files and blob storage
 */
async function cleanupFiles(fileId: string, originalFilename: string, useAzure: boolean): Promise<void> {
    try {
        // Clean up local audio file
        await fs.unlink(`${TEMP_DIRS.audios}/${fileId}.mp3`).catch(error => {
            console.error('Error cleaning up audio file:', error);
        });

        // Clean up Azure blob if used
        if (useAzure) {
            const blobName = `${fileId}-${originalFilename}`;
            await azureStorage.deleteFile(blobName).catch(error => {
                console.error('Error cleaning up Azure blob:', error);
            });
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

/**
 * Process an uploaded video file to generate a summary or transcript
 */
export async function processUploadedFile({
    file,
    originalFilename,
    fileSize,
    words = 400,
    updateProgress = () => {},
    additionalPrompt = '',
    returnTranscriptOnly = false,
    requestInfo,
}: FileUploadSummaryOptions): Promise<string> {
    if (!ffmpegPath) {
        throw new Error('FFmpeg not found');
    }

    const sessionId = uuidv4();
    const sessionDir = path.join(TEMP_DIRS.sessions, sessionId);
    const fileId = uuidv4();
    const audioFilePath = path.join(TEMP_DIRS.audios, `${fileId}.mp3`);
    let useAzure = false;

    try {
        // Create temporary directories
        await fs.mkdir(sessionDir, { recursive: true });
        await fs.mkdir(TEMP_DIRS.audios, { recursive: true });

        // 1. Handle file storage based on size
        updateProgress({ 
            status: 'processing', 
            message: 'Starting file processing...',
            progress: 0
        });
        
        useAzure = AzureStorageService.shouldUseAzureStorage(fileSize);
        
        // Save stream to temporary file for validation
        const tempVideoPath = path.join(sessionDir, `${fileId}-original${path.extname(originalFilename)}`);
        const writeStream = fs_sync.createWriteStream(tempVideoPath);
        await new Promise((resolve, reject) => {
            file.pipe(writeStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        // Validate video file
        const isValid = await validateVideoFile(tempVideoPath);
        if (!isValid) {
            throw new Error('Invalid or unsupported video file format');
        }

        if (useAzure) {
            // Upload to Azure using the saved file
            const blobName = `${fileId}-${originalFilename}`;
            console.log('Starting Azure upload:', { fileSize, blobName });
            
            updateProgress({ 
                status: 'uploading', 
                message: 'Uploading to cloud storage...',
                progress: 10 
            });
            
            try {
                const fileStream = fs_sync.createReadStream(tempVideoPath);
                await azureStorage.uploadFile(fileStream, blobName, fileSize, (progress: number) => {
                    console.log('Upload progress:', progress);
                    updateProgress({
                        status: 'uploading',
                        message: `Uploading to cloud storage: ${Math.round(progress)}%`,
                        progress: 10 + (progress * 0.2)
                    });
                });
                console.log('File upload to Azure completed');
            } catch (uploadError: unknown) {
                const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
                throw new Error(`Azure upload failed: ${errorMessage}`);
            }
        }

        // Convert to audio with improved error handling
        updateProgress({ 
            status: 'processing', 
            message: 'Extracting audio...',
            progress: 30 
        });

        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .toFormat('mp3')
                .on('start', (commandLine) => {
                    console.log('FFmpeg conversion started:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('FFmpeg progress:', progress);
                })
                .on('error', (err, stdout, stderr) => {
                    console.error('FFmpeg error:', err.message);
                    console.error('FFmpeg stderr:', stderr);
                    reject(new Error(`FFmpeg conversion failed: ${err.message}\n${stderr}`));
                })
                .on('end', () => {
                    console.log('FFmpeg conversion completed');
                    resolve();
                })
                .save(audioFilePath);
        });

        // Clean up temporary video file
        await fs.unlink(tempVideoPath);

        // 2. Generate transcript
        updateProgress({ 
            status: 'processing', 
            message: 'Generating transcript...',
            progress: 50 
        });
        
        const transcript = await generateTranscript(fileId);

        if (returnTranscriptOnly) {
            await cleanupFiles(fileId, originalFilename, useAzure);
            return transcript;
        }

        // 3. Generate summary
        updateProgress({ 
            status: 'processing', 
            message: 'Generating summary...',
            progress: 80 
        });
        
        const summary = await generateSummary(transcript, words, additionalPrompt);

        // Log success
        console.log('Successfully generated summary:', {
            filename: originalFilename,
            fileSize,
            useAzure,
            ip: requestInfo?.ip || 'unknown',
            userAgent: requestInfo?.userAgent || 'unknown',
            timestamp: new Date().toISOString()
        });

        updateProgress({ 
            status: 'processing', 
            message: 'Finalizing summary...',
            progress: 90 
        });

        return summary;
    } catch (error: unknown) {
        console.error('Error processing file:', error);
        throw error;
    } finally {
        // Clean up all temporary files and blobs
        await cleanupFiles(fileId, originalFilename, useAzure);
    }
} 
