import { Router } from 'express';
import { validation } from '../../../../middleware/index.js';
import { uploadFile, getUploadUrl } from './routes.js';

const router = Router();

// File upload routes
router.post('/upload', validation.upload.validateFileUpload, uploadFile);
router.post('/upload-url', getUploadUrl);

export default router; 