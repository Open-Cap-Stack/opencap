const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Corporation = require('../models/Corporation');

describe('Corporation API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await Corporation.deleteMany({});
  });

  test('should list corporations', async () => {
    await Corporation.create({ legalName: 'Test Corp', doingBusinessAsName: 'TestCo', website: 'http://test.com' });

    const response = await request(app).get('/api/v2/corporations');
    expect(response.status).toBe(200);
    expect(response.body.corporations.length).toBe(1);
  });

  test('should create a new corporation', async () => {
    const response = await request(app)
      .post('/api/v2/corporations')
      .send({ legalName: 'Test Corp', doingBusinessAsName: 'TestCo', website: 'http://test.com' });

    expect(response.status).toBe(201);
    expect(response.body.legalName).toBe('Test Corp');
  });

  test('should update a corporation', async () => {
    const corp = await Corporation.create({ legalName: 'Test Corp', doingBusinessAsName: 'TestCo', website: 'http://test.com' });

    const response = await request(app)
      .put(`/api/v2/corporations/${corp._id}`)
      .send({ legalName: 'Updated Corp' });

    expect(response.status).toBe(200);
    expect(response.body.legalName).toBe('Updated Corp');
  });

  test('should delete a corporation', async () => {
    const corp = await Corporation.create({ legalName: 'Test Corp', doingBusinessAsName: 'TestCo', website: 'http://test.com' });

    const response = await request(app).delete(`/api/v2/corporations/${corp._id}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Corporation deleted successfully');
  });
});
