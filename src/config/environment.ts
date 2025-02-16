import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

export const config = {
    port: parseInt(process.env.PORT || '5050', 10),
    nodeEnv: NODE_ENV as 'development' | 'production' | 'test',
    
    // Environment checks
    isProduction: NODE_ENV === 'production',
    isDevelopment: NODE_ENV === 'development',
    isTest: NODE_ENV === 'test',

    // Security settings
    security: {
        apiKeyHeader: 'x-api-key',
        apiKeys: (process.env.API_KEYS || '').split(',').filter(Boolean),
        corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
    },

    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
    },

    // Request queue
    queue: {
        maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '2', 10),
        requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10) // 30 seconds
    },

    // Azure Storage
    azure: {
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
        containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads'
    },

    // OpenAI
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4'
    },

    // YouTube
    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY || ''
    },

    // File upload
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10) // 100MB
} as const;

export type Config = typeof config;

export default config; 
