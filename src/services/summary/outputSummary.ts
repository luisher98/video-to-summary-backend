import { downloadVideo, deleteVideo } from './videoTools.ts';
import { generateTranscript, generateSummary } from '../../lib/openAI.ts';
import { ProgressUpdate } from '../../types/global.types.ts';
import {
    BadRequestError,
    InternalServerError,
} from '../../utils/errorHandling.ts';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

interface OutputSummaryOptions {
    url: string;
    words?: number;
    updateProgress?: (progress: ProgressUpdate) => void;
    additionalPrompt?: string;
    returnTranscriptOnly?: boolean;
}

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
            const [_, summary] = await Promise.all([
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
