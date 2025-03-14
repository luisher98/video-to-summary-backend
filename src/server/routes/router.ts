import { Router } from 'express';
import storage from './storage/storage.route.js';
import summary from './summary/summary.route.js';
import health from './health/health.route.js';
import test from './healthSSE/healthSSE.route.js';
import videos from './videos/video.route.js';

const router = Router();

// Mount API routes
router.use('/storage', storage);
router.use('/summary', summary);
router.use('/health', health);
router.use('/_test', test);
router.use('/videos', videos);

export default router; 