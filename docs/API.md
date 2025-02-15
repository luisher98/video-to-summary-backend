# Video Summary API Documentation

## Table of Contents
- [Video Summary API Documentation](#video-summary-api-documentation)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Getting Started](#getting-started)
    - [Base URL](#base-url)
    - [Prerequisites](#prerequisites)
  - [Authentication](#authentication)
  - [Rate Limiting](#rate-limiting)
  - [API Endpoints](#api-endpoints)
    - [YouTube Summary](#youtube-summary)
      - [Query Parameters](#query-parameters)
      - [Example Request](#example-request)
      - [SSE Events](#sse-events)
    - [File Upload Summary](#file-upload-summary)
      - [Query Parameters](#query-parameters-1)
      - [Request Headers](#request-headers)
      - [Form Data](#form-data)
      - [Example Request](#example-request-1)
      - [SSE Events](#sse-events-1)
    - [Transcript](#transcript)
      - [Query Parameters](#query-parameters-2)
      - [Example Request](#example-request-2)
      - [Response](#response)
    - [Video Information](#video-information)
      - [Query Parameters](#query-parameters-3)
      - [Example Request](#example-request-3)
      - [Response](#response-1)
    - [Health Check](#health-check)
      - [Example Request](#example-request-4)
      - [Response](#response-2)
    - [Azure Blob Summary](#azure-blob-summary)
      - [Query Parameters](#query-parameters-4)
      - [Example Request](#example-request-5)
      - [SSE Events](#sse-events-2)
  - [Error Handling](#error-handling)
    - [Common Status Codes](#common-status-codes)
  - [Examples](#examples)
    - [JavaScript Example (Browser)](#javascript-example-browser)
    - [Node.js Example (File Upload)](#nodejs-example-file-upload)
  - [Best Practices](#best-practices)
  - [WebSocket Events](#websocket-events)
    - [Progress Event Types](#progress-event-types)
    - [Event Format](#event-format)

## Overview

The Video Summary API provides powerful video processing capabilities, allowing you to:
- Generate AI-powered summaries of YouTube videos
- Process uploaded video files
- Extract video transcripts
- Get video metadata
- Monitor processing progress in real-time

All endpoints that involve video processing provide real-time updates through Server-Sent Events (SSE).

## Getting Started

### Base URL
```
https://your-api-domain.com/api
```

### Prerequisites
- Valid YouTube URLs or video files (for upload)
- HTTP client capable of handling Server-Sent Events (for real-time progress)
- Files under 500MB for uploads

## Authentication

Currently, the API uses IP-based rate limiting without requiring authentication. Future versions may introduce API key authentication.

## Rate Limiting

- **Limit**: 10 requests per minute per IP address
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time until reset (seconds)

When rate limit is exceeded, the API returns a 429 status code.

## API Endpoints

### YouTube Summary

Get an AI-generated summary of a YouTube video with real-time progress updates.

```http
GET /youtube-summary-sse
```

#### Query Parameters
| Parameter | Type   | Required | Description                    | Default |
|-----------|--------|----------|--------------------------------|---------|
| url       | string | Yes      | YouTube video URL              | -       |
| words     | number | No       | Summary length in words        | 400     |
| prompt    | string | No       | Custom instructions for AI     | -       |

#### Example Request
```bash
curl -N "https://your-api-domain.com/api/youtube-summary-sse?url=https://youtube.com/watch?v=example&words=300"
```

#### SSE Events
```javascript
// Progress update
event: progress
data: {
  "status": "downloading",
  "progress": 25
}

// Final summary
event: summary
data: {
  "summary": "Video summary content..."
}

// Error event
event: error
data: {
  "error": "Error message"
}
```

### File Upload Summary

Get a summary from an uploaded video file with real-time progress updates.

```http
POST /api/get-upload-summary-sse
```

#### Query Parameters
| Parameter | Type   | Required | Description             | Default |
|-----------|--------|----------|-------------------------|---------|
| words     | number | No       | Summary length in words | 400     |

#### Request Headers
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

Get the raw transcript of a YouTube video.

```http
GET /transcript
```

#### Query Parameters
| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| url       | string | Yes      | YouTube URL   |

#### Example Request
```bash
curl "https://your-api-domain.com/api/transcript?url=https://youtube.com/watch?v=example"
```

#### Response
```json
{
  "transcript": "Full video transcript...",
  "duration": 360
}
```

### Video Information

Retrieve metadata about a YouTube video.

```http
GET /info
```

#### Query Parameters
| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| url       | string | Yes      | YouTube URL   |

#### Example Request
```bash
curl "https://your-api-domain.com/api/info?url=https://youtube.com/watch?v=example"
```

#### Response
```json
{
  "title": "Video Title",
  "duration": 360,
  "author": "Channel Name",
  "description": "Video description..."
}
```

### Health Check

Check API health status.

```http
GET /health
```

#### Example Request
```bash
curl "https://your-api-domain.com/api/health"
```

#### Response
```json
{
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "used": 512,
    "total": 1024
  },
  "cpu": 45.2
}
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Status Codes
| Code | Description           | Common Causes                          |
|------|--------------------- |---------------------------------------|
| 400  | Bad Request          | Invalid parameters or URL              |
| 404  | Not Found            | Invalid YouTube URL                    |
| 413  | Payload Too Large    | File size exceeds 500MB               |
| 415  | Unsupported Media    | Invalid file format                   |
| 429  | Too Many Requests    | Rate limit exceeded                   |
| 500  | Internal Server Error| Server-side processing error          |

## Examples

### JavaScript Example (Browser)
```javascript
// YouTube Summary with SSE
const eventSource = new EventSource(
  'https://your-api-domain.com/api/youtube-summary-sse?url=https://youtube.com/watch?v=example'
);

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Progress: ${data.status} - ${data.progress}%`);
});

eventSource.addEventListener('summary', (event) => {
  const data = JSON.parse(event.data);
  console.log('Summary:', data.summary);
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  console.error('Error:', event);
  eventSource.close();
});
```

### Node.js Example (File Upload)
```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function uploadVideo(filePath) {
  const form = new FormData();
  form.append('video', fs.createReadStream(filePath));

  const response = await fetch(
    'https://your-api-domain.com/api/upload-summary-sse',
    {
      method: 'POST',
      body: form
    }
  );

  // Handle SSE response
  for await (const chunk of response.body) {
    const data = JSON.parse(chunk);
    console.log(data);
  }
}
```

## Best Practices

1. **Error Handling**
   - Always implement error event listeners for SSE connections
   - Handle network timeouts and implement reconnection logic
   - Validate input parameters before making API calls

2. **Resource Management**
   - Close SSE connections when done (`eventSource.close()`)
   - Keep uploaded files under 500MB
   - Implement retry logic for failed requests

3. **Progress Monitoring**
   - Display progress updates to users
   - Handle all possible status types in progress events
   - Implement proper error handling for failed operations

4. **Rate Limiting**
   - Monitor rate limit headers
   - Implement backoff strategy when approaching limits
   - Queue requests if necessary

## WebSocket Events

### Progress Event Types
| Status      | Description                              |
|-------------|------------------------------------------|
| downloading | Video is being downloaded                |
| processing  | Video is being processed                 |
| transcribing| Audio is being transcribed              |
| summarizing | AI is generating summary                 |
| complete    | Processing complete                      |

### Event Format
```javascript
{
  status: string,    // Current operation status
  progress: number,  // Progress percentage (0-100)
  message?: string   // Optional status message
}
``` 