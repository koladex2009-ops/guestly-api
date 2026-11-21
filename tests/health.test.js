process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/guestly-test';
process.env.JWT_SECRET = 'test-secret-key-for-guestly-testing-123456';

const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns the service and database connection state', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        database: 'disconnected',
      },
    });
  });
});

