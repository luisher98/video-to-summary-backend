# YouTube Summary API by Luis Hernández

A powerful Node.js API that leverages OpenAI's GPT and Whisper models to automatically generate concise summaries and accurate transcripts from YouTube videos. Perfect for content creators, researchers, or anyone needing quick video content analysis.

## 🚀 Quick Start

1. **Clone and Install**
```bash
git clone https://github.com/luisher98/youtube-summary-api.git
cd youtube-summary-api
npm install
```

2. **Configure Environment**
Create a `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

3. **Start the Server**
```bash
npm run dev
```

4. **Try it out**
```bash
curl "http://localhost:5050/api/summary-sse/?url=https://www.youtube.com/watch?v=your-video-id"
```

## ✨ Features

### Core Functionality
- Generate intelligent AI-powered summaries of YouTube videos
- Extract accurate transcripts of YouTube videos using OpenAI's Whisper
- Get video metadata
- Monitor progress in real-time through SSE

### Technical Features
- Real-time progress updates via Server-Sent Events
- Automatic temporary file cleanup
- Comprehensive error handling
- Rate limiting and security protections
- CORS and Helmet security headers

## 🛠 API Endpoints

### Generate Summary (SSE)
```http
GET /api/summary-sse?url=<YouTube-URL>&words=<number>
```
Generates an AI-powered summary with real-time progress updates

### Get Transcript
```http
GET /api/transcript?url=<YouTube-URL>
```
Extracts the complete video transcript

### Video Information
```http
GET /api/info?url=<YouTube-URL>
```
Returns video metadata and statistics

## 🔧 Technical Requirements

### Prerequisites
- Node.js
- OpenAI API Key
- YouTube Data API Key

### Environment Variables
Required:
```
OPENAI_API_KEY - Your OpenAI API key
YOUTUBE_API_KEY - Your YouTube Data API key
```

Optional:
```
PORT - Server port (default: 5050)
NODE_ENV - Environment (development/production)
WEBSITE_HOSTNAME - Azure Web App hostname
```

## 💻 Development

### Available Scripts
```bash
# Development server
npm run dev

# Build project
npm run build

# Run tests
npm test

# Format code
npm run prettify
```

## 🚀 Deployment

### Production Setup
The API is configured to run on Azure App Service using PM2:
```bash
# Build for production
npm run build

# Start with PM2
npm start
```

### Tech Stack
- Node.js & TypeScript
- Express.js for API routing
- OpenAI's GPT & Whisper
- PM2 for process management
- Azure App Service for hosting

## 👤 Author

Luis Hernández Martín
luisheratm@gmail.com

## 📝 License

MIT