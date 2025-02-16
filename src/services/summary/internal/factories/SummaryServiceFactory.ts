import { YouTubeMediaProcessor } from '../providers/media/youtube/YouTubeMediaProcessor.js';
import { FileUploadMediaProcessor } from '../providers/media/fileUpload/FileUploadMediaProcessor.js';
import { OpenAITranscriptionService } from '../providers/transcription/OpenAITranscriptionService.js';
import { OpenAISummarizationService } from '../providers/summarization/OpenAISummarizationService.js';
import { SummaryOrchestrator } from '../orchestration/SummaryOrchestrator.js';
import { ProgressTracker } from '../orchestration/ProgressTracker.js';

export class SummaryServiceFactory {
  static createYouTubeService(): SummaryOrchestrator {
    return new SummaryOrchestrator(
      new YouTubeMediaProcessor(),
      new OpenAITranscriptionService(),
      new OpenAISummarizationService(),
      new ProgressTracker()
    );
  }

  static createFileUploadService(): SummaryOrchestrator {
    return new SummaryOrchestrator(
      new FileUploadMediaProcessor(),
      new OpenAITranscriptionService(),
      new OpenAISummarizationService(),
      new ProgressTracker()
    );
  }

  // Add more factory methods for other types of services
} 