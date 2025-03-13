/**
 * File size configuration used throughout the application.
 * These constants define limits and chunk sizes for file operations.
 */
export const FILE_SIZE = {
    /** Base size for megabyte calculations */
    MB: 1024 * 1024,
    
    /** Maximum memory limit for file operations (200MB) */
    MEMORY_LIMIT: 200 * 1024 * 1024,
    
    /** Maximum allowed file size for uploads (500MB) */
    MAX_FILE_SIZE: 500 * 1024 * 1024,
    
    /** Size of chunks for streaming operations (50MB) */
    CHUNK_SIZE: 50 * 1024 * 1024,
    
    /** Maximum size for local file storage (configurable, defaults to 100MB) */
    MAX_LOCAL_SIZE: Number(process.env.MAX_LOCAL_FILESIZE_MB || 100) * 1024 * 1024
} as const;

export type FileSizeConfig = typeof FILE_SIZE;
export default FILE_SIZE; 