import { IMediaProcessor, MediaSource } from '../../../interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../types/summary.types.js';

import { BadRequestError } from '@/utils/errors/index.js';
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
  constructor() {}

  async processMedia(source: MediaSource): Promise<ProcessedMedia> {
    if (source.type !== 'youtube') {
      throw new BadRequestError('Invalid source type for YouTube processor');
    }

    const youtubeSource = source as YouTubeSource;
    const { url } = youtubeSource.data;
    const processName = 'Media Extraction';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { source: 'YouTube' });

    try {
      // Ensure audio directory exists
      processTimer.startProcess('Resource Setup');
      await ensureDir(TempPaths.AUDIOS);
      logProcessStep('Resource Setup', 'complete', 'environment ready');
      processTimer.endProcess('Resource Setup');

      // Download and process the video
      processTimer.startProcess('Download');
      const videoId = await YouTubeDownloader.downloadVideo(url);
      const audioPath = path.join(TempPaths.AUDIOS, `${videoId}.mp3`);
      processTimer.endProcess('Download');
      
      // Get audio file stats
      processTimer.startProcess('Audio Conversion');
      const stats = await fs.stat(audioPath);
      logProcessStep('Audio Conversion', 'complete', { size: stats.size, format: 'mp3' });
      processTimer.endProcess('Audio Conversion');

      processTimer.endProcess(processName);
      return {
        id: videoId,
        audioPath,
        metadata: {
          duration: 0,
          format: 'mp3',
          size: stats.size
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logProcessStep(processName, 'error', { error: err.message });
      processTimer.endProcess(processName, err);

      // Clean up any partial downloads
      try {
        const videoId = path.basename(url).replace(/[^a-z0-9]/gi, '_');
        const audioPath = path.join(TempPaths.AUDIOS, `${videoId}.mp3`);
        await fs.unlink(audioPath);
        logProcessStep('Cleanup', 'complete', 'partial download removed');
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    }
  }

  async cleanup(mediaId: string): Promise<void> {
    const processName = 'Cleanup';
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
        const err = error;
        logProcessStep(processName, 'error', { error: err.message });
        processTimer.endProcess(processName, err);
        throw err;
      }
      logProcessStep(processName, 'complete', 'nothing to clean');
      processTimer.endProcess(processName);
    }
  }
} 