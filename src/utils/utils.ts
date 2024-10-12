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

export async function checkVideoExists(id: string) {
    const url = `https://www.youtube.com/watch?v=${id}`;

    try {
        const response = await fetch(url);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

export async function clearDownloadFolder() {

}