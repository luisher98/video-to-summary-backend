import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), '.env');

// Load environment variables
dotenv.config({ path: envPath });

console.log('Environment variables loaded from:', envPath);
console.log('Environment:', NODE_ENV); 