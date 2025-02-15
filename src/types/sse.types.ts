/**
 * Server-Sent Events (SSE) response types
 */
export interface SSEResponse {
    /** Current status of the operation */
    status: 'pending' | 'processing' | 'uploading' | 'converting' | 'done' | 'error';
    /** Progress message to display to the user */
    message: string;
    /** Progress percentage (0-100) */
    progress: number;
} 