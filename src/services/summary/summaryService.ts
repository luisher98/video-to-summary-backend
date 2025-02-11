import { ProgressUpdate } from '../../types/global.types.js';
import { generateTranscript, generateSummary } from '../../lib/openAI.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { promises as fs } from 'fs';
import { TEMP_DIRS } from '../../utils/utils.js';

/**
 * Request information for tracking and logging
 */
export interface RequestInfo {
    ip: string;
    userAgent?: string;
}

/**
 * Base configuration options for summary generation
 */
export interface SummaryOptions {
    /** Number of words for the summary (default: 400) */
    words?: number;
    /** Callback function to report progress updates */
    updateProgress?: (progress: ProgressUpdate) => void;
    /** Additional instructions for the AI summarizer */
    additionalPrompt?: string;
    /** Whether to return only the transcript without summarizing */
    returnTranscriptOnly?: boolean;
    /** Request information */
    requestInfo?: RequestInfo;
}

/**
 * Base interface for summary service implementations.
 * This allows for different summary providers (YouTube, file upload, etc.)
 * while maintaining a consistent interface.
 */
export interface SummaryService {
    /**
     * Process a video to generate a summary or transcript
     * @param options Configuration options for the summary generation
     */
    process(options: SummaryOptions): Promise<string>;

    /**
     * Clean up any resources used during processing
     */
    cleanup(): Promise<void>;
}

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
    }

    public async cleanup(): Promise<void> {
        await fs.rm(this.sessionDir, { recursive: true, force: true });
    }
} 