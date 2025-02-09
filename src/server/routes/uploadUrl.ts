import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getBlobClient } from '../../services/storage/azureStorage.js';
import { config } from '../../config/environment.js';
import { handleError } from '../../utils/errorHandling.js';

interface UploadUrlRequest {
  fileName: string;
  fileSize: number;
}

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
    const { fileName, fileSize } = req.body as UploadUrlRequest;

    if (!fileName || !fileSize) {
      return res.status(400).json({
        success: false,
        message: 'fileName and fileSize are required'
      });
    }

    if (fileSize > config.maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${config.maxFileSize / (1024 * 1024)}MB`
      });
    }

    // Generate unique blob name
    const fileExtension = fileName.split('.').pop() || '';
    const blobName = `${uuidv4()}.${fileExtension}`;
    const fileId = uuidv4();

    // Get blob client and generate SAS URL
    const blobClient = await getBlobClient(blobName);
    const sasUrl = await blobClient.generateSasUrl({
      permissions: { write: true, create: true },
      expiresOn: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    res.json({
      success: true,
      data: {
        url: sasUrl,
        blobName,
        fileId,
      }
    });
  } catch (error) {
    handleError(error, res);
  }
} 