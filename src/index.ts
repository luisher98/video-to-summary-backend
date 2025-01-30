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

import { startServer, stopServer } from './server/server.js';
import { startCLI } from './cli/cli.js';
import express from 'express';
import { clearAllTempDirs } from './utils/utils.js';

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
    try {
        if (mode === 'server') {
            await stopServer();
        } else {
            await clearAllTempDirs(0); // Clean all temp files immediately
        }
        console.log('Cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
    process.exit(0);
}

// Cleanup on exit
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));