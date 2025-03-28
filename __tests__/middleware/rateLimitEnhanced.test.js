/**
 * Enhanced Rate Limiting Tests
 * [Feature] OCAE-305: Implement API rate limiting
 * 
 * This test file verifies the enhanced API rate limiting functionality
 * following the Semantic Seed Venture Studio Coding Standards.
 */

const express = require('express');
const request = require('supertest');
const { expect } = require('chai');

// Import rate limiting module
const rateLimitModule = require('../../middleware/security/rateLimit');

describe('Enhanced API Rate Limiting', () => {
  let app;
  
  beforeEach(() => {
    app = express();
  });
  
  describe('Route-Specific Rate Limiting', () => {
    it('should apply different limits to different API routes', async () => {
      // Create a route-specific rate limiter
      const apiLimiter = rateLimitModule.createRouteRateLimit('api', 20, 5 * 60 * 1000);
      
      // Verify it's a function (middleware)
      expect(typeof apiLimiter).to.equal('function');
      
      // Apply the middleware to a test route
      app.use('/api', apiLimiter);
      app.get('/api/test', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      
      // Test route
      const response = await request(app).get('/api/test');
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-limit');
      expect(response.headers).to.have.property('x-ratelimit-remaining');
    });
    
    it('should track limits per route', async () => {
      // Create multiple route limiters
      rateLimitModule.createRouteRateLimit('api', 20, 5 * 60 * 1000);
      rateLimitModule.createRouteRateLimit('admin', 10, 10 * 60 * 1000);
      
      // Get the limits and verify they're tracked correctly
      const limits = rateLimitModule.getRouteLimits();
      
      expect(limits).to.have.property('api');
      expect(limits).to.have.property('admin');
      expect(limits.api.max).to.equal(20);
      expect(limits.admin.max).to.equal(10);
      expect(limits.api.windowMs).to.equal(5 * 60 * 1000);
      expect(limits.admin.windowMs).to.equal(10 * 60 * 1000);
    });
  });
  
  describe('API Key Based Rate Limiting', () => {
    it('should identify requests by API key instead of IP when provided', async () => {
      // Create an API key rate limiter
      const apiKeyLimiter = rateLimitModule.createApiKeyRateLimit(50, 10 * 60 * 1000);
      
      // Apply the middleware to a test route
      app.use('/api', apiKeyLimiter);
      app.get('/api/test', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      
      // Test with API key
      const response = await request(app)
        .get('/api/test')
        .set('x-api-key', 'test-key-1234');
        
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-limit');
      expect(response.headers).to.have.property('x-ratelimit-remaining');
    });
    
    it('should apply different limits to different API keys based on subscription tier', async () => {
      // Create a tiered rate limiter for premium tier
      const premiumLimiter = rateLimitModule.createTieredRateLimit('premium');
      
      // Apply the middleware to a test route
      app.use('/api', premiumLimiter);
      app.get('/api/test', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      
      // Test with API key
      const response = await request(app)
        .get('/api/test')
        .set('x-api-key', 'premium-key-1234');
        
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-limit');
      expect(parseFloat(response.headers['x-ratelimit-limit'])).to.be.at.least(1000); // Premium tier has higher limit
    });
  });
  
  describe('Burst Prevention', () => {
    it('should implement token bucket algorithm for better burst handling', async () => {
      // Create a token bucket rate limiter
      const tokenBucketLimiter = rateLimitModule.createTokenBucketRateLimit(20, 1);
      
      // Apply the middleware to a test route
      app.use('/api', tokenBucketLimiter);
      app.get('/api/test', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      
      // Test route
      const response = await request(app).get('/api/test');
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-limit');
      expect(response.headers).to.have.property('x-ratelimit-remaining');
      expect(response.headers).to.have.property('x-ratelimit-reset');
      
      // Tokens should be reduced after request
      expect(parseFloat(response.headers['x-ratelimit-remaining'])).to.be.lessThan(20);
    });
  });
  
  describe('Advanced Response Headers', () => {
    it('should include advanced rate limit information in response headers', async () => {
      // Create rate limiter with advanced headers
      const advancedHeadersMiddleware = rateLimitModule.includeAdvancedHeaders();
      
      // Setup a test app that will set a rate limit header
      app.use((req, res, next) => {
        // Simulate rateLimit middleware by setting headers
        res.setHeader('x-ratelimit-remaining', '99');
        // Create reset time
        req.rateLimit = {
          resetTime: Date.now() + 900000
        };
        next();
      });
      
      // Then apply the advanced headers middleware
      app.use(advancedHeadersMiddleware);
      
      app.get('/test', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      
      // Test route
      const response = await request(app).get('/test');
      expect(response.status).to.equal(200);
      
      // The policy header should be added
      expect(response.headers).to.have.property('x-ratelimit-policy');
    });
    
    it('should include retry-after header when rate limit is exceeded', async () => {
      // Setup a minimal rate limit middleware for testing
      app.use(rateLimitModule.testRateLimiter);
      
      app.get('/test', (req, res) => {
        res.status(200).json({ message: 'Test route' });
      });
      
      // First request should pass
      await request(app).get('/test');
      
      // Make enough requests to hit the limit
      for (let i = 0; i < 10; i++) {
        await request(app).get('/test');
      }
      
      // This should exceed the limit
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(429);
      expect(response.headers).to.have.property('retry-after');
    });
  });
  
  describe('Configuration Management', () => {
    it('should support dynamic configuration updates', async () => {
      // Create an initial route limiter
      rateLimitModule.createRouteRateLimit('api', 20, 5 * 60 * 1000);
      
      // Get initial configuration
      const initialLimits = rateLimitModule.getRouteLimits();
      expect(initialLimits.api.max).to.equal(20);
      
      // Update the configuration
      const result = rateLimitModule.updateRateLimitConfig('api', { max: 200 });
      expect(result).to.be.true;
      
      // Get updated configuration
      const updatedLimits = rateLimitModule.getRouteLimits();
      expect(updatedLimits.api.max).to.equal(200);
    });
  });
});
