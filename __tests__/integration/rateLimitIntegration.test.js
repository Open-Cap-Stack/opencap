/**
 * Rate Limiting Integration Tests
 * [Feature] OCAE-305: Implement API rate limiting
 * 
 * This test file verifies the integration of enhanced API rate limiting functionality
 * in a full Express application context.
 */

const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const {
  rateLimiter,
  authRateLimiter,
  createRouteRateLimit,
  createApiKeyRateLimit,
  createTieredRateLimit,
  createTokenBucketRateLimit,
  includeAdvancedHeaders
} = require('../../middleware/security/rateLimit');

describe('Rate Limiting Integration Tests', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    
    // Apply basic middlewares
    app.use(express.json());
    app.use(includeAdvancedHeaders());
    
    // Setup test routes with different rate limits
    app.use('/api', createRouteRateLimit('api', 5, 60 * 1000));
    app.use('/auth', authRateLimiter);
    
    // Premium route with tiered rate limiting
    app.use('/premium', (req, res, next) => {
      // Extract tier from header for testing
      const tier = req.headers['x-user-tier'] || 'basic';
      const tierLimiter = createTieredRateLimit(tier);
      tierLimiter(req, res, next);
    });
    
    // API key route
    app.use('/apikey', createApiKeyRateLimit(5, 60 * 1000));
    
    // Token bucket route for burst handling
    app.use('/burst', createTokenBucketRateLimit(5, 1));
    
    // Default rate limiter
    app.use(rateLimiter);
    
    // Test routes
    app.get('/api/test', (req, res) => {
      res.status(200).json({ message: 'API route', ip: req.ip });
    });
    
    app.get('/auth/test', (req, res) => {
      res.status(200).json({ message: 'Auth route', ip: req.ip });
    });
    
    app.get('/premium/test', (req, res) => {
      res.status(200).json({ message: 'Premium route', ip: req.ip });
    });
    
    app.get('/apikey/test', (req, res) => {
      res.status(200).json({ message: 'API Key route', ip: req.ip });
    });
    
    app.get('/burst/test', (req, res) => {
      res.status(200).json({ message: 'Burst route', ip: req.ip });
    });
    
    app.get('/test', (req, res) => {
      res.status(200).json({ message: 'Default route', ip: req.ip });
    });
  });
  
  describe('Route-Specific Rate Limiting', () => {
    it('should apply different limits to different routes', async () => {
      const response = await request(app).get('/api/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-limit');
      expect(response.headers).to.have.property('x-ratelimit-remaining');
      expect(parseInt(response.headers['x-ratelimit-limit'])).to.equal(5);
    });
    
    it('should block requests after exceeding route-specific limit', async () => {
      // Make requests until limit exceeded
      for (let i = 0; i < 6; i++) {
        await request(app).get('/api/test');
      }
      
      // The last request should be rate limited
      const response = await request(app).get('/api/test');
      expect(response.status).to.equal(429);
      expect(response.headers).to.have.property('retry-after');
    });
  });
  
  describe('Auth Rate Limiting', () => {
    it('should apply stricter limits to auth routes', async () => {
      const response = await request(app).get('/auth/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-limit');
      expect(parseInt(response.headers['x-ratelimit-limit'])).to.equal(10);
    });
  });
  
  describe('Tiered Rate Limiting', () => {
    it('should apply different limits based on subscription tier', async () => {
      // Test basic tier
      const basicResponse = await request(app)
        .get('/premium/test')
        .set('x-user-tier', 'basic');
      
      expect(basicResponse.status).to.equal(200);
      expect(basicResponse.headers).to.have.property('x-ratelimit-limit');
      const basicLimit = parseInt(basicResponse.headers['x-ratelimit-limit']);
      
      // Test premium tier
      const premiumResponse = await request(app)
        .get('/premium/test')
        .set('x-user-tier', 'premium');
      
      expect(premiumResponse.status).to.equal(200);
      expect(premiumResponse.headers).to.have.property('x-ratelimit-limit');
      const premiumLimit = parseInt(premiumResponse.headers['x-ratelimit-limit']);
      
      // Premium should have higher limit than basic
      expect(premiumLimit).to.be.greaterThan(basicLimit);
    });
  });
  
  describe('API Key Based Rate Limiting', () => {
    it('should track limits by API key rather than IP', async () => {
      // First API key
      const response1 = await request(app)
        .get('/apikey/test')
        .set('x-api-key', 'test-key-1');
      
      expect(response1.status).to.equal(200);
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      
      // Second API key should have full limit despite same IP
      const response2 = await request(app)
        .get('/apikey/test')
        .set('x-api-key', 'test-key-2');
      
      expect(response2.status).to.equal(200);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);
      
      // Second key should have full limit
      expect(remaining2).to.be.greaterThan(remaining1);
    });
  });
  
  describe('Token Bucket for Burst Handling', () => {
    it('should allow burst traffic up to bucket capacity', async () => {
      // Make multiple requests quickly (burst)
      const responses = [];
      for (let i = 0; i < 5; i++) {
        responses.push(await request(app).get('/burst/test'));
      }
      
      // All should succeed despite the burst
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });
      
      // The next one should exceed capacity
      const limitedResponse = await request(app).get('/burst/test');
      expect(limitedResponse.status).to.equal(429);
    });
  });
  
  describe('Advanced Headers', () => {
    it('should include advanced rate limit information in response headers', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-ratelimit-policy');
      expect(response.headers['x-ratelimit-policy']).to.include('docs.opencap.io/rate-limits');
    });
    
    it('should include retry-after header when rate limited', async () => {
      // Make requests until limit exceeded
      for (let i = 0; i < 11; i++) {
        await request(app).get('/auth/test');
      }
      
      // The last request should be rate limited
      const response = await request(app).get('/auth/test');
      expect(response.status).to.equal(429);
      expect(response.headers).to.have.property('retry-after');
      expect(parseInt(response.headers['retry-after'])).to.be.at.least(1);
    });
  });
});
