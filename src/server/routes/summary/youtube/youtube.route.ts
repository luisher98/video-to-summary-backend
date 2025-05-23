import { Router } from 'express';
import { validation } from '../../../middleware/middleware.js';
import { streamingSummary, streamingTranscript, getMetadata } from './streamingYoutube.handler.js';

const router = Router();

// Apply validation middleware
const validateYouTube = [
    validation.youtube.validateUrl,
    validation.youtube.validateWordCount
];

// Routes
router.get('/summary', validateYouTube, streamingSummary);
router.get('/stream', validateYouTube, streamingSummary);
router.get('/transcript', validation.youtube.validateUrl, streamingTranscript);
router.get('/metadata', validation.youtube.validateUrl, getMetadata);

// Keep the original route names for backward compatibility
router.get('/streaming/summary', validateYouTube, streamingSummary);
router.get('/streaming/transcript', validation.youtube.validateUrl, streamingTranscript);

export default router; 