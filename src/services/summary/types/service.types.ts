import { ProgressUpdate } from '../../../types/global.types.js';

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