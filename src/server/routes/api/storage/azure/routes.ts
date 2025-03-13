import { Request, Response, Router } from 'express';
import { createStorageService, StorageError } from '@/services/storage/StorageService.js';
import { AZURE_STORAGE_CONFIG } from '@/config/azure.js';
import { handleError } from '@/utils/errors/index.js';
import { validateFileUpload } from '@/server/middleware/validation/upload.js';

const router = Router();

// Initialize storage service
const storage = createStorageService(AZURE_STORAGE_CONFIG);
await storage.initialize();

interface UploadRequest {
    fileName: string;
    fileSize: number;
}

/**
 * Handle direct file upload to Azure Blob Storage
 */
export async function uploadFile(req: Request, res: Response) {
    try {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const uploadResult = await storage.uploadFile(
            file.buffer,
            file.originalname,
            file.size
        );

        res.json({ data: uploadResult });
    } catch (error) {
        handleError(error, res);
    }
}

/**
 * Generate a pre-signed URL for client-side upload to Azure Blob Storage
 */
export async function getUploadUrl(req: Request, res: Response) {
    try {
        const { fileName, fileSize } = req.body as UploadRequest;
        
        if (!fileName || !fileSize) {
            return res.status(400).json({ error: 'fileName and fileSize are required' });
        }

        const uploadUrl = await storage.generateUploadUrl(fileName, {
            metadata: {
                originalName: fileName,
                size: fileSize.toString(),
                uploadedAt: new Date().toISOString()
            }
        });

        res.json({ data: uploadUrl });
    } catch (error) {
        handleError(error, res);
    }
}

router.post('/upload', validateFileUpload, async (req: Request, res: Response) => {
    try {
        const { file } = req;
        if (!file) {
            throw new Error('No file uploaded');
        }

        const uploadResult = await storage.uploadFile(
            file.buffer,
            file.originalname,
            file.size
        );

        res.json({
            success: true,
            url: uploadResult
        });
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/upload-url', validateFileUpload, async (req: Request, res: Response) => {
    try {
        const { fileName, fileSize } = req.body;

        const uploadUrl = await storage.generateUploadUrl(fileName, {
            metadata: {
                originalName: fileName,
                size: fileSize.toString()
            }
        });

        res.json(uploadUrl);
    } catch (error) {
        handleError(error, res);
    }
});

export default router; 