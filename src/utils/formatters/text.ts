/**
 * Text formatting utilities
 */

/**
 * Gets word count from text
 * @param text - Text to count words from
 * @returns Number of words
 */
export function getWordCount(text: string): number {
    return text.trim().split(/\s+/).length;
}

/**
 * Truncates text to specified word count
 * @param text - Text to truncate
 * @param maxWords - Maximum number of words
 * @returns Truncated text
 */
export function truncateToWordCount(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Formats text for display by removing extra whitespace
 * @param text - Text to format
 * @returns Formatted text
 */
export function formatText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
} 