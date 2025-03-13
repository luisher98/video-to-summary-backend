import { TempPaths } from './paths.js';
import path from 'path';

export interface YouTubeConfig {
    cookies: {
        enabled: boolean;
        path: string;
    };
}

export const YOUTUBE_CONFIG: YouTubeConfig = {
    cookies: {
        enabled: process.env.YOUTUBE_USE_COOKIES === 'true',
        path: path.join(TempPaths.COOKIES, 'youtube_cookies.txt')
    }
} as const; 