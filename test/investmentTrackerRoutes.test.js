const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const router = require('../routes/investmentTrackerRoutes');
const investmentTracker = require('../models/investmentTrackerModel');

jest.mock('../models/investmentTrackerModel');

const app = express();
app.use(bodyParser.json());
app.use('/api', router);

describe('Investment Tracker Routes', () => {
  beforeAll(async () => {
    const mongoUri = 'mongodb://127.0.0.1/investmentTrackerTestDB';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new investment tracker entry via POST /api/investments', async () => {
    investmentTracker.mockImplementationOnce(() => {
      return {
        save: jest.fn().mockResolvedValue({
          TrackID: '123',
          Company: 'Test Company',
          EquityPercentage: 10,
          CurrentValue: 1000,
        }),
      };
    });

    const response = await request(app)
      .post('/api/investments')
      .send({
        TrackID: '123',
        Company: 'Test Company',
        EquityPercentage: 10,
        CurrentValue: 1000,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('TrackID', '123');
    expect(response.body).toHaveProperty('Company', 'Test Company');
    expect(response.body).toHaveProperty('EquityPercentage', 10);
    expect(response.body).toHaveProperty('CurrentValue', 1000);
  });

  it('should return 400 if required fields are missing in POST /api/investments', async () => {
    const response = await request(app)
      .post('/api/investments')
      .send({
        Company: 'Test Company',
        EquityPercentage: 10,
        CurrentValue: 1000,
      });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Missing required fields');
  });
  

  // Add more tests here for other routes related to investmentTracker
});