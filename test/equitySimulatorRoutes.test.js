const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = express();
const bodyParser = require('body-parser');
const routes = require('../routes/equitySimulator');
const EquitySimulator = require('../models/equitySimulator');

// Middleware setup
app.use(bodyParser.json());
app.use('/api', routes);

// In-memory MongoDB server instance
let mongoServer;

// Connect to an in-memory database before running tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Disconnect and stop the in-memory database after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('EquitySimulator Routes', () => {
  describe('POST /api/equity-simulations', () => {
    it('should create a new equity simulator entry and return it', async () => {
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
      expect(response.body).toHaveProperty('simulationId', '12345');
      expect(response.body).toHaveProperty('ScenarioDetails');
      expect(response.body).toHaveProperty('EquityChangeType', 'Dilution');
      expect(response.body).toHaveProperty('StakeholdersAffected');
      expect(response.body).toHaveProperty('ProjectedEquityValue', 1000000);
      expect(response.body).toHaveProperty('PredictedOutcome');
      expect(response.body).toHaveProperty('OutcomeDescription', 'Sample description');
      expect(response.body).toHaveProperty('ImpactOnStakeholders');
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
      // Mock to simulate server error
      jest.spyOn(EquitySimulator.prototype, 'save').mockImplementation(() => {
        throw new Error('Database error');
      });

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