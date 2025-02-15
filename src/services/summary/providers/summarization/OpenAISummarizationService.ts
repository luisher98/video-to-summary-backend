import { ISummarizationService } from '../../core/interfaces/ISummarizationService.js';
import { Summary, Transcript, SummaryOptions } from '../../core/types/summary.types.js';
import { generateSummary } from '../../../../lib/openAI.js';
import { processTimer, logProcessStep } from '../../../../utils/logging/logger.js';

export class OpenAISummarizationService implements ISummarizationService {
  async summarize(
    transcript: Transcript,
    options: SummaryOptions,
    sourceType: 'youtube' | 'file',
    sourceId: string
  ): Promise<Summary> {
    const processName = `Summarize ${sourceType} content (${sourceId})`;
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { wordLimit: options.maxWords || 400 });

    try {
      const content = await generateSummary(
        transcript.text,
        options.maxWords || 400,
        options.additionalPrompt || ''
      );

      const wordCount = content.split(/\s+/).length;
      logProcessStep(processName, 'complete', { wordCount });
      processTimer.endProcess(processName);

      return {
        content,
        metadata: {
          wordCount,
          sourceType,
          sourceId,
          timestamp: new Date()
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logProcessStep(processName, 'error', { error: err.message });
      processTimer.endProcess(processName, err);
      throw err;
    }
  }
} 