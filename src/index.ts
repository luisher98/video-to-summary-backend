import { startServer } from './server/server.js';
import { startCLI } from './cli/cli.js';

const mode = process.argv.includes('--cli') ? 'cli' : 'server';

if (mode === 'cli') {
  startCLI();
} else {
  startServer();
}