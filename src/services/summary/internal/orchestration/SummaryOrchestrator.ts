import { IMediaProcessor, MediaSource } from '../interfaces/IMediaProcessor.js';
import { ITranscriptionService } from '../interfaces/ITranscriptionService.js';
import { ISummarizationService } from '../interfaces/ISummarizationService.js';
import { Summary, SummaryOptions } from '../types/summary.types.js';
import { Progress } from '../types/progress.types.js';
import { ProgressTracker } from './ProgressTracker.js';
import { processTimer, logProcessStep, logProcessSummary } from '@/utils/logging/logger.js';

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
    const processName = 'Content Processing';
    let processedMedia;
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { source: source.type });

    try {
      this.progressTracker.updateProgress('initialization', 100);

      // Process media
      this.progressTracker.updateProgress('media', 0);
      processedMedia = await this.mediaProcessor.processMedia(source);
      this.progressTracker.updateProgress('media', 100);

      // Generate transcript
      this.progressTracker.updateProgress('transcription', 0);
      logProcessStep('Speech Recognition', 'start');
      const transcript = await this.transcriptionService.transcribe(processedMedia);
      const wordCount = transcript.text.split(/\s+/).length;
      logProcessStep('Speech Recognition', 'complete', { wordCount, duration: processedMedia.metadata.duration });
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
        processTimer.endProcess(processName);
        logProcessSummary(processTimer.getTimings());
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
      processTimer.endProcess(processName);
      logProcessSummary(processTimer.getTimings());
      
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.progressTracker.error(errorMessage);
      processTimer.endProcess(processName, error instanceof Error ? error : new Error(errorMessage));
      logProcessSummary(processTimer.getTimings());
      throw error;
    } finally {
      await this.mediaProcessor.cleanup(processedMedia?.id || 'youtube');
    }
  }
} 