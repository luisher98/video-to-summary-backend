# YouTube Video Summary API

A powerful API and CLI tool that generates summaries and transcripts from YouTube videos and uploaded files using AI. Features streaming processing, memory leak protection, and production-ready reliability.

## Features

- 🎥 **YouTube video summary generation** - Extract summaries from any public YouTube video
- 📝 **Full transcript generation** - Get complete transcripts with timestamps
- 📤 **Direct file upload support** - Process audio/video files directly (up to 200MB)
- ⚡ **Real-time progress updates** - Server-Sent Events (SSE) for live processing status
- 🔄 **Azure Blob Storage integration** - Scalable cloud storage for large files
- 🖥️ **Interactive CLI interface** - Command-line tool for batch processing
- 🔒 **Secure and rate-limited API** - API key authentication and request limiting
- 🌊 **Streaming processing** - Memory-efficient processing for large files
- 🛡️ **Memory leak protection** - Production-ready with automatic resource cleanup
- 🌐 **Proxy support** - Bypass YouTube IP blocking with residential proxies
- 📊 **Health monitoring** - Built-in health checks and system status

## Quick Start

1. **Installation**
   ```bash
   git clone <repository-url>
   cd youtube-summary-api
   npm install
   ```

2. **Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Run the Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

4. **Use the CLI**
   ```bash
   # Start interactive CLI
   npm run cli
   
   # Then use commands like:
   video summarize -u "https://youtube.com/watch?v=..." -w 400
   video transcript -u "https://youtube.com/watch?v=..."
   status
   help
   ```

## Documentation

- [API Documentation](docs/API.md) - Complete API reference
- [Architecture Overview](docs/ARCHITECTURE.md) - System design and components
- [Utilities Reference](docs/UTILITIES.md) - Helper functions and utilities
- [Error Handling](docs/ERROR_HANDLING.md) - Error management and recovery
- [Error Codes](docs/ERROR_CODES.md) - Complete error code reference
- [Quick Start Errors](docs/QUICK_START_ERRORS.md) - Common setup issues

## Requirements

- **Node.js 18+** - Runtime environment
- **FFmpeg** - Audio/video processing (`brew install ffmpeg` or `apt install ffmpeg`)
- **yt-dlp** - YouTube video downloading (`pip install yt-dlp`)
- **OpenAI API key** - For transcription and summarization
- **YouTube Data API key** - For video metadata (optional)
- **Azure Storage Account** - For file storage (optional)

## Environment Variables

### Required Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4                    # Optional: gpt-3.5-turbo, gpt-4

# Server Configuration
PORT=5050
NODE_ENV=development                  # development, production, test
```

### YouTube Configuration
```bash
# YouTube API (optional - for metadata)
YOUTUBE_API_KEY=your-youtube-api-key

# YouTube Cookies (optional - helps with access)
YOUTUBE_USE_COOKIES=true

# Proxy Configuration (recommended for production)
YOUTUBE_USE_PROXY=true
YOUTUBE_PROXY_ENDPOINTS=geo.rotating.databay.net:8080
YOUTUBE_PROXY_USERNAME=your-databay-username
YOUTUBE_PROXY_PASSWORD=your-databay-password
YOUTUBE_PROXY_TIMEOUT=30              # Seconds
YOUTUBE_PROXY_MAX_RETRIES=3
YOUTUBE_PROXY_ROTATION=random         # random, round-robin
```

### Security & Rate Limiting
```bash
# API Security
API_KEYS=key1,key2,key3              # Comma-separated API keys
CORS_ORIGINS=http://localhost:3000   # Comma-separated allowed origins

# Rate Limiting
RATE_LIMIT_MAX=100                   # Requests per 15 minutes
MAX_CONCURRENT_REQUESTS=2            # Concurrent processing limit
REQUEST_TIMEOUT_MS=300000           # 5 minutes timeout
```

### Azure Storage (Optional)
```bash
# Service Principal Authentication
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_STORAGE_ACCOUNT_NAME=your-account-name
AZURE_STORAGE_CONTAINER_NAME=uploads

