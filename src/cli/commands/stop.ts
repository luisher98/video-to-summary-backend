import { typedApp } from '../../server/server.js';

/**
 * Gracefully stops the server and cleans up resources.
 * 
 * @returns {Promise<void>}
 * @throws {Error} If server stop operation fails
 * 
 * @example
 * await handleStopCommand();
 * // Server stopped successfully.
 */
export async function handleStopCommand() {
  try {
    await typedApp.stop();
    console.log('Server stopped successfully.');
  } catch (error) {
    console.error('Error stopping the server:', (error as Error).message);
  }
}
