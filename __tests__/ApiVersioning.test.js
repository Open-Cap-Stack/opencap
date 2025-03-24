/**
 * API Versioning Tests
 * 
 * [Chore] OCAE-209: Implement API versioning
 * 
 * This file contains tests for the API versioning functionality.
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

describe('API Versioning', () => {
  // Clean up after tests
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('Version 1 API routes', () => {
    it('should access SPVs through v1 API route', async () => {
      const response = await request(app).get('/api/v1/spvs');
      
      // Expectations will depend on whether data exists, but should at least return 200
      expect(response.status).toBe(200);
    });

    it('should access companies through v1 API route', async () => {
      const response = await request(app).get('/api/v1/companies');
      
      expect(response.status).toBe(200);
    });

    it('should access financial reports through v1 API route', async () => {
      const response = await request(app).get('/api/v1/financial-reports');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Legacy API routes', () => {
    it('should continue to access SPVs through legacy route', async () => {
      const response = await request(app).get('/api/spvs');
      
      expect(response.status).toBe(200);
    });

    it('should continue to access companies through legacy route', async () => {
      const response = await request(app).get('/api/companies');
      
      expect(response.status).toBe(200);
    });

    it('should continue to access financial reports through legacy route', async () => {
      const response = await request(app).get('/api/financial-reports');
      
      expect(response.status).toBe(200);
    });
  });

  describe('API version headers', () => {
    it('should include API version in response headers for v1 routes', async () => {
      const response = await request(app).get('/api/v1/spvs');
      
      expect(response.headers['x-api-version']).toBe('1.0');
    });

    it('should include API version in response headers for legacy routes', async () => {
      const response = await request(app).get('/api/spvs');
      
      expect(response.headers['x-api-version']).toBe('1.0');
    });
  });

  describe('API version middleware', () => {
    it('should reject requests to unsupported API versions', async () => {
      const response = await request(app).get('/api/v999/spvs');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('API version not supported');
    });
  });
});
