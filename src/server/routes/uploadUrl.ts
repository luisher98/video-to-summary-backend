import { Request, Response } from 'express';
import { azureStorage } from '@/services/storage/azure/azureStorageService.js';
import { handleError } from '@/utils/errors/errorHandling.js';

/**
 * Generates a pre-signed URL for uploading files directly to Azure Blob Storage.
 * 
 * @param {Request} req - Express request object with body:
 *   - fileName: Name of the file to upload
 *   - fileSize: Size of the file in bytes
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with upload URL and file info
 */
export default async function getUploadUrl(req: Request, res: Response) {
  try {
    const { fileName } = req.query;
    
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({
        error: 'fileName is required and must be a string'
      });
    }

    const uploadUrl = await azureStorage.generateUploadUrl(fileName);
    
    res.json({
      uploadUrl,
      fileName
    });
  } catch (error) {
    handleError(error, res);
  }
} 