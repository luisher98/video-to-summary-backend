import express from 'express';
import { config } from '../config/environment.js';
import { corsMiddleware, timeoutMiddleware, securityHeaders } from '../middleware/security.js';
import getVideoInfo from './routes/getVideoInfo.js';
import getUploadUrl from './routes/uploadUrl.js';
import { handleUncaughtErrors } from '../utils/errorHandling.js';
import { initializeTempDirs, clearAllTempDirs } from '../utils/utils.js';

const app = express();

// Apply middleware
app.use(corsMiddleware);
app.use(timeoutMiddleware);
app.use(securityHeaders);
app.use(express.json());

// Routes
app.get('/api/info', getVideoInfo);
app.post('/api/upload-url', getUploadUrl);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Initialize temp directories
initializeTempDirs();

// Cleanup on exit
process.on('SIGINT', async () => {
  await clearAllTempDirs();
  process.exit(0);
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
