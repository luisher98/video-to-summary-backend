import { Router } from 'express';
import storage from './api/storage/index.js';
import summary from './api/summary/index.js';
import health from './api/health/index.js';
import { commonMiddleware } from '../middleware/index.js';

const router = Router();

// Apply common middleware to all API routes
router.use(commonMiddleware);

// Mount API routes
router.use('/storage', storage);
router.use('/summary', summary);
router.use('/health', health);

export default router; 