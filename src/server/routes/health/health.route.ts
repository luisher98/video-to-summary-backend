import { Router } from 'express';
import { getStatus } from './health.handler.js';

const router = Router();

// Health check endpoint
router.get('/', getStatus);

export default router; 