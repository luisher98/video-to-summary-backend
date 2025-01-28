export interface ProgressUpdate {
    status: 'pending' | 'done' | 'error';
    message?: string;
    error?: string;
}
