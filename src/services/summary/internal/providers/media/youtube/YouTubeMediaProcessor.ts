import { IMediaProcessor, MediaSource } from '../../../interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../types/summary.types.js';
import { BadRequestError, MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import { YouTubeDownloader } from './youtubeDownloader.js';
import { promises as fs } from 'fs';
import path from 'path';
import { TempPaths } from '@/config/paths.js';
import { ensureDir } from '@/utils/file/tempDirs.js';
import { processTimer, logProcessStep } from '@/utils/logging/logger.js';

interface YouTubeSource extends MediaSource {
  type: 'youtube';
  data: {
    url: string;
  };
}

export class YouTubeMediaProcessor implements IMediaProcessor {
  async ensureResources(): Promise<void> {
    await ensureDir(TempPaths.AUDIOS);
    logProcessStep('Resource Setup', 'complete', 'environment ready');
  }

  async processMedia(source: MediaSource): Promise<ProcessedMedia> {
    if (source.type !== 'youtube') {
      throw new BadRequestError('Invalid source type for YouTube processor');
    }

    const youtubeSource = source as YouTubeSource;
    const { url } = youtubeSource.data;
    const processName = 'YouTube Media Processing';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { url });

    try {
      // Download and process the video
      processTimer.startProcess('YouTube Download');
      let videoId: string;
      try {
        videoId = await YouTubeDownloader.downloadVideo(url);
      } catch (error) {
        throw new MediaError(
          'Failed to download YouTube video',
          MediaErrorCode.DOWNLOAD_FAILED,
          { url, error: error instanceof Error ? error.message : String(error) }
        );
      }
      processTimer.endProcess('YouTube Download');
      
      // Process audio
      processTimer.startProcess('Audio Processing');
      const audioPath = path.join(TempPaths.AUDIOS, `${videoId}.mp3`);
      
      try {
        const stats = await fs.stat(audioPath);
        logProcessStep('Audio Processing', 'complete', { 
          size: stats.size,
          format: 'mp3',
          path: audioPath
        });
        processTimer.endProcess('Audio Processing');
      } catch (error) {
        throw new MediaError(
          'Failed to process audio file',
          MediaErrorCode.PROCESSING_FAILED,
          { videoId, error: error instanceof Error ? error.message : String(error) }
        );
      }

      processTimer.endProcess(processName);
      return {
        id: videoId,
        audioPath,
        metadata: {
          duration: 0, // TODO: Implement duration extraction
          format: 'mp3',
          size: (await fs.stat(audioPath)).size
        }
      };
    } catch (error) {
      // End all active processes
      ['Audio Processing', 'YouTube Download', processName].forEach(process => {
        try {
          processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
        } catch {
          // Process might not have been started
        }
      });

      // Clean up any partial downloads
      try {
        const videoId = path.basename(url).replace(/[^a-z0-9]/gi, '_');
        const audioPath = path.join(TempPaths.AUDIOS, `${videoId}.mp3`);
        await fs.unlink(audioPath);
        logProcessStep('Cleanup', 'complete', 'partial download removed');
      } catch {
        // Ignore cleanup errors
      }

      // Rethrow domain errors, wrap others
      if (error instanceof MediaError || error instanceof BadRequestError) {
        throw error;
      }
      throw new MediaError(
        'Failed to process YouTube video',
        MediaErrorCode.PROCESSING_FAILED,
        { url, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async cleanup(mediaId: string): Promise<void> {
    const processName = 'YouTube Cleanup';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { mediaId });

    try {
      const audioPath = path.join(TempPaths.AUDIOS, `${mediaId}.mp3`);
      await fs.access(audioPath);
      await fs.unlink(audioPath);
      logProcessStep(processName, 'complete', 'resources freed');
      processTimer.endProcess(processName);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        processTimer.endProcess(processName, error);
        throw new MediaError(
          'Failed to clean up media resources',
          MediaErrorCode.DELETION_FAILED,
          { mediaId, error: error.message }
        );
      }
      logProcessStep(processName, 'complete', 'nothing to clean');
      processTimer.endProcess(processName);
    }
  }
} 