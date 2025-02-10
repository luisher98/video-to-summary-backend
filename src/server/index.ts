import express from 'express';
import uploadUrlRouter from './routes/uploadUrl.js';

const app = express();

// Register routes
app.use('/api/upload-url', uploadUrlRouter);

// ... rest of the existing code ... 