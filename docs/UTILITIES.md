# Utilities Documentation

All utility functions are centrally exported from `src/utils/utils.ts`. Import them like this:

```typescript
import { formatBytes, formatDuration, BadRequestError } from '../utils/utils.js';
```

## Available Utilities

### 1. Constants (`src/utils/constants/`)

#### File Size Constants (`fileSize.js`)
```typescript
FILE_SIZE = {
    MB: 1024 * 1024,
    MEMORY_LIMIT: 200 * 1024 * 1024,  // 200MB
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    CHUNK_SIZE: 50 * 1024 * 1024,     // 50MB chunks
    MAX_LOCAL_SIZE: process.env.MAX_LOCAL_FILESIZE_MB * 1024 * 1024 // Default 100MB
}
```

#### Path Constants (`paths.js`)
```typescript
TEMP_DIRS = {
    base: process.env.TEMP_DIR || './tmp',
    uploads: './tmp/uploads',
    audios: './tmp/audios',
    transcripts: './tmp/transcripts',
    cookies: './tmp/cookies',
    sessions: './tmp/sessions'
}
```

### 2. File Utilities (`src/utils/file/`)

#### Temporary Directories (`tempDirs.js`)
- `initializeTempDirs()`: Create all necessary temporary directories
- `clearTempDir(directory, maxAge)`: Clear files from a specific temp directory
- `clearAllTempDirs(maxAge)`: Clear all temporary directories
- `createTempFile(content, extension, directory, maxAge)`: Create a temporary file

#### File Validation (`fileValidation.js`)
- `checkExecutable(filePath)`: Check if a file is executable
- `validateVideoFile(filePath)`: Validate video file format and size

### 3. Media Utilities (`src/utils/media/`)

#### FFmpeg (`ffmpeg.js`)
- `getFfmpegPath()`: Get the path to FFmpeg executable

#### Video Utils (`videoUtils.js`)
- `checkVideoExists(url)`: Check if a video URL is accessible

### 4. Formatters (`src/utils/formatters/`)

#### DateTime (`dateTime.js`)
- `getCurrentDateTime()`: Get formatted current date/time (DD_MM_YYYY___HH_MM)
- `formatDuration(seconds)`: Format duration in seconds to human-readable string

#### File Size (`fileSize.js`)
- `formatBytes(bytes)`: Format bytes to human-readable string
- `sanitizeFileName(input)`: Sanitize a filename

### 5. System Utilities (`src/utils/system/`)

#### Environment (`env.js`)
- `getEnvVar(name)`: Get and validate environment variable

### 6. Logging (`src/utils/logging/`)

#### Logger (`logger.js`)
```typescript
interface LogInfo {
    event: string;
    url: string;
    ip: string;
    userAgent?: string;
    duration?: number;
    error?: string;
    [key: string]: any;
}
```
- `logRequest(info: LogInfo)`: Log structured request information

### 7. Error Handling (`src/utils/errors/`)

#### Error Classes (`errorHandling.js`)
- `HttpError`: Base class for HTTP errors
- `BadRequestError`: 400 Bad Request
- `InternalServerError`: 500 Internal Server Error
- `DownloadError`: Video download failures
- `ConversionError`: Media conversion failures
- `DeletionError`: File deletion failures
- `CustomError`: Configurable status code errors

#### Error Handling Functions
- `handleError(error, res)`: Handle errors in route handlers
- `handleUncaughtErrors(server)`: Set up global error handlers
- `gracefulShutdown(server)`: Perform graceful server shutdown

## Best Practices

1. **Import from Barrel File**
   ```typescript
   // Good
   import { formatBytes } from '../utils/utils.js';
   
   // Avoid
   import { formatBytes } from '../utils/formatters/fileSize.js';
   ```

2. **Error Handling**
   ```typescript
   try {
     // Your code
   } catch (error) {
     if (error instanceof BadRequestError) {
       // Handle bad request
     } else {
       throw new InternalServerError('Something went wrong');
     }
   }
   ```

3. **Temporary Files**
   ```typescript
   const tempFile = await createTempFile(content, '.txt');
   try {
     // Use temp file
   } finally {
     await clearTempDir(path.dirname(tempFile));
   }
   ```

4. **Logging**
   ```typescript
   logRequest({
     event: 'video_processing',
     url: videoUrl,
     ip: req.ip,
     duration: Date.now() - startTime
   });
   ``` 