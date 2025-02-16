import { ProcessedMedia } from '../types/summary.types.js';

export interface MediaSource {
  type: 'youtube' | 'file';
  data: unknown;
}

export interface IMediaProcessor {
  processMedia(source: MediaSource): Promise<ProcessedMedia>;
  cleanup(mediaId: string): Promise<void>;
} 