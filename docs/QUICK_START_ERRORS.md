# Error Handling Quick Start Guide

This guide provides practical examples of using the error handling system in common scenarios.

## Basic Usage

### 1. Throwing Domain Errors

```typescript
import { MediaError, MediaErrorCode } from '@/utils/errors';
import { processTimer, logRequest } from '@/utils/logging';

async function processVideo(videoId: string): Promise<void> {
    processTimer.startProcess('video-processing');
    
    try {
        // Process video...
        processTimer.endProcess('video-processing');
    } catch (error) {
        processTimer.endProcess('video-processing', error);
        throw new MediaError(
            'Failed to process video',
            MediaErrorCode.PROCESSING_FAILED,
            { videoId, originalError: error }
        );
    }
}
```

### 2. HTTP Route Error Handling

```typescript
import { Request, Response } from 'express';
import { handleError, BadRequestError } from '@/utils/errors';

export async function handleUpload(req: Request, res: Response): Promise<void> {
    try {
        const { file } = req;
        if (!file) {
            throw new BadRequestError('No file provided');
        }

        // Process file...
        res.json({ success: true });
    } catch (error) {
        handleError(error, res);
    }
}
```

### 3. Process Tracking with Error Context

```typescript
import { processTimer, logProcessStep } from '@/utils/logging';
import { MediaError, MediaErrorCode } from '@/utils/errors';

async function convertVideo(inputPath: string, outputPath: string): Promise<void> {
    const processName = 'Video Conversion';
    processTimer.startProcess(processName);
    logProcessStep(processName, 'start', { input: inputPath });

    try {
        // Conversion steps...
        logProcessStep(processName, 'complete', { output: outputPath });
        processTimer.endProcess(processName);
    } catch (error) {
        logProcessStep(processName, 'error', { 
            error: error instanceof Error ? error.message : String(error)
        });
        processTimer.endProcess(processName, error);
        
        throw new MediaError(
            'Video conversion failed',
            MediaErrorCode.CONVERSION_FAILED,
            { input: inputPath, output: outputPath, error }
        );
    }
}
```

### 4. Network Errors and Retries

```typescript
import { NetworkError, NetworkErrorCode } from '@/utils/errors';
import { retryOperation } from '@/utils/retry';

async function fetchWithRetry(url: string): Promise<Response> {
    return retryOperation(
        async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new NetworkError(
                        'Request failed',
                        NetworkErrorCode.CONNECTION_FAILED,
                        { statusCode: response.status }
                    );
                }
                return response;
            } catch (error) {
                if (error instanceof TypeError) {
                    throw new NetworkError(
                        'Network connection failed',
                        NetworkErrorCode.CONNECTION_FAILED,
                        { error }
                    );
                }
                throw error;
            }
        },
        {
            maxAttempts: 3,
            initialDelay: 1000,
            shouldRetry: (error) => error instanceof NetworkError
        }
    );
}
```

## Common Patterns

### 1. Validation Errors

```typescript
import { ValidationError } from '@/utils/errors';

function validateVideoOptions(options: unknown): void {
    const errors: Record<string, string[]> = {};
    
    if (!options || typeof options !== 'object') {
        throw new ValidationError('Invalid options', {
            options: ['Must be an object']
        });
    }

    // Add validation errors
    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Validation failed', errors);
    }
}
```

### 2. Storage Errors

```typescript
import { StorageError, StorageErrorCode } from '@/utils/errors';

async function uploadFile(file: Buffer, path: string): Promise<void> {
    try {
        // Upload file...
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new StorageError(
                'Directory not found',
                StorageErrorCode.NOT_FOUND,
                { path }
            );
        }
        throw new StorageError(
            'Upload failed',
            StorageErrorCode.UPLOAD_FAILED,
            { path, error }
        );
    }
}
```

### 3. Rate Limiting

```typescript
import { RateLimitError } from '@/utils/errors';

function checkRateLimit(userId: string, operation: string): void {
    const limit = getRateLimit(userId, operation);
    if (limit.exceeded) {
        throw new RateLimitError(
            'Rate limit exceeded',
            limit.resetIn,
            {
                userId,
                operation,
                limit: limit.max,
                remaining: limit.remaining
            }
        );
    }
}
```

## Best Practices

1. **Always Include Context**
   ```typescript
   throw new MediaError(
       'Processing failed',
       MediaErrorCode.PROCESSING_FAILED,
       {
           videoId,
           stage: 'transcoding',
           format: 'mp4',
           error: originalError
       }
   );
   ```

2. **Use Process Tracking**
   ```typescript
   processTimer.startProcess('operation');
   try {
       // Operation steps...
       processTimer.endProcess('operation');
   } catch (error) {
       processTimer.endProcess('operation', error);
       throw error;
   }
   ```

3. **Proper Error Propagation**
   ```typescript
   try {
       await processVideo(videoId);
   } catch (error) {
       if (error instanceof MediaError) {
           // Already a domain error, rethrow
           throw error;
       }
       // Wrap unknown errors
       throw new MediaError(
           'Video processing failed',
           MediaErrorCode.PROCESSING_FAILED,
           { videoId, error }
       );
   }
   ```

4. **Clean Up Resources**
   ```typescript
   const tempFiles: string[] = [];
   try {
       // Process files...
   } catch (error) {
       // Clean up on error
       await Promise.all(
           tempFiles.map(file => fs.unlink(file).catch(() => {}))
       );
       throw error;
   }
   ```

5. **Handle Network Errors with Retries**
   ```typescript
   const operation = async () => {
       try {
           return await retryOperation(
               () => makeNetworkRequest(),
               {
                   maxAttempts: 3,
                   shouldRetry: (error) => {
                       // Only retry on connection errors or timeouts
                       return error instanceof NetworkError && 
                           [NetworkErrorCode.CONNECTION_FAILED, NetworkErrorCode.TIMEOUT]
                               .includes(error.code as NetworkErrorCode);
                   }
               }
           );
       } catch (error) {
           if (error instanceof NetworkError) {
               // Handle network error after all retries failed
               console.error('Network operation failed after retries:', error);
           }
           throw error;
       }
   }
   ```

## Error Response Examples

### 1. HTTP Error Response
```json
{
    "error": {
        "name": "BadRequestError",
        "message": "Invalid video format",
        "code": "MEDIA_INVALID_FORMAT",
        "statusCode": 400,
        "context": {
            "timestamp": "2024-03-13T12:34:56.789Z",
            "requestId": "req_123",
            "path": "/api/videos/process"
        }
    }
}
```

### 2. Validation Error Response
```json
{
    "error": {
        "name": "ValidationError",
        "message": "Validation failed",
        "code": "VALIDATION_ERROR",
        "statusCode": 400,
        "details": {
            "validationErrors": {
                "format": ["Unsupported video format"],
                "duration": ["Must be less than 60 minutes"]
            }
        }
    }
}
```

## Testing Error Handling

```typescript
import { MediaError, MediaErrorCode } from '@/utils/errors';

describe('Video Processing', () => {
    it('should throw MediaError on processing failure', async () => {
        await expect(processVideo('invalid-id')).rejects.toThrow(MediaError);
        await expect(processVideo('invalid-id')).rejects.toMatchObject({
            code: MediaErrorCode.PROCESSING_FAILED
        });
    });
}); 