/**
 * Get current date and time in a formatted string
 * Format: DD_MM_YYYY___HH_MM
 */
export function getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
  
    return `${day}_${month}_${year}___${hours}_${minutes}`;
}

/**
 * Format duration in seconds into human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "2h 30m 15s")
 */
export function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;
    
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    const parts = [];
    
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
} 