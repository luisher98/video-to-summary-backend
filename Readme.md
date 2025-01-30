# YouTube Summary API

AI-powered API that generates concise summaries and transcripts from YouTube videos and uploaded video files using OpenAI's GPT and Whisper models.

## Architecture Overview

### Core Services
I've structured the application around these key services:
- **Summary Service**: Orchestrates video processing, transcription, and AI summarization
- **Video Service**: Handles YouTube video downloads, file uploads, and audio extraction
- **OpenAI Service**: Manages interactions with GPT and Whisper APIs
- **Info Service**: Retrieves and validates YouTube video metadata
- **Storage Service**: Manages file storage (local and Azure Blob Storage with managed identity support)

### Technical Stack
I've chosen these technologies:
- **Backend**: Node.js with TypeScript
- **Framework**: Express.js with middleware architecture
- **AI Integration**: OpenAI GPT-4 and Whisper APIs
- **Cloud Storage**: Azure Blob Storage with managed identity
- **Process Management**: PM2 for production reliability
- **Testing**: Jest with separate development/production configs
- **Security**: Rate limiting, CORS, and Helmet implementation

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

### Generate YouTube Summary (SSE)
```http
GET /api/youtube-summary-sse?url=<YouTube-URL>&words=<number>
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

## Implementation

### Project Structure
```
src/
├── services/         # Core business logic
│   ├── summary/      # Video processing and AI integration
│   ├── info/         # YouTube metadata handling
│   ├── storage/      # File storage management
│   └── openai/       # AI service integration
├── middleware/       # Express middleware
├── utils/            # Shared utilities
├── types/            # TypeScript definitions
└── config/           # Configuration management
```

### Development Workflow

1. **Setup**
```bash
git clone https://github.com/luisher98/youtube-summary-api.git
cd youtube-summary-api
npm install
```

2. **Configuration**
Create a `.env` file:
```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name_here
AZURE_STORAGE_CONTAINER_NAME=video-uploads

# Azure Identity Configuration (Optional - for local development)
AZURE_TENANT_ID=your_tenant_id_here
AZURE_CLIENT_ID=your_client_id_here
AZURE_CLIENT_SECRET=your_client_secret_here

# File Size Configuration
MAX_LOCAL_FILESIZE_MB=100

# Server Configuration
PORT=5050
NODE_ENV=development
TEMP_DIR=./tmp

# Optional: YouTube Cookie Configuration
YOUTUBE_COOKIE_FILE=cookies.txt
```

3. **Development**
```bash
npm run dev      # Start development server
npm test        # Run test suite
npm run build   # Build for production
npm start       # Run production server
```

## File Upload Features

### Storage Strategy
- Files ≤ 100MB: Stored locally for processing
- Files > 100MB: Uploaded to Azure Blob Storage
- Configurable threshold via `MAX_LOCAL_FILESIZE_MB`

### Azure Storage Authentication
The service supports two authentication methods:
1. **Managed Identity** (Recommended for production)
   - Uses Azure AD managed identity when deployed to Azure
   - No credentials needed in configuration
   - Automatic credential management

2. **Service Principal** (For development/testing)
   - Uses Azure AD service principal credentials
   - Requires `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET`
   - Only needed for local development

### Supported Formats
- All common video formats (MP4, MOV, AVI, etc.)
- Maximum file size: 500MB
- Files are automatically converted to MP3 for processing

### Security Measures
- File type validation
- Size limits
- Automatic cleanup
- Secure cloud storage with managed identity
- No storage account keys in configuration

## Error Handling

The API implements a comprehensive error handling system:
- Custom error classes for specific scenarios
- Consistent error response format
- Detailed logging for debugging
- Graceful fallbacks for service failures

## Security Measures

- Rate limiting per IP
- Request validation
- Security headers via Helmet
- CORS configuration
- Environment variable protection
- Cookie-based authentication
- File upload restrictions
- Azure managed identity for secure storage access

## Author

Luis Hernández Martín  
luisheratm@gmail.com

## License

MIT

## Important Notes

I recently encountered an issue where `@distube/ytdl-core` stopped working on server deployments (Azure, AWS, etc.). This likely happened because Google's bot detection started flagging data center IP addresses more aggressively.

### My Solution
I've implemented `youtube-dl-exec` ([npm package](https://www.npmjs.com/package/youtube-dl-exec)) as a workaround. This library:
- Uses `yt-dlp` under the hood, which better handles YouTube's restrictions
- Provides better handling of rate limits and IP blocks
- Requires Python 3.7+ on the system
- Offers more configuration options for bypassing restrictions

### Implementation Details
I've maintained both implementations in the codebase:
- Kept the original `@distube/ytdl-core` code for when YouTube possibly relaxes their restrictions
- Added new `youtube-dl-exec` implementation for current production use
- May implement an automatic fallback mechanism in future versions

### Requirements
To use my current version, you'll need:
- Python 3.7 or higher installed
- Node.js 16 or higher
- Proper environment variables set (see Configuration section)

### Known Issues
In my testing, I've found:
- Some cloud providers need extra configuration for Python
- First-time downloads are slower due to yt-dlp binary installation
- Rate limiting still happens but less frequently than with ytdl-core