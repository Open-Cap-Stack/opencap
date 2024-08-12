// integrationRoutes.test.js

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const IntegrationModule = require('../models/integrationModel');
const integrationRoutes = require('../routes/integration');

// Setup Express app and use the routes
const app = express();
app.use(express.json());
app.use('/api', integrationRoutes);

describe('Integration Routes Test', () => {
  // Connect to the in-memory database before running tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  // Clear the database after each test
  afterEach(async () => {
    await IntegrationModule.deleteMany({});
  });

  // Close the connection after all tests are done
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/integration-modules', () => {
    it('should create a new integration module', async () => {
      const response = await request(app)
        .post('/api/integration-modules')
        .send({
          IntegrationID: '123',
          ToolName: 'Sample Tool',
          Description: 'A sample tool description',
          LinkOrPath: 'http://example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('IntegrationID', '123');
      expect(response.body).toHaveProperty('ToolName', 'Sample Tool');
      expect(response.body).toHaveProperty('Description', 'A sample tool description');
      expect(response.body).toHaveProperty('LinkOrPath', 'http://example.com');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/integration-modules')
        .send({
          Description: 'A sample tool description',
        });

      expect(response.status).toBe(400);
    });

    it('should handle duplicate IntegrationID errors', async () => {
      const integrationModule = new IntegrationModule({
        IntegrationID: '123',
        ToolName: 'Sample Tool',
        Description: 'A sample tool description',
        LinkOrPath: 'http://example.com',
      });
      await integrationModule.save();

      const response = await request(app)
        .post('/api/integration-modules')
        .send({
          IntegrationID: '123',
          ToolName: 'Another Tool',
          Description: 'Another sample tool description',
          LinkOrPath: 'http://example.com/another',
        });

      expect(response.status).toBe(400);
    });
  });
});