import { downloadVideoWithExec as downloadVideo, deleteVideo } from './videoTools.js';
import { generateTranscript, generateSummary } from '../../lib/openAI.js';
import { ProgressUpdate } from '../../types/global.types.js';
import {
    BadRequestError,
    InternalServerError,
} from '../../utils/errorHandling.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

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
export async function outputSummary({
    url,
    words = 400,
    updateProgress = () => {},
    additionalPrompt = '',
    returnTranscriptOnly = false,
}: OutputSummaryOptions): Promise<string> {
    const sessionId = uuidv4();
    const tempDir = path.join(process.env.TEMP_DIR || './tmp', sessionId);
    
    try {
        // Create temporary directory for this request
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        if (typeof url !== 'string' || !url.includes('?v=')) {
            throw new BadRequestError('Invalid YouTube URL');
        }
        let fileId: string | undefined;
        try {
            // 1. Download video from YouTube
            updateProgress({ status: 'pending', message: 'Downloading video...' });
            fileId = await downloadVideo(url);

            // 2. Generate transcript
            updateProgress({
                status: 'pending',
                message: 'Generating transcript...',
            });
            const transcript = await generateTranscript(fileId);

            if (returnTranscriptOnly) {
                await deleteVideo(fileId).then(() => fileId = undefined);
                return transcript;
            }

            // 3. Generate summary and delete video in parallel
            updateProgress({ status: 'pending', message: 'Generating summary...' });
            const [, summary] = await Promise.all([
                deleteVideo(fileId).then(() => fileId = undefined), 
                generateSummary(transcript, words, additionalPrompt),
            ]);

            return summary;
        } catch (error) {
            console.error('Error during video processing:', error);
            throw new InternalServerError(
                `Something went wrong during video processing: ${error}`,
            );
        } finally {
            if (fileId) await deleteVideo(fileId); 
        }
    } finally {
        // Cleanup temporary files
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
}
