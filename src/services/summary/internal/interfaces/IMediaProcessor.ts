import { ProcessedMedia } from '../types/summary.types.js';

export interface MediaSource {
  type: 'youtube' | 'file';
  data: unknown;
}

export interface IMediaProcessor {
  /**
   * Ensures required resources are available
   */
  ensureResources?(): Promise<void>;

  /**
   * Processes media from the given source
   */
  processMedia(source: MediaSource): Promise<ProcessedMedia>;

  /**
   * Cleans up resources for the given media ID
   */
  cleanup?(mediaId: string): Promise<void>;
} 