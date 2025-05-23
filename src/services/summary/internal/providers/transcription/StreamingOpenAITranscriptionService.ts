import { ITranscriptionService } from '../../interfaces/ITranscriptionService.js';
import { ProcessedMedia, Transcript } from '../../types/summary.types.js';
import { generateTranscriptFromStream } from '@/integrations/openAI.js';
import { processTimer, logProcessStep } from '@/utils/logging/logger.js';
import { MediaError, MediaErrorCode } from '@/utils/errors/index.js';
import { StreamingProcessedMedia } from '../media/youtube/StreamingYouTubeMediaProcessor.js';

export class StreamingOpenAITranscriptionService implements ITranscriptionService {
  async transcribe(
    media: ProcessedMedia
  ): Promise<Transcript> {
    const processName = 'Streaming Speech Recognition';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { 
      model: 'Whisper',
      format: media.metadata.format,
      duration: media.metadata.duration,
      mediaId: media.id
    });

    try {
      // Validate input
      processTimer.startProcess('Input Validation');
      
      // Check if we have a stream or need to fall back to file-based processing
      const streamingMedia = media as StreamingProcessedMedia;
      if (!streamingMedia.stream) {
        throw new MediaError(
          'No audio stream provided for transcription',
          MediaErrorCode.PROCESSING_FAILED,
          { mediaId: media.id }
        );
      }
      processTimer.endProcess('Input Validation');

      // Generate transcript using the stream
      processTimer.startProcess('Streaming Transcription');
      logProcessStep('Streaming Transcription', 'start', { mediaId: media.id });
      
      const text = await generateTranscriptFromStream(streamingMedia.stream, media.id);
      
      if (!text || text.trim().length === 0) {
        throw new MediaError(
          'Generated transcript is empty',
          MediaErrorCode.PROCESSING_FAILED,
          { mediaId: media.id }
        );
      }
      processTimer.endProcess('Streaming Transcription');

      // Process transcript into segments
      processTimer.startProcess('Segmentation');
      const words = text.split(/\s+/);
      const wordsPerSegment = 50;
      const segments = [];

      for (let i = 0; i < words.length; i += wordsPerSegment) {
        segments.push({
          text: words.slice(i, i + wordsPerSegment).join(' '),
          startTime: (i / words.length) * (media.metadata.duration || 0),
          endTime: (Math.min(i + wordsPerSegment, words.length) / words.length) * (media.metadata.duration || 0)
        });
      }
      processTimer.endProcess('Segmentation');

      logProcessStep(processName, 'complete', { 
        wordCount: words.length,
        segments: segments.length,
        rate: media.metadata.duration ? `${Math.round(words.length / media.metadata.duration)}w/s` : 'unknown',
        mediaId: media.id
      });
      processTimer.endProcess(processName);

      return { text, segments };
    } catch (error) {
      // End all active processes
      ['Segmentation', 'Streaming Transcription', 'Input Validation', processName].forEach(process => {
        try {
          processTimer.endProcess(process, error instanceof Error ? error : new Error(String(error)));
        } catch {
          // Process might not have been started
        }
      });

      // Log error with context
      logProcessStep(processName, 'error', {
        error: error instanceof Error ? error.message : String(error),
        mediaId: media.id,
        format: media.metadata.format,
        duration: media.metadata.duration
      });

      // Handle different error types
      if (error instanceof MediaError) {
        throw error;
      }

      // Wrap unknown errors
      throw new MediaError(
        'Failed to transcribe audio stream',
        MediaErrorCode.PROCESSING_FAILED,
        {
          mediaId: media.id,
          format: media.metadata.format,
          duration: media.metadata.duration,
          error: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }
} 