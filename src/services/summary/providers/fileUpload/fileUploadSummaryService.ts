import { Readable } from 'stream';
import { azureStorage } from '../../../storage/azure/azureStorageService.js';
import { ProgressUpdate } from '../../../../types/global.types.js';
import { BadRequestError } from '../../../../utils/errors/errorHandling.js';
import path from 'path';
import { promises as fs } from 'fs';
import fs_sync from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath } from '../../../../utils/media/ffmpeg.js';
import { validateVideoFile } from '../../../../utils/file/fileValidation.js';
import { BaseSummaryProcessor } from '../../base/BaseSummaryProcessor.js';
import { SummaryOptions } from '../../types/service.types.js';

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
 * Processor for generating summaries from uploaded video files
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
            updateProgress = () => {},
        } = options;

        const tempVideoPath = path.join(this.sessionDir, `${this.fileId}-original${path.extname(originalFilename)}`);

        try {
            // Initialize directories
            await this.initializeDirs();

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
                throw new BadRequestError('Invalid or unsupported video file format');
            }

            // Convert to audio
            await this.convertToAudio(tempVideoPath, updateProgress);

            // Process transcript and generate summary using base class functionality
            return await this.processTranscriptAndSummary(options);

        } catch (error) {
            console.error('Error processing uploaded file:', error);
            throw new BadRequestError(
                `Failed to process uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        } finally {
            // Clean up temporary file
            if (fs_sync.existsSync(tempVideoPath)) {
                await fs.unlink(tempVideoPath).catch(() => {});
            }
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
                        message: `Converting video to audio... ${Math.round(estimatedProgress)}%`,
                        progress: 30 + (estimatedProgress * 0.2) // Scale to 30-50% range
                    });
                })
                .on('end', () => {
                    console.log('FFmpeg conversion finished');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg conversion error:', err);
                    reject(new Error('Failed to convert video to audio'));
                })
                .save(this.audioFilePath);
        });
    }

    private parseTimemarkToSeconds(timemark: string): number {
        const [hours, minutes, seconds] = timemark.split(':').map(Number);
        return (hours * 3600) + (minutes * 60) + seconds;
    }
} 