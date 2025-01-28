import { app } from '../../server/server.js';
import type { CustomExpress } from '../../server/server.js';

export async function handleStopCommand() {
  try {
    const customApp = app as CustomExpress;
    await customApp.stop();
    console.log('Server stopped successfully.');
  } catch (error) {
    console.error('Error stopping the server:', (error as Error).message);
  }
}
