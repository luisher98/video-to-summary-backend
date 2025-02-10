import express, { NextFunction } from 'express';
import getVideoInfo from './routes/getVideoInfo.js';
import getYouTubeSummary from './routes/getYouTubeSummary.js';
import getYouTubeSummarySSE from './routes/getYouTubeSummarySSE.js';
import uploadSummarySSE from './routes/uploadSummarySSE.js';
import getTranscript from './routes/getTranscript.js';
import getTestSSE from './routes/getTestSSE.js';
import uploadUrlRouter from './routes/uploadUrl.js';
import { handleUncaughtErrors } from '../utils/errorHandling.js';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import helmet from 'helmet';
import { initializeTempDirs, clearAllTempDirs } from '../utils/utils.js';

// Configuration constants
const CONFIG = {
    port: process.env.PORT || 5050,
    url: process.env.WEBSITE_HOSTNAME 
        ? `https://${process.env.WEBSITE_HOSTNAME}`
        : `http://localhost:${process.env.PORT || 5050}`,
    rateLimit: {
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 10,
        message: 'Too many requests from this IP, please try again later'
    },
    queue: {
        maxConcurrentRequests: 2
    },
    tempFiles: {
        cleanupInterval: 60 * 60 * 1000, // 1 hour
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    exampleVideoId: 'N-ZNfuCdkUo' 
} as const;

/**
 * Server configuration and state interfaces
 */
interface ServerStatus {
    running: boolean;
    port: number;
    url: string;
    activeRequests: number;
    uptime: number;
}

/**
 * Queue entry for tracking active requests
 */
interface QueueEntry {
    timestamp: number;
    ip: string;
}

// Server state
let serverInstance: ReturnType<typeof app.listen> | null = null;

// Initialize Express app
export const app = express();

// Trust only Azure's proxy
app.set('trust proxy', 'uniquelocal');

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: '*',  // Allow all origins for now
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],  // Include PUT for Azure uploads
    allowedHeaders: ['Content-Type', 'x-ms-blob-type', 'x-ms-version'],
    exposedHeaders: ['ETag'],
    maxAge: 86400,  // 24 hours
    optionsSuccessStatus: 200,
    credentials: false
};
app.use(cors(corsOptions));

// Add stop method type to app
export interface CustomExpress extends express.Express {
    stop(): Promise<void>;
}

// Cast app to CustomExpress and add stop method
(app as CustomExpress).stop = stopServer;

// Export the typed app
export const typedApp = app as CustomExpress;

// Configure rate limiting
const rateLimiter = rateLimit({
    windowMs: CONFIG.rateLimit.windowMs,
    max: CONFIG.rateLimit.maxRequests,
    message: CONFIG.rateLimit.message,
    // Use a more secure key generator
    keyGenerator: (req) => {
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (typeof xForwardedFor === 'string') {
            // Get the first IP in the chain (original client)
            return xForwardedFor.split(',')[0].trim();
        }
        return req.socket.remoteAddress || 'unknown';
    }
});

app.use(rateLimiter);

// Request queue management
export const activeRequests = new Map<string, QueueEntry>();

/**
 * Gets current server status including uptime and active requests.
 * 
 * @returns {ServerStatus} Current server status
 */
export function getServerStatus(): ServerStatus {
    return {
        running: serverInstance !== null,
        port: Number(CONFIG.port),
        url: CONFIG.url,
        activeRequests: activeRequests.size,
        uptime: process.uptime()
    };
}

/**
 * Middleware to manage concurrent request queue
 */
const requestQueueMiddleware = async (
    req: express.Request, 
    res: express.Response, 
    next: NextFunction
): Promise<void> => {
    const requestId = uuidv4();
    
    if (activeRequests.size >= CONFIG.queue.maxConcurrentRequests) {
        res.status(503).json({
            error: 'Server is busy. Please try again later.'
        });
        return;
    }

    activeRequests.set(requestId, {
        timestamp: Date.now(),
        ip: req.ip || 'unknown'
    });

    res.once('finish', () => {
        activeRequests.delete(requestId);
    });

    next();
};

// API Routes
const apiRoutes = {
    info: '/api/info',
    youtubeSummary: '/api/youtube-summary',
    youtubeSummarySSE: '/api/youtube-summary-sse',
    uploadSummarySSE: '/api/upload-summary-sse',
    uploadUrl: '/api/upload-url',
    transcript: '/api/transcript',
    testSSE: '/api/test-sse'
} as const;

// Configure routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(apiRoutes.info, getVideoInfo);
app.get(apiRoutes.youtubeSummary, requestQueueMiddleware as express.RequestHandler, getYouTubeSummary);
app.get(apiRoutes.youtubeSummarySSE, requestQueueMiddleware as express.RequestHandler, getYouTubeSummarySSE);
app.use(apiRoutes.uploadUrl, uploadUrlRouter);
app.post(apiRoutes.uploadSummarySSE, requestQueueMiddleware as express.RequestHandler, uploadSummarySSE);
app.get(apiRoutes.uploadSummarySSE, requestQueueMiddleware as express.RequestHandler, uploadSummarySSE);
app.get(apiRoutes.transcript, requestQueueMiddleware as express.RequestHandler, getTranscript);
app.get(apiRoutes.testSSE, getTestSSE);

/**
 * Starts the server and configures error handling.
 * Sets up routes, middleware, and request queue.
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
 * 
 * @returns {Promise<void>} Resolves when server is stopped
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
                // Clean up temp files on shutdown
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
