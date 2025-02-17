import { Router } from 'express';
import storage from './storage/index.js';
import summary from './summary/index.js';
import health from './health/index.js';
import test from './_testSSE/index.js';

const router = Router();

// Mount API routes
router.use('/storage', storage);
router.use('/summary', summary);
router.use('/health', health);
router.use('/test', test);

export default router; 