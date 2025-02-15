# Architecture Overview

## Directory Structure

```
src/
├── cli/          # Command-line interface
├── config/       # Application configuration
├── domain/       # Domain models and business logic
├── lib/          # External library integrations
├── server/       # Web server and API routes
├── services/     # Core services (summary, storage, etc.)
├── types/        # TypeScript type definitions
├── utils/        # Utility functions and helpers
└── index.ts      # Application entry point
```

## Core Components

### 1. Services Layer (`src/services/`)

Core business logic implementation including:
- Video summary generation
- Transcript creation
- Storage management (Azure)
- Authentication services

### 2. Server Layer (`src/server/`)

Express.js based web server including:
- REST API endpoints
- Server-Sent Events (SSE) for real-time progress
- Middleware (security, rate limiting, etc.)
- Route handlers

### 3. CLI Layer (`src/cli/`)

Command-line interface providing:
- Video summary generation
- Transcript generation
- Server management commands
- Monitoring tools

### 4. Utilities (`src/utils/`)

Shared utility functions organized by category:
- Constants (file sizes, paths)
- File operations
- Media processing
- Formatters
- System utilities
- Logging
- Error handling

For detailed information about available utilities, see [UTILITIES.md](./UTILITIES.md).

## Key Design Decisions

1. **Modular Architecture**
   - Clear separation of concerns
   - Independent modules
   - Easy to test and maintain

2. **Type Safety**
   - TypeScript throughout
   - Strong type definitions
   - Runtime validation

3. **Error Handling**
   - Custom error classes
   - Consistent error responses
   - Detailed logging

4. **Security**
   - Rate limiting
   - API key authentication
   - Security headers
   - CORS configuration

5. **Performance**
   - Efficient file handling
   - Stream processing
   - Azure blob storage for large files
   - Concurrent processing

## Data Flow

1. **Video Summary Generation**
   ```
   Request → Validation → Download → Transcription → Summary → Response
   ```

2. **File Upload**
   ```
   Request → SAS URL Generation → Azure Upload → Processing → Response
   ```

## Dependencies

Major external dependencies:
- Express.js for web server
- Azure Blob Storage for file storage
- OpenAI API for transcription/summary
- FFmpeg for media processing
- youtube-dl for video downloads

For a complete list, see [package.json](../package.json). 