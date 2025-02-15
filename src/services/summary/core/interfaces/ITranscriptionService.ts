import { ProcessedMedia, Transcript } from '../types/summary.types.js';

export interface ITranscriptionService {
  transcribe(media: ProcessedMedia): Promise<Transcript>;
} 