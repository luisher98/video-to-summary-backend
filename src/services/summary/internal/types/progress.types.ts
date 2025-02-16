/**
 * Progress tracking types for summary service
 */

/**
 * Base progress update interface
 */
export interface Progress {
    /** Current status of the operation */
    status: ProcessingStatus;
    /** Progress message or result */
    message: string;
    /** Error message if status is 'error' */
    error?: string;
    /** Progress percentage (0-100) */
    progress: number;
}

/**
 * All possible processing statuses
 */
export type ProcessingStatus = 
    | 'pending'
    | 'uploading'
    | 'processing'
    | 'converting'
    | 'transcribing'
    | 'summarizing'
    | 'done'
    | 'error';

/**
 * Processing stage configuration
 */
export interface ProcessingStage {
    name: string;
    status: ProcessingStatus;
    progressRange: [number, number];
    getMessage: (progress: number) => string;
}

/**
 * Defined processing stages with their progress ranges
 */
export const PROCESSING_STAGES: ProcessingStage[] = [
    {
        name: 'initialization',
        status: 'pending',
        progressRange: [0, 5],
        getMessage: () => 'Initializing...'
    },
    {
        name: 'media',
        status: 'processing',
        progressRange: [5, 35],
        getMessage: (progress) => `Processing media (${progress}%)`
    },
    {
        name: 'transcription',
        status: 'transcribing',
        progressRange: [35, 70],
        getMessage: (progress) => `Generating transcript (${progress}%)`
    },
    {
        name: 'summarization',
        status: 'summarizing',
        progressRange: [70, 95],
        getMessage: (progress) => `Generating summary (${progress}%)`
    },
    {
        name: 'done',
        status: 'done',
        progressRange: [95, 100],
        getMessage: () => 'Complete'
    }
]; 