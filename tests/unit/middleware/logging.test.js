/**
 * Logging Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for request/response logging middleware
 * Target coverage: 80%+
 */

// We need to capture the morgan token callbacks when the module loads
let apiVersionTokenFn;
let userIdTokenFn;

// Mock morgan before requiring anything
jest.mock('morgan', () => {
  const mockMorgan = jest.fn((format, options) => {
    return jest.fn((req, res, next) => next && next());
  });

  // Capture token functions
  mockMorgan.token = jest.fn((name, fn) => {
    if (name === 'api-version') apiVersionTokenFn = fn;
    if (name === 'user-id') userIdTokenFn = fn;
  });

  return mockMorgan;
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn()
  }))
}));

const morgan = require('morgan');
const fs = require('fs');

describe('Logging Middleware', () => {
  let getLoggingMiddleware;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Reset modules to re-register tokens
    jest.resetModules();

    // Re-mock morgan with fresh state
    jest.doMock('morgan', () => {
      const mockMorgan = jest.fn((format, options) => {
        return jest.fn((req, res, next) => next && next());
      });

      mockMorgan.token = jest.fn((name, fn) => {
        if (name === 'api-version') apiVersionTokenFn = fn;
        if (name === 'user-id') userIdTokenFn = fn;
      });

      return mockMorgan;
    });

    // Re-require to get fresh instance
    getLoggingMiddleware = require('../../../middleware/logging');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Custom Tokens', () => {
    describe('api-version token', () => {
      it('should return x-api-version header value', () => {
        expect(apiVersionTokenFn).toBeDefined();

        const req = {
          headers: { 'x-api-version': '1.0' }
        };

        expect(apiVersionTokenFn(req)).toBe('1.0');
      });

      it('should return "none" when header is missing', () => {
        const req = { headers: {} };

        expect(apiVersionTokenFn(req)).toBe('none');
      });
    });

    describe('user-id token', () => {
      it('should return user id when authenticated', () => {
        expect(userIdTokenFn).toBeDefined();

        const req = {
          user: { id: 'user123' }
        };

        expect(userIdTokenFn(req)).toBe('user123');
      });

      it('should return "anonymous" when not authenticated', () => {
        const req = {};

        expect(userIdTokenFn(req)).toBe('anonymous');
      });
    });
  });

  describe('Test Environment', () => {
    it('should return skip middleware in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.ENABLE_TEST_LOGS;

      const middleware = getLoggingMiddleware();

      expect(typeof middleware).toBe('function');

      // The middleware should just call next
      const next = jest.fn();
      middleware({}, {}, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Development Environment', () => {
    it('should return morgan middleware in development', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();

      const freshMorgan = require('morgan');
      const freshGetLogging = require('../../../middleware/logging');

      const middleware = freshGetLogging();

      expect(freshMorgan).toHaveBeenCalled();
    });
  });

  describe('Production Environment', () => {
    it('should return array with file and console logging', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      // Fresh fs mock
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => false),
        mkdirSync: jest.fn(),
        createWriteStream: jest.fn(() => ({
          write: jest.fn(),
          end: jest.fn()
        }))
      }));

      const freshGetLogging = require('../../../middleware/logging');
      const middleware = freshGetLogging();

      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBe(2);
    });

    it('should handle production logging setup', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      const freshFs = require('fs');
      const freshGetLogging = require('../../../middleware/logging');
      const middleware = freshGetLogging();

      // Should return array in production
      expect(Array.isArray(middleware)).toBe(true);
    });
  });

  describe('Other Environments', () => {
    it('should return morgan middleware for staging', () => {
      process.env.NODE_ENV = 'staging';
      jest.resetModules();

      const freshMorgan = require('morgan');
      const freshGetLogging = require('../../../middleware/logging');

      freshGetLogging();

      expect(freshMorgan).toHaveBeenCalled();
    });
  });

  describe('Middleware Function', () => {
    it('should be a function that returns middleware', () => {
      expect(typeof getLoggingMiddleware).toBe('function');
    });

    it('should return callable middleware in test mode', () => {
      process.env.NODE_ENV = 'test';

      const middleware = getLoggingMiddleware();

      expect(typeof middleware).toBe('function');
    });
  });
});
