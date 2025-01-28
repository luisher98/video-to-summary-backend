import express, { NextFunction } from 'express';
import getVideoInfo from './routes/getVideoInfo.js';
import getSummary from './routes/getSummary.js';
import getSummarySSE from './routes/getSummarySSE.js';
import getTranscript from './routes/getTranscript.js';
import getTestSSE from './routes/getTestSSE.js';
import { handleUncaughtErrors } from '../utils/errorHandling.js';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import helmet from 'helmet';

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
    exampleVideoId: 'N-ZNfuCdkUo' 
} as const;

// Types
interface QueueEntry {
    timestamp: number;
    ip: string;
}

interface ServerStatus {
    running: boolean;
    port: number;
    url: string;
    activeRequests: number;
    uptime: number;
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
    methods: ['GET'],
    optionsSuccessStatus: 200
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
 * Get current server status
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
    summary: '/api/summary',
    summarySSE: '/api/summary-sse',
    transcript: '/api/transcript',
    testSSE: '/api/test-sse'
} as const;

// Configure routes
app.get(apiRoutes.info, getVideoInfo);
app.get(apiRoutes.summary, requestQueueMiddleware as express.RequestHandler, getSummary);
app.get(apiRoutes.summarySSE, requestQueueMiddleware as express.RequestHandler, getSummarySSE);
app.get(apiRoutes.transcript, requestQueueMiddleware as express.RequestHandler, getTranscript);
app.get(apiRoutes.testSSE, getTestSSE);

/**
 * Start the server and configure error handling
 */
export function startServer(): void {
    if (serverInstance) {
        console.log('Server is already running');
        return;
    }

    // Only log once per cluster
    const shouldLog = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

    serverInstance = app.listen(CONFIG.port, () => {
        if (shouldLog) {
            console.log(`Server running on ${CONFIG.url}`);
            console.log(`Example endpoint: ${CONFIG.url}/api/summary-sse/?url=https://www.youtube.com/watch?v=${CONFIG.exampleVideoId}`);
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
}

/**
 * Stop the server
 */
export function stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!serverInstance) {
            console.log('Server is not running');
            resolve();
            return;
        }

        serverInstance.close((err) => {
            if (err) {
                reject(err);
                return;
            }
            serverInstance = null;
            activeRequests.clear();
            resolve();
        });
    });
}
