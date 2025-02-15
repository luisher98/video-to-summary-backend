import { ITranscriptionService } from '../../core/interfaces/ITranscriptionService.js';
import { ProcessedMedia, Transcript } from '../../core/types/summary.types.js';
import { generateTranscript } from '../../../../lib/openAI.js';
import { processTimer, logProcessStep } from '../../../../utils/logging/logger.js';

export class OpenAITranscriptionService implements ITranscriptionService {
  async transcribe(
    media: ProcessedMedia
  ): Promise<Transcript> {
    const processName = 'Speech Recognition';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { model: 'Whisper', format: media.metadata.format });

    try {
      const text = await generateTranscript(media.id);
      const words = text.split(/\s+/);
      
      // Create segments for the transcript
      const wordsPerSegment = 50;
      const segments = [];
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        segments.push({
          text: words.slice(i, i + wordsPerSegment).join(' '),
          startTime: (i / words.length) * media.metadata.duration,
          endTime: (Math.min(i + wordsPerSegment, words.length) / words.length) * media.metadata.duration
        });
      }

      logProcessStep(processName, 'complete', { 
        wordCount: words.length,
        segments: segments.length,
        rate: `${Math.round(words.length / (media.metadata.duration || 1))}w/s`
      });
      processTimer.endProcess(processName);

      return { text, segments };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logProcessStep(processName, 'error', { error: err.message });
      processTimer.endProcess(processName, err);
      throw err;
    }
  }
} 