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

import { startServer } from './server/server.js';
import { startCLI } from './cli/cli.js';
import express from 'express';

const mode = process.argv.includes('--cli') ? 'cli' : 'server';

const app = express();

// Add this line before other middleware
app.set('trust proxy', true);

if (mode === 'cli') {
  startCLI();
} else {
  startServer();
}