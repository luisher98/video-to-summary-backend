/**
 * Format bytes into human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Sanitizes a filename by removing or replacing invalid characters
 * @param input - The filename to sanitize
 * @returns The sanitized filename
 */
export function sanitizeFileName(input: string | number | boolean | undefined | null): string {
    const str = String(input || '').trim();
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
} 