# Alternative: Connection String Authentication
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
```

### File Upload Configuration
```bash
MAX_FILE_SIZE=104857600              # 100MB in bytes
MAX_LOCAL_FILESIZE_MB=100            # Local vs cloud storage threshold
```

### Proxy Setup for Production

YouTube blocks requests from datacenter IPs (Google Cloud, AWS, etc.). Use residential proxies.



## API Endpoints

### YouTube Processing
```bash
# Generate summary (streaming)
GET /api/summary/youtube/summary?url=https://youtube.com/watch?v=VIDEO_ID&words=400

# Generate transcript (streaming)
GET /api/summary/youtube/transcript?url=https://youtube.com/watch?v=VIDEO_ID

# Get video metadata
GET /api/summary/youtube/metadata?url=https://youtube.com/watch?v=VIDEO_ID

# Legacy streaming endpoints (backward compatibility)
GET /api/summary/youtube/streaming/summary?url=...
GET /api/summary/youtube/streaming/transcript?url=...
```

### File Upload Processing
```bash
# Upload and summarize file
POST /api/summary/upload/summary
Content-Type: multipart/form-data
Body: file=<audio/video file>, words=400 (optional)

# Upload and get transcript
POST /api/summary/upload/transcript
Content-Type: multipart/form-data
Body: file=<audio/video file>

# Legacy streaming endpoints
POST /api/summary/upload/streaming/summary
POST /api/summary/upload/streaming/transcript
```

### Azure Storage Integration
```bash
# Initiate direct upload to Azure
POST /api/videos/upload/initiate
Body: { "fileName": "video.mp4", "fileSize": 52428800 }

# Process uploaded video
POST /api/videos/{fileId}/process?words=400
```

### System Health
```bash
# Health check
GET /api/health

# Server-sent events test
GET /api/_test

# Storage operations
GET /api/storage/...
```

All streaming endpoints return Server-Sent Events (SSE) with real-time progress updates.

## Development Scripts

```bash
# Development
npm run dev                    # Start with hot reload
npm run cli                    # Start interactive CLI

# Building
npm run build                  # Compile TypeScript
npm run clean                  # Clean dist directory

# Quality
npm run lint                   # Run ESLint
npm run prettify              # Format code with Prettier

# Production
npm start                      # Start compiled server
npm run restart               # Build and restart
npm stop                      # Stop PM2 processes
```

## Docker Support

```bash
# Single container
npm run docker:build
npm run docker:run
npm run docker:stop
npm run docker:logs

# Docker Compose
npm run docker:compose         # Start services
npm run docker:compose:down    # Stop services
npm run docker:compose:logs    # View logs
npm run docker:cleanup        # Clean up containers
```

## CLI Commands

Start the interactive CLI with `npm run cli`, then use:

```bash
# Video processing
video summarize -u "https://youtube.com/watch?v=..." -w 400 -p "Focus on key insights"
video transcript -u "https://youtube.com/watch?v=..." -o transcript.txt

# System management
status                         # Show server status
monitor                        # Live system monitoring
stop                          # Stop the server
help                          # Show all commands
quit                          # Exit CLI
```

## Error Handling

The API includes comprehensive error handling with:

- **Structured error responses** with error codes and context
- **Automatic retry mechanisms** for transient failures
- **Memory leak protection** with automatic resource cleanup
- **Graceful shutdown** with proper resource deallocation
- **Rate limiting** to prevent abuse
- **Request queuing** to manage server load

See [Error Handling Documentation](docs/ERROR_HANDLING.md) for details.

## Production Deployment

### Memory Management
- ✅ **Memory leak fixes** implemented for long-running processes
- ✅ **Automatic cleanup** of streams, timers, and temporary files
- ✅ **Resource monitoring** and cleanup on shutdown

### Performance
- ✅ **Streaming architecture** for memory-efficient processing
- ✅ **Request queuing** to prevent server overload
- ✅ **Connection pooling** for external APIs
- ✅ **Adaptive buffering** for optimal throughput

### Security
- ✅ **API key authentication** (disabled in development)
- ✅ **Rate limiting** per IP address
- ✅ **CORS protection** with configurable origins
- ✅ **Input validation** and sanitization
- ✅ **Security headers** with Helmet.js

### Monitoring
- Health checks at `/api/health`
- Server-sent events for real-time monitoring
- Structured logging with request tracing
- Memory usage and performance metrics

## License

MIT
