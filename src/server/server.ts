import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { Paths } from '@/infrastructure/config/paths.js';
import { fileURLToPath } from 'url';
import path from 'path';
import getVideoMetadata from './routes/getVideoMetadata.js';
import summarizeYouTube from './routes/summarizeYouTube.js';
import summarizeYouTubeStream from './routes/summarizeYouTubeStream.js';
import summarizeUploadStream from './routes/summarizeUploadStream.js';
import getVideoTranscript from './routes/getVideoTranscript.js';
import testStream from './routes/testStream.js';
import getAzureUploadUrl from './routes/getAzureUploadUrl.js';
import checkHealth from './routes/checkHealth.js';
import { handleUncaughtErrors } from '@/utils/errors/errorHandling.js';
import { initializeTempDirs, clearAllTempDirs } from '@/utils/file/tempDirs.js';
import { 
    securityHeaders, 
    corsMiddleware, 
    rateLimiter,
    requestQueueMiddleware,
    requestTimeout,
    apiKeyAuth,
    activeRequests
} from './middleware/security.js';
import summarizeAzureStream from './routes/summarizeAzureStream.js';

// Configuration constants
const CONFIG = {
    port: process.env.PORT || 5050,
    url: process.env.WEBSITE_HOSTNAME || `http://localhost:${process.env.PORT || 5050}`,
    environment: process.env.NODE_ENV || 'development',
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
app.use('/health', checkHealth);

// Routes with queue middleware
app.get('/api/video/metadata', getVideoMetadata);
app.get('/api/youtube/summary', requestQueueMiddleware, summarizeYouTube);
app.get('/api/youtube/summary/stream', requestQueueMiddleware, summarizeYouTubeStream);
app.use('/api/azure/upload/url', getAzureUploadUrl);

// File upload summary endpoints
app.route('/api/upload/summary/stream')
  .get(requestQueueMiddleware, summarizeUploadStream)
  .post(requestQueueMiddleware, summarizeUploadStream);

// Azure blob summary endpoint
app.get('/api/azure/summary/stream', requestQueueMiddleware, summarizeAzureStream);

app.get('/api/video/transcript', requestQueueMiddleware, getVideoTranscript);
app.get('/api/test/stream', testStream);

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
        clearAllTempDirs(CONFIG.tempFiles.maxAge).catch((error: Error) => {
            console.error('Error during temp file cleanup:', error);
        });
    }, CONFIG.tempFiles.cleanupInterval);

    // Only log once per cluster
    const shouldLog = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

    serverInstance = app.listen(CONFIG.port, () => {
        if (shouldLog) {
            console.log(`Server running on ${CONFIG.url}`);
            console.log(`Example endpoint: ${CONFIG.url}/api/youtube/summary/stream?url=https://www.youtube.com/watch?v=${CONFIG.exampleVideoId}`);
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
