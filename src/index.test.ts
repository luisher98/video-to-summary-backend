import app from 'index.ts'; // Assuming your main express app file is in app.js or app.ts

describe('/api/summary', () => {
  it('should return video summary for a valid URL', async () => {
    const response = await request(app)
      .get('/api/summary')
      .query({ url: 'https://www.youtube.com/watch?v=NQ0v5ZbKJl0' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('title');
    expect(response.body.data).toHaveProperty('description');
  });

  it('should return 400 if no URL is provided', async () => {
    const response = await request(app)
      .get('/api/summary')
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No URL provided');
  });

  it('should return 500 if summary cannot be fetched', async () => {
    const response = await request(app)
      .get('/api/summary')
      .query({ url: 'https://invalid.url' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Unable to fetch summary');
  });
});
