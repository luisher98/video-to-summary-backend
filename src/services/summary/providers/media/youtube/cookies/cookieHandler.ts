import { TEMP_DIRS, createTempFile } from '../../../../../../utils/utils.js';

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

/**
 * Handles YouTube cookie management and validation.
 * Converts JSON cookies to Netscape format and manages temporary files.
 */
export class CookieHandler {
    private static readonly COOKIE_HEADER = '# Netscape HTTP Cookie File\n';
    private static readonly REQUIRED_FIELDS = ['domain', 'name', 'value'];
    private static readonly COOKIE_MAX_AGE = 3600000; // 1 hour

    /**
     * Validates cookie format and required fields
     */
    private static validateCookie(cookie: Cookie): boolean {
        return this.REQUIRED_FIELDS.every(field => 
            cookie[field as keyof Cookie] !== undefined && 
            cookie[field as keyof Cookie] !== ''
        );
    }

    /**
     * Converts JSON cookies to Netscape format
     */
    private static convertToNetscape(cookies: Cookie[]): string {
        const cookieLines = cookies.map(cookie => [
            cookie.domain || '.youtube.com',
            'FALSE',
            cookie.path || '/',
            cookie.secure ? 'TRUE' : 'FALSE',
            cookie.expirationDate || '0',
            cookie.name,
            cookie.value
        ].join('\t'));

        return this.COOKIE_HEADER + cookieLines.join('\n');
    }

    /**
     * Processes cookies from environment variable.
     * Validates, converts to Netscape format, and creates temporary file.
     * 
     * @returns Cookie options for youtube-dl-exec
     * @throws Error if cookie format is invalid
     */
    public static async processYouTubeCookies(): Promise<Record<string, string>> {
        const cookiesString = process.env.YOUTUBE_COOKIES;
        if (!cookiesString) {
            return {};
        }

        try {
            const cookies: Cookie[] = JSON.parse(cookiesString);
            if (!Array.isArray(cookies) || !cookies.length) {
                throw new Error('Invalid cookie format: expected non-empty array');
            }

            const invalidCookies = cookies.filter(c => !this.validateCookie(c));
            if (invalidCookies.length) {
                throw new Error(`Invalid cookies found: ${invalidCookies.map(c => c.name).join(', ')}`);
            }

            const netscapeCookies = this.convertToNetscape(cookies);
            const tempPath = await createTempFile(
                netscapeCookies,
                '.txt',
                TEMP_DIRS.cookies,
                this.COOKIE_MAX_AGE
            );

            console.log('Successfully processed YouTube cookies');
            return { cookies: tempPath };
        } catch (err) {
            console.warn('Failed to process YouTube cookies:', err instanceof Error ? err.message : err);
            return {};
        }
    }
} 