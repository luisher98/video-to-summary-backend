import { Router } from 'express';
import { security } from '../../middleware/middleware.js';
import youtube from './youtube/youtube.route.js';
import upload from './upload/upload.route.js';

const router = Router();

// Apply summary-specific middleware
router.use(security.request.rateLimit.processing);

// Mount summary provider routes
router.use('/youtube', youtube);
router.use('/upload', upload);

export default router; 