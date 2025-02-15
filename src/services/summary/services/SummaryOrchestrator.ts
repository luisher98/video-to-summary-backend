import { IMediaProcessor, MediaSource } from '../core/interfaces/IMediaProcessor.js';
import { ITranscriptionService } from '../core/interfaces/ITranscriptionService.js';
import { ISummarizationService } from '../core/interfaces/ISummarizationService.js';
import { Summary, SummaryOptions } from '../core/types/summary.types.js';
import { Progress } from '../core/types/progress.types.js';
import { ProgressTracker } from './ProgressTracker.js';

export class SummaryOrchestrator {
  constructor(
    private mediaProcessor: IMediaProcessor,
    private transcriptionService: ITranscriptionService,
    private summarizationService: ISummarizationService,
    private progressTracker: ProgressTracker
  ) {}

  onProgress(observer: (progress: Progress) => void): void {
    this.progressTracker.addObserver(observer);
  }

  async process(
    source: MediaSource,
    options: SummaryOptions
  ): Promise<Summary> {
    try {
      this.progressTracker.updateProgress('initialization', 100);

      // Process media
      this.progressTracker.updateProgress('media', 0);
      const processedMedia = await this.mediaProcessor.processMedia(source);
      this.progressTracker.updateProgress('media', 100);

      // Generate transcript
      this.progressTracker.updateProgress('transcription', 0);
      const transcript = await this.transcriptionService.transcribe(processedMedia);
      this.progressTracker.updateProgress('transcription', 100);

      if (options.returnTranscriptOnly) {
        const summary = {
          content: transcript.text,
          metadata: {
            wordCount: transcript.text.split(/\s+/).length,
            sourceType: source.type,
            sourceId: processedMedia.id,
            timestamp: new Date()
          }
        };
        this.progressTracker.complete(summary.content);
        return summary;
      }

      // Generate summary
      this.progressTracker.updateProgress('summarization', 0);
      const summary = await this.summarizationService.summarize(
        transcript,
        options,
        source.type,
        processedMedia.id
      );
      this.progressTracker.updateProgress('summarization', 100);

      // Mark as complete with the final summary
      this.progressTracker.complete(summary.content);
      
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.progressTracker.error(errorMessage);
      throw error;
    } finally {
      await this.mediaProcessor.cleanup(source.type);
    }
  }
} 