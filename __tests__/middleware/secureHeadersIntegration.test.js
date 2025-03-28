/**
 * Secure Headers Integration Tests
 * [Feature] OCAE-304: Set up secure header configuration
 * 
 * These tests verify that secure headers are correctly applied
 * to API responses in the full application context.
 */

const request = require('supertest');
const app = require('../../app');

describe('Secure Headers Integration', () => {
  describe('API Endpoints', () => {
    it('should apply secure headers to API responses', async () => {
      // Make a request to an API endpoint
      const response = await request(app).get('/api/v1/health');
      
      // Check that secure headers are present
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('referrer-policy');
    });
  });

  describe('Static Content', () => {
    it('should apply secure headers to static content', async () => {
      // Make a request to a static file (if any are served)
      const response = await request(app).get('/');
      
      // Check that secure headers are present
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('referrer-policy');
    });
  });

  describe('Error Responses', () => {
    it('should apply secure headers to error responses', async () => {
      // Make a request to a non-existent endpoint to trigger 404
      const response = await request(app).get('/non-existent-endpoint');
      
      // Check that secure headers are present even in error responses
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('referrer-policy');
    });
  });
});
