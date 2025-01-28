# YouTube Summary API

An AI-powered API that generates concise summaries and transcripts from YouTube videos using OpenAI's GPT and Whisper models.

## Architecture Overview

### Core Services
- **Summary Service**: Orchestrates video processing, transcription, and AI summarization
- **Video Service**: Handles YouTube video downloads and audio extraction
- **OpenAI Service**: Manages interactions with GPT and Whisper APIs
- **Info Service**: Retrieves and validates YouTube video metadata

### Technical Stack
- **Backend**: Node.js with TypeScript
- **Framework**: Express.js with middleware architecture
- **AI Integration**: OpenAI GPT-4 and Whisper APIs
- **Process Management**: PM2 for production reliability
- **Testing**: Jest with separate development/production configs
- **Security**: Rate limiting, CORS, and Helmet implementation

## Features

- 🤖 AI-powered video summaries using GPT-4
- 📝 Accurate transcripts via Whisper
- 🔄 Real-time progress updates using Server-Sent Events
- 🛡️ Comprehensive error handling and security measures

## API Design

### Generate Summary (SSE)
```http
GET /api/summary-sse?url=<YouTube-URL>&words=<number>
```
Streams real-time progress updates during:
1. Video download and processing
2. Audio transcription
3. AI summary generation

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
OPENAI_API_KEY=your_openai_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

3. **Development**
```bash
npm run dev      # Start development server
npm test        # Run test suite
npm run build   # Build for production
npm start       # Run production server
```

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

## Author

Luis Hernández Martín  
luisheratm@gmail.com

## License

MIT