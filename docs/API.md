# Video Summary API Documentation

## Table of Contents
- [Video Summary API Documentation](#video-summary-api-documentation)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Architecture](#architecture)
    - [Core Components](#core-components)
  - [Getting Started](#getting-started)
    - [Base URL](#base-url)
    - [Prerequisites](#prerequisites)
    - [Environment Setup](#environment-setup)
  - [Authentication](#authentication)
  - [Rate Limiting](#rate-limiting)
  - [API Endpoints](#api-endpoints)
    - [YouTube Summary](#youtube-summary)
      - [Query Parameters](#query-parameters)
      - [Technical Details](#technical-details)
      - [SSE Events](#sse-events)
    - [File Upload Summary](#file-upload-summary)
      - [Technical Implementation](#technical-implementation)
      - [Query Parameters](#query-parameters-1)
      - [Headers](#headers)
      - [Form Data](#form-data)
      - [Example Request](#example-request)
      - [SSE Events](#sse-events-1)
    - [Azure Blob Summary](#azure-blob-summary)
      - [Query Parameters](#query-parameters-2)
      - [Example Request](#example-request-1)
      - [SSE Events](#sse-events-2)
    - [Transcript](#transcript)
      - [Implementation Details](#implementation-details)
      - [Query Parameters](#query-parameters-3)
    - [Video Information](#video-information)
      - [Implementation](#implementation)
      - [Query Parameters](#query-parameters-4)
  - [Technical Implementation](#technical-implementation-1)
    - [File Processing](#file-processing)
    - [Storage Strategy](#storage-strategy)
    - [Security Measures](#security-measures)
    - [Performance Optimization](#performance-optimization)
  - [Error Handling](#error-handling)
    - [Status Codes](#status-codes)
  - [Examples](#examples)
    - [JavaScript SSE Client](#javascript-sse-client)
    - [File Upload with Progress](#file-upload-with-progress)
  - [Best Practices](#best-practices)
    - [Client Implementation](#client-implementation)
    - [Server Considerations](#server-considerations)
  - [WebSocket Events](#websocket-events)
    - [Progress Event Types](#progress-event-types)
    - [Event Format](#event-format)
  - [Summary Endpoints](#summary-endpoints)
    - [YouTube Video Processing](#youtube-video-processing)
      - [`GET /api/summary/youtube/summary`](#get-apisummaryyoutubesummary)
      - [`GET /api/summary/youtube/stream`](#get-apisummaryyoutubestream)
      - [`GET /api/summary/youtube/transcript`](#get-apisummaryyoutubetranscript)
    - [Streaming Endpoints (Optimized for Performance)](#streaming-endpoints-optimized-for-performance)
      - [`GET /api/summary/youtube/streaming/summary`](#get-apisummaryyoutubestreamingsummary)
      - [`GET /api/summary/youtube/streaming/transcript`](#get-apisummaryyoutubestreamingtranscript)
    - [File Upload Processing](#file-upload-processing)
      - [`POST /api/summary/upload/summary`](#post-apisummaryuploadsummary)
      - [`POST /api/summary/upload/transcript`](#post-apisummaryuploadtranscript)
  - [Storage Endpoints](#storage-endpoints)
    - [Azure Storage Integration](#azure-storage-integration)
      - [`POST /api/storage/blob`](#post-apistorageblob)
  - [Health and Status Endpoints](#health-and-status-endpoints)
      - [`GET /api/health`](#get-apihealth)
  - [Performance Metrics](#performance-metrics)

## Overview

The Video Summary API is a powerful service that combines video processing, AI-powered transcription, and summarization capabilities. It provides:
- AI-powered summaries of YouTube videos using GPT-4
- Processing and summarization of uploaded video files
- Real-time progress tracking via Server-Sent Events (SSE)
- Transcript extraction using OpenAI's Whisper
- Video metadata retrieval
- Hybrid storage solution for efficient file handling

## Architecture

### Core Components

1. **Summary Service**
   - Manages video processing workflow
   - Handles transcription and summarization
   - Provides real-time progress updates

2. **Storage Service**
   - Hybrid storage approach:
     - Local storage for files ≤200MB
     - Azure Blob Storage for larger files
   - Automatic cleanup of processed files
   - Stream-based file handling

3. **Processing Pipeline**
   - Video download/upload handling
   - Audio extraction using FFmpeg
   - Transcription via OpenAI Whisper
   - Summarization using GPT-4

## Getting Started

### Base URL
```
https://your-api-domain.com/api
```

### Prerequisites
- Valid YouTube URLs or video files
- HTTP client with SSE support
- Files under 500MB for uploads
- FFmpeg for video processing

### Environment Setup
Required environment variables:
- `OPENAI_API_KEY`: For AI services
- `AZURE_STORAGE_CONNECTION_STRING`: For cloud storage
- `YOUTUBE_API_KEY`: For video metadata

## Authentication

Currently uses IP-based rate limiting. Future versions will introduce API key authentication.

## Rate Limiting

- **Limit**: 10 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time until reset (seconds)

## API Endpoints

### YouTube Summary

Generate AI-powered summaries with real-time updates.

```http
GET /youtube-summary-sse
```

#### Query Parameters
| Parameter | Type   | Required | Description                    | Default |
|-----------|--------|----------|--------------------------------|---------|
| url       | string | Yes      | YouTube video URL              | -       |
| words     | number | No       | Summary length in words        | 400     |
| prompt    | string | No       | Custom instructions for AI     | -       |

#### Technical Details
- Uses youtube-dl for video download
- FFmpeg for audio extraction
- OpenAI Whisper for transcription
- GPT-4 for summarization
- Temporary file cleanup after processing

#### SSE Events
```javascript
// Progress Events
{
  status: "downloading" | "processing" | "transcribing" | "summarizing",
  progress: number, // 0-100
  message: string
}

// Final Summary
{
  status: "done",
  summary: string
}

// Error Event
{
  status: "error",
  error: string
}
```

### File Upload Summary

Get a summary from an uploaded video file with real-time progress updates.

```http
POST /api/get-upload-summary-sse
```

#### Technical Implementation
- Chunked upload processing (50MB chunks)
- Memory optimization:
  - In-memory processing ≤200MB
  - Azure Blob Storage >200MB
- Automatic file type validation
- FFmpeg integration
- Temporary file management

#### Query Parameters
| Parameter | Type   | Required | Description             | Default |
|-----------|--------|----------|-------------------------|---------|
| words     | number | No       | Summary length in words | 400     |

#### Headers
```
Content-Type: multipart/form-data
```

#### Form Data
| Field | Type | Required | Description                    |
|-------|------|----------|--------------------------------|
| file  | file | Yes      | Video file (max size: 500MB)   |

#### Example Request
```bash
curl -N -F "file=@video.mp4" "https://your-api-domain.com/api/get-upload-summary-sse?words=300"
```

#### SSE Events
```javascript
// Progress update
event: progress
data: {
  "status": "processing",
  "progress": 25,
  "message": "Processing video..."
}

// Final summary
event: summary
data: {
  "status": "done",
  "progress": 100,
  "message": "Summary content..."
}

// Error event
event: error
data: {
  "status": "error",
  "progress": 0,
  "message": "Error message"
}
```

### Azure Blob Summary

Get a summary from a video file stored in Azure Blob Storage.

```http
GET /api/get-azure-summary-sse
```

#### Query Parameters
| Parameter | Type   | Required | Description                    | Default |
|-----------|--------|----------|--------------------------------|---------|
| fileId    | string | Yes      | ID of the file                | -       |
| blobName  | string | Yes      | Name of the blob in storage   | -       |
| words     | number | No       | Summary length in words       | 400     |

#### Example Request
```bash
curl -N "https://your-api-domain.com/api/get-azure-summary-sse?fileId=xxx&blobName=xxx&words=300"
```

#### SSE Events
```javascript
// Progress update
event: progress
data: {
  "status": "processing",
  "progress": 25,
  "message": "Processing video..."
}

// Final summary
event: summary
data: {
  "status": "done",
  "progress": 100,
  "message": "Summary content..."
}

// Error event
event: error
data: {
  "status": "error",
  "progress": 0,
  "message": "Error message"
}
```

### Transcript

Extract raw video transcripts.

```http
GET /transcript
```

#### Implementation Details
- Uses OpenAI Whisper
- Supports multiple languages
- Temporary audio file handling
- Stream processing for large files

#### Query Parameters
| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| url       | string | Yes      | YouTube URL   |

### Video Information

Retrieve video metadata.

```http
GET /info
```

#### Implementation
- YouTube Data API integration
- Cached responses
- Error handling for unavailable videos

#### Query Parameters
| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| url       | string | Yes      | YouTube URL   |

## Technical Implementation

### File Processing
- Chunked uploads (50MB chunks)
- Memory limits:
  - 200MB for in-memory processing
  - Azure Blob Storage for larger files
- FFmpeg integration for audio extraction
- Temporary file management
- Cleanup procedures

### Storage Strategy
1. **Local Storage** (≤200MB)
   - Faster processing
   - Automatic cleanup
   - Stream-based handling

2. **Azure Blob Storage** (>200MB)
   - Managed identity support
   - SAS URL generation
   - Automatic expiration
   - Secure access

### Security Measures
- File type validation
- Size restrictions
- Secure headers
- Azure managed identity
- Request logging
- Rate limiting

### Performance Optimization
- Chunked file processing
- Debounced progress updates
- Parallel processing
- Stream-based operations
- Memory management

## Error Handling

Structured error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional technical details
  }
}
```

### Status Codes
| Code | Description           | Common Causes                          |
|------|--------------------- |---------------------------------------|
| 400  | Bad Request          | Invalid parameters or URL              |
| 404  | Not Found            | Invalid YouTube URL                    |
| 413  | Payload Too Large    | File size exceeds 500MB               |
| 415  | Unsupported Media    | Invalid file format                   |
| 429  | Too Many Requests    | Rate limit exceeded                   |
| 500  | Internal Server Error| Processing failure                    |
| 503  | Service Unavailable  | Azure Storage/OpenAI API issues       |

## Examples

### JavaScript SSE Client
```javascript
const eventSource = new EventSource(
  'https://api.domain.com/youtube-summary-sse?url=youtube.com/watch?v=example'
);

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.status}: ${data.progress}%`);
});

eventSource.addEventListener('summary', (event) => {
  const data = JSON.parse(event.data);
  console.log('Summary:', data.summary);
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

### File Upload with Progress
```javascript
const form = new FormData();
form.append('video', file);

const response = await fetch('/api/upload-summary-sse', {
  method: 'POST',
  body: form
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {value, done} = await reader.read();
  if (done) break;
  
  const events = decoder.decode(value).split('\n\n');
  for (const event of events) {
    if (!event.trim()) continue;
    const data = JSON.parse(event.replace('data: ', ''));
    console.log(`${data.status}: ${data.progress}%`);
  }
}
```

## Best Practices

### Client Implementation
1. **Error Handling**
   - Implement SSE error listeners
   - Handle network timeouts
   - Implement reconnection logic
   - Validate input before API calls

2. **Resource Management**
   - Close SSE connections when done
   - Respect file size limits
   - Implement retry logic
   - Monitor rate limits

3. **Progress Tracking**
   - Display all progress stages
   - Handle all SSE event types
   - Implement error recovery
   - Show meaningful progress UI

4. **Performance**
   - Use appropriate chunk sizes
   - Implement request queuing
   - Monitor memory usage
   - Cache responses when appropriate

### Server Considerations
1. **File Handling**
   - Validate file types
   - Use stream processing
   - Implement cleanup procedures
   - Monitor storage usage

2. **Error Management**
   - Log all errors
   - Provide meaningful messages
   - Implement fallbacks
   - Monitor API health

3. **Resource Usage**
   - Monitor memory usage
   - Track API quotas
   - Implement caching
   - Optimize storage use

## WebSocket Events

### Progress Event Types
| Status      | Description                              |
|-------------|------------------------------------------|
| downloading | Video download in progress               |
| uploading   | File upload in progress                 |
| processing  | Video/audio processing                  |
| transcribing| Generating transcript                   |
| summarizing | Creating AI summary                     |
| done        | Process complete                        |
| error       | Error occurred                          |

### Event Format
```typescript
interface ProgressEvent {
  status: string;
  progress: number;
  message?: string;
}

interface SummaryEvent {
  status: 'done';
  summary: string;
}

interface ErrorEvent {
  status: 'error';
  error: string;
  details?: any;
}
```

## Summary Endpoints

### YouTube Video Processing

#### `GET /api/summary/youtube/summary`
Generate a summary of a YouTube video.

**Query Parameters:**
- `url` (required): YouTube video URL
- `words` (optional): Maximum number of words in the summary (default: 400)
- `prompt` (optional): Additional instructions for the AI

**Response:**
```json
{
  "data": "Summary text here..."
}
```

#### `GET /api/summary/youtube/stream`
Generate a summary with progress updates via Server-Sent Events (SSE).

**Query Parameters:**
- `url` (required): YouTube video URL
- `words` (optional): Maximum number of words in the summary (default: 400)
- `prompt` (optional): Additional instructions for the AI

**Response:** SSE stream with progress updates and final summary

#### `GET /api/summary/youtube/transcript`
Get the full transcript of a YouTube video.

**Query Parameters:**
- `url` (required): YouTube video URL

**Response:**
```json
{
  "data": "Full transcript text here..."
}
```

### Streaming Endpoints (Optimized for Performance)

#### `GET /api/summary/youtube/streaming/summary`
Generate a summary using streaming and piping for improved performance. This endpoint is more efficient for large videos and starts processing before the download completes.

**Query Parameters:**
- `url` (required): YouTube video URL
- `words` (optional): Maximum number of words in the summary (default: 400)
- `prompt` (optional): Additional instructions for the AI

**Response:** SSE stream with progress updates and final summary

**Performance Benefits:**
- Faster processing for large videos
- Lower memory usage
- Processing starts before download completes

#### `GET /api/summary/youtube/streaming/transcript`
Get the transcript of a YouTube video using streaming for improved performance.

**Query Parameters:**
- `url` (required): YouTube video URL
- `stream` (optional): Set to "true" to receive progress updates via SSE

**Response:**
- If `stream=true`: SSE stream with progress updates and final transcript
- Otherwise: Standard JSON response with transcript

### File Upload Processing

#### `POST /api/summary/upload/summary`
Generate a summary from an uploaded audio or video file.

**Form Data:**
- `file` (required): Audio or video file to process
- `words` (optional): Maximum number of words in the summary (default: 400)
- `prompt` (optional): Additional instructions for the AI

**Response:**
```json
{
  "data": "Summary text here..."
}
```

#### `POST /api/summary/upload/transcript`
Get the transcript from an uploaded audio or video file.

**Form Data:**
- `file` (required): Audio or video file to process

**Response:**
```json
{
  "data": "Full transcript text here..."
}
```

## Storage Endpoints

### Azure Storage Integration

#### `POST /api/storage/blob`
Upload a file to Azure Blob Storage.

**Form Data:**
- `file` (required): File to upload
- `container` (optional): Container name (default: from config)

**Response:**
```json
{
  "url": "https://storage.url/path/to/file",
  "filename": "filename.ext"
}
```

## Health and Status Endpoints

#### `GET /api/health`
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 12345,
  "version": "1.0.0"
}
```

## Performance Metrics

The streaming endpoints include performance metrics in the response metadata, including:
- `downloadTime`: Time spent downloading the video
- `processingTime`: Time spent processing the audio
- `transcriptionTime`: Time spent generating the transcript
- `summarizationTime`: Time spent generating the summary
- `totalTime`: Total request processing time
- `memoryUsage`: Peak memory usage during processing

Example metrics response:
```json
{
  "metrics": {
    "downloadTime": 2500,
    "processingTime": 1200,
    "transcriptionTime": 3500,
    "summarizationTime": 1800,
    "totalTime": 9000,
    "memoryUsage": "120MB"
  }
}
``` 