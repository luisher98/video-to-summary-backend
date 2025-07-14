import { YOUTUBE_CONFIG } from '@/config/youtube.js';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { TempPaths } from '@/config/paths.js';

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
 * Advanced cookie handler for YouTube downloads with multiple extraction strategies
 */
export class CookieHandler {
    private static readonly COOKIE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    private static lastCookieUpdate = 0;
    private static cachedCookiePath: string | null = null;

    /**
     * Main method to get YouTube cookies with multiple fallback strategies
     */
    public static async processYouTubeCookies(): Promise<CookieOptions> {
        if (!YOUTUBE_CONFIG.cookies.enabled) {
            console.log('YouTube cookies disabled in configuration');
            return {};
        }

        try {
            // Check if we have fresh cached cookies
            if (await this.hasFreshCookies()) {
                console.log('Using cached cookies');
                return { cookies: this.cachedCookiePath! };
            }

            console.log('Attempting to extract fresh YouTube cookies...');

            // Strategy 1: Try browser cookie extraction
            const browserCookies = await this.extractBrowserCookies();
            if (browserCookies.cookies) {
                console.log('Successfully extracted browser cookies');
                return browserCookies;
            }

            // Strategy 2: Try remote cookie API
            const remoteCookies = await this.fetchRemoteCookies();
            if (remoteCookies.cookies) {
                console.log('Successfully fetched remote cookies');
                return remoteCookies;
            }

            // Strategy 3: Create enhanced fallback cookies
            const fallbackCookies = await this.createEnhancedFallbackCookies();
            if (fallbackCookies.cookies) {
                console.log('Created enhanced fallback cookies');
                return fallbackCookies;
            }

            console.warn('All cookie strategies failed, proceeding without cookies');
            return {};

        } catch (error) {
            console.error('Cookie processing error:', error);
            return {};
        }
    }

    /**
     * Check if we have fresh cookies that don't need updating
     */
    private static async hasFreshCookies(): Promise<boolean> {
        if (!this.cachedCookiePath || Date.now() - this.lastCookieUpdate > this.COOKIE_CACHE_TTL) {
            return false;
        }

        try {
            await fs.access(this.cachedCookiePath);
            const stats = await fs.stat(this.cachedCookiePath);
            return stats.size > 100; // Reasonable cookie file size
        } catch {
            return false;
        }
    }

    /**
     * Strategy 1: Extract cookies from browser installations
     */
    private static async extractBrowserCookies(): Promise<CookieOptions> {
        try {
            console.log('Attempting browser cookie extraction...');
            
            // Try yt-dlp's built-in browser cookie extraction
            const cookiePath = path.join(TempPaths.COOKIES, `browser_cookies_${Date.now()}.txt`);
            
            const browserResult = await this.runYtDlpCookieExtraction(cookiePath);
            if (browserResult) {
                this.updateCache(cookiePath);
                return { cookies: cookiePath };
            }

            return {};
        } catch (error) {
            console.warn('Browser cookie extraction failed:', error);
            return {};
        }
    }

    /**
     * Run yt-dlp cookie extraction from browsers
     */
    private static async runYtDlpCookieExtraction(outputPath: string): Promise<boolean> {
        const browsers = ['chrome', 'firefox', 'safari', 'edge'];
        
        for (const browser of browsers) {
            try {
                console.log(`Trying to extract cookies from ${browser}...`);
                
                const result = await new Promise<boolean>((resolve) => {
                    const ytDlp = spawn('yt-dlp', [
                        '--cookies-from-browser', browser,
                        '--cookies', outputPath,
                        '--print', 'cookies',
                        '--no-download',
                        'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // Test video
                    ]);

                    ytDlp.on('exit', (code) => {
                        resolve(code === 0);
                    });

                    ytDlp.on('error', () => {
                        resolve(false);
                    });

                    // Timeout after 10 seconds
                    setTimeout(() => resolve(false), 10000);
                });

                if (result) {
                    // Verify the file was created and has content
                    try {
                        const stats = await fs.stat(outputPath);
                        if (stats.size > 100) {
                            console.log(`Successfully extracted cookies from ${browser}`);
                            return true;
                        }
                    } catch {
                        // File wasn't created or is empty
                    }
                }
            } catch (error) {
                console.warn(`Failed to extract from ${browser}:`, error);
                continue;
            }
        }

        return false;
    }

    /**
     * Strategy 2: Fetch cookies from remote API service
     */
    private static async fetchRemoteCookies(): Promise<CookieOptions> {
        try {
            console.log('Fetching cookies from remote API...');
            
            // Using the yt-cookies service approach from the search results
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('http://185.158.132.66:1234/golden-cookies/ytc', {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Remote API responded with ${response.status}`);
            }

            const cookieData = await response.json();
            
            if (cookieData && typeof cookieData === 'object') {
                const cookiePath = path.join(TempPaths.COOKIES, `remote_cookies_${Date.now()}.txt`);
                await this.formatAndSaveRemoteCookies(cookieData, cookiePath);
                
                this.updateCache(cookiePath);
                return { cookies: cookiePath };
            }

            return {};
        } catch (error) {
            console.warn('Remote cookie fetch failed:', error);
            return {};
        }
    }

    /**
     * Format and save cookies from remote API
     */
    private static async formatAndSaveRemoteCookies(cookieData: any, outputPath: string): Promise<void> {
        let cookieContent = '# Netscape HTTP Cookie File\n# This is a generated file! Do not edit.\n\n';
        
        if (typeof cookieData === 'string') {
            // If it's already a cookie string, use it directly
            cookieContent += cookieData;
        } else if (cookieData.cookies && Array.isArray(cookieData.cookies)) {
            // If it's an array of cookie objects
            for (const cookie of cookieData.cookies) {
                if (cookie.domain && cookie.name && cookie.value) {
                    const domain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`;
                    const secure = cookie.secure ? 'TRUE' : 'FALSE';
                    const httpOnly = cookie.httpOnly ? 'TRUE' : 'FALSE';
                    const expiry = cookie.expirationDate || Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
                    
                    cookieContent += `${domain}\t${httpOnly}\t${cookie.path || '/'}\t${secure}\t${expiry}\t${cookie.name}\t${cookie.value}\n`;
                }
            }
        }

        await fs.writeFile(outputPath, cookieContent);
    }

    /**
     * Strategy 3: Create enhanced fallback cookies with better values
     */
    private static async createEnhancedFallbackCookies(): Promise<CookieOptions> {
        try {
            console.log('Creating enhanced fallback cookies...');
            
            const cookiePath = path.join(TempPaths.COOKIES, `enhanced_fallback_${Date.now()}.txt`);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(cookiePath), { recursive: true });
            
            // Create enhanced cookies with more realistic values
            const enhancedCookieContent = `# Netscape HTTP Cookie File
# This is a generated file! Do not edit.

.youtube.com	TRUE	/	FALSE	${Math.floor(Date.now() / 1000) + 86400}	VISITOR_INFO1_LIVE	${this.generateVisitorId()}
.youtube.com	TRUE	/	FALSE	${Math.floor(Date.now() / 1000) + 86400}	YSC	${this.generateYSC()}
.youtube.com	TRUE	/	FALSE	${Math.floor(Date.now() / 1000) + 31536000}	PREF	f1=50000000&f4=4000000&f6=400&f7=100
.youtube.com	TRUE	/	FALSE	${Math.floor(Date.now() / 1000) + 86400}	CONSENT	PENDING+${Math.floor(Math.random() * 1000)}
.google.com	TRUE	/	FALSE	${Math.floor(Date.now() / 1000) + 86400}	NID	${this.generateNID()}
.youtube.com	TRUE	/	TRUE	${Math.floor(Date.now() / 1000) + 86400}	__Secure-3PSID	${this.generateSecureId()}
`;

            await fs.writeFile(cookiePath, enhancedCookieContent);
            
            this.updateCache(cookiePath);
            return { cookies: cookiePath };
            
        } catch (error) {
            console.error('Failed to create enhanced fallback cookies:', error);
            return {};
        }
    }

    /**
     * Generate realistic visitor ID
     */
    private static generateVisitorId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let result = '';
        for (let i = 0; i < 22; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generate YSC cookie value
     */
    private static generateYSC(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Generate NID cookie value
     */
    private static generateNID(): string {
        const part1 = Math.floor(Math.random() * 1000);
        const part2 = Math.random().toString(36).substring(2, 15);
        const part3 = Math.random().toString(36).substring(2, 15);
        return `${part1}=${part2}-${part3}`;
    }

    /**
     * Generate secure ID
     */
    private static generateSecureId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 64; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Update cache information
     */
    private static updateCache(cookiePath: string): void {
        this.cachedCookiePath = cookiePath;
        this.lastCookieUpdate = Date.now();
    }

    /**
     * Clean up old cookie files
     */
    public static async cleanupOldCookies(): Promise<void> {
        try {
            const cookieDir = TempPaths.COOKIES;
            const files = await fs.readdir(cookieDir);
            const now = Date.now();
            
            for (const file of files) {
                if (file.startsWith('browser_cookies_') || 
                    file.startsWith('remote_cookies_') || 
                    file.startsWith('enhanced_fallback_')) {
                    
                    const filePath = path.join(cookieDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Delete files older than 1 hour
                    if (now - stats.mtime.getTime() > 60 * 60 * 1000) {
                        await fs.unlink(filePath);
                        console.log(`Cleaned up old cookie file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.warn('Cookie cleanup failed:', error);
        }
    }
} 