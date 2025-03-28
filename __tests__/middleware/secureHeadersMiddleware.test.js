/**
 * Secure Headers Middleware Tests
 * [Feature] OCAE-304: Set up secure header configuration
 */

const request = require('supertest');
const express = require('express');
const { expect } = require('chai');

// Import middleware (will be implemented next)
const secureHeaders = require('../../middleware/secureHeadersMiddleware');

describe('Secure Headers Middleware', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    
    // Apply secure headers middleware
    app.use(secureHeaders());
    
    // Add a simple route for testing
    app.get('/test', (req, res) => {
      res.status(200).json({ message: 'Test route' });
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should set content-security-policy header with appropriate directives', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('content-security-policy');
      
      const cspHeader = response.headers['content-security-policy'];
      expect(cspHeader).to.include("default-src 'self'");
      expect(cspHeader).to.include("script-src 'self'");
      expect(cspHeader).to.include("img-src 'self'");
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set x-content-type-options to nosniff', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
    });
  });

  describe('X-Frame-Options', () => {
    it('should set x-frame-options to deny by default', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-frame-options', 'DENY');
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set x-xss-protection to prevent XSS attacks', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('x-xss-protection', '1; mode=block');
    });
  });

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should set strict-transport-security header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('strict-transport-security');
      expect(response.headers['strict-transport-security']).to.include('max-age=');
      expect(response.headers['strict-transport-security']).to.include('includeSubDomains');
    });
  });

  describe('Referrer-Policy', () => {
    it('should set referrer-policy header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('referrer-policy', 'strict-origin-when-cross-origin');
    });
  });

  describe('Custom Configuration', () => {
    it('should allow custom Content-Security-Policy directives', async () => {
      // Create a new app with custom CSP
      const customApp = express();
      customApp.use(secureHeaders({
        contentSecurityPolicy: {
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", 'trusted-cdn.com'],
            'img-src': ["'self'", 'img.example.com'],
          }
        }
      }));
      
      customApp.get('/test', (req, res) => {
        res.status(200).json({ message: 'Test route' });
      });
      
      const response = await request(customApp).get('/test');
      
      expect(response.status).to.equal(200);
      expect(response.headers).to.have.property('content-security-policy');
      
      const cspHeader = response.headers['content-security-policy'];
      expect(cspHeader).to.include("default-src 'self'");
      expect(cspHeader).to.include("script-src 'self' trusted-cdn.com");
      expect(cspHeader).to.include("img-src 'self' img.example.com");
    });
  });
});
