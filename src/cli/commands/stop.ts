import { app } from '../../server/server.ts'; 

export async function handleStopCommand() {
  try {
    await app.stop(); // it doesn't exist for now. must be implemented
    console.log('Server stopped successfully.');
  } catch (error) {
    console.error('Error stopping the server:', (error as Error).message);
  }
}
