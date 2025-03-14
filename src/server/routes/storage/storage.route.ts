import { Router } from 'express';
import { security } from '../../middleware/middleware.js';
import azure from './azure/azure.route.js';

const router = Router();

// Apply storage-specific middleware
router.use(security.request.rateLimit.processing);

// Mount storage provider routes
router.use('/azure', azure);

export default router; 