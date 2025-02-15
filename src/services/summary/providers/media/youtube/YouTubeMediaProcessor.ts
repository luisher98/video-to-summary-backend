import { IMediaProcessor, MediaSource } from '../../../core/interfaces/IMediaProcessor.js';
import { ProcessedMedia } from '../../../core/types/summary.types.js';
import { BadRequestError } from '../../../../../utils/errors/errorHandling.js';
import { YouTubeDownloader } from './youtubeDownloader.js';
import { promises as fs } from 'fs';
import path from 'path';
import { TEMP_DIRS } from '../../../../../utils/constants/paths.js';
import { ensureDir } from '../../../../../utils/file/tempDirs.js';

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

    try {
      // Ensure audio directory exists
      await ensureDir(TEMP_DIRS.audios);

      // Download and process the video
      const videoId = await YouTubeDownloader.downloadVideo(url);
      const audioPath = path.join(TEMP_DIRS.audios, `${videoId}.mp3`);

      // Get audio file stats
      const stats = await fs.stat(audioPath);

      return {
        id: videoId,
        audioPath,
        metadata: {
          duration: 0, // Duration not available from yt-dlp directly
          format: 'mp3',
          size: stats.size
        }
      };
    } catch (error) {
      // Clean up any partial downloads
      try {
        const audioPath = path.join(TEMP_DIRS.audios, 'youtube.mp3');
        await fs.unlink(audioPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async cleanup(mediaId: string): Promise<void> {
    try {
      const audioPath = path.join(TEMP_DIRS.audios, `${mediaId}.mp3`);
      await fs.unlink(audioPath);
    } catch (error) {
      console.error(`Failed to clean up media ${mediaId}:`, error);
    }
  }
} 