const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const bodyParser = require('body-parser');
const EquitySimulator = require('../models/equitySimulator');
const equitySimulatorController = require('../controllers/equitySimulatorController');
const routes = require('../routes/equitySimulator');

// Middleware setup
app.use(bodyParser.json());
app.use('/api', routes);

// Mock Mongoose
jest.mock('mongoose', () => ({
  model: jest.fn(() => ({
    save: jest.fn()
  })),
}));

describe('EquitySimulator Controller', () => {
  beforeAll(async () => {
    // Connect to a test database (you might want to use an in-memory database for faster tests)
    await mongoose.connect('mongodb://localhost:27017/testdb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Disconnect from the test database
    await mongoose.disconnect();
  });

  describe('POST /api/equity-simulations', () => {
    it('should create a new equity simulator entry and return it', async () => {
      // Mock the save method to return a resolved promise with a fake entry
      const mockSave = jest.fn().mockResolvedValue({
        simulationId: '12345',
        ScenarioDetails: { /* mock details */ },
        EquityChangeType: 'Dilution',
        StakeholdersAffected: [/* mock stakeholders */],
        ProjectedEquityValue: 1000000,
        PredictedOutcome: { /* mock outcome */ },
        OutcomeDescription: 'Sample description',
        ImpactOnStakeholders: [/* mock impact */],
      });

      // Replace the model save method with the mock
      mongoose.model.mockImplementation(() => ({
        save: mockSave,
      }));

      const response = await request(app)
        .post('/api/equity-simulations')
        .send({
          simulationId: '12345',
          ScenarioDetails: { /* mock details */ },
          EquityChangeType: 'Dilution',
          StakeholdersAffected: [/* mock stakeholders */],
          ProjectedEquityValue: 1000000,
          PredictedOutcome: { /* mock outcome */ },
          OutcomeDescription: 'Sample description',
          ImpactOnStakeholders: [/* mock impact */],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        simulationId: '12345',
        ScenarioDetails: { /* mock details */ },
        EquityChangeType: 'Dilution',
        StakeholdersAffected: [/* mock stakeholders */],
        ProjectedEquityValue: 1000000,
        PredictedOutcome: { /* mock outcome */ },
        OutcomeDescription: 'Sample description',
        ImpactOnStakeholders: [/* mock impact */],
      });
    });

    it('should return a 400 error if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/equity-simulations')
        .send({
          simulationId: '12345',
          ScenarioDetails: { /* mock details */ },
          // Missing EquityChangeType, StakeholdersAffected, ProjectedEquityValue, and PredictedOutcome
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should handle internal server errors gracefully', async () => {
      // Mock the save method to throw an error
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));

      // Replace the model save method with the mock
      mongoose.model.mockImplementation(() => ({
        save: mockSave,
      }));

      const response = await request(app)
        .post('/api/equity-simulations')
        .send({
          simulationId: '12345',
          ScenarioDetails: { /* mock details */ },
          EquityChangeType: 'Dilution',
          StakeholdersAffected: [/* mock stakeholders */],
          ProjectedEquityValue: 1000000,
          PredictedOutcome: { /* mock outcome */ },
          OutcomeDescription: 'Sample description',
          ImpactOnStakeholders: [/* mock impact */],
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
    });
  });
});