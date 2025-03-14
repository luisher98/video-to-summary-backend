import { ISummarizationService } from '../../interfaces/ISummarizationService.js';
import { Summary, Transcript, SummaryOptions } from '../../types/summary.types.js';
import { generateSummary } from '@/integrations/openAI.js';
import { processTimer, logProcessStep } from '@/utils/logging/logger.js';
import { MediaError, MediaErrorCode, ValidationError } from '@/utils/errors/index.js';

export class OpenAISummarizationService implements ISummarizationService {
  async summarize(
    transcript: Transcript,
    options: SummaryOptions,
    sourceType: 'youtube' | 'file',
    sourceId: string
  ): Promise<Summary> {
    const processName = 'OpenAI Summary Generation';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { 
      targetLength: options.maxWords || 400,
      sourceType,
      sourceId
    });

    try {
      // Validate input
      processTimer.startProcess('Input Validation');
      if (!transcript || !transcript.text) {
        throw new ValidationError('Invalid transcript', {
          transcript: ['Transcript text is required']
        });
      }

      if (transcript.text.length < 50) {
        throw new ValidationError('Transcript too short', {
          transcript: ['Transcript must be at least 50 characters long']
        });
      }

      const maxWords = options.maxWords || 400;
      if (maxWords < 50 || maxWords > 1000) {
        throw new ValidationError('Invalid word count', {
          maxWords: ['Word count must be between 50 and 1000']
        });
      }
      processTimer.endProcess('Input Validation');

      // Generate summary
      processTimer.startProcess('Summary Generation');
      const content = await generateSummary(
        transcript.text,
        maxWords,
        options.additionalPrompt || ''
      );

      if (!content || content.trim().length === 0) {
        throw new MediaError(
          'Generated summary is empty',
          MediaErrorCode.PROCESSING_FAILED,
          { sourceId, sourceType }
        );
      }
      processTimer.endProcess('Summary Generation');

      // Process results
      processTimer.startProcess('Result Processing');
      const wordCount = content.split(/\s+/).length;
      const transcriptWordCount = transcript.text.split(/\s+/).length;
      const compressionRatio = ((wordCount / transcriptWordCount) * 100).toFixed(1);

      logProcessStep(processName, 'complete', { 
        wordCount,
        transcriptWordCount,
        compressionRatio: `${compressionRatio}%`,
        sourceId,
        sourceType
      });
      processTimer.endProcess('Result Processing');
      processTimer.endProcess(processName);

      return {
        content,
        metadata: {
          wordCount,
          sourceType,
          sourceId,
          timestamp: new Date(),
          compressionRatio: parseFloat(compressionRatio)
        }
      };
    } catch (error) {
      // End all active processes
      ['Result Processing', 'Summary Generation', 'Input Validation', processName].forEach(process => {
        try {
          processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
        } catch {
          // Process might not have been started
        }
      });

      // Log error with context
      logProcessStep(processName, 'error', {
        error: error instanceof Error ? error.message : String(error),
        sourceId,
        sourceType,
        targetLength: options.maxWords || 400
      });

      // Handle different error types
      if (error instanceof MediaError || error instanceof ValidationError) {
        throw error;
      }

      // Wrap unknown errors
      throw new MediaError(
        'Failed to generate summary',
        MediaErrorCode.PROCESSING_FAILED,
        {
          sourceId,
          sourceType,
          targetLength: options.maxWords || 400,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }
} 