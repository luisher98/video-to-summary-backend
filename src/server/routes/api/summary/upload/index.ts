import { Router } from 'express';
import { validation } from '../../../../middleware/middleware.js';
import { generateSummary, streamSummary, getTranscript } from './routes.js';

const router = Router();

// Apply upload-specific validation
const validateUpload = [
    validation.upload.validateFileUpload,
    validation.upload.validateFileType
];

const validateSummary = [
    ...validateUpload,
    validation.upload.validateWordCount
];

// Upload summary routes
router.post('/summary', validateSummary, generateSummary);
router.post('/stream', validateSummary, streamSummary);
router.post('/transcript', validateUpload, getTranscript);

export default router; 