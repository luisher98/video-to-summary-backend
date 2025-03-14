export interface Summary {
  content: string;
  metadata: SummaryMetadata;
}

export interface SummaryMetadata {
  wordCount: number;
  sourceType: 'youtube' | 'file';
  sourceId: string;
  timestamp: Date;
  compressionRatio?: number;
}

export interface SummaryOptions {
  maxWords?: number;
  additionalPrompt?: string;
  returnTranscriptOnly?: boolean;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export interface ProcessedMedia {
  id: string;
  audioPath: string;
  metadata: MediaMetadata;
}

export interface MediaMetadata {
  duration: number;
  format: string;
  size: number;
} 