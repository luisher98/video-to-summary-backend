# YouTube Video Summary API

A powerful API and CLI tool that generates summaries and transcripts from YouTube videos using AI.

## Features

- 🎥 YouTube video summary generation
- 📝 Full transcript generation
- 📤 Direct file upload support
- ⚡ Real-time progress updates via SSE
- 🔄 Azure Blob Storage integration
- 🖥️ CLI interface
- 🔒 Secure and rate-limited API

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
   npm start
   ```

4. **Use the CLI**
   ```bash
   # Generate a summary
   npm run cli summary https://youtube.com/watch?v=...

   # Generate a transcript
   npm run cli transcript https://youtube.com/watch?v=...
   ```

## Documentation

- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Utilities Reference](docs/UTILITIES.md)

## Requirements

- Node.js 18+
- FFmpeg
- Azure Storage Account (optional)
- OpenAI API key
- YouTube Data API key

## Environment Variables

Key environment variables (see `.env.example` for all options):

```bash
OPENAI_API_KEY=your-api-key
YOUTUBE_API_KEY=your-api-key
PORT=5050
```

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Run linter
npm run lint
```


## License

MIT
