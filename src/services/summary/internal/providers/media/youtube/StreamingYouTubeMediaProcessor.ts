import { IMediaProcessor, MediaSource } from '../../../interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../types/summary.types.js';
import { BadRequestError, MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import { StreamingYouTubeDownloader } from './StreamingYouTubeDownloader.js';
import path from 'path';
import { TempPaths } from '@/config/paths.js';
import { ensureDir } from '@/utils/file/tempDirs.js';
import { processTimer, logProcessStep } from '@/utils/logging/logger.js';
import fs from 'fs';
import { Readable } from 'stream';

// Extend the MediaSource interface to add streaming support
export interface StreamingMediaSource extends MediaSource {
  stream?: Readable;
  cleanup?: () => Promise<void>;
}

// Extend ProcessedMedia to add streaming support
export interface StreamingProcessedMedia extends ProcessedMedia {
  stream?: Readable;
  cleanup?: () => Promise<void>;
}

interface YouTubeSource extends MediaSource {
  type: 'youtube';
  data: {
    url: string;
  };
}

export class StreamingYouTubeMediaProcessor implements IMediaProcessor {
  // Track active streams for cleanup
  private activeStreams: Map<string, { 
    stream: Readable; 
    cleanup: () => Promise<void>;
    createdAt: number;
  }> = new Map();

  async ensureResources(): Promise<void> {
    await ensureDir(TempPaths.AUDIOS);
    logProcessStep('Resource Setup', 'complete', 'environment ready');
  }

  // NEW: Automatic cleanup method
  private async cleanupOldStreams(maxAgeMs: number = 300000): Promise<void> { // 5 minutes
    const now = Date.now();
    const toCleanup: string[] = [];

    for (const [streamId, streamInfo] of this.activeStreams.entries()) {
      if ((now - streamInfo.createdAt) > maxAgeMs) {
        toCleanup.push(streamId);
      }
    }

    for (const streamId of toCleanup) {
      await this.cleanup(streamId);
    }
  }

  async processMedia(source: MediaSource): Promise<StreamingProcessedMedia> {
    // Clean up old streams before processing new ones
    await this.cleanupOldStreams();

    if (source.type !== 'youtube') {
      throw new BadRequestError('Invalid source type for YouTube processor');
    }

    const youtubeSource = source as YouTubeSource;
    const { url } = youtubeSource.data;
    const processName = 'Streaming YouTube Media Processing';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { url });

    try {
      // Create streaming pipeline
      processTimer.startProcess('YouTube Streaming Pipeline');
      
      // Start the streaming pipeline
      const { stream, fileId, cleanup } = await StreamingYouTubeDownloader.createStreamingPipeline(
        url, 
        (progress) => {
          logProcessStep('YouTube Download Progress', 'start', { 
            kbDownloaded: progress.toFixed(2),
            fileId 
          });
        }
      );

      // Store active stream for later cleanup
      this.activeStreams.set(fileId, { stream, cleanup, createdAt: Date.now() });

      // Create dummy audio file path for compatibility
      const audioPath = path.join(TempPaths.AUDIOS, `${fileId}.mp3`);
      
      processTimer.endProcess('YouTube Streaming Pipeline');
      processTimer.endProcess(processName);
      
      // Return processed media with stream
      return {
        id: fileId,
        audioPath, // Include path for backwards compatibility
        stream,    // Add stream for new streaming features
        metadata: {
          duration: 0, // Duration is unknown in streaming mode
          format: 'mp3',
          size: 0      // Size is unknown in streaming mode
        },
        cleanup    // Add cleanup function
      };
    } catch (error) {
      // End all active processes
      ['YouTube Streaming Pipeline', processName].forEach(process => {
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
        'Failed to process streaming YouTube video',
        MediaErrorCode.PROCESSING_FAILED,
        { url, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async cleanup(mediaId: string): Promise<void> {
    const processName = 'Streaming YouTube Cleanup';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { mediaId });

    try {
      // Check if there's an active stream to clean up
      const streamInfo = this.activeStreams.get(mediaId);
      if (streamInfo) {
        try {
          await streamInfo.cleanup();
        } catch (cleanupError) {
          console.error(`Error during stream cleanup for ${mediaId}:`, cleanupError);
        } finally {
          this.activeStreams.delete(mediaId);
        }
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

  // NEW: Force cleanup all streams (for shutdown)
  async cleanupAll(): Promise<void> {
    const streamIds = Array.from(this.activeStreams.keys());
    await Promise.allSettled(streamIds.map(id => this.cleanup(id)));
  }
} 