const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const IntegrationModule = require('../models/integrationModel');
const integrationRoutes = require('../routes/integration');
const { connectDB, disconnectDB } = require('../db');

// Setup Express app and use the routes
const app = express();
app.use(express.json());
app.use('/api', integrationRoutes);

describe('Integration Routes Test', () => {
  // Connect to the in-memory database before running tests
  beforeAll(async () => {
    await connectDB();
    // Ensure unique index is created
    await IntegrationModule.collection.createIndex({ IntegrationID: 1 }, { unique: true });
  });
  
  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  describe('POST /api/integration-modules', () => {
    beforeEach(async () => {
      await IntegrationModule.deleteMany(); // Clean up before each test
    });
  
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
    });
  
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/integration-modules')
        .send({
          Description: 'A sample tool description',
        });
    
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('IntegrationID: Path `IntegrationID` is required.');
      expect(response.body.message).toContain('ToolName: Path `ToolName` is required.');
    });
    
    it('should handle duplicate IntegrationID errors', async () => {
      // Create the first module
      const integrationModule = new IntegrationModule({
        IntegrationID: '123',
        ToolName: 'Sample Tool',
        Description: 'A sample tool description',
        LinkOrPath: 'http://example.com',
      });
      await integrationModule.save();
  
      // Attempt to create a duplicate module
      const response = await request(app)
        .post('/api/integration-modules')
        .send({
          IntegrationID: '123',
          ToolName: 'Another Tool',
          Description: 'Another sample tool description',
          LinkOrPath: 'http://example.com/another',
        });
  
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'IntegrationID must be unique.');
    });
  });
});
