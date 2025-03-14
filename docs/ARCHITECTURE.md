# Architecture Overview

## Directory Structure

```
src/
├── cli/          # Command-line interface
├── config/       # Application configuration
├── integrations/ # External service integrations
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

## Project Structure

The project follows a modular architecture with clear separation of concerns. Here's the directory structure:

```
.
├── Dockerfile
├── Readme.md
├── data
│   ├── logs
│   ├── test-data
│   │   ├── argentina.mp4
│   │   └── joji.mp4
│   └── tmp
│       ├── audios
│       ├── cookies
│       ├── sessions
│       ├── transcripts
│       └── uploads
├── docker-compose.yml
├── docs
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── UTILITIES.md
├── ecosystem.config.cjs
├── eslint.config.js
├── package-lock.json
├── package.json
├── src
│   ├── cli                    # Command-line interface
│   │   ├── cli.ts
│   │   ├── commands
│   │   ├── parser.ts
│   │   ├── style
│   │   └── utils
│   ├── config                # Application configuration
│   │   ├── azure.ts
│   │   ├── environment.ts
│   │   ├── fileSize.ts
│   │   ├── loadEnv.ts
│   │   ├── paths.ts
│   │   ├── server.ts
│   │   └── youtube.ts
│   ├── index.ts
│   ├── integrations         # Third-party integrations
│   │   └── openAI.ts
│   ├── server               # HTTP server and routes
│   │   ├── middleware
│   │   └── routes
│   ├── services            # Core business logic
│   │   ├── info
│   │   ├── storage
│   │   └── summary
│   ├── types              # TypeScript type definitions
│   └── utils              # Utility functions
│       ├── errors
│       ├── file
│       ├── formatters
│       ├── logging
│       ├── media
│       └── system
├── tmp                    # Temporary files (gitignored)
│   ├── audios
│   ├── cookies
│   ├── sessions
│   ├── transcripts
│   └── uploads
└── tsconfig.json
```

### Key Directories

- **`src/config`**: Contains all configuration files for different aspects of the application (Azure, YouTube, file sizes, etc.)
- **`src/services`**: Core business logic organized by domain (storage, summary, info)
- **`src/server`**: HTTP server implementation, routes, and middleware
- **`src/utils`**: Shared utility functions and error handling
- **`data/tmp`**: Temporary file storage for processing
- **`docs`**: Project documentation

### Configuration Files

The application uses several configuration files in `src/config`:

- `azure.ts`: Azure Storage configuration
- `environment.ts`: Environment variables and settings
- `fileSize.ts`: File size limits and chunk sizes
- `paths.ts`: Application directory paths
- `youtube.ts`: YouTube-specific settings (cookies, download options)

Each configuration file exports a strongly-typed configuration object that can be imported throughout the application. 