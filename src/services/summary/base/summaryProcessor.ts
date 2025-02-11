import { downloadVideoWithExec as downloadVideo, deleteVideo } from '../utils/videoTools.js';
import { generateTranscript, generateSummary } from '../../../lib/openAI.js';
import { ProgressUpdate } from '../../../types/global.types.js';
import {
    BadRequestError,
    InternalServerError,
} from '../../../utils/errorHandling.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { BaseSummaryProcessor, SummaryOptions } from '../summaryService.js';

interface SummaryProcessorOptions extends SummaryOptions {
    /** The YouTube video URL */
    url: string;
}

/**
 * Options for generating a summary or transcript of a YouTube video
 * @interface OutputSummaryOptions
 */
interface OutputSummaryOptions {
    /** The YouTube video URL */
    url: string;
    /** Number of words for the summary (default: 400) */
    words?: number;
    /** Callback function to report progress updates */
    updateProgress?: (progress: ProgressUpdate) => void;
    /** Additional instructions for the AI summarizer */
    additionalPrompt?: string;
    /** Whether to return only the transcript without summarizing */
    returnTranscriptOnly?: boolean;
    /** Request information */
    requestInfo?: {
        ip: string;
        userAgent?: string;
    };
}

/**
 * Processes a YouTube video to generate either a summary or transcript
 * 
 * @param {OutputSummaryOptions} options - Configuration options
 * @returns {Promise<string>} The generated summary or transcript
 * @throws {BadRequestError} If the URL is invalid
 * @throws {InternalServerError} If processing fails
 * 
 * @example
 * const summary = await outputSummary({
 *   url: 'https://youtube.com/watch?v=...',
 *   words: 400,
 *   updateProgress: (progress) => console.log(progress)
 * });
 */
export async function outputSummary(options: SummaryProcessorOptions): Promise<string> {
    const {
        url,
        words = 400,
        updateProgress = () => {},
        additionalPrompt = '',
        returnTranscriptOnly = false,
        requestInfo
    } = options;

    let fileId: string | undefined;

    try {
        // 1. Download video from YouTube
        updateProgress({ 
            status: 'processing', 
            message: 'Downloading video...',
            progress: 10
        });

        try {
            fileId = await downloadVideo(url);

            if (!fileId) {
                throw new Error('Failed to get file ID');
            }

            // 2. Generate transcript
            updateProgress({
                status: 'processing',
                message: 'Generating transcript...',
                progress: 50
            });
            
            const transcript = await generateTranscript(fileId);

            if (returnTranscriptOnly) {
                return transcript;
            }

            // 3. Generate summary
            updateProgress({ 
                status: 'processing', 
                message: 'Generating summary...',
                progress: 80 
            });
            
            const summary = await generateSummary(transcript, words, additionalPrompt);

            // Log success
            console.log('Successfully generated summary:', {
                url,
                ...requestInfo
            });

            return summary;
        } catch (error) {
            console.error('Error during video processing:', error);
            throw new InternalServerError(
                `Something went wrong during video processing: ${error}`,
            );
        }
    } finally {
        if (fileId) {
            await deleteVideo(fileId);
        }
    }
}
