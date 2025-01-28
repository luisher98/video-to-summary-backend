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