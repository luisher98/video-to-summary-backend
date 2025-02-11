import { downloadVideoWithExec as downloadVideo, deleteVideo } from '../../utils/videoTools.js';
import { BadRequestError, InternalServerError } from '../../../../utils/errorHandling.js';
import { BaseSummaryProcessor, SummaryOptions } from '../../summaryService.js';

interface YouTubeSummaryOptions extends SummaryOptions {
    /** The YouTube video URL */
    url: string;
}

/**
 * Processes a YouTube video to generate either a summary or transcript.
 * Implements the base summary service interface for YouTube-specific functionality.
 */
export class YouTubeVideoSummary extends BaseSummaryProcessor {
    async process(options: YouTubeSummaryOptions): Promise<string> {
        const {
            url,
            words = 400,
            updateProgress = () => {},
            additionalPrompt = '',
            returnTranscriptOnly = false,
            requestInfo
        } = options;

        try {
            await this.initializeDirs();
            
            if (typeof url !== 'string' || !url.includes('?v=')) {
                throw new BadRequestError('Invalid YouTube URL');
            }

            try {
                // 1. Download video from YouTube
                updateProgress({ 
                    status: 'processing', 
                    message: 'Downloading video...',
                    progress: 10
                });
                this.fileId = await downloadVideo(url);

                // 2. Process transcript and summary
                const result = await this.processTranscriptAndSummary({
                    words,
                    updateProgress,
                    additionalPrompt,
                    returnTranscriptOnly,
                    requestInfo
                });

                // Log success with URL
                console.log('Successfully processed YouTube video:', {
                    url,
                    ...requestInfo
                });

                return result;
            } catch (error) {
                console.error('Error during video processing:', error);
                throw new InternalServerError(
                    `Something went wrong during video processing: ${error}`,
                );
            } finally {
                await deleteVideo(this.fileId);
            }
        } finally {
            await this.cleanup();
        }
    }
} 