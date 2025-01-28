import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration schema with validation using Zod.
 * Ensures all required environment variables are present and correctly typed.
 */
const envSchema = z.object({
    // API Keys
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
    YOUTUBE_API_KEY: z.string().min(1, 'YouTube API key is required'),
    
    // Server Configuration
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('5050'),
    URL: z.string().url().default('http://localhost'),
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('10'),
    
    // Security
    CORS_ORIGINS: z.string().default('*'),
    API_KEY_HEADER: z.string().default('x-api-key'),
    API_KEYS: z.string().transform((keys: string) => keys.split(',')).default(''),
    
    // Request Queue
    MAX_CONCURRENT_REQUESTS: z.string().transform(Number).default('2'),
    REQUEST_TIMEOUT_MS: z.string().transform(Number).default('30000'),
});

// Validate environment
const env = envSchema.safeParse(process.env);

if (!env.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(env.error.format(), null, 4));
    process.exit(1);
}

/**
 * Validated and typed configuration object.
 * Contains all application settings derived from environment variables.
 * 
 * @example
 * // Access configuration values
 * config.server.port; // Server port number
 * config.apis.openai.apiKey; // OpenAI API key
 * 
 * // Check environment
 * if (config.isProduction) {
 *   // Apply production-specific logic
 * }
 */
export const config = {
    isProduction: env.data.NODE_ENV === 'production',
    isDevelopment: env.data.NODE_ENV === 'development',
    isTest: env.data.NODE_ENV === 'test',
    
    server: {
        port: env.data.PORT,
        url: env.data.URL,
    },
    
    security: {
        corsOrigins: env.data.CORS_ORIGINS.split(','),
        apiKeyHeader: env.data.API_KEY_HEADER,
        apiKeys: env.data.API_KEYS,
    },
    
    rateLimit: {
        windowMs: env.data.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.data.RATE_LIMIT_MAX_REQUESTS,
    },
    
    queue: {
        maxConcurrentRequests: env.data.MAX_CONCURRENT_REQUESTS,
        requestTimeoutMs: env.data.REQUEST_TIMEOUT_MS,
    },
    
    apis: {
        openai: {
            apiKey: env.data.OPENAI_API_KEY,
        },
        youtube: {
            apiKey: env.data.YOUTUBE_API_KEY,
        },
    },
} as const; 
