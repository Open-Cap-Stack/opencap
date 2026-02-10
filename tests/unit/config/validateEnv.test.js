/**
 * Tests for config/validateEnv.js
 *
 * Verifies environment variable validation logic for different environments.
 * GitHub Issue #355
 */

const { validateEnvironment } = require('../../../config/validateEnv');

describe('validateEnvironment', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should throw when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      process.env.ZERODB_API_KEY = 'valid-key';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('JWT_SECRET is not set');
    });

    it('should throw when JWT_SECRET is the default test-secret value', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.ZERODB_API_KEY = 'valid-key';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('JWT_SECRET must be changed from default value in production');
    });

    it('should throw when neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set', () => {
      process.env.JWT_SECRET = 'secure-production-secret';
      delete process.env.ZERODB_API_KEY;
      delete process.env.AINATIVE_API_TOKEN;

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('Neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set');
    });

    it('should throw with multiple errors when multiple validations fail', () => {
      delete process.env.JWT_SECRET;
      delete process.env.ZERODB_API_KEY;
      delete process.env.AINATIVE_API_TOKEN;

      expect(() => validateEnvironment()).toThrow('JWT_SECRET is not set');
    });

    it('should not throw when all required vars are properly set with ZERODB_API_KEY', () => {
      process.env.JWT_SECRET = 'secure-production-secret';
      process.env.ZERODB_API_KEY = 'valid-zerodb-key';

      const result = validateEnvironment();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not throw when all required vars are properly set with AINATIVE_API_TOKEN', () => {
      process.env.JWT_SECRET = 'secure-production-secret';
      process.env.AINATIVE_API_TOKEN = 'valid-ainative-token';
      delete process.env.ZERODB_API_KEY;

      const result = validateEnvironment();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return warnings but not throw when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.ZERODB_API_KEY;
      delete process.env.AINATIVE_API_TOKEN;

      const result = validateEnvironment();
      expect(result.warnings).toContain('JWT_SECRET is not set');
      expect(result.errors).toHaveLength(0);
    });

    it('should return warnings but not throw when ZeroDB credentials are missing', () => {
      process.env.JWT_SECRET = 'dev-secret';
      delete process.env.ZERODB_API_KEY;
      delete process.env.AINATIVE_API_TOKEN;

      const result = validateEnvironment();
      expect(result.warnings).toContain('Neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set');
      expect(result.errors).toHaveLength(0);
    });

    it('should not warn when all vars are set', () => {
      process.env.JWT_SECRET = 'dev-secret';
      process.env.ZERODB_API_KEY = 'dev-key';

      const result = validateEnvironment();
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('test environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should return warnings but not throw when vars are missing', () => {
      delete process.env.JWT_SECRET;
      delete process.env.ZERODB_API_KEY;
      delete process.env.AINATIVE_API_TOKEN;

      const result = validateEnvironment();
      expect(result.warnings).toContain('JWT_SECRET is not set');
      expect(result.warnings).toContain('Neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('NODE_ENV validation', () => {
    it('should warn when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      process.env.JWT_SECRET = 'some-secret';
      process.env.ZERODB_API_KEY = 'some-key';

      const result = validateEnvironment();
      expect(result.warnings).toContain('NODE_ENV is not explicitly set (defaulting to development behavior)');
    });

    it('should not warn about NODE_ENV when it is explicitly set', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'some-secret';
      process.env.ZERODB_API_KEY = 'some-key';

      const result = validateEnvironment();
      expect(result.warnings).not.toContain('NODE_ENV is not explicitly set (defaulting to development behavior)');
    });
  });
});
