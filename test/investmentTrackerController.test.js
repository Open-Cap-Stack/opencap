const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { createInvestmentTracker } = require('../controllers/investmentTrackerController');
const { connectDB, disconnectDB } = require('../db');

// Set up the Express app
const app = express();
app.use(bodyParser.json());
app.post('/investments', createInvestmentTracker);

// Mock the investmentTracker model
jest.mock('../models/investmentTracker', () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({
      TrackID: '123',
      Company: 'Test Company',
      EquityPercentage: 10,
      CurrentValue: 1000,
    }),
  }));
});

describe('Investment Tracker Controller', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should create a new investment tracker entry', async () => {
    const response = await request(app)
      .post('/investments')
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

  // Add more tests here for other routes related to investmentTracker
});
