import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { TempPaths } from '@/config/paths.js';
import { validation } from '../../../middleware/middleware.js';
import { streamingSummary, streamingTranscript } from './streamingUpload.handler.js';

const router = Router();

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, TempPaths.UPLOADS);
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: function (_req, file, cb) {
        // Accept audio and video files
        if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio and video files are allowed'));
        }
    }
});

// File upload routes - keep original routes for backward compatibility
router.post('/summary', upload.single('file'), validation.upload.validateWordCount, streamingSummary);
router.post('/stream', upload.single('file'), validation.upload.validateWordCount, streamingSummary);
router.post('/transcript', upload.single('file'), streamingTranscript);

// Streaming routes (maintaining both paths for compatibility)
router.post('/streaming/summary', upload.single('file'), validation.upload.validateWordCount, streamingSummary);
router.post('/streaming/transcript', upload.single('file'), streamingTranscript);

export default router; 