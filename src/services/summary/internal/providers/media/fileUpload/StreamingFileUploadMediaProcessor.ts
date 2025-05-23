import { IMediaProcessor, MediaSource } from '../../../interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../types/summary.types.js';
import { BadRequestError, MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import path from 'path';
import { TempPaths } from '@/config/paths.js';
import { ensureDir } from '@/utils/file/tempDirs.js';
import { processTimer, logProcessStep } from '@/utils/logging/logger.js';
import fs from 'fs';
import { Readable, Transform } from 'stream';
import { spawn } from 'child_process';
import { getFfmpegPath } from '@/utils/media/ffmpeg.js';
import { v4 as uuidv4 } from 'uuid';
import { AdaptiveBuffer } from '@/utils/streaming/AdaptiveBuffer.js';

// Extend the MediaSource interface to add streaming support
export interface StreamingFileUploadSource extends MediaSource {
  type: 'file';
  data: {
    buffer?: Buffer;
    path?: string;
    stream?: Readable;
    originalname: string;
    mimetype: string;
  };
}

// Extend ProcessedMedia to add streaming support
export interface StreamingProcessedMedia extends ProcessedMedia {
  stream?: Readable;
  cleanup?: () => Promise<void>;
}

export class StreamingFileUploadMediaProcessor implements IMediaProcessor {
  // Track active streams for cleanup
  private activeStreams: Map<string, { 
    stream: Readable; 
    cleanup: () => Promise<void>;
  }> = new Map();

  async ensureResources(): Promise<void> {
    await ensureDir(TempPaths.AUDIOS);
    logProcessStep('Resource Setup', 'complete', 'file upload environment ready');
  }

  async processMedia(source: MediaSource): Promise<StreamingProcessedMedia> {
    if (source.type !== 'file') {
      throw new BadRequestError('Invalid source type for file upload processor');
    }

    const fileSource = source as StreamingFileUploadSource;
    const { originalname, mimetype } = fileSource.data;
    const processName = 'Streaming File Upload Processing';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { originalname, mimetype });

    try {
      // Create streaming pipeline
      processTimer.startProcess('File Processing Pipeline');
      
      // Generate a unique ID for this file
      const fileId = uuidv4();
      
      // Create source stream based on what's available
      let sourceStream: Readable;
      
      if (fileSource.data.stream) {
        // If stream is already provided, use it directly
        sourceStream = fileSource.data.stream;
      } else if (fileSource.data.buffer) {
        // If buffer is provided, create a stream from it
        sourceStream = Readable.from(fileSource.data.buffer);
      } else if (fileSource.data.path) {
        // If path is provided, create a read stream
        sourceStream = fs.createReadStream(fileSource.data.path);
      } else {
        throw new MediaError(
          'No valid source data provided for file processing',
          MediaErrorCode.PROCESSING_FAILED
        );
      }

      // Create FFmpeg process for audio conversion
      const ffmpegPath = getFfmpegPath();
      const ffmpeg = spawn(ffmpegPath, [
        '-i', 'pipe:0',          // Take input from stdin
        '-f', 'mp3',             // Output format
        '-ab', '128k',           // Audio bitrate
        '-ac', '2',              // Audio channels
        '-ar', '44100',          // Audio sample rate
        '-vn',                   // No video
        '-loglevel', 'warning',  // Reduce logging
        'pipe:1'                 // Output to stdout
      ]);

      // Setup error handlers
      ffmpeg.on('error', (error) => {
        logProcessStep('Audio Processing', 'error', { error: error.message, fileId });
        throw new MediaError(
          `Failed to process audio: ${error.message}`,
          MediaErrorCode.PROCESSING_FAILED
        );
      });

      // Track progress
      let totalBytes = 0;
      let lastProgressUpdate = 0;
      
      // Create progress monitoring transform stream
      const progressStream = new Transform({
        transform(chunk, encoding, callback) {
          totalBytes += chunk.length;
          
          // Only update progress every 500ms
          const now = Date.now();
          if (now - lastProgressUpdate > 500) {
            lastProgressUpdate = now;
            logProcessStep('File Processing', 'start', { 
              kbProcessed: (totalBytes / 1024).toFixed(2),
              fileId 
            });
          }
          
          // Pass the chunk through unchanged
          callback(null, chunk);
        }
      });

      // Create adaptive buffer for better performance
      const adaptiveBuffer = new AdaptiveBuffer({
        initialBufferSize: 128 * 1024, // 128KB initial buffer
        maxBufferSize: 2 * 1024 * 1024, // 2MB max buffer
        onBufferSizeChange: (newSize, reason) => {
          logProcessStep('Adaptive Buffer', 'start', { 
            newSize: `${Math.round(newSize / 1024)}KB`, 
            reason, 
            fileId 
          });
        }
      });

      // Connect the streams: source -> ffmpeg
      sourceStream.pipe(ffmpeg.stdin);

      // Create cleanup function
      const cleanup = async () => {
        try {
          // Kill FFmpeg process if it's still running
          ffmpeg.kill();
          
          // Clean up temp file if it was created
          if (fileSource.data.path && fileSource.data.path.startsWith(TempPaths.UPLOADS)) {
            try {
              await fs.promises.unlink(fileSource.data.path);
            } catch (error) {
              // Ignore file not found errors
            }
          }
          
          logProcessStep('Cleanup', 'complete', { fileId });
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      };

      // Store active stream for later cleanup
      this.activeStreams.set(fileId, { 
        stream: ffmpeg.stdout.pipe(progressStream).pipe(adaptiveBuffer),
        cleanup 
      });

      // Create dummy audio file path for compatibility
      const audioPath = path.join(TempPaths.AUDIOS, `${fileId}.mp3`);
      
      processTimer.endProcess('File Processing Pipeline');
      processTimer.endProcess(processName);
      
      // Return processed media with stream
      return {
        id: fileId,
        audioPath, // Include path for backwards compatibility
        stream: ffmpeg.stdout.pipe(progressStream).pipe(adaptiveBuffer), // Add stream for new streaming features
        metadata: {
          duration: 0, // Duration is unknown in streaming mode
          format: 'mp3',
          size: 0      // Size is unknown in streaming mode
        },
        cleanup      // Add cleanup function
      };
    } catch (error) {
      // End all active processes
      ['File Processing Pipeline', processName].forEach(process => {
        try {
          processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
        } catch {
          // Process might not have been started
        }
      });

      // Rethrow domain errors, wrap others
      if (error instanceof MediaError || error instanceof BadRequestError) {
        throw error;
      }
      throw new MediaError(
        'Failed to process file upload',
        MediaErrorCode.PROCESSING_FAILED,
        { filename: fileSource.data.originalname, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async cleanup(mediaId: string): Promise<void> {
    const processName = 'Streaming File Cleanup';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { mediaId });

    try {
      // Check if there's an active stream to clean up
      const streamInfo = this.activeStreams.get(mediaId);
      if (streamInfo) {
        await streamInfo.cleanup();
        this.activeStreams.delete(mediaId);
      }

      // Also clean up any temporary files
      const audioPath = path.join(TempPaths.AUDIOS, `${mediaId}.mp3`);
      try {
        await fs.promises.access(audioPath);
        await fs.promises.unlink(audioPath);
      } catch (error) {
        // Ignore file not found errors
      }

      logProcessStep(processName, 'complete', 'resources freed');
      processTimer.endProcess(processName);
    } catch (error) {
      processTimer.endProcess(processName, error instanceof Error ? error : new Error(String(error)));
      throw new MediaError(
        'Failed to clean up streaming media resources',
        MediaErrorCode.DELETION_FAILED,
        { mediaId, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
} 