import { Readable } from 'stream';
import { AzureStorageService, azureStorage } from '../storage/azureStorage.js';
import { generateTranscript, generateSummary } from '../../lib/openAI.js';
import { ProgressUpdate } from '../../types/global.types.js';
import { InternalServerError } from '../../utils/errorHandling.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, VIDEO_DOWNLOAD_PATH } from '../../utils/utils.js';

// Initialize ffmpeg with proper path
const ffmpegBinaryPath = getFfmpegPath();
console.log('Using ffmpeg from:', ffmpegBinaryPath);
ffmpeg.setFfmpegPath(ffmpegBinaryPath);

// Ensure required directories exist
if (!fs.existsSync(VIDEO_DOWNLOAD_PATH)) {
    fs.mkdirSync(VIDEO_DOWNLOAD_PATH, { recursive: true });
}

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
    const sessionId = uuidv4();
    const tempDir = path.join(process.env.TEMP_DIR || './tmp', sessionId);
    const fileId = uuidv4();
    const audioFilePath = `${VIDEO_DOWNLOAD_PATH}/${fileId}.mp3`;
    let useAzure = false;

    try {
        // Create temporary directories
        await fsPromises.mkdir(tempDir, { recursive: true });
        await fsPromises.mkdir(VIDEO_DOWNLOAD_PATH, { recursive: true });

        // 1. Handle file storage based on size
        updateProgress({ 
            status: 'pending', 
            message: 'Starting file processing...',
            progress: 0
        });
        
        useAzure = AzureStorageService.shouldUseAzureStorage(fileSize);
        if (useAzure) {
            // Upload to Azure using stream
            const blobName = `${fileId}-${originalFilename}`;
            console.log('Starting Azure upload:', { fileSize, blobName });
            
            updateProgress({ 
                status: 'pending', 
                message: 'Uploading to cloud storage...',
                progress: 10 
            });
            
            // Upload to Azure (uploadFile method supports streams)
            try {
                console.log('Initiating file upload to Azure');
                await azureStorage.uploadFile(file, blobName, fileSize, (progress: number) => {
                    console.log('Upload progress:', progress);
                    updateProgress({
                        status: 'pending',
                        message: `Uploading to cloud storage: ${Math.round(progress)}%`,
                        progress: 10 + (progress * 0.2) // Scale to 10-30% range
                    });
                });
                console.log('File upload to Azure completed');
            } catch (error) {
                console.error('Error during Azure upload:', error);
                throw error;
            }
            
            updateProgress({ 
                status: 'pending', 
                message: 'Converting video to audio...',
                progress: 30 
            });

            // Download and convert to MP3
            const videoStream = await azureStorage.downloadFile(blobName);
            await new Promise<void>((resolve, reject) => {
                let progress = 0;
                ffmpeg()
                    .input(videoStream)
                    .toFormat('mp3')
                    .on('progress', (info) => {
                        if (info.percent) {
                            progress = Math.min(info.percent, 100);
                            updateProgress({ 
                                status: 'pending', 
                                message: `Converting video: ${progress.toFixed(1)}%`,
                                progress: 30 + (progress * 0.3) // Scale to 30-60% range
                            });
                        }
                    })
                    .on('end', () => {
                        updateProgress({ 
                            status: 'pending', 
                            message: 'Audio conversion complete',
                            progress: 60 
                        });
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg error:', err);
                        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
                    })
                    .save(audioFilePath);
            });
            
            // Clean up Azure storage
            await azureStorage.deleteFile(blobName);
        } else {
            // For smaller files, process directly
            updateProgress({ 
                status: 'pending', 
                message: 'Processing video locally...',
                progress: 10 
            });

            // Convert directly to MP3 using ffmpeg
            await new Promise<void>((resolve, reject) => {
                let progress = 0;
                ffmpeg()
                    .input(file)
                    .toFormat('mp3')
                    .on('progress', (info) => {
                        if (info.percent) {
                            progress = Math.min(info.percent, 100);
                            updateProgress({ 
                                status: 'pending', 
                                message: `Converting video: ${progress.toFixed(1)}%`,
                                progress: 30 + (progress * 0.3) // Scale to 30-60% range
                            });
                        }
                    })
                    .on('end', () => {
                        updateProgress({ 
                            status: 'pending', 
                            message: 'Audio conversion complete',
                            progress: 60 
                        });
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('FFmpeg error:', err);
                        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
                    })
                    .save(audioFilePath);
            });
        }

        // 2. Generate transcript
        updateProgress({ 
            status: 'pending', 
            message: 'Generating transcript...',
            progress: 70 
        });
        
        const transcript = await generateTranscript(fileId);

        if (returnTranscriptOnly) {
            await cleanupFiles(fileId);
            return transcript;
        }

        // 3. Generate summary
        updateProgress({ 
            status: 'pending', 
            message: 'Generating summary...',
            progress: 90 
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
            status: 'pending', 
            message: 'Finalizing...',
            progress: 100 
        });

        return summary;
    } catch (error) {
        console.error('Error processing uploaded file:', error);
        throw new InternalServerError(
            `Failed to process uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    } finally {
        // Cleanup
        await Promise.all([
            fsPromises.rm(tempDir, { recursive: true, force: true }),
            cleanupFiles(fileId)
        ]).catch(err => {
            console.error('Error during cleanup:', err);
        });
    }
}

/**
 * Clean up temporary files
 */
async function cleanupFiles(fileId: string): Promise<void> {
    try {
        await fsPromises.unlink(`${VIDEO_DOWNLOAD_PATH}/${fileId}.mp3`);
    } catch (error) {
        console.error('Error cleaning up files:', error);
    }
} 
