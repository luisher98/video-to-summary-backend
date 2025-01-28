import { typedApp } from '../../server/server.js';

export async function handleStopCommand() {
  try {
    await typedApp.stop();
    console.log('Server stopped successfully.');
  } catch (error) {
    console.error('Error stopping the server:', (error as Error).message);
  }
}
