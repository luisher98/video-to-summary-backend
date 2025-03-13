import { IMediaProcessor, MediaSource } from '../../../interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../types/summary.types.js';
import { BadRequestError } from '@/utils/errors/index.js';
import { validateVideoFile } from '@/utils/file/fileValidation.js';
import { promises as fs } from 'fs';
import fs_sync from 'fs';
import path from 'path';
import { TempPaths } from '@/config/paths.js';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, getFfprobePath } from '@/utils/media/ffmpeg.js';
import { Readable } from 'stream';
import { ensureDir } from '@/utils/file/tempDirs.js';
import { processTimer, logProcessStep } from '@/utils/logging/logger.js';

// Initialize ffmpeg
const ffmpegBinaryPath = getFfmpegPath();
const ffprobeBinaryPath = getFfprobePath();
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

    try {
      // Create directories
      await fs.mkdir(TempPaths.SESSIONS, { recursive: true });
      await fs.mkdir(TempPaths.AUDIOS, { recursive: true });

      // Save stream to temporary file
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
      await this.convertToAudio(tempVideoPath, audioPath);

      // Get audio file stats
      const stats = await fs.stat(audioPath);

      return {
        id: fileId,
        audioPath,
        metadata: {
          duration: await this.getVideoDuration(tempVideoPath),
          format: 'mp3',
          size: stats.size
        }
      };
    } catch (error) {
      // Clean up on error
      await fs.unlink(tempVideoPath).catch(() => {});
      await fs.unlink(audioPath).catch(() => {});
      
      throw new BadRequestError(
        `Failed to process uploaded file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async convertToAudio(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('mp3')
        .on('end', () => resolve())
        .on('error', reject)
        .save(outputPath);
    });
  }

  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });
  }

  async cleanup(mediaId: string): Promise<void> {
    const sessionPath = path.join(TempPaths.SESSIONS, `${mediaId}-original.*`);
    const audioPath = path.join(TempPaths.AUDIOS, `${mediaId}.mp3`);

    // Clean up session file
    const sessionFiles = await fs.readdir(TempPaths.SESSIONS);
    const matchingFiles = sessionFiles.filter(file => file.startsWith(`${mediaId}-original`));
    for (const file of matchingFiles) {
      await fs.unlink(path.join(TempPaths.SESSIONS, file)).catch(() => {});
    }

    // Clean up audio file
    await fs.unlink(audioPath).catch(() => {});
  }
} 