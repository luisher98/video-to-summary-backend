export type ProcessingStatus = 'uploading' | 'processing' | 'converting' | 'done' | 'error';

export interface Progress {
  status: ProcessingStatus;
  message: string;
  progress: number;
  error?: string;
}

export interface ProcessingStage {
  name: string;
  status: ProcessingStatus;
  progressRange: [number, number];
  getMessage: (progress: number) => string;
}

export const PROCESSING_STAGES: ProcessingStage[] = [
  {
    name: 'initialization',
    status: 'processing',
    progressRange: [0, 5],
    getMessage: () => 'Initializing connection...'
  },
  {
    name: 'media',
    status: 'processing',
    progressRange: [5, 35],
    getMessage: () => 'Downloading and processing media'
  },
  {
    name: 'conversion',
    status: 'converting',
    progressRange: [35, 45],
    getMessage: () => 'Converting media format'
  },
  {
    name: 'transcription',
    status: 'processing',
    progressRange: [45, 75],
    getMessage: () => 'Generating transcript'
  },
  {
    name: 'summarization',
    status: 'processing',
    progressRange: [75, 100],
    getMessage: () => 'Generating summary'
  },
  {
    name: 'done',
    status: 'done',
    progressRange: [100, 100],
    getMessage: () => 'Processing completed successfully'
  }
]; 