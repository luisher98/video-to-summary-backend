import { Router } from 'express';
import { getTestSSE } from './healthSSE.handler.js';

const router = Router();

// Test endpoints
router.get('/sse', getTestSSE);

export default router; 