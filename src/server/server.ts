import express from 'express';
import getVideoInfo from './routes/getVideoInfo.js';
import getYouTubeSummary from './routes/getYouTubeSummary.js';
import getYouTubeSummarySSE from './routes/getYouTubeSummarySSE.js';
import uploadSummarySSE from './routes/uploadSummarySSE.js';
import getTranscript from './routes/getTranscript.js';
import getTestSSE from './routes/getTestSSE.js';
import uploadUrlRouter from './routes/uploadUrl.js';
import healthCheck from './routes/healthCheck.js';
import { handleUncaughtErrors } from '../utils/errorHandling.js';
import { initializeTempDirs, clearAllTempDirs } from '../utils/utils.js';
import { 
    securityHeaders, 
    corsMiddleware, 
    rateLimiter,
    requestQueueMiddleware,
    requestTimeout,
    apiKeyAuth,
    activeRequests
} from './middleware/security.js';

// Configuration constants
const CONFIG = {
    port: process.env.PORT || 5050,
    url: process.env.WEBSITE_HOSTNAME 
        ? `https://${process.env.WEBSITE_HOSTNAME}`
        : `http://localhost:${process.env.PORT || 5050}`,
    tempFiles: {
        cleanupInterval: 60 * 60 * 1000, // 1 hour
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    exampleVideoId: 'N-ZNfuCdkUo' 
} as const;

// Server state
let serverInstance: ReturnType<typeof app.listen> | null = null;

// Initialize Express app
export const app = express();

// Trust only Azure's proxy
app.set('trust proxy', 'uniquelocal');

// Apply security middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(rateLimiter);
app.use(requestTimeout);
app.use(apiKeyAuth);

// Add stop method type to app
export interface CustomExpress extends express.Express {
    stop(): Promise<void>;
}

// Cast app to CustomExpress and add stop method
(app as CustomExpress).stop = stopServer;

// Export the typed app
export const typedApp = app as CustomExpress;

// API Routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route (no queue middleware)
app.use('/health', healthCheck);

// Routes with queue middleware
app.get('/api/info', getVideoInfo);
app.get('/api/youtube-summary', requestQueueMiddleware, getYouTubeSummary);
app.get('/api/youtube-summary-sse', requestQueueMiddleware, getYouTubeSummarySSE);
app.use('/api/upload-url', uploadUrlRouter);
app.route('/api/upload-summary-sse')
    .get(requestQueueMiddleware, uploadSummarySSE)
    .post(requestQueueMiddleware, uploadSummarySSE);
app.get('/api/transcript', requestQueueMiddleware, getTranscript);
app.get('/api/test-sse', getTestSSE);

/**
 * Gets current server status including uptime and active requests.
 */
export function getServerStatus() {
    return {
        running: serverInstance !== null,
        port: Number(CONFIG.port),
        url: CONFIG.url,
        activeRequests: activeRequests.size,
        uptime: process.uptime()
    };
}

/**
 * Starts the server and configures error handling.
 */
export async function startServer(): Promise<void> {
    if (serverInstance) {
        console.log('Server is already running');
        return;
    }

    // Initialize temp directories
    await initializeTempDirs();

    // Set up periodic temp file cleanup
    const cleanupInterval = setInterval(() => {
        clearAllTempDirs(CONFIG.tempFiles.maxAge).catch(error => {
            console.error('Error during temp file cleanup:', error);
        });
    }, CONFIG.tempFiles.cleanupInterval);

    // Only log once per cluster
    const shouldLog = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

    serverInstance = app.listen(CONFIG.port, () => {
        if (shouldLog) {
            console.log(`Server running on ${CONFIG.url}`);
            console.log(`Example endpoint: ${CONFIG.url}/api/youtube-summary-sse/?url=https://www.youtube.com/watch?v=${CONFIG.exampleVideoId}`);
        }
    });

    // Add global error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
    });

    handleUncaughtErrors(serverInstance);

    // Clean up on process termination
    process.on('SIGTERM', () => {
        clearInterval(cleanupInterval);
        stopServer().catch(console.error);
    });
}

/**
 * Gracefully stops the server and cleans up resources.
 */
export function stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!serverInstance) {
            console.log('Server is not running');
            resolve();
            return;
        }

        serverInstance.close(async (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            try {
                await clearAllTempDirs(0); // 0 means delete all files regardless of age
                serverInstance = null;
                activeRequests.clear();
                resolve();
            } catch (cleanupError) {
                console.error('Error cleaning up temp files:', cleanupError);
                reject(cleanupError);
            }
        });
    });
}
