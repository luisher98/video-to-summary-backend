import { app } from '../../server/server.ts'; // Assuming your server has methods like app.getStatus()

export async function handleStatusCommand() {
  try {
    const status = await app.getStatus();
    if (status.running) {
      console.log(`Server is running on port ${status.port}`);
    } else {
      console.log('Server is not running.');
    }
  } catch (error) {
    console.error('Error retrieving server status:', error.message);
  }
}
