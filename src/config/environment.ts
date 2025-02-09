import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Server configuration
  PORT: z.string().default('5050'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Azure Storage configuration
  AZURE_STORAGE_CONNECTION_STRING: z.string(),
  AZURE_STORAGE_CONTAINER_NAME: z.string(),

  // OpenAI configuration
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string().default('gpt-4'),

  // YouTube API configuration
  YOUTUBE_API_KEY: z.string(),

  // Optional configurations
  MAX_FILE_SIZE: z.string().default('500'), // in MB
  RATE_LIMIT: z.string().default('10'), // requests per minute
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Export typed environment variables
export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  azure: {
    connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: env.AZURE_STORAGE_CONTAINER_NAME,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },
  youtube: {
    apiKey: env.YOUTUBE_API_KEY,
  },
  maxFileSize: parseInt(env.MAX_FILE_SIZE, 10) * 1024 * 1024, // Convert MB to bytes
  rateLimit: parseInt(env.RATE_LIMIT, 10),
} as const;

// Type for the config object
export type Config = typeof config; 
