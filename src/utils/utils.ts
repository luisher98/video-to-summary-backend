import ffmpegPath from 'ffmpeg-static';

export const VIDEO_DOWNLOAD_PATH = process.env.VIDEO_DOWNLOAD_PATH || './src/tmp/audios/';

export function getFfmpegPath(): string {
    const path = process.env.FFMPEG_PATH ?? (ffmpegPath as unknown as string);
    if (!path) {
        throw new Error(
            'FFMPEG_PATH is not defined and fallback path is unavailable.',
        );
    }
    return path;
}

export function getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not set.`);
    }
    return value;
}

export async function checkVideoExists(url: string) {
    try {
        const response = await fetch(url);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

export async function clearDownloadFolder() {

}

export function sanitizeFileName(fileName: string): string {
    // Invalid characters: \ / : * ? " < > | and -
    const invalidCharacters = /[\\\/:*?"<>| -]/g;
    // Replace with underscore
    return fileName.replace(invalidCharacters, '_');
}

export const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
  
    return `${day}_${month}_${year}___${hours}_${minutes}`;
  };
  