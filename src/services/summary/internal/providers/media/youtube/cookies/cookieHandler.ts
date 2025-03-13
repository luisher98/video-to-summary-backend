import { YOUTUBE_CONFIG } from '@/config/youtube.js';
import { promises as fs } from 'fs';

/**
 * Interface for YouTube cookie structure
 */
export interface Cookie {
    /** Cookie domain (e.g., .youtube.com) */
    domain: string;
    /** Cookie expiration timestamp */
    expirationDate?: number;
    /** Whether cookie is host-only */
    hostOnly?: boolean;
    /** Whether cookie is HTTP only */
    httpOnly?: boolean;
    /** Cookie name */
    name: string;
    /** Cookie path */
    path?: string;
    /** SameSite attribute */
    sameSite?: string;
    /** Whether cookie requires secure connection */
    secure?: boolean;
    /** Whether cookie is session-only */
    session?: boolean;
    /** Cookie value */
    value: string;
}

interface CookieOptions {
    cookies?: string;
}

/**
 * Simple cookie handler for YouTube downloads
 */
export class CookieHandler {
    /**
     * Checks for YouTube cookies and returns them if they exist and are enabled
     */
    public static async processYouTubeCookies(): Promise<CookieOptions> {
        // If cookies are disabled in config, return empty options
        if (!YOUTUBE_CONFIG.cookies.enabled) {
            return {};
        }

        try {
            // Check if cookie file exists
            await fs.access(YOUTUBE_CONFIG.cookies.path);
            return { cookies: YOUTUBE_CONFIG.cookies.path };
        } catch {
            // If no cookies exist, return empty options
            return {};
        }
    }
} 