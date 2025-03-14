import { Router } from 'express';
import storage from './storage/index.js';
import summary from './summary/index.js';
import health from './health/index.js';
import test from './healthSSE/index.js';
import videos from './videos/index.js';

const router = Router();

// Mount API routes
router.use('/storage', storage);
router.use('/summary', summary);
router.use('/health', health);
router.use('/_test', test);
router.use('/videos', videos);

export default router; 