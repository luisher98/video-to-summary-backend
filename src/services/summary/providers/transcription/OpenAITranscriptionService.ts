import { ITranscriptionService } from '../../core/interfaces/ITranscriptionService.js';
import { ProcessedMedia, Transcript } from '../../core/types/summary.types.js';
import { generateTranscript } from '../../../../lib/openAI.js';

export class OpenAITranscriptionService implements ITranscriptionService {
  async transcribe(
    media: ProcessedMedia
  ): Promise<Transcript> {
    const text = await generateTranscript(media.id);

    // Since OpenAI doesn't provide timing information, we create dummy segments
    const words = text.split(/\s+/);
    const wordsPerSegment = 50;
    const segments = [];
    
    for (let i = 0; i < words.length; i += wordsPerSegment) {
      segments.push({
        text: words.slice(i, i + wordsPerSegment).join(' '),
        startTime: (i / words.length) * media.metadata.duration,
        endTime: (Math.min(i + wordsPerSegment, words.length) / words.length) * media.metadata.duration
      });
    }

    return { text, segments };
  }
} 