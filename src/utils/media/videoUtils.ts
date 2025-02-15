/**
 * Check if a video URL exists and is accessible
 */
export async function checkVideoExists(url: string): Promise<boolean> {
    try {
        const response = await fetch(url);
        return response.status === 200;
    } catch {
        return false;
    }
} 