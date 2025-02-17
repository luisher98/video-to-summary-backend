import { Router } from 'express';
import { validation } from '../../../middleware/index.js';
import { initiateUpload, processVideo } from './routes.js';

const router = Router();

// Apply video-specific validation
router.post('/upload/initiate', validation.upload.validateInitiateUpload, initiateUpload);
router.post('/:fileId/process', processVideo);

export default router; 