import { getQueueStatus } from './queue.js';
import * as headers from './headers.js';
import * as rateLimit from './rate-limit.js';
import * as auth from './auth.js';
import * as timeout from './timeout.js';

// Re-export all security middleware
export {
    headers,
    rateLimit,
    auth,
    timeout,
    getQueueStatus
};

// Export common middleware chains
export const common = [
    headers.basic,
    headers.csp,
    headers.cors,
    rateLimit.basic
];

export const processing = [
    ...common,
    rateLimit.processing,
    timeout.requestTimeout
];

export const development = [
    ...common,
    rateLimit.development
]; 