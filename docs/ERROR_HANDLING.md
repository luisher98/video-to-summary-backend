# Error Handling Architecture

## Overview

The application implements a comprehensive error handling system that provides:
- Structured error responses with consistent formats
- Detailed error logging with process timing information
- Performance tracking and visualization
- Type-safe error handling with TypeScript
- Integration with the application's logging infrastructure
- Global error handling for uncaught errors

## Core Components

### 1. Error Handling Functions

#### Preventive Error Handling
```typescript
// For route handlers - wraps async functions with error handling
const handler = withErrorHandling(async (req, res) => {
    const data = await processRequest();
    return { data };
});
```

#### Reactive Error Handling
```typescript
// For direct error responses
try {
    await someOperation();
} catch (error) {
    sendErrorResponse(error, res);
}
```

#### Global Error Handling
```typescript
// For uncaught errors and rejections
handleUncaughtErrors();
```

### 2. Error Classes

#### Base Errors
- `ApplicationError`: Base class for all application-specific errors
  - Includes timestamp, error code, and context information
  - Provides JSON serialization
  - Integrates with logging system

- `HttpError`: Base class for HTTP-specific errors
  - Extends `ApplicationError`
  - Includes HTTP status code
  - Used for REST API responses

#### Specialized Errors
- HTTP Errors:
  - `BadRequestError`: 400 Bad Request
  - `InternalServerError`: 500 Internal Server Error
  - `RateLimitError`: 429 Too Many Requests (with retry-after support)

- Domain Errors:
  - `StorageError`: File storage related errors
  - `MediaError`: Media processing errors

- Validation Errors:
  - `ValidationError`: Data validation errors

### 3. Error Context

```typescript
interface ErrorContext {
    timestamp: Date;
    requestId?: string;
    path?: string;
    userId?: string;
    additionalInfo?: {
        method?: string;
        ip?: string;
        userAgent?: string;
    };
}
```

### 4. Process Timing

The error handling system integrates with the application's logging infrastructure to provide detailed process timing information:

```typescript
interface ProcessTiming {
    processName: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    subProcesses?: ProcessTiming[];
    status: 'running' | 'completed' | 'error';
    metadata?: { rate?: string };
}
```

Features:
- Automatic timing for all route handlers
- Support for nested processes
- Visual progress tracking
- Resource usage monitoring
- Performance analytics

### 5. Response Format

#### Success Response
```typescript
{
    success: true,
    data?: T,
    meta: {
        processTimings: ProcessTiming[];
        [key: string]: unknown;
    }
}
```

#### Error Response
```typescript
{
    success: false,
    error: {
        name: string;
        message: string;
        code: string;
        context: ErrorContext;
        stack?: string; // In development only
    },
    meta: {
        processTimings: ProcessTiming[];
    }
}
```

## Usage Examples

### 1. Route Handler with Error Handling

```typescript
// Define the route handler with type safety
const getUserProfile = withErrorHandling<UserProfile>(async (req, res) => {
    // Operation is automatically timed and logged
    const profile = await userService.getProfile(req.params.id);
    
    return {
        data: profile,
        meta: {
            cached: false
        }
    };
});

// Use it in your router
router.get('/profile/:id', getUserProfile);
```

### 2. Manual Process Timing

```typescript
import { processTimer, logProcessStep } from '@/utils/logging/logger';

async function complexOperation() {
    processTimer.startProcess('data-processing');
    
    try {
        // Log start of operation
        logProcessStep('data-processing', 'start');
        
        // Start a sub-process
        processTimer.startProcess('validation');
        await validateData();
        processTimer.endProcess('validation');
        
        // Complete main process
        const result = await processData();
        processTimer.endProcess('data-processing');
        logProcessStep('data-processing', 'complete', { size: result.size });
        
        return result;
    } catch (error) {
        processTimer.endProcess('data-processing', error);
        logProcessStep('data-processing', 'error', error.message);
        throw error;
    }
}
```

### 3. Direct Error Response

```typescript
router.post('/upload', async (req, res) => {
    try {
        const result = await uploadFile(req.file);
        res.json({ success: true, data: result });
    } catch (error) {
        // Automatically handles logging, formatting, and sending the error response
        sendErrorResponse(error, res);
    }
});
```

### 4. Custom Error with Context

```typescript
throw new StorageError(
    'Failed to upload file',
    'UPLOAD_FAILED',
    { fileName, size },
    {
        userId: req.user.id,
        additionalInfo: {
            container: 'uploads',
            contentType: file.mimetype
        }
    }
);
```

## Best Practices

1. **Use Type-Safe Error Handling**
   - Always use `withErrorHandling` for route handlers
   - Define proper return types for all operations
   - Use TypeScript for better error detection

2. **Choose the Right Error Handling Approach**
   - Use `withErrorHandling` for route handlers (preventive)
   - Use `sendErrorResponse` for direct error responses (reactive)
   - Use `handleUncaughtErrors` for global error handling

3. **Process Timing**
   - Let the error handling system track timings automatically
   - Use `logProcessStep` for visual progress tracking
   - Use sub-processes for complex operations
   - Monitor resource usage with process summaries

4. **Error Context**
   - Include relevant context in errors
   - Use appropriate error codes
   - Add process timing information

5. **Response Format**
   - Follow the standard success/error response format
   - Include process timings in responses
   - Only expose stack traces in development

6. **Performance Monitoring**
   - Use `logProcessSummary` for detailed timing analysis
   - Track error rates and patterns
   - Monitor resource usage trends
   - Use timing visualization for debugging

## Error Codes

See [ERROR_CODES.md](./ERROR_CODES.md) for a complete list of error codes and their meanings. 