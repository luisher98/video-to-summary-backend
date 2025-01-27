import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../../src/server/server';
import fs from 'fs/promises';
import path from 'path';

let server: ReturnType<typeof app.listen>;
const TEST_PORT = 5052; // Different port from regular tests

beforeAll((done) => {
    server = app.listen(TEST_PORT, () => {
        console.log(`Production test server running on port ${TEST_PORT}`);
        done();
    });
});

afterAll((done) => {
    server.close(done);
});

describe('Production API Tests (Real API Calls)', () => {
    // Test video that's unlikely to be deleted/changed
    const TEST_VIDEO = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo" - First YouTube video

    describe('GET /api/summary', () => {
        it('should generate a real summary using OpenAI', async () => {
            const response = await request(app)
                .get('/api/summary')
                .query({ 
                    url: TEST_VIDEO,
                    words: 50 // Keep it short to minimize costs
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('content');
            expect(typeof response.body.content).toBe('string');
            expect(response.body.content.length).toBeGreaterThan(0);

            // Log the summary for manual verification
            console.log('\nGenerated Summary:', response.body.content);
        }, 30000); // 30s timeout for real API call

        it('should clean up temporary files after processing', async () => {
            // Make a request
            await request(app)
                .get('/api/summary')
                .query({ url: TEST_VIDEO });

            // Check that no temporary files remain
            const tmpDir = path.join(process.cwd(), 'tmp', 'audios');
            const files = await fs.readdir(tmpDir);
            expect(files.length).toBe(0);
        });
    });

    describe('GET /api/transcript', () => {
        it('should fetch real transcript from YouTube', async () => {
            const response = await request(app)
                .get('/api/transcript')
                .query({ url: TEST_VIDEO });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('text');
            expect(typeof response.body.text).toBe('string');
            expect(response.body.text.length).toBeGreaterThan(0);

            // Log the transcript for manual verification
            console.log('\nFetched Transcript:', response.body.text);
        });
    });

    describe('GET /api/info', () => {
        it('should fetch real video information', async () => {
            const response = await request(app)
                .get('/api/info')
                .query({ url: TEST_VIDEO });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('title');
            expect(response.body).toHaveProperty('description');
            expect(response.body).toHaveProperty('duration');
            
            // Log the info for manual verification
            console.log('\nVideo Info:', {
                title: response.body.title,
                duration: response.body.duration
            });
        });
    });

    describe('Error Handling with Real APIs', () => {
        it('should handle non-existent videos gracefully', async () => {
            const response = await request(app)
                .get('/api/summary')
                .query({ url: 'https://www.youtube.com/watch?v=nonexistent' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBeTruthy();
        });

        it('should handle private videos gracefully', async () => {
            const response = await request(app)
                .get('/api/summary')
                .query({ url: 'https://www.youtube.com/watch?v=private' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBeTruthy();
        });
    });
}); 