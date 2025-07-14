import { TempPaths } from './paths.js';
import path from 'path';

export interface ProxyConfig {
    enabled: boolean;
    endpoints: string[];
    username?: string;
    password?: string;
    timeout: number;
    maxRetries: number;
    rotationStrategy: 'random' | 'round-robin';
}

export interface YouTubeConfig {
    cookies: {
        enabled: boolean;
        path: string;
    };
    proxy: ProxyConfig;
}

export const YOUTUBE_CONFIG: YouTubeConfig = {
    cookies: {
        enabled: process.env.YOUTUBE_USE_COOKIES === 'true',
        path: path.join(TempPaths.COOKIES, 'youtube_cookies.txt')
    },
    proxy: {
        enabled: process.env.YOUTUBE_USE_PROXY === 'true',
        endpoints: process.env.YOUTUBE_PROXY_ENDPOINTS ? 
            process.env.YOUTUBE_PROXY_ENDPOINTS.split(',').map(e => e.trim()) : 
            ['gw.databay.co:8888'], // Default Databay endpoint
        username: process.env.YOUTUBE_PROXY_USERNAME,
        password: process.env.YOUTUBE_PROXY_PASSWORD,
        timeout: parseInt(process.env.YOUTUBE_PROXY_TIMEOUT || '30'),
        maxRetries: parseInt(process.env.YOUTUBE_PROXY_MAX_RETRIES || '3'),
        rotationStrategy: (process.env.YOUTUBE_PROXY_ROTATION as 'random' | 'round-robin') || 'random'
    }
} as const; 