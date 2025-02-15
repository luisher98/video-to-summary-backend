import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';
import fs_sync from 'fs';
import { TEMP_DIRS } from '../../../utils/utils.js';
import { generateTranscript, generateSummary } from '../../../lib/openAI.js';
import { ProgressUpdate } from '../../../types/global.types.js';
import { SummaryService, SummaryOptions } from '../types/service.types.js';

/**
 * Base abstract class for video summary processors.
 * Provides common functionality for managing temporary files and processing summaries.
 */
export abstract class BaseSummaryProcessor implements SummaryService {
    protected sessionId: string;
    protected fileId: string;
    protected sessionDir: string;
    protected audioFilePath: string;

    constructor() {
        this.sessionId = uuidv4();
        this.fileId = uuidv4();
        this.sessionDir = path.join(TEMP_DIRS.sessions, this.sessionId);
        this.audioFilePath = path.join(TEMP_DIRS.audios, `${this.fileId}.mp3`);
    }

    abstract process(options: SummaryOptions): Promise<string>;

    protected async initializeDirs(): Promise<void> {
        await fs.mkdir(this.sessionDir, { recursive: true });
        await fs.mkdir(TEMP_DIRS.audios, { recursive: true });
    }

    /**
     * Core processing logic shared by all summary processors
     */
    protected async processTranscriptAndSummary(
        options: SummaryOptions
    ): Promise<string> {
        const {
            words = 400,
            updateProgress = () => {},
            additionalPrompt = '',
            returnTranscriptOnly = false,
            requestInfo
        } = options;

        try {
            // Generate transcript
            updateProgress({
                status: 'processing',
                message: 'Generating transcript...',
                progress: 50
            });
            
            const transcript = await generateTranscript(this.fileId);

            if (returnTranscriptOnly) {
                return transcript;
            }

            // Generate summary
            updateProgress({ 
                status: 'processing', 
                message: 'Generating summary...',
                progress: 80 
            });
            
            const summary = await generateSummary(transcript, words, additionalPrompt);

            // Log success
            console.log('Successfully generated summary:', {
                fileId: this.fileId,
                ip: requestInfo?.ip || 'unknown',
                userAgent: requestInfo?.userAgent || 'unknown',
                timestamp: new Date().toISOString()
            });

            updateProgress({ 
                status: 'processing', 
                message: 'Finalizing summary...',
                progress: 90 
            });

            return summary;
        } catch (error) {
            console.error('Error processing summary:', error);
            throw error;
        }
    }

    /**
     * Utility function to format and send progress updates
     */
    protected sendProgress(
        updateProgress: (progress: ProgressUpdate) => void,
        data: ProgressUpdate
    ): void {
        try {
            updateProgress({
                status: data.status,
                message: data.message,
                progress: Math.round(data.progress)
            });
        } catch (error) {
            console.error('Error sending progress update:', error);
        }
    }

    public async cleanup(): Promise<void> {
        try {
            await fs.rm(this.sessionDir, { recursive: true, force: true });
            if (fs_sync.existsSync(this.audioFilePath)) {
                await fs.rm(this.audioFilePath);
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
} 