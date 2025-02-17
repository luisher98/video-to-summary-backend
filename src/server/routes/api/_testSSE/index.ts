import { Router } from 'express';
import { getTestSSE } from './routes.js';

const router = Router();

// Test endpoints
router.get('/sse', getTestSSE);

export default router; 