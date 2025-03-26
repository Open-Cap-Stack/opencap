/**
 * Test suite for Swagger documentation middleware
 * Feature: OCAE-210: Create comprehensive Swagger documentation
 * 
 * This test suite verifies that the Swagger documentation is properly
 * configured and accessible via API endpoints.
 */
const request = require('supertest');
const mockApp = require('./mockApp');
const swaggerMiddleware = require('../../middleware/swaggerDocs');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Setup swagger on the mock app for testing
swaggerMiddleware.setupSwagger(mockApp);

describe('Swagger Documentation Middleware', () => {
  describe('Configuration', () => {
    it('should have valid Swagger configuration object', () => {
      expect(swaggerMiddleware.swaggerSpec).toBeDefined();
      expect(swaggerMiddleware.swaggerSpec.openapi).toBe('3.0.0');
      expect(swaggerMiddleware.swaggerSpec.info).toBeDefined();
      expect(swaggerMiddleware.swaggerSpec.info.title).toBe('OpenCap API Documentation');
    });

    it('should include all main API paths', () => {
      const spec = swaggerMiddleware.swaggerSpec;
      expect(spec.paths).toBeDefined();
      
      // Check for essential API paths
      const paths = Object.keys(spec.paths);
      expect(paths.some(path => path.includes('/auth/login'))).toBe(true);
      expect(paths.some(path => path.includes('/auth/register'))).toBe(true);
      expect(paths.some(path => path.includes('/api/spvs'))).toBe(true);
      expect(paths.some(path => path.includes('/api/documents'))).toBe(true);
    });

    it('should define common response schemas', () => {
      const spec = swaggerMiddleware.swaggerSpec;
      expect(spec.components).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
      expect(spec.components.schemas.Error).toBeDefined();
      expect(spec.components.responses).toBeDefined();
      expect(spec.components.responses.NotFound).toBeDefined();
      expect(spec.components.responses.Unauthorized).toBeDefined();
    });
    
    it('should create the swagger docs directory if it does not exist', () => {
      // Create a mock implementation of fs.existsSync and fs.mkdirSync to test directory creation
      const originalExistsSync = fs.existsSync;
      const originalMkdirSync = fs.mkdirSync;
      const originalWriteFileSync = fs.writeFileSync;
      
      const mockPath = path.join(__dirname, '../../docs/swagger-test');
      
      try {
        // Mock fs functions to test directory creation branch
        fs.existsSync = jest.fn().mockReturnValue(false);
        fs.mkdirSync = jest.fn();
        fs.writeFileSync = jest.fn();
        
        // Re-require the module to trigger directory creation code
        jest.resetModules();
        const freshSwaggerMiddleware = require('../../middleware/swaggerDocs');
        
        // Verify that mkdirSync was called
        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
      } finally {
        // Restore original fs functions
        fs.existsSync = originalExistsSync;
        fs.mkdirSync = originalMkdirSync;
        fs.writeFileSync = originalWriteFileSync;
      }
    });
  });

  describe('API Endpoints', () => {
    it('should register Swagger UI middleware route', () => {
      // Check that the middleware was registered
      const swaggerUiMiddleware = mockApp.middlewares.find(
        middleware => middleware[0] === '/api-docs'
      );
      expect(swaggerUiMiddleware).toBeDefined();
    });
    
    it('should register Swagger JSON endpoint', () => {
      // Check that the JSON endpoint was registered
      const swaggerJsonRoute = mockApp.routes.find(
        route => route.path === '/api-docs.json' && route.method === 'GET'
      );
      expect(swaggerJsonRoute).toBeDefined();
    });
    
    it('should handle null app gracefully', () => {
      // Create a spy to track console.error calls
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call setupSwagger with null app
      swaggerMiddleware.setupSwagger(null);
      
      // Verify error was logged
      expect(errorSpy).toHaveBeenCalledWith('Express app instance is required to setup Swagger');
      
      // Restore original console.error
      errorSpy.mockRestore();
    });
    
    it('should handle JSON endpoint response correctly', () => {
      // Create a mini Express app to test the endpoint handler directly
      const miniApp = express();
      swaggerMiddleware.setupSwagger(miniApp);
      
      // Find the registered route handler for the JSON endpoint
      const route = mockApp.routes.find(
        route => route.path === '/api-docs.json' && route.method === 'GET'
      );
      const handler = route.handlers[0];
      
      // Mock req and res objects
      const req = {};
      const res = {
        setHeader: jest.fn(),
        send: jest.fn()
      };
      
      // Call the handler directly
      handler(req, res);
      
      // Verify the response was set up correctly
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.send).toHaveBeenCalledWith(swaggerMiddleware.swaggerSpec);
    });
  });

  describe('Security Definitions', () => {
    it('should include authentication security scheme', () => {
      const spec = swaggerMiddleware.swaggerSpec;
      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    });
  });
});
