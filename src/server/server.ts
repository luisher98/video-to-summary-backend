import express from 'express';
import getVideoInfo from './routes/getVideoInfo.ts';
import getSummary from './routes/getSummary.ts';
import getSummarySSE from './routes/getSummarySSE.ts';
import getTestSSE from './routes/getTestSSE.ts';
import { handleUncaughtErrors } from '../utils/errorHandling.ts';

const port = process.env.PORT || 5050;
const url = process.env.URL || 'http://localhost';

export const app = express();

app.use(express.json());

// Routes
app.get('/api/info', getVideoInfo);
app.get('/api/summary', getSummary);
app.get('/api/summary-sse', getSummarySSE);
app.get('/api/test-sse', getTestSSE);

// Start server
export function startServer() {
  const server = app.listen(port, () => {
    console.log(`Server running on ${url}:${port}`);
    console.log(`Test response: ${url}:${port}/api/summary/?url=https://www.youtube.com/watch?v=Knd4wvmqK3g`);
  });

  // Error handling
  handleUncaughtErrors(server);
}
