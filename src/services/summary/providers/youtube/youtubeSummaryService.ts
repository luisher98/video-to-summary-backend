import { YouTubeDownloader } from './youtubeDownloader.js';
import { BadRequestError, InternalServerError } from '../../../../utils/utils.js';
import { BaseSummaryProcessor } from '../../base/BaseSummaryProcessor.js';
import { SummaryOptions } from '../../types/service.types.js';
import { ProgressUpdate } from '../../../../types/global.types.js';

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
            updateProgress = () => {},
        } = options;

        try {
            // Initialize directories
            await this.initializeDirs();
            
            if (typeof url !== 'string' || !url.includes('?v=')) {
                throw new BadRequestError('Invalid YouTube URL');
            }

            // Download video
            this.sendProgress(updateProgress, { 
                status: 'processing', 
                message: 'Downloading video...',
                progress: 10
            });

            const fileId = await YouTubeDownloader.downloadVideo(url);
            this.fileId = fileId;

            // Process transcript and generate summary using base class functionality
            return await this.processTranscriptAndSummary(options);

        } catch (error) {
            console.error('Error during YouTube video processing:', error);
            throw new InternalServerError(
                `Failed to process YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            await this.cleanup();
        }
    }
} 