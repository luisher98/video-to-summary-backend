/**
 * File size constants used throughout the application
 */
export const FILE_SIZE = {
    MB: 1024 * 1024,
    MEMORY_LIMIT: 200 * 1024 * 1024, // 200MB
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    CHUNK_SIZE: 50 * 1024 * 1024, // 50MB chunks
    MAX_LOCAL_SIZE: Number(process.env.MAX_LOCAL_FILESIZE_MB || 100) * 1024 * 1024 // Default 100MB
} as const; 