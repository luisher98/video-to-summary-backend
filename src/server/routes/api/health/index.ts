import { Router } from 'express';
import { getStatus } from './routes.js';

const router = Router();

// Health check endpoint
router.get('/', getStatus);

export default router; 