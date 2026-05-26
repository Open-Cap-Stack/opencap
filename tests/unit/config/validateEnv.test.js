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

    it('should throw when JWT_SECRET is empty string', () => {
      process.env.JWT_SECRET = '   ';
      process.env.ZERODB_API_KEY = 'valid-key';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('JWT_SECRET is set but empty');
    });

    it('should throw when JWT_SECRET is the default test-secret value', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.ZERODB_API_KEY = 'valid-key';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('JWT_SECRET must be changed from default/placeholder value in production');
    });

    it('should throw when JWT_SECRET is a common placeholder value', () => {
      process.env.JWT_SECRET = 'your-secret-key';
      process.env.ZERODB_API_KEY = 'valid-key';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('JWT_SECRET must be changed from default/placeholder value in production');
    });

    it('should throw when JWT_SECRET is shorter than 32 characters', () => {
      process.env.JWT_SECRET = 'short-but-not-placeholder-val';
      process.env.ZERODB_API_KEY = 'valid-key';

      expect(() => validateEnvironment()).toThrow('Environment validation failed');
      expect(() => validateEnvironment()).toThrow('JWT_SECRET must be at least 32 characters');
    });

    it('should not throw when JWT_SECRET is 32+ characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
      process.env.ZERODB_API_KEY = 'valid-key';
      process.env.PLUGIN_CLIENT_ID = 'test-client-id';
      process.env.PLUGIN_CLIENT_SECRET = 'test-client-secret';
      process.env.PLUGIN_REDIRECT_URI = 'https://example.com/callback';
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      const result = validateEnvironment();
      expect(result.errors).toHaveLength(0);
    });

    it('should throw when neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set', () => {
      process.env.JWT_SECRET = 'a]3kF9!mZ#qR7wL$2pX8nC&5vB0jT*6d';
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
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      process.env.JWT_REFRESH_SECRET = 'r1e2f3r4e5s6h7s8e9c0r1e2t3k4e5y6';
      process.env.ZERODB_API_KEY = 'valid-zerodb-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      process.env.PLUGIN_CLIENT_ID = 'test-client-id';
      process.env.PLUGIN_CLIENT_SECRET = 'test-client-secret';
      process.env.PLUGIN_REDIRECT_URI = 'https://example.com/callback';
      process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

      const result = validateEnvironment();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not throw when all required vars are properly set with AINATIVE_API_TOKEN', () => {
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      process.env.JWT_REFRESH_SECRET = 'r1e2f3r4e5s6h7s8e9c0r1e2t3k4e5y6';
      process.env.AINATIVE_API_TOKEN = 'valid-ainative-token';
      process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      process.env.PLUGIN_CLIENT_ID = 'test-client-id';
      process.env.PLUGIN_CLIENT_SECRET = 'test-client-secret';
      process.env.PLUGIN_REDIRECT_URI = 'https://example.com/callback';
      process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      delete process.env.ZERODB_API_KEY;

      const result = validateEnvironment();
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should throw when only some PLUGIN_* vars are set in production', () => {
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      process.env.JWT_REFRESH_SECRET = 'r1e2f3r4e5s6h7s8e9c0r1e2t3k4e5y6';
      process.env.ZERODB_API_KEY = 'valid-zerodb-key';
      process.env.PLUGIN_CLIENT_ID = 'test-client-id';
      // Missing PLUGIN_CLIENT_SECRET and PLUGIN_REDIRECT_URI

      expect(() => validateEnvironment()).toThrow('PLUGIN_CLIENT_SECRET is not set');
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
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      delete process.env.ZERODB_API_KEY;
      delete process.env.AINATIVE_API_TOKEN;

      const result = validateEnvironment();
      expect(result.warnings).toContain('Neither ZERODB_API_KEY nor AINATIVE_API_TOKEN is set');
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when JWT_SECRET is too short in development', () => {
      process.env.JWT_SECRET = 'dev-secret';
      process.env.ZERODB_API_KEY = 'dev-key';

      const result = validateEnvironment();
      expect(result.warnings.some(w => w.includes('JWT_SECRET must be at least 32 characters'))).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should not warn when all vars are set with sufficient length', () => {
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      process.env.JWT_REFRESH_SECRET = 'r1e2f3r4e5s6h7s8e9c0r1e2t3k4e5y6';
      process.env.ZERODB_API_KEY = 'dev-key';
      process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
      process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

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
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      process.env.ZERODB_API_KEY = 'some-key';

      const result = validateEnvironment();
      expect(result.warnings).toContain('NODE_ENV is not explicitly set (defaulting to development behavior)');
    });

    it('should not warn about NODE_ENV when it is explicitly set', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
      process.env.ZERODB_API_KEY = 'some-key';

      const result = validateEnvironment();
      expect(result.warnings).not.toContain('NODE_ENV is not explicitly set (defaulting to development behavior)');
    });
  });
});
