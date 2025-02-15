import { ISummarizationService } from '../../core/interfaces/ISummarizationService.js';
import { Summary, Transcript, SummaryOptions } from '../../core/types/summary.types.js';
import { generateSummary } from '../../../../lib/openAI.js';

export class OpenAISummarizationService implements ISummarizationService {
  async summarize(
    transcript: Transcript,
    options: SummaryOptions,
    sourceType: 'youtube' | 'file',
    sourceId: string
  ): Promise<Summary> {
    const content = await generateSummary(
      transcript.text,
      options.maxWords || 400,
      options.additionalPrompt || ''
    );

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        sourceType,
        sourceId,
        timestamp: new Date()
      }
    };
  }
} 