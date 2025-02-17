import { Router } from 'express';
import { validation } from '../../../../middleware/index.js';
import { generateSummary, streamSummary, getTranscript, getMetadata } from './routes.js';

const router = Router();

// Apply YouTube-specific validation
const validateYouTube = [validation.youtube.validateUrl, validation.youtube.validateWordCount];

// YouTube summary routes
router.get('/summary', validateYouTube, generateSummary);
router.get('/stream', validateYouTube, streamSummary);
router.get('/transcript', validation.youtube.validateUrl, getTranscript);
router.get('/metadata', validation.youtube.validateUrl, getMetadata);

export default router; 