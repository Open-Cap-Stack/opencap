// integrationController.test.js

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { createIntegrationModule } = require('../controllers/integrationController');
const IntegrationModule = require('../models/integrationModel');

// Mock the IntegrationModule model
jest.mock('../models/integrationModule');

const app = express();
app.use(express.json());

// Use the controller function for the route
app.post('/integration-modules', createIntegrationModule);

describe('Integration Module Controller', () => {
  describe('POST /integration-modules', () => {
    it('should create a new integration module', async () => {
      // Mock the IntegrationModule.save method
      IntegrationModule.prototype.save = jest.fn().mockResolvedValue({
        IntegrationID: '123',
        ToolName: 'Sample Tool',
        Description: 'A sample tool description',
        LinkOrPath: 'http://example.com',
      });

      const response = await request(app)
        .post('/integration-modules')
        .send({
          IntegrationID: '123',
          ToolName: 'Sample Tool',
          Description: 'A sample tool description',
          LinkOrPath: 'http://example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('IntegrationID', '123');
      expect(response.body).toHaveProperty('ToolName', 'Sample Tool');
      expect(response.body).toHaveProperty('Description', 'A sample tool description');
      expect(response.body).toHaveProperty('LinkOrPath', 'http://example.com');
    });

    it('should handle errors when creating a new integration module', async () => {
      // Mock the IntegrationModule.save method to throw an error
      IntegrationModule.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/integration-modules')
        .send({
          IntegrationID: '123',
          ToolName: 'Sample Tool',
          Description: 'A sample tool description',
          LinkOrPath: 'http://example.com',
        });

      expect(response.status).toBe(500);
    });
  });
});