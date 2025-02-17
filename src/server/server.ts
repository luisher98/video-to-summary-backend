import express from 'express';
import { Server } from 'http';
import { initializeTempDirs, clearAllTempDirs } from '@/utils/file/tempDirs.js';
import { handleUncaughtErrors } from '@/utils/errors/errorHandling.js';
import { SERVER_CONFIG } from './config.js';
import { commonMiddleware, errors } from './middleware/index.js';
import apiRoutes from './routes/api/index.js';
import { verifyServices } from '@/utils/system/serviceVerification.js';

// Initialize Express app
export const app = express();

// Trust only Azure's proxy
app.set('trust proxy', SERVER_CONFIG.security.trustProxy);

// Apply common middleware
app.use(commonMiddleware);

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRoutes);

// Error handling
app.use(errors.handler);

// Server state
let serverInstance: ReturnType<typeof app.listen> | null = null;

// Add stop method type to app
export interface CustomExpress extends express.Express {
    stop(): Promise<void>;
}

// Cast app to CustomExpress and add stop method
(app as CustomExpress).stop = stopServer;

// Export the typed app
export const typedApp = app as CustomExpress;

/**
 * Gets current server status including uptime and active requests.
 */
export function getServerStatus() {
    return {
        running: serverInstance !== null,
        port: Number(SERVER_CONFIG.port),
        url: SERVER_CONFIG.url,
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

    // Verify services
    await verifyServices();

    // Set up periodic temp file cleanup
    const cleanupInterval = setInterval(() => {
        clearAllTempDirs(SERVER_CONFIG.tempFiles.maxAge).catch((error: Error) => {
            console.error('Error during temp file cleanup:', error);
        });
    }, SERVER_CONFIG.tempFiles.cleanupInterval);

    // Only log once per cluster
    const shouldLog = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

    serverInstance = app.listen(SERVER_CONFIG.port, () => {
        if (shouldLog) {
            console.log(`Server running on ${SERVER_CONFIG.url}`);
            console.log(`Example endpoint: ${SERVER_CONFIG.url}/api/summary/youtube/stream?url=https://www.youtube.com/watch?v=${SERVER_CONFIG.examples.videoId}`);
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
    return new Promise((resolve) => {
        if (!serverInstance || !serverInstance.listening) {
            console.log('Server is not running');
            resolve();
            return;
        }

        // Set a timeout for forceful shutdown
        const forceShutdown = setTimeout(() => {
            console.log('Force closing server after timeout');
            process.exit(1);
        }, 10000);

        serverInstance.close(async (err) => {
            clearTimeout(forceShutdown);
            
            if (err) {
                console.error('Error while closing server:', err);
            }
            
            try {
                await clearAllTempDirs(0); // 0 means delete all files regardless of age
                console.log('Successfully cleaned up resources');
            } catch (cleanupError) {
                console.error('Error cleaning up temp files:', cleanupError);
            }

            serverInstance = null;
            resolve();
        });

        // Close existing connections
        if (serverInstance.listening) {
            console.log('Closing all existing connections...');
            serverInstance.emit('close');
        }
    });
}
