import { IMediaProcessor, MediaSource } from '../../../interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../types/summary.types.js';
import { BadRequestError, MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import { validateVideoFile } from '@/utils/file/fileValidation.js';
import { promises as fs } from 'fs';
import fs_sync from 'fs';
import path from 'path';
import { TempPaths } from '@/config/paths.js';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, getFfprobePath } from '@/utils/media/ffmpeg.js';
import { Readable } from 'stream';
import { logProcessStep, processTimer } from '@/utils/logging/logger.js';

// Initialize ffmpeg
const ffmpegBinaryPath = getFfmpegPath();
const ffprobeBinaryPath = getFfprobePath();

if (!ffmpegBinaryPath || !ffprobeBinaryPath) {
    throw new MediaError(
        'FFmpeg binaries not found',
        MediaErrorCode.PROCESSING_FAILED,
        { ffmpeg: ffmpegBinaryPath, ffprobe: ffprobeBinaryPath }
    );
}

ffmpeg.setFfmpegPath(ffmpegBinaryPath);
ffmpeg.setFfprobePath(ffprobeBinaryPath);

interface FileUploadSource extends MediaSource {
  type: 'file';
  data: {
    file: Readable;
    filename: string;
    size: number;
  };
}

export class FileUploadMediaProcessor implements IMediaProcessor {
  async processMedia(source: FileUploadSource): Promise<ProcessedMedia> {
    if (source.type !== 'file') {
      throw new BadRequestError('Invalid source type for file upload processor');
    }

    const { file, filename, size } = source.data;
    const fileId = uuidv4();
    const tempVideoPath = path.join(TempPaths.SESSIONS, `${fileId}-original${path.extname(filename)}`);
    const audioPath = path.join(TempPaths.AUDIOS, `${fileId}.mp3`);
    const processName = 'File Upload Processing';

    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { filename, size, fileId });

    try {
      // Setup phase
      processTimer.startProcess('Directory Setup');
      await fs.mkdir(TempPaths.SESSIONS, { recursive: true });
      await fs.mkdir(TempPaths.AUDIOS, { recursive: true });
      logProcessStep('Directory Setup', 'complete', { 
        sessions: TempPaths.SESSIONS,
        audios: TempPaths.AUDIOS
      });
      processTimer.endProcess('Directory Setup');

      // Upload phase
      processTimer.startProcess('File Upload');
      const writeStream = fs_sync.createWriteStream(tempVideoPath);
      await new Promise((resolve, reject) => {
        file.pipe(writeStream)
          .on('finish', () => {
            logProcessStep('File Upload', 'complete', { path: tempVideoPath });
            resolve(null);
          })
          .on('error', (error) => {
            logProcessStep('File Upload', 'error', { error: error.message });
            reject(error);
          });
      });
      processTimer.endProcess('File Upload');

      // Validation phase
      processTimer.startProcess('File Validation');
      const isValid = await validateVideoFile(tempVideoPath);
      if (!isValid) {
        throw new MediaError(
          'Invalid or unsupported video file format',
          MediaErrorCode.PROCESSING_FAILED,
          { filename, path: tempVideoPath }
        );
      }
      logProcessStep('File Validation', 'complete', { path: tempVideoPath });
      processTimer.endProcess('File Validation');

      // Conversion phase
      processTimer.startProcess('Audio Conversion');
      await this.convertToAudio(tempVideoPath, audioPath);
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        throw new MediaError(
          'Audio conversion produced empty file',
          MediaErrorCode.PROCESSING_FAILED,
          { path: audioPath }
        );
      }
      logProcessStep('Audio Conversion', 'complete', { 
        path: audioPath,
        size: stats.size
      });
      processTimer.endProcess('Audio Conversion');

      // Metadata extraction
      processTimer.startProcess('Metadata Extraction');
      const duration = await this.getVideoDuration(tempVideoPath);
      logProcessStep('Metadata Extraction', 'complete', { duration });
      processTimer.endProcess('Metadata Extraction');

      processTimer.endProcess(processName);
      return {
        id: fileId,
        audioPath,
        metadata: {
          duration,
          format: 'mp3',
          size: stats.size
        }
      };
    } catch (error) {
      // End all active processes
      [
        'Metadata Extraction',
        'Audio Conversion',
        'File Validation',
        'File Upload',
        'Directory Setup',
        processName
      ].forEach(process => {
        try {
          processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
        } catch {
          // Process might not have been started
        }
      });

      // Clean up on error
      await fs.unlink(tempVideoPath).catch(() => {});
      await fs.unlink(audioPath).catch(() => {});
      
      if (error instanceof MediaError || error instanceof BadRequestError) {
        throw error;
      }

      throw new MediaError(
        'Failed to process uploaded file',
        MediaErrorCode.PROCESSING_FAILED,
        { 
          filename,
          fileId,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  private async convertToAudio(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('mp3')
        .on('end', () => resolve())
        .on('error', (err) => reject(new MediaError(
          'Failed to convert video to audio',
          MediaErrorCode.PROCESSING_FAILED,
          { input: videoPath, output: outputPath, error: err.message }
        )))
        .save(outputPath);
    });
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new MediaError(
            'Failed to extract video metadata',
            MediaErrorCode.PROCESSING_FAILED,
            { path: videoPath, error: err.message }
          ));
        } else {
          resolve(metadata.format.duration || 0);
        }
      });
    });
  }

  async cleanup(mediaId: string): Promise<void> {
    const processName = 'File Upload Cleanup';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { mediaId });

    try {
      // Clean up session files
      processTimer.startProcess('Session Cleanup');
      const sessionFiles = await fs.readdir(TempPaths.SESSIONS);
      const matchingFiles = sessionFiles.filter(file => file.startsWith(`${mediaId}-original`));
      for (const file of matchingFiles) {
        const filePath = path.join(TempPaths.SESSIONS, file);
        await fs.unlink(filePath);
        logProcessStep('Session Cleanup', 'complete', { path: filePath });
      }
      processTimer.endProcess('Session Cleanup');

      // Clean up audio file
      processTimer.startProcess('Audio Cleanup');
      const audioPath = path.join(TempPaths.AUDIOS, `${mediaId}.mp3`);
      await fs.unlink(audioPath);
      logProcessStep('Audio Cleanup', 'complete', { path: audioPath });
      processTimer.endProcess('Audio Cleanup');

      processTimer.endProcess(processName);
    } catch (error) {
      // End all active processes
      ['Audio Cleanup', 'Session Cleanup', processName].forEach(process => {
        try {
          processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
        } catch {
          // Process might not have been started
        }
      });

      if (error instanceof Error && error.message.includes('ENOENT')) {
        logProcessStep(processName, 'complete', { message: 'Files already deleted', mediaId });
        return;
      }

      throw new MediaError(
        'Failed to clean up media files',
        MediaErrorCode.DELETION_FAILED,
        { 
          mediaId,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }
} 