import { Router } from 'express';
import { validation } from '@/server/middleware/middleware.js';
import { createStorageService } from '@/services/storage/StorageService.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';
import { createRouteHandlers } from './routes.js';

// Initialize storage service (this will be done only once)
const storage = await createStorageService(AZURE_STORAGE_CONFIG);
await storage.initialize();

// Create route handlers
const { initiateUpload, uploadContent, processVideo } = createRouteHandlers(storage);

// Create router
const router = Router();

// File upload routes
router.post('/upload/initiate', validation.upload.validateFileUpload, initiateUpload);
router.post('/upload/content', validation.upload.validateFileUpload, uploadContent);
router.post('/upload/process', validation.upload.validateFileUpload, processVideo);

export default router; 