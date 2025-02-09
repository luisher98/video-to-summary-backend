# Video to Summary API

## Project Overview

I built this API to solve a common problem: getting quick, accurate summaries of video content. Whether it's a YouTube video or an uploaded file, this service can transcribe it and generate an AI-powered summary. What makes it special is the real-time progress tracking and flexible storage options I implemented.

I'm also building a [front end for this project](https://github.com/luisher98/video-to-summary-app).

## Why I Built This

During my learning journey with AI and cloud services, I noticed that while there were many transcription services and summarization tools, few combined both with real-time progress updates and robust error handling. I wanted to create something that could:
- Handle both YouTube videos and direct file uploads
- Show real-time progress instead of making users wait blindly
- Scale well with cloud storage when needed
- Maintain high security standards
- Provide accurate, useful summaries

## Core Architecture

I structured the application around several key services, each handling a specific part of the video processing pipeline:

### 1. Summary Service (`src/services/summary/`)
This is the brain of the operation. It:
- Coordinates the entire video processing workflow
- Manages the transcription and summarization pipeline
- Handles real-time progress updates via Server-Sent Events (SSE)

Key files:
- `outputSummary.ts`: Orchestrates the summary generation process
- `videoTools.ts`: Handles video download and processing
- `fileUploadSummary.ts`: Manages file upload processing

### 2. Storage Service (`src/services/storage/`)
I implemented a hybrid storage approach:
- Small files (≤100MB) are processed locally for speed
- Larger files are automatically routed to Azure Blob Storage
- Uses Azure managed identity in production for better security

The main logic is in `azureStorage.ts`, which handles:
- Secure file uploads to Azure
- Automatic cleanup of processed files
- Stream-based file handling for better memory usage

### 3. API Layer (`src/server/`)
I built the API with Express.js, focusing on:
- Clean route organization
- Comprehensive error handling
- Real-time progress updates using SSE
- Rate limiting and security middleware

Key endpoints:
```http
GET  /api/youtube-summary-sse   # YouTube video summaries with progress updates
POST /api/upload-summary-sse    # File upload summaries with progress updates
GET  /api/transcript            # Raw video transcription
GET  /api/info                  # Video metadata retrieval
```

## Technical Stack & Why I Chose It

1. **TypeScript & Node.js**
   - Type safety helped me catch errors early
   - Great ecosystem for video processing
   - Excellent async/await support for complex operations

2. **Express.js**
   - Familiar and battle-tested
   - Great middleware ecosystem
   - Easy to implement SSE

3. **Azure Blob Storage**
   - Reliable for large file handling
   - Managed identity support for better security
   - Cost-effective for my needs

4. **OpenAI's GPT-4 & Whisper**
   - Whisper provides accurate transcriptions
   - GPT-4 generates high-quality summaries
   - Easy to extend with custom prompts

## Features

I've implemented:
- 🤖 AI-powered video summaries using GPT-4
- 📝 Accurate transcripts via Whisper
- 🔄 Real-time progress updates using Server-Sent Events
- 📤 Support for both YouTube videos and file uploads
- ☁️ Hybrid storage with local and cloud options
- 🔐 Secure cloud storage with Azure managed identity
- 🛡️ Comprehensive error handling and security measures

## API Design


![youtube summary (1)](https://github.com/user-attachments/assets/0116aeac-5224-459c-aa1c-ef56174f2ddb)



### Generate YouTube Summary (SSE)
```http
GET /api/youtube-summary-sse?url=<YouTube-URL>&words=<number>&prompt=<optional-prompt>
```
Streams real-time progress updates during:
1. Video download and processing
2. Audio transcription
3. AI summary generation

### Upload and Generate Summary (SSE)
```http
POST /api/upload-summary-sse?words=<number>
Content-Type: multipart/form-data

Form Data:
- video: <video-file>
```
Streams real-time progress updates during:
1. File upload and storage (local or Azure)
2. Audio extraction
3. Transcription and summary generation

### Get Transcript
```http
GET /api/transcript?url=<YouTube-URL>
```
Handles audio extraction and Whisper transcription

### Video Information
```http
GET /api/info?url=<YouTube-URL>
```
Validates and retrieves video metadata

## CLI Interface

I've also built a command-line interface for easier interaction with the API. The CLI provides real-time progress updates and server monitoring capabilities.

### Available Commands

```bash
YouTubeSummary > help

Available commands:
  - summary <url> [--words=<number>] [--prompt=<text>] [--save=<filename>]
    Generate a summary of a YouTube video
    
  - transcript <url> [--save=<filename>]
    Get the transcript of a YouTube video
    
  - monitor
    Start real-time server monitoring (CPU, Memory, Requests)
    
  - status
    Check server status
    
  - stop
    Stop the server
    
  - help
    Display this help message
    
  - quit, q
    Exit the CLI
```

### Using the CLI

1. **Generate Summary**
   ```bash
   YouTubeSummary > summary https://youtube.com/watch?v=example --words=300
   ```
   Options:
   - `--words`: Number of words in summary (default: 400)
   - `--prompt`: Custom instructions for the AI
   - `--save`: Save output to a file

2. **Get Transcript**
   ```bash
   YouTubeSummary > transcript https://youtube.com/watch?v=example --save=output.txt
   ```

3. **Monitor Server**
   ```bash
   YouTubeSummary > monitor
   ```
   Shows real-time:
   - CPU usage
   - Memory consumption
   - Active requests
   - Queue status

### CLI Structure
```
src/cli/
├── commands/           # Command implementations
│   ├── help.ts        # Help command
│   ├── monitor.ts     # Server monitoring
│   ├── status.ts      # Server status
│   ├── stop.ts        # Server control
│   └── videoProcessing.ts  # Video commands
├── style/             # CLI styling
├── utils/             # CLI utilities
├── cli.ts            # Main CLI setup
└── parser.ts         # Command parsing
```

## Implementation

### Project Structure
The project follows a modular architecture with clear separation of concerns:

```
src/
├── server/                          # API Server Implementation
│   ├── routes/                      # API Route Handlers
│   │   ├── getYouTubeSummarySSE.ts  # YouTube video summary endpoint with SSE
│   │   ├── uploadSummarySSE.ts      # File upload summary endpoint with SSE
│   │   ├── getTranscript.ts         # Video transcription endpoint
│   │   ├── getVideoInfo.ts          # Video metadata retrieval
│   │   └── getTestSSE.ts            # SSE testing endpoint
│   └── server.ts                    # Express server setup & middleware config
│
├── services/                        # Core Business Logic
│   ├── summary/                     # Video Processing & Summarization
│   │   ├── outputSummary.ts         # Main summary generation orchestrator
│   │   ├── videoTools.ts            # Video download & processing utilities
│   │   └── fileUploadSummary.ts     # File upload processing logic
│   └── storage/                     # Storage Management
│       └── azureStorage.ts          # Azure Blob Storage integration
│
├── utils/                          # Shared Utilities
│   ├── errorHandling.ts            # Custom error classes & handlers
│   ├── logger.ts                   # Structured logging configuration
│   └── utils.ts                    # General utility functions
│
├── types/                         # TypeScript Type Definitions
│   └── global.types.ts            # Shared type definitions & interfaces
│
├── config/                        # Configuration Management
│   └── environment.ts             # Environment variables & app config
│
├── cli/                          # Command Line Interface
│   ├── commands/                 # CLI Command Implementations
│   │   ├── help.ts              # Help command & documentation
│   │   ├── monitor.ts           # Server monitoring utilities
│   │   ├── status.ts            # Server status checks
│   │   ├── stop.ts             # Server control functions
│   │   └── videoProcessing.ts   # Video processing commands
│   ├── style/                   # CLI Styling & UI Components
│   ├── utils/                   # CLI-specific utilities
│   ├── cli.ts                   # Main CLI application setup
│   └── parser.ts                # Command parsing & validation
```

#### Key Directories

1. **`server/`**: Express.js server implementation
   - Routes are organized by functionality
   - Each route handler is isolated for maintainability
   - Implements SSE for real-time progress updates

2. **`services/`**: Core business logic
   - `summary/`: Video processing pipeline
     - Handles video download, transcription, and summarization
     - Manages progress tracking and error handling
   - `storage/`: File storage management
     - Implements hybrid storage strategy (local/cloud)
     - Handles secure file operations

3. **`utils/`**: Shared utilities
   - Error handling with custom error classes
   - Structured logging with correlation IDs
   - Common helper functions

4. **`types/`**: TypeScript definitions
   - Shared interfaces and types
   - Ensures type safety across the application

5. **`config/`**: Configuration management
   - Environment-specific settings
   - API keys and secrets management
   - Feature flags and app constants

6. **`cli/`**: Command-line interface
   - Modular command implementation
   - Real-time monitoring capabilities
   - User-friendly interface with styled output

#### Design Principles

The project structure follows these key principles:
- **Modularity**: Each component has a single responsibility
- **Scalability**: Easy to add new features or modify existing ones
- **Maintainability**: Clear separation of concerns
- **Type Safety**: Comprehensive TypeScript types
- **Testing**: Structure supports unit and integration tests

<details>
<summary>Security & Implementation</summary>

## Security Overview
I've implemented comprehensive security measures throughout the application, following industry best practices and OWASP guidelines.

### Security Measures Implementation

1. **API Security**
   - Rate limiting per IP (10 requests/minute)
   - Request validation and sanitization
   - Security headers via Helmet
   - CORS configuration
   - Input sanitization

2. **File Security**
   - Type validation
   - Size limits (500MB max)
   - Virus scanning
   - Secure file naming
   - Automatic cleanup
   - Stream-based processing

3. **Cloud Security**
   - Azure managed identity in production
   - Temporary access tokens
   - Minimal permission scope
   - Secure URL generation
   ```typescript
   // Example of secure URL generation
   const blobClient = containerClient.getBlobClient(blobName);
   const sasUrl = await blobClient.generateSasUrl({
     permissions: BlobSASPermissions.from({ read: true }),
     expiresOn: new Date(new Date().valueOf() + 3600 * 1000),
   });
   ```

4. **Environment Security**
   - Separate configs per environment
   - Secret rotation
   - Access logging
   - Error monitoring

## TODO Checklist

### High Priority
- [ ] **Fix YouTube Download in Production**
  - [ ] Implement IP rotation system
  - [ ] Add proxy support for server deployments
  - [x] Create fallback mechanism between different download methods
  - [ ] Add retry mechanism with exponential backoff

### Core Features
- [ ] **Platform Support**
  - [ ] Vimeo integration
  - [ ] Dailymotion support
  - [ ] Add support for playlists

- [ ] **Enhanced Summary Generation**
  - [ ] Support for longer videos (>2 hours)

### Security
- [ ] **Critical Security Updates**
  - [ ] Implement Content Security Policy (CSP)
  - [ ] Add API key authentication
  - [ ] Set up automated security scanning

### Testing
- [ ] **Essential Testing**
  - [ ] Add end-to-end tests
  - [ ] Add TypeScript strict mode

</details>


### Security Checklist
Based on [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html), here's what I've implemented and what is pending:

#### 1. HTTP Security
- [x] **Set Security HTTP Headers**: Implemented using `helmet` middleware
- [x] **Implement Rate Limiting**: Using `express-rate-limit` with 10 requests per minute
- [x] **Use TLS**: HTTPS enforced in production
- [x] **Use CORS**: Implemented with `cors` middleware
- [ ] **Use CSP**: Content Security Policy needs to be configured

#### 2. Authentication & Session Management
- [x] **Implement Brute Force Protection**: Using rate limiting
- [x] **Use Secure Headers**: Set via `helmet`
- [x] **Implement Proper Session Handling**: Using SSE for real-time updates
- [-] **Use Strong Password Policy**: Not applicable (no user authentication)
- [-] **Implement MFA**: Not applicable (no user authentication)

#### 3. Input Validation
- [x] **Validate All Inputs**: Implemented for URLs and file uploads
- [x] **Sanitize User Input**: Using input validation middleware
- [x] **Implement File Upload Validation**: 
  - File size limits
  - Type checking
  - Secure file naming
  - Automatic cleanup
- [x] **Use Parameterized Queries**: Not applicable (no database)

#### 4. Data Security
- [x] **Secure File Uploads**: 
  - Size limits enforced
  - Type validation
  - Streaming for large files
- [x] **Implement Access Controls**: Using Azure managed identity
- [x] **Secure Temporary Files**: 
  - Automatic cleanup
  - Secure naming
  - Proper permissions
- [x] **Handle Secrets Securely**: Using environment variables

#### 5. Error Handling
- [x] **Implement Global Error Handler**: Using custom error handling middleware
- [x] **Use Custom Error Classes**: Implemented in `errorHandling.ts`
- [x] **Hide Error Details**: Sanitized error messages in production
- [x] **Log Errors Properly**: Using structured logging

#### 6. Security Misconfiguration
- [x] **Use Security Middleware**: Helmet configured
- [x] **Set Proper CORS**: Configured for API endpoints
- [x] **Remove Unnecessary Routes**: Only essential endpoints exposed
- [x] **Update Dependencies**: Regular security audits with `npm audit`

#### 7. Logging & Monitoring
- [x] **Implement Request Logging**: Using logging middleware
- [x] **Monitor File Operations**: Tracking file processing
- [x] **Track API Usage**: Rate limit monitoring
- [ ] **Set Up Alerts**: Needs implementation

#### 8. Dependencies
- [x] **Regular Security Updates**: Using `npm audit`
- [x] **Minimize Dependencies**: Only essential packages used
- [x] **Use Exact Versions**: Package versions locked
- [ ] **Implement SCA**: Need to add automated scanning

#### 9. File System Operations
- [x] **Secure File Handling**:
  - Path validation
  - Type checking
  - Size limits
- [x] **Implement Cleanup**: Automatic temp file removal
- [x] **Use Proper Permissions**: Secure file operations
- [x] **Handle Storage Securely**: Azure Blob Storage integration

</details>



## Documentation

For detailed API documentation and integration guides, check out our [API Documentation](docs/API.md).

### Quick Links

- [API Endpoints](docs/API.md#api-endpoints)
- [Authentication](docs/API.md#authentication)
- [Error Handling](docs/API.md#error-handling)
- [Code Examples](docs/API.md#examples)
- [Best Practices](docs/API.md#best-practices)

### Getting Help

If you encounter any issues or need help:
1. Check the [Error Handling](docs/API.md#error-handling) section for common problems
2. Review the [Best Practices](docs/API.md#best-practices) section
3. Open an issue in the GitHub repository

### Contributing

We welcome contributions to improve the documentation. Please feel free to:
1. Open issues for unclear or missing documentation
2. Submit pull requests with improvements
3. Suggest new examples or use cases



## Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- FFmpeg installed on your system
- Azure account (for cloud storage features)
- OpenAI API key
- YouTube Data API key

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/video-to-summary-api.git
   cd video-to-summary-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```env
   # API Keys
   OPENAI_API_KEY=your_openai_key
   YOUTUBE_API_KEY=your_youtube_key
   
   # Azure Storage (optional for files >200MB)
   AZURE_STORAGE_CONNECTION_STRING=your_connection_string
   
   # Server Configuration
   PORT=5050
   NODE_ENV=development
   
   # File Processing
   MAX_FILE_SIZE=500000000  # 500MB
   MEMORY_LIMIT=200000000   # 200MB
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

### Development Workflow

1. **Code Style**
   - Format code:
     ```bash
     npm run prettify
     ```
   - Lint code:
     ```bash
     npm run lint
     ```

2. **Testing**
   - Run all tests:
     ```bash
     npm run test:all
     ```
   - Development tests:
     ```bash
     npm run test:watch
     ```
   - Production tests:
     ```bash
     npm run test:prod
     ```

3. **Building**
   ```bash
   npm run build
   ```

4. **Production Start**
   ```bash
   npm start
   ```

### Deployment

1. **Prerequisites**
   - Node.js production environment
   - FFmpeg installed
   - Configured environment variables
   - Azure account (for cloud storage)

2. **Production Setup**
   ```bash
   # Install dependencies
   npm ci
   
   # Build project
   npm run build
   
   # Start with PM2
   npm start
   ```

3. **Monitoring**
   ```bash
   # View logs
   pm2 logs
   
   # Monitor processes
   pm2 monit
   ```

### Contributing

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request
## Author

Luis Hernández Martín
- GitHub: [@luisher98](https://github.com/luisher98)
- Email: luisheratm@gmail.com

## License

MIT
