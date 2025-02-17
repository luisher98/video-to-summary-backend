import { Router } from 'express';
import { security } from '../../../middleware/index.js';
import azure from './azure/index.js';

const router = Router();

// Apply storage-specific middleware
router.use(security.rateLimit.processing);

// Mount storage provider routes
router.use('/azure', azure);

export default router; 