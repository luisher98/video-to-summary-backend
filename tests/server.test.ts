import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';
import { app } from '../src/server/server.ts';
import { mockOpenAIClient, mockOpenAIResponse } from '../src/mocks/openai.ts';
import { mockVideoProcessing, mockYouTubeResponse } from '../src/mocks/youtube.ts';

// Mock the OpenAI and video processing modules
jest.mock('../lib/openAI.ts', () => ({
    openai: mockOpenAIClient
}));

jest.mock('../services/summary/videoTools.ts', () => ({
    ...mockVideoProcessing
}));

let server: ReturnType<typeof app.listen>;
const TEST_PORT = 5051;

beforeAll((done) => {
    server = app.listen(TEST_PORT, () => {
        console.log(`Test server running on port ${TEST_PORT}`);
        done();
    });
});

afterAll((done) => {
    server.close(done);
});

beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

describe('API Endpoints', () => {
    describe('GET /api/summary', () => {
        const validUrl = 'https://www.youtube.com/watch?v=test123';

        it('should return video summary for a valid URL', async () => {
            const response = await request(app)
                .get('/api/summary')
                .query({ url: validUrl });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('content', mockOpenAIResponse.summary.content);
            expect(mockVideoProcessing.downloadVideo).toHaveBeenCalledWith(validUrl);
            expect(mockVideoProcessing.deleteVideo).toHaveBeenCalled();
        });

        it('should return 400 if no URL is provided', async () => {
            const response = await request(app)
                .get('/api/summary');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid YouTube URL');
        });

        it('should handle OpenAI API errors gracefully', async () => {
            mockOpenAIClient.chat.completions.create.mockRejectedValueOnce(
                new Error(mockOpenAIResponse.error.message)
            );

            const response = await request(app)
                .get('/api/summary')
                .query({ url: validUrl });

            expect(response.status).toBe(500);
            expect(response.body.error).toBeTruthy();
        });

        it('should handle video processing errors gracefully', async () => {
            mockVideoProcessing.downloadVideo.mockRejectedValueOnce(
                new Error('Video processing failed')
            );

            const response = await request(app)
                .get('/api/summary')
                .query({ url: validUrl });

            expect(response.status).toBe(500);
            expect(response.body.error).toBeTruthy();
        });
    });

    describe('GET /api/transcript', () => {
        const validUrl = 'https://www.youtube.com/watch?v=test123';

        it('should return video transcript for a valid URL', async () => {
            const response = await request(app)
                .get('/api/transcript')
                .query({ url: validUrl });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockYouTubeResponse.transcript);
            expect(mockVideoProcessing.getTranscript).toHaveBeenCalledWith(validUrl);
        });

        it('should return 400 if no URL is provided', async () => {
            const response = await request(app)
                .get('/api/transcript');

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid YouTube URL');
        });
    });

    describe('Rate Limiting', () => {
        it('should limit requests according to configuration', async () => {
            const url = '/api/summary?url=https://youtube.com/watch?v=test123';
            
            // Make requests up to the limit
            for (let i = 0; i < 10; i++) {
                await request(app).get(url);
            }

            // This request should be rate limited
            const response = await request(app).get(url);
            expect(response.status).toBe(429);
        });
    });

    describe('Request Queue', () => {
        it('should queue requests and return 503 when queue is full', async () => {
            const url = '/api/summary?url=https://youtube.com/watch?v=test123';
            
            // Create pending requests to fill the queue
            const requests = Array(3).fill(null).map(() => 
                request(app).get(url)
            );

            // This request should be rejected due to queue limit
            const response = await request(app).get(url);
            expect(response.status).toBe(503);
            expect(response.body.error).toBe('Server is busy. Please try again later.');

            // Clean up pending requests
            await Promise.all(requests);
        });
    });
});
