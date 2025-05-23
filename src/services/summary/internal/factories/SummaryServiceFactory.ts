import { StreamingYouTubeMediaProcessor } from '../providers/media/youtube/StreamingYouTubeMediaProcessor.js';
import { StreamingFileUploadMediaProcessor } from '../providers/media/fileUpload/StreamingFileUploadMediaProcessor.js';
import { StreamingOpenAITranscriptionService } from '../providers/transcription/StreamingOpenAITranscriptionService.js';
import { OpenAISummarizationService } from '../providers/summarization/OpenAISummarizationService.js';
import { SummaryOrchestrator } from '../orchestration/SummaryOrchestrator.js';
import { ProgressTracker } from '../orchestration/ProgressTracker.js';

export class SummaryServiceFactory {
  /**
   * Creates a service for processing YouTube videos
   */
  static createYouTubeService(): SummaryOrchestrator {
    return new SummaryOrchestrator(
      new StreamingYouTubeMediaProcessor(),
      new StreamingOpenAITranscriptionService(),
      new OpenAISummarizationService(),
      new ProgressTracker()
    );
  }

  /**
   * Creates a service for processing uploaded files
   */
  static createFileUploadService(): SummaryOrchestrator {
    return new SummaryOrchestrator(
      new StreamingFileUploadMediaProcessor(),
      new StreamingOpenAITranscriptionService(),
      new OpenAISummarizationService(),
      new ProgressTracker()
    );
  }

  /**
   * Creates a streaming-based YouTube service that uses piping for efficiency
   * This provides better memory usage and can start processing before the entire video is downloaded
   * @deprecated Use createYouTubeService instead
   */
  static createStreamingYouTubeService(): SummaryOrchestrator {
    return this.createYouTubeService();
  }

  /**
   * Creates a streaming-based file upload service that uses piping for efficiency
   * This provides better memory usage and processing for large uploaded files
   * @deprecated Use createFileUploadService instead
   */
  static createStreamingFileUploadService(): SummaryOrchestrator {
    return this.createFileUploadService();
  }

  // Add more factory methods for other types of services
} 