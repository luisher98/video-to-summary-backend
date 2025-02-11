import { Readable } from 'stream';
import { AzureStorageService, azureStorage } from '../../../storage/azure/azureStorageService.js';
import { ProgressUpdate } from '../../../../types/global.types.js';
import { InternalServerError } from '../../../../utils/errorHandling.js';
import path from 'path';
import { promises as fs } from 'fs';
import fs_sync from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, validateVideoFile } from '../../../../utils/utils.js';
import { BaseSummaryProcessor, SummaryOptions } from '../../summaryService.js';

// Initialize ffmpeg with proper path
const ffmpegBinaryPath = getFfmpegPath();
console.log('Using ffmpeg from:', ffmpegBinaryPath);
ffmpeg.setFfmpegPath(ffmpegBinaryPath);

interface FileUploadOptions extends SummaryOptions {
    /** The uploaded file stream */
    file: Readable;
    /** Original filename */
    originalFilename: string;
    /** File size in bytes */
    fileSize: number;
}

/**
 * Process an uploaded video file to generate a summary or transcript.
 * Implements the base summary service interface for file upload functionality.
 */
export class FileUploadSummary extends BaseSummaryProcessor {
    private async cleanupFiles(originalFilename: string, useAzure: boolean): Promise<void> {
        try {
            // Clean up local audio file
            await fs.unlink(this.audioFilePath).catch(error => {
                console.error('Error cleaning up audio file:', error);
            });

            // Clean up Azure blob if used
            if (useAzure) {
                const blobName = `${this.fileId}-${originalFilename}`;
                await azureStorage.deleteFile(blobName).catch((error: Error) => {
                    console.error('Error cleaning up Azure blob:', error);
                });
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    async process(options: FileUploadOptions): Promise<string> {
        const {
            file,
            originalFilename,
            fileSize,
            words = 400,
            updateProgress = () => {},
            additionalPrompt = '',
            returnTranscriptOnly = false,
            requestInfo
        } = options;

        let useAzure = false;
        const tempVideoPath = path.join(this.sessionDir, `${this.fileId}-original${path.extname(originalFilename)}`);

        try {
            await this.initializeDirs();

            // 1. Handle file storage based on size
            updateProgress({ 
                status: 'processing', 
                message: 'Starting file processing...',
                progress: 0
            });
            
            useAzure = AzureStorageService.shouldUseAzureStorage(fileSize);
            
            // Save stream to temporary file for validation
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
                await this.handleAzureUpload(tempVideoPath, originalFilename, fileSize, updateProgress);
            }

            // Convert to audio
            await this.convertToAudio(tempVideoPath, updateProgress);

            // Process transcript and summary
            const result = await this.processTranscriptAndSummary({
                words,
                updateProgress,
                additionalPrompt,
                returnTranscriptOnly,
                requestInfo
            });

            // Log success
            console.log('Successfully processed uploaded file:', {
                filename: originalFilename,
                fileSize,
                useAzure,
                ...requestInfo
            });

            return result;
        } catch (error: unknown) {
            console.error('Error processing file:', error);
            throw error;
        } finally {
            // Clean up temporary files
            await fs.unlink(tempVideoPath).catch(() => {});
            await this.cleanupFiles(originalFilename, useAzure);
            await this.cleanup();
        }
    }

    private async handleAzureUpload(
        tempVideoPath: string,
        originalFilename: string,
        fileSize: number,
        updateProgress: (progress: ProgressUpdate) => void
    ): Promise<void> {
        const blobName = `${this.fileId}-${originalFilename}`;
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

    private async convertToAudio(
        tempVideoPath: string,
        updateProgress: (progress: ProgressUpdate) => void
    ): Promise<void> {
        updateProgress({ 
            status: 'converting', 
            message: 'Converting video to audio...',
            progress: 30 
        });

        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .toFormat('mp3')
                .on('start', () => {
                    console.log('FFmpeg conversion started');
                })
                .on('progress', (progress) => {
                    const timemark = progress.timemark;
                    const timeInSeconds = this.parseTimemarkToSeconds(timemark);
                    const estimatedProgress = Math.min((timeInSeconds / (60 * 10)) * 100, 100);

                    updateProgress({
                        status: 'converting',
                        message: `Converting video: ${Math.round(estimatedProgress)}%`,
                        progress: 30 + (estimatedProgress * 0.2)
                    });
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
                .save(this.audioFilePath);
        });
    }

    private parseTimemarkToSeconds(timemark: string): number {
        const parts = timemark.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
} 