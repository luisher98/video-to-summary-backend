/**
 * Server Configuration
 */

export const SERVER_CONFIG = {
    // Server settings
    port: process.env.PORT || 5050,
    url: process.env.WEBSITE_HOSTNAME || `http://localhost:${process.env.PORT || 5050}`,
    environment: process.env.NODE_ENV || 'development',
    
    // Security settings
    security: {
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        apiKeyHeader: 'x-api-key',
        apiKeys: process.env.API_KEYS?.split(',') || [],
        trustProxy: 'uniquelocal' // Azure's proxy setting
    },

    // Rate limiting
    rateLimit: {
        standard: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        processing: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10 // limit each IP to 10 requests per windowMs
        }
    },

    // Request queue
    queue: {
        maxConcurrentRequests: 2,
        requestTimeoutMs: 5 * 60 * 1000 // 5 minutes
    },

    // Temporary files
    tempFiles: {
        cleanupInterval: 60 * 60 * 1000, // 1 hour
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },

    // Example settings
    examples: {
        videoId: 'N-ZNfuCdkUo'
    }
} as const;

export type ServerConfig = typeof SERVER_CONFIG; 