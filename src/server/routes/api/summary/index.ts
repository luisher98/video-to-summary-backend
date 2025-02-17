import { Router } from 'express';
import { security } from '../../../middleware/index.js';
import youtube from './youtube/index.js';
import upload from './upload/index.js';

const router = Router();

// Apply summary-specific middleware
router.use(security.rateLimit.processing);

// Mount summary provider routes
router.use('/youtube', youtube);
router.use('/upload', upload);

export default router; 