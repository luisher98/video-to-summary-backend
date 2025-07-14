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
            console.log('YouTube cookies disabled in configuration');
            return {};
        }

        try {
            // Check if cookie file exists
            await fs.access(YOUTUBE_CONFIG.cookies.path);
            console.log('Found existing cookies file:', YOUTUBE_CONFIG.cookies.path);
            return { cookies: YOUTUBE_CONFIG.cookies.path };
        } catch {
            // If no cookies exist, create a basic empty cookies file
            // This sometimes helps with bot detection
            try {
                console.log('Creating basic cookies file at:', YOUTUBE_CONFIG.cookies.path);
                
                // Ensure the directory exists
                const cookieDir = YOUTUBE_CONFIG.cookies.path.split('/').slice(0, -1).join('/');
                await fs.mkdir(cookieDir, { recursive: true });
                
                // Create a basic cookies file with common YouTube domains
                const basicCookieContent = `# Netscape HTTP Cookie File
# This is a generated file! Do not edit.

.youtube.com	TRUE	/	FALSE	0	CONSENT	PENDING+999
.youtube.com	TRUE	/	FALSE	0	PREF	f1=50000000
`;
                await fs.writeFile(YOUTUBE_CONFIG.cookies.path, basicCookieContent);
                console.log('Created basic cookies file');
                return { cookies: YOUTUBE_CONFIG.cookies.path };
            } catch (cookieError) {
                console.warn('Failed to create cookies file:', cookieError);
                return {};
            }
        }
    }
} 