# Error Codes Reference

This document provides a comprehensive list of error codes used throughout the application.

## HTTP Error Codes

### 4xx Client Errors

| Code | Name | Description |
|------|------|-------------|
| `BAD_REQUEST` | Bad Request | The request was malformed or contains invalid parameters |
| `UNAUTHORIZED` | Unauthorized | Authentication is required or credentials are invalid |
| `FORBIDDEN` | Forbidden | The authenticated user lacks required permissions |
| `NOT_FOUND` | Not Found | The requested resource does not exist |
| `METHOD_NOT_ALLOWED` | Method Not Allowed | The HTTP method is not supported for this endpoint |
| `CONFLICT` | Conflict | The request conflicts with the current state |
| `PAYLOAD_TOO_LARGE` | Payload Too Large | The request payload exceeds size limits |
| `UNSUPPORTED_MEDIA_TYPE` | Unsupported Media Type | The content type is not supported |
| `RATE_LIMIT_EXCEEDED` | Rate Limit Exceeded | Too many requests in a given time window |

### 5xx Server Errors

| Code | Name | Description |
|------|------|-------------|
| `INTERNAL_SERVER_ERROR` | Internal Server Error | An unexpected error occurred on the server |
| `NOT_IMPLEMENTED` | Not Implemented | The requested functionality is not implemented |
| `BAD_GATEWAY` | Bad Gateway | Invalid response from an upstream service |
| `SERVICE_UNAVAILABLE` | Service Unavailable | The service is temporarily unavailable |

## Storage Error Codes

| Code | Name | Description |
|------|------|-------------|
| `STORAGE_ERROR` | Storage Error | Generic storage operation error |
| `FILE_NOT_FOUND` | File Not Found | The requested file does not exist |
| `UPLOAD_FAILED` | Upload Failed | File upload operation failed |
| `DOWNLOAD_FAILED` | Download Failed | File download operation failed |
| `INVALID_FILE_TYPE` | Invalid File Type | The file type is not supported |
| `FILE_TOO_LARGE` | File Too Large | The file size exceeds the limit |
| `STORAGE_QUOTA_EXCEEDED` | Storage Quota Exceeded | Account storage quota has been exceeded |
| `INVALID_CONTAINER` | Invalid Container | The storage container is invalid or inaccessible |

## Media Error Codes

| Code | Name | Description |
|------|------|-------------|
| `MEDIA_ERROR` | Media Error | Generic media operation error |
| `PROCESSING_ERROR` | Processing Error | Media processing operation failed |
| `EXTRACTION_FAILED` | Extraction Failed | Media extraction operation failed |
| `TRANSCODING_FAILED` | Transcoding Failed | Media transcoding operation failed |
| `INVALID_MEDIA_TYPE` | Invalid Media Type | The media type is not supported |
| `MEDIA_TOO_LARGE` | Media Too Large | The media file size exceeds the limit |
| `INVALID_DURATION` | Invalid Duration | The media duration exceeds the limit |
| `CORRUPT_MEDIA` | Corrupt Media | The media file is corrupted or invalid |

## YouTube Error Codes

| Code | Name | Description |
|------|------|-------------|
| `YOUTUBE_ERROR` | YouTube Error | Generic YouTube operation error |
| `VIDEO_NOT_FOUND` | Video Not Found | The requested video does not exist |
| `VIDEO_UNAVAILABLE` | Video Unavailable | The video is not available (private/deleted) |
| `DOWNLOAD_ERROR` | Download Error | Video download operation failed |
| `INVALID_VIDEO_ID` | Invalid Video ID | The provided video ID is invalid |
| `REGION_BLOCKED` | Region Blocked | The video is not available in the current region |
| `AGE_RESTRICTED` | Age Restricted | The video requires age verification |
| `COPYRIGHT_BLOCKED` | Copyright Blocked | The video is blocked due to copyright |

## Validation Error Codes

| Code | Name | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | Validation Error | Generic validation error |
| `REQUIRED_FIELD` | Required Field | A required field is missing |
| `INVALID_FORMAT` | Invalid Format | Field format is invalid |
| `INVALID_LENGTH` | Invalid Length | Field length is outside allowed range |
| `INVALID_VALUE` | Invalid Value | Field value is not allowed |
| `INVALID_TYPE` | Invalid Type | Field type does not match expected type |

## Authentication Error Codes

| Code | Name | Description |
|------|------|-------------|
| `AUTH_ERROR` | Authentication Error | Generic authentication error |
| `INVALID_CREDENTIALS` | Invalid Credentials | The provided credentials are invalid |
| `TOKEN_EXPIRED` | Token Expired | The authentication token has expired |
| `INVALID_TOKEN` | Invalid Token | The authentication token is invalid |
| `MISSING_TOKEN` | Missing Token | No authentication token provided |
| `INSUFFICIENT_PERMISSIONS` | Insufficient Permissions | User lacks required permissions |

## System Error Codes

| Code | Name | Description |
|------|------|-------------|
| `SYSTEM_ERROR` | System Error | Generic system error |
| `CONFIG_ERROR` | Configuration Error | Invalid configuration |
| `ENV_ERROR` | Environment Error | Missing environment variables |
| `NETWORK_ERROR` | Network Error | Network communication failed |
| `DATABASE_ERROR` | Database Error | Database operation failed |
| `CACHE_ERROR` | Cache Error | Cache operation failed |
| `RESOURCE_EXHAUSTED` | Resource Exhausted | System resources are exhausted |

## Using Error Codes

When throwing errors, always use the appropriate error code from this list:

```typescript
throw new StorageError(
    'Failed to upload file',
    'UPLOAD_FAILED',
    { fileName, size }
);
```

For HTTP responses, combine with appropriate HTTP status codes:

```typescript
throw new HttpError(
    'Video not available in your region',
    HttpStatus.FORBIDDEN,
    'REGION_BLOCKED'
);
``` 