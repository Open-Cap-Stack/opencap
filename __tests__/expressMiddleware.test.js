// __tests__/expressMiddleware.test.js
/**
 * Test file for OCAE-201: Set up Express server with middleware
 * 
 * This file tests the proper configuration of essential Express middleware including:
 * - Security (helmet)
 * - CORS handling
 * - Rate limiting
 * - Body parsing (JSON and URL-encoded)
 * - Request logging (morgan)
 * - Compression
 * - Cookie parsing
 */

const request = require('supertest');
const express = require('express');
// Set up test environment for middleware tests
require('./setup/middleware-test-env');
const app = require('../app');

describe('Express Server Middleware Configuration', () => {
  
  describe('Security Middleware', () => {
    it('should have helmet middleware configured', async () => {
      const response = await request(app).get('/api');
      
      // Helmet sets various security headers
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
    
    it('should have content security policy headers', async () => {
      const response = await request(app).get('/api');
      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });
  
  describe('CORS Middleware', () => {
    it('should have CORS headers configured', async () => {
      const response = await request(app)
        .options('/api')
        .set('Origin', 'http://example.com');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
    
    it('should allow specified HTTP methods', async () => {
      const response = await request(app)
        .options('/api')
        .set('Origin', 'http://example.com');
      
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
    });
  });
  
  describe('Rate Limiting Middleware', () => {
    it('should have rate limiting headers', async () => {
      const response = await request(app).get('/api/rate-limit-test');
      
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
    
    it('should enforce rate limits after multiple requests', async () => {
      // For test environment, adjust to ensure this doesn't take too long
      const requestPromises = [];
      const numRequests = 7; // Testing endpoint has a limit of 5
      
      for (let i = 0; i < numRequests; i++) {
        requestPromises.push(request(app).get('/api/rate-limit-test'));
      }
      
      const responses = await Promise.all(requestPromises);
      const tooManyRequestsCount = responses.filter(res => res.status === 429).length;
      
      // Should have at least one 429 Too Many Requests response
      expect(tooManyRequestsCount).toBeGreaterThan(0);
    });
  });
  
  describe('Body Parsing Middleware', () => {
    it('should parse JSON bodies correctly', async () => {
      const testData = { name: 'Test User', email: 'test@example.com' };
      
      const response = await request(app)
        .post('/api/test-body-parser')
        .send(testData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('receivedData');
      expect(response.body.receivedData).toMatchObject(testData);
    });
    
    it('should parse URL-encoded bodies correctly', async () => {
      const response = await request(app)
        .post('/api/test-body-parser')
        .type('form')
        .send({ name: 'Test User', email: 'test@example.com' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('receivedData');
      expect(response.body.receivedData).toHaveProperty('name', 'Test User');
    });
  });
  
  describe('Compression Middleware', () => {
    it('should have compression middleware enabled', async () => {
      const response = await request(app)
        .get('/api/test-compression')
        .set('Accept-Encoding', 'gzip');
      
      expect(response.headers).toHaveProperty('content-encoding', 'gzip');
    });
  });
  
  describe('Cookie Parsing Middleware', () => {
    it('should parse cookies correctly', async () => {
      const response = await request(app)
        .get('/api/test-cookie-parser')
        .set('Cookie', 'testCookie=cookieValue');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cookies');
      expect(response.body.cookies).toHaveProperty('testCookie', 'cookieValue');
    });
  });
  
  describe('Request Logging Middleware', () => {
    // This is hard to test directly, but we can check that the middleware is registered
    it('should have morgan middleware configured', () => {
      const morganMiddleware = app._router.stack.some(layer => 
        layer.name === 'logger' || 
        (layer.handle && layer.handle.name === 'logger') ||
        (layer.handle && layer.handle.toString().includes('morgan'))
      );
      
      expect(morganMiddleware).toBe(true);
    });
  });
});
