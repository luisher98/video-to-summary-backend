# YouTube Summary API by Luis Hernández

A Node.js API and CLI tool that utilizes OpenAI's GPT and Whisper models to generate summaries and transcripts from YouTube videos.

## Important Note About TypeScript Imports

This project uses TypeScript with ES Modules. You'll notice that imports use `.js` extensions even for TypeScript files:

```typescript
// Correct way (even for .ts files):
import { outputSummary } from "../../services/summary/outputSummary.js";

// Wrong way:
import { outputSummary } from "../../services/summary/outputSummary.ts";
```

This is because:
1. We use `"type": "module"` in package.json and `"moduleResolution": "NodeNext"` in tsconfig.json
2. Node.js requires explicit file extensions for ESM imports
3. The `.js` extension refers to the compiled output that will exist at runtime

## Features

- CLI interface with commands for:
  - Generating summaries
  - Getting transcripts
  - Monitoring server status
  - Server control
- REST API endpoints for:
  - Video information retrieval
  - Summary generation
  - Transcript extraction
- Real-time progress updates via SSE
- Rate limiting and security features
- Temporary file cleanup

## Prerequisites

Before you begin, ensure you have:

- Node.js installed (v18+)
- FFmpeg installed
- OpenAI API Key
- YouTube Data API Key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/luisher98/youtube-summary-api.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with:
   ```
   OPENAI_API_KEY=your_openai_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   PORT=5050 # optional
   ```

## Usage

### CLI Mode

Start the CLI interface:
```bash
npm run cli
```

Available commands:
```
summary <url> [--words=<number>] [--prompt=<text>] [--save=<filename>]
transcript <url> [--save=<filename>]
monitor     # Monitor server status
status      # Check server status
stop        # Stop the server
help        # Show all commands
```

### API Mode

Start the server:
```bash
npm run dev
```

Endpoints:
```
GET /api/info?url=<YouTube-URL>
GET /api/summary?url=<YouTube-URL>&words=<number>
GET /api/summary-sse?url=<YouTube-URL>&words=<number>
GET /api/transcript?url=<YouTube-URL>
```

## Development

```bash
# Run in development
npm run dev

# Run CLI
npm run cli

# Build
npm run build

# Run tests
npm test

# Format code
npm run prettify
```

## Security Features

- Rate limiting
- API key validation in production
- CORS configuration
- Helmet security headers
- Request timeout protection

## Error Handling

The application includes comprehensive error handling for:
- Invalid YouTube URLs
- API failures
- File operations
- Video processing issues
- Network errors

## Author

Luis Hernández Martín
luisheratm@gmail.com

## License

MIT