/**
 * Load environment variables first
 */
import '@/config/loadEnv.js';

/**
 * Main application entry point.
 * Starts either the CLI or server based on command line arguments.
 * 
 * @example
 * // Start server mode
 * npm start
 * 
 * // Start CLI mode
 * npm start -- --cli
 */

import { startServer, stopServer } from '@/server/server.js';
import { startCLI } from '@/cli/cli.js';
import express from 'express';
import { clearAllTempDirs } from '@/utils/file/tempDirs.js';
import { Paths } from '@/infrastructure/config/paths.js';

// Initialize paths
console.log('Application paths initialized:', {
    root: Paths.ROOT,
    temp: Paths.TEMP.ROOT
});

const mode = process.argv.includes('--cli') ? 'cli' : 'server';
const app = express();

// Add this line before other middleware
app.set('trust proxy', true);

if (mode === 'cli') {
    startCLI();
} else {
    startServer();
}

/**
 * Cleanup handler for graceful shutdown
 */
async function handleShutdown(signal: string): Promise<void> {
    console.log(`\nReceived ${signal}. Cleaning up...`);
    await clearAllTempDirs();
    await stopServer();
    process.exit(0);
}

// Cleanup on exit
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));