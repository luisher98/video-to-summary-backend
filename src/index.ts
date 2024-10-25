import { startServer } from './server/server.ts';
import { startCLI } from './cli/cli.ts';

const mode = process.argv.includes('--cli') ? 'cli' : 'server';

if (mode === 'cli') {
  startCLI();
} else {
  startServer();
}