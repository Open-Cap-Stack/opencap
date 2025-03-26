/**
 * API Versioning Tests
 * 
 * [Chore] OCAE-209: Implement API versioning
 * 
 * This file contains tests for the API versioning functionality.
 */

const request = require('supertest');
const express = require('express');
const { addVersionHeaders, createVersionedRoutes, validateApiVersion } = require('../middleware/apiVersioning');

// Create test app with simplified routes for testing versioning
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Apply versioning middleware
  app.use(addVersionHeaders);
  app.use(validateApiVersion);
  
  // Create a sample route handler that always returns 200
  const sampleHandler = (req, res) => {
    res.status(200).json({ message: 'Success' });
  };
  
  // Define routes for testing
  const routes = {
    testRoutes: express.Router().get('/', sampleHandler)
  };
  
  // Define route mappings
  const routeMappings = {
    '/api/test': 'testRoutes'
  };
  
  // Mount routes
  app.use('/api/test', routes.testRoutes);
  
  // Create versioned routes
  createVersionedRoutes(app, routes, routeMappings);
  
  // Add 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
  
  return app;
};

describe('API Versioning', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  describe('Version 1 API routes', () => {
    it('should respond correctly to v1 API route', async () => {
      const response = await request(app).get('/api/v1/test');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });
  });

  describe('Legacy API routes', () => {
    it('should respond correctly to legacy routes', async () => {
      const response = await request(app).get('/api/test');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
    });
  });

  describe('API version headers', () => {
    it('should include API version in response headers for v1 routes', async () => {
      const response = await request(app).get('/api/v1/test');
      
      expect(response.headers['x-api-version']).toBe('1.0');
    });

    it('should include API version in response headers for legacy routes', async () => {
      const response = await request(app).get('/api/test');
      
      expect(response.headers['x-api-version']).toBe('1.0');
    });
  });

  describe('API version middleware', () => {
    it('should reject requests to unsupported API versions', async () => {
      const response = await request(app).get('/api/v999/test');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('API version not supported');
    });
  });
});
