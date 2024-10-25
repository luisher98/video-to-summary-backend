import request from 'supertest';

import fs from 'fs';
import path from 'path';

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from './server.ts';


let server: any;
const TEST_PORT = 5051;  // Specify a unique port for testing

beforeAll((done) => {
  server = app.listen(TEST_PORT, () => {
    console.log(`Test server running on port ${TEST_PORT}`);
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe('HTTP req/res summary generation tests', () => {

  it('should return video summary for a valid URL', async () => {
    const response = await request(app)
      .get('/api/summary')
      .query({ url: 'https://www.youtube.com/watch?v=Knd4wvmqK3g' })
      .set('Accept', 'application/json');

    console.log(response.body);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('content');
  }, 10000);

  it('should delete the audio file after correctly processing', async () => {
    const directoryPath = path.join(__dirname, '../tmp/audios');

    const files = fs.readdirSync(directoryPath);
    expect(files.length).toBe(0);
  });

  it('should return 400 if no URL is provided', async () => {
    const response = await request(app)
      .get('/api/summary')
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid YouTube URL');
  });

  it('should return 500 if summary cannot be fetched', async () => {
    const response = await request(app)
      .get('/api/summary')
      .query({ url: 'https://invalid.url' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Unable to fetch summary');
  }, 10000);
});
