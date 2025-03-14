import { IMediaProcessor, MediaSource } from '../interfaces/IMediaProcessor.js';
import { ITranscriptionService } from '../interfaces/ITranscriptionService.js';
import { ISummarizationService } from '../interfaces/ISummarizationService.js';
import { Summary, SummaryOptions } from '../types/summary.types.js';
import { Progress } from '../types/progress.types.js';
import { ProgressTracker } from './ProgressTracker.js';
import { processTimer, logProcessStep, logProcessSummary } from '@/utils/logging/logger.js';
import { MediaError, MediaErrorCode, ValidationError } from '@/utils/errors/index.js';

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
      // Validate input
      processTimer.startProcess('Input Validation');
      if (!source || !source.type || !source.data) {
        throw new ValidationError('Invalid media source', {
          source: ['Media source is required']
        });
      }

      if (!['youtube', 'file'].includes(source.type)) {
        throw new ValidationError('Invalid source type', {
          type: [`Unsupported source type: ${source.type}`]
        });
      }

      if (options.maxWords && (options.maxWords < 50 || options.maxWords > 1000)) {
        throw new ValidationError('Invalid word count', {
          maxWords: ['Word count must be between 50 and 1000']
        });
      }
      processTimer.endProcess('Input Validation');

      // Initialize resources
      this.progressTracker.updateProgress('input_validation', 100);
      this.progressTracker.updateProgress('resource_setup', 0);
      processTimer.startProcess('Resource Setup');
      await this.mediaProcessor.ensureResources?.();
      processTimer.endProcess('Resource Setup');
      this.progressTracker.updateProgress('resource_setup', 100);

      // Process media
      processTimer.startProcess('Media Processing');
      this.progressTracker.updateProgress('media_download', 0);
      try {
        processedMedia = await this.mediaProcessor.processMedia(source);
      } catch (error) {
        this.progressTracker.error('Failed to process media');
        throw error;
      }
      this.progressTracker.updateProgress('media_download', 100);
      processTimer.endProcess('Media Processing');

      // Generate transcript
      processTimer.startProcess('Transcription');
      this.progressTracker.updateProgress('speech_recognition', 0);
      let transcript;
      try {
        transcript = await this.transcriptionService.transcribe(processedMedia);
        const wordCount = transcript.text.split(/\s+/).length;
        logProcessStep('Transcription', 'complete', { 
          wordCount, 
          duration: processedMedia.metadata.duration,
          mediaId: processedMedia.id
        });
      } catch (error) {
        this.progressTracker.error('Failed to generate transcript');
        throw error;
      }
      this.progressTracker.updateProgress('speech_recognition', 100);
      processTimer.endProcess('Transcription');

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
      processTimer.startProcess('Summarization');
      this.progressTracker.updateProgress('summarization', 0);
      let summary;
      try {
        summary = await this.summarizationService.summarize(
          transcript,
          options,
          source.type,
          processedMedia.id
        );
      } catch (error) {
        this.progressTracker.error('Failed to generate summary');
        throw error;
      }
      this.progressTracker.updateProgress('summarization', 100);
      processTimer.endProcess('Summarization');

      // Mark as complete with the final summary
      this.progressTracker.complete(summary.content);
      processTimer.endProcess(processName);
      logProcessSummary(processTimer.getTimings());
      
      return summary;
    } catch (error) {
      // End all active processes
      processTimer.endProcess(processName, error instanceof Error ? error : new Error(String(error)));
      
      // Clean up any partial resources
      try {
        if (processedMedia?.id) {
          await this.mediaProcessor.cleanup?.(processedMedia.id);
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }

      // Rethrow the original error
      throw error;
    }
  }
} 