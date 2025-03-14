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
    | 'validating'
    | 'initializing'
    | 'uploading'
    | 'downloading'
    | 'processing'
    | 'converting'
    | 'transcribing'
    | 'segmenting'
    | 'summarizing'
    | 'finalizing'
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
        name: 'input_validation',
        status: 'validating',
        progressRange: [0, 2],
        getMessage: () => 'Validating input...'
    },
    {
        name: 'resource_setup',
        status: 'initializing',
        progressRange: [2, 5],
        getMessage: () => 'Setting up resources...'
    },
    {
        name: 'media_download',
        status: 'downloading',
        progressRange: [5, 20],
        getMessage: (progress) => `Downloading media (${progress}%)`
    },
    {
        name: 'audio_processing',
        status: 'processing',
        progressRange: [20, 35],
        getMessage: (progress) => `Processing audio (${progress}%)`
    },
    {
        name: 'speech_recognition',
        status: 'transcribing',
        progressRange: [35, 70],
        getMessage: (progress) => `Converting speech to text (${progress}%)`
    },
    {
        name: 'text_segmentation',
        status: 'segmenting',
        progressRange: [70, 75],
        getMessage: (progress) => `Segmenting text (${progress}%)`
    },
    {
        name: 'summarization',
        status: 'summarizing',
        progressRange: [75, 95],
        getMessage: (progress) => `Generating summary (${progress}%)`
    },
    {
        name: 'result_processing',
        status: 'finalizing',
        progressRange: [95, 98],
        getMessage: (progress) => `Processing results (${progress}%)`
    },
    {
        name: 'done',
        status: 'done',
        progressRange: [98, 100],
        getMessage: () => 'Complete'
    }
]; 