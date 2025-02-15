import { Summary, Transcript, SummaryOptions } from '../types/summary.types.js';

export interface ISummarizationService {
  summarize(
    transcript: Transcript,
    options: SummaryOptions,
    sourceType: 'youtube' | 'file',
    sourceId: string
  ): Promise<Summary>;
} 