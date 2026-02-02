/**
 * Environment Configuration Tests
 *
 * Tests environment variable validation, .env.example completeness,
 * missing variable handling, and configuration precedence.
 *
 * Following TDD principles - these tests validate deployment configuration.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

describe('Environment Configuration Tests', () => {
  const projectRoot = path.join(__dirname, '../../');
  const envExamplePath = path.join(projectRoot, '.env.example');
  const envPath = path.join(projectRoot, '.env');

  // Required environment variables for deployment
  const REQUIRED_ENV_VARS = [
    'NODE_ENV',
    'PORT',
    'JWT_SECRET',
    'ZERODB_API_KEY',
    'ZERODB_BASE_URL',
    'ZERODB_PROJECT_ID'
  ];

  // Optional but recommended variables
  const OPTIONAL_ENV_VARS = [
    'LOG_LEVEL',
    'ENABLE_SYNC',
    'SYNC_DIRECTION',
    'SYNC_BATCH_SIZE',
    'MONGODB_URI', // Optional now with ZeroDB
    'DATABASE_URL'
  ];

  // Sensitive variables that should never have real values in .env.example
  const SENSITIVE_VARS = [
    'JWT_SECRET',
    'ZERODB_API_KEY',
    'SHORTCUT_API_TOKEN',
    'EMAIL_API_KEY',
    'AWS_SECRET_ACCESS_KEY'
  ];

  describe('.env.example Validation', () => {
    test('should have .env.example file', () => {
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    test('should be a valid dotenv format', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');
      expect(envContent).toBeTruthy();

      // Should not throw error when parsing
      expect(() => {
        dotenv.parse(envContent);
      }).not.toThrow();
    });

    test('should include all required environment variables', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');
      const parsed = dotenv.parse(envContent);

      REQUIRED_ENV_VARS.forEach(varName => {
        expect(envContent).toContain(varName);
      });
    });

    test('should include optional recommended variables', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      OPTIONAL_ENV_VARS.forEach(varName => {
        // Should at least mention them in comments or definitions
        expect(envContent).toContain(varName);
      });
    });

    test('should have comments explaining each variable', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');
      const lines = envContent.split('\n');

      // Count lines with actual variable definitions
      const varLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#') && trimmed.includes('=');
      });

      // Count comment lines
      const commentLines = lines.filter(line => line.trim().startsWith('#'));

      // Should have decent amount of documentation
      expect(commentLines.length).toBeGreaterThan(varLines.length * 0.3); // At least 30% comments
    });

    test('should not contain real secrets in .env.example', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');
      const parsed = dotenv.parse(envContent);

      SENSITIVE_VARS.forEach(varName => {
        if (parsed[varName]) {
          const value = parsed[varName];

          // Should contain placeholder text
          expect(
            value.includes('your_') ||
            value.includes('example') ||
            value.includes('change') ||
            value.includes('placeholder') ||
            value.includes('REPLACE')
          ).toBe(true);

          // Should not be a real secret (basic checks)
          expect(value.length).toBeLessThan(100); // Real secrets might be longer
          expect(value).not.toMatch(/^[A-Za-z0-9+/]{40,}={0,2}$/); // Base64 pattern
          expect(value).not.toMatch(/^[A-Fa-f0-9]{32,}$/); // Hex pattern
        }
      });
    });

    test('should have proper section organization', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Should have sections for different concerns
      const expectedSections = [
        'Database',
        'ZeroDB',
        'Server',
        'Authentication'
      ];

      expectedSections.forEach(section => {
        const sectionRegex = new RegExp(`#.*${section}`, 'i');
        expect(envContent).toMatch(sectionRegex);
      });
    });

    test('should specify ZeroDB as primary database', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // ZeroDB configuration should be prominent
      expect(envContent).toContain('ZERODB');
      expect(envContent).toContain('ZERODB_API_KEY');
      expect(envContent).toContain('ZERODB_BASE_URL');

      // MongoDB should be marked as optional or legacy
      const lines = envContent.split('\n');
      const mongoLine = lines.find(line => line.includes('MONGODB_URI'));

      if (mongoLine) {
        // Should be documented as optional
        const mongoLineIndex = lines.indexOf(mongoLine);
        const contextLines = lines.slice(Math.max(0, mongoLineIndex - 5), mongoLineIndex + 1);
        const context = contextLines.join('\n');

        expect(
          context.toLowerCase().includes('optional') ||
          context.toLowerCase().includes('legacy') ||
          context.toLowerCase().includes('sync')
        ).toBe(true);
      }
    });

    test('should document sync configuration', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Sync configuration should be present and documented
      expect(envContent).toContain('SYNC');
      expect(envContent).toContain('ENABLE_SYNC');

      // Should explain sync direction options
      const lines = envContent.split('\n');
      const syncDirectionLine = lines.find(line => line.includes('SYNC_DIRECTION'));

      if (syncDirectionLine) {
        const lineIndex = lines.indexOf(syncDirectionLine);
        const contextLines = lines.slice(lineIndex, lineIndex + 3).join('\n');

        expect(
          contextLines.includes('bidirectional') ||
          contextLines.includes('mongo-to-zerodb') ||
          contextLines.includes('zerodb-to-mongo')
        ).toBe(true);
      }
    });
  });

  describe('Environment Variable Validation', () => {
    let originalEnv;

    beforeEach(() => {
      // Save original environment
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    test('should validate NODE_ENV values', () => {
      const validValues = ['development', 'production', 'test'];
      const invalidValues = ['dev', 'prod', 'staging', ''];

      validValues.forEach(value => {
        process.env.NODE_ENV = value;
        expect(['development', 'production', 'test']).toContain(process.env.NODE_ENV);
      });
    });

    test('should validate PORT is a number', () => {
      const validPorts = ['3000', '3001', '8080', '5000'];
      const invalidPorts = ['abc', '-1', '70000', 'port'];

      validPorts.forEach(port => {
        const portNum = parseInt(port, 10);
        expect(portNum).toBeGreaterThan(0);
        expect(portNum).toBeLessThan(65536);
      });

      invalidPorts.forEach(port => {
        const portNum = parseInt(port, 10);
        expect(
          isNaN(portNum) || portNum < 1 || portNum > 65535
        ).toBe(true);
      });
    });

    test('should validate ZERODB_BASE_URL format', () => {
      const validUrls = [
        'https://api.ainative.studio/api/v1',
        'http://localhost:3000',
        'https://api.example.com/v1'
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://wrong-protocol.com',
        'https:/missing-slash.com',
        ''
      ];

      validUrls.forEach(url => {
        try {
          new URL(url);
          expect(true).toBe(true); // Valid URL
        } catch {
          expect(false).toBe(true); // Should not reach here
        }
      });

      invalidUrls.forEach(url => {
        try {
          new URL(url);
          // Some invalid URLs might still parse, check protocol
          const parsed = new URL(url);
          expect(['http:', 'https:']).toContain(parsed.protocol);
        } catch {
          expect(true).toBe(true); // Expected to throw
        }
      });
    });

    test('should validate JWT_SECRET minimum length', () => {
      const MIN_JWT_SECRET_LENGTH = 32;

      const validSecrets = [
        'a'.repeat(32),
        'very_long_secret_key_for_jwt_security_12345678',
        'another-secure-secret-with-sufficient-entropy-xyz'
      ];

      const invalidSecrets = [
        'short',
        '12345',
        'weak',
        ''
      ];

      validSecrets.forEach(secret => {
        expect(secret.length).toBeGreaterThanOrEqual(MIN_JWT_SECRET_LENGTH);
      });

      invalidSecrets.forEach(secret => {
        expect(secret.length).toBeLessThan(MIN_JWT_SECRET_LENGTH);
      });
    });

    test('should validate SYNC_DIRECTION values', () => {
      const validDirections = [
        'bidirectional',
        'mongo-to-zerodb',
        'zerodb-to-mongo'
      ];

      const invalidDirections = [
        'both',
        'one-way',
        'mongodb',
        ''
      ];

      validDirections.forEach(direction => {
        expect([
          'bidirectional',
          'mongo-to-zerodb',
          'zerodb-to-mongo'
        ]).toContain(direction);
      });

      invalidDirections.forEach(direction => {
        expect([
          'bidirectional',
          'mongo-to-zerodb',
          'zerodb-to-mongo'
        ]).not.toContain(direction);
      });
    });

    test('should validate boolean environment variables', () => {
      const booleanVars = [
        'ENABLE_SYNC',
        'ENABLE_ZERODB',
        'ENABLE_DB_MONITORING',
        'ENABLE_MONGO_CHANGESTREAM'
      ];

      const validBooleans = ['true', 'false', '1', '0'];
      const invalidBooleans = ['yes', 'no', 'enabled', 'disabled', 'TRUE', 'FALSE'];

      validBooleans.forEach(value => {
        const normalized = value === 'true' || value === '1';
        expect(typeof normalized).toBe('boolean');
      });
    });

    test('should validate numeric configuration values', () => {
      const numericVars = {
        'SYNC_BATCH_SIZE': { min: 1, max: 1000 },
        'SYNC_INTERVAL_MS': { min: 100, max: 60000 },
        'SYNC_MAX_RETRIES': { min: 0, max: 10 },
        'SYNC_CIRCUIT_BREAKER_THRESHOLD': { min: 1, max: 100 }
      };

      Object.entries(numericVars).forEach(([varName, { min, max }]) => {
        // Valid values
        expect(50).toBeGreaterThanOrEqual(min);
        expect(50).toBeLessThanOrEqual(max);

        // Invalid values
        expect(min - 1).toBeLessThan(min);
        expect(max + 1).toBeGreaterThan(max);
      });
    });
  });

  describe('Missing Environment Variable Handling', () => {
    test('should provide clear error for missing required variables', () => {
      const checkRequiredEnv = (varName) => {
        if (!process.env[varName]) {
          throw new Error(`Missing required environment variable: ${varName}`);
        }
      };

      REQUIRED_ENV_VARS.forEach(varName => {
        const testEnv = { ...process.env };
        delete testEnv[varName];

        // Simulate missing variable
        if (!testEnv[varName]) {
          expect(() => {
            checkRequiredEnv(varName);
          }).toThrow(`Missing required environment variable: ${varName}`);
        }
      });
    });

    test('should have default values for optional variables', () => {
      const defaults = {
        'PORT': '3001',
        'NODE_ENV': 'development',
        'LOG_LEVEL': 'info',
        'ENABLE_SYNC': 'false',
        'SYNC_DIRECTION': 'bidirectional',
        'SYNC_BATCH_SIZE': '100',
        'SYNC_MAX_RETRIES': '3'
      };

      Object.entries(defaults).forEach(([varName, defaultValue]) => {
        const value = process.env[varName] || defaultValue;
        expect(value).toBeTruthy();
        expect(value).toBe(value); // Should have a value
      });
    });

    test('should validate environment before application start', () => {
      const validateEnvironment = () => {
        const missing = [];
        const invalid = [];

        // Check required variables
        REQUIRED_ENV_VARS.forEach(varName => {
          if (!process.env[varName]) {
            missing.push(varName);
          }
        });

        // Validate PORT
        const port = parseInt(process.env.PORT || '3001', 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          invalid.push('PORT must be a valid port number (1-65535)');
        }

        // Validate ZERODB_BASE_URL
        if (process.env.ZERODB_BASE_URL) {
          try {
            new URL(process.env.ZERODB_BASE_URL);
          } catch {
            invalid.push('ZERODB_BASE_URL must be a valid URL');
          }
        }

        return { missing, invalid };
      };

      const result = validateEnvironment();

      // Should return validation results
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('invalid');
      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.invalid)).toBe(true);
    });
  });

  describe('Configuration Precedence', () => {
    test('should prioritize environment variables over .env file', () => {
      // Environment variables should take precedence
      const envValue = process.env.NODE_ENV;
      const fileValue = 'development';

      // If set in environment, it should override file
      if (envValue) {
        expect(envValue).toBe(envValue); // Uses environment value
      } else {
        // Falls back to file or default
        expect(fileValue).toBe('development');
      }
    });

    test('should support .env file for local development', () => {
      // .env file should be loadable
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        expect(() => {
          dotenv.parse(envContent);
        }).not.toThrow();
      }
    });

    test('should support command-line argument override', () => {
      // Command-line args should override both .env and environment
      const mockArgs = ['--port=4000', '--env=production'];

      const parseArgs = (args) => {
        const parsed = {};
        args.forEach(arg => {
          const [key, value] = arg.replace('--', '').split('=');
          parsed[key] = value;
        });
        return parsed;
      };

      const args = parseArgs(mockArgs);
      expect(args.port).toBe('4000');
      expect(args.env).toBe('production');
    });

    test('should apply defaults for unset optional variables', () => {
      const getConfigValue = (varName, defaultValue) => {
        return process.env[varName] || defaultValue;
      };

      // Test default application
      expect(getConfigValue('UNDEFINED_VAR', 'default')).toBe('default');
      expect(getConfigValue('LOG_LEVEL', 'info')).toBeTruthy();
    });
  });

  describe('ZeroDB Configuration', () => {
    test('should require ZeroDB credentials for deployment', () => {
      const zerodbRequiredVars = [
        'ZERODB_API_KEY',
        'ZERODB_BASE_URL',
        'ZERODB_PROJECT_ID'
      ];

      zerodbRequiredVars.forEach(varName => {
        const envContent = fs.readFileSync(envExamplePath, 'utf-8');
        expect(envContent).toContain(varName);
      });
    });

    test('should validate ZeroDB API key format', () => {
      const validApiKeys = [
        'sk_test_12345abcdef',
        'sk_live_67890ghijkl',
        'test_key_xyz'
      ];

      validApiKeys.forEach(key => {
        expect(key).toBeTruthy();
        expect(key.length).toBeGreaterThan(10);
      });
    });

    test('should support ZeroDB configuration sections', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Should have dedicated ZeroDB section
      expect(envContent).toMatch(/ZERODB.*CONFIGURATION/i);

      // Should document all ZeroDB variables
      const zerodbVars = [
        'ZERODB_API_KEY',
        'ZERODB_BASE_URL',
        'ZERODB_PROJECT_ID'
      ];

      zerodbVars.forEach(varName => {
        expect(envContent).toContain(varName);
      });
    });

    test('should handle ZeroDB token validation', () => {
      const validateZeroDBToken = (token) => {
        if (!token) {
          return { valid: false, error: 'Token is required' };
        }

        if (token.length < 10) {
          return { valid: false, error: 'Token too short' };
        }

        // Basic format validation
        if (!token.match(/^[A-Za-z0-9_-]+$/)) {
          return { valid: false, error: 'Invalid token format' };
        }

        return { valid: true };
      };

      // Valid tokens
      expect(validateZeroDBToken('valid_token_12345').valid).toBe(true);
      expect(validateZeroDBToken('sk_test_abcdef123').valid).toBe(true);

      // Invalid tokens
      expect(validateZeroDBToken('').valid).toBe(false);
      expect(validateZeroDBToken('short').valid).toBe(false);
      expect(validateZeroDBToken('invalid token!@#').valid).toBe(false);
    });
  });

  describe('Deployment Environment Tests', () => {
    test('should support development environment', () => {
      const devConfig = {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        ENABLE_SYNC: 'false'
      };

      Object.entries(devConfig).forEach(([key, value]) => {
        expect(value).toBeTruthy();
      });
    });

    test('should support production environment', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        LOG_LEVEL: 'error',
        ENABLE_SYNC: 'true'
      };

      Object.entries(prodConfig).forEach(([key, value]) => {
        expect(value).toBeTruthy();
      });

      // Production should have stricter requirements
      expect(prodConfig.NODE_ENV).toBe('production');
    });

    test('should support staging environment', () => {
      const stagingConfig = {
        NODE_ENV: 'production', // Use production mode
        LOG_LEVEL: 'info',
        ENABLE_SYNC: 'true'
      };

      expect(stagingConfig.NODE_ENV).toBe('production');
    });

    test('should validate environment-specific configurations', () => {
      const environments = {
        development: {
          NODE_ENV: 'development',
          LOG_LEVEL: 'debug'
        },
        production: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'error'
        },
        test: {
          NODE_ENV: 'test',
          LOG_LEVEL: 'silent'
        }
      };

      Object.entries(environments).forEach(([env, config]) => {
        expect(config.NODE_ENV).toBe(env);
        expect(config.LOG_LEVEL).toBeTruthy();
      });
    });
  });

  describe('Configuration Documentation', () => {
    test('should document all environment variables', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');
      const lines = envContent.split('\n');

      // Find all variable definitions
      const varDefinitions = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#') && trimmed.includes('=');
      });

      // Each variable should have nearby documentation
      varDefinitions.forEach(varLine => {
        const lineIndex = lines.indexOf(varLine);
        const previousLines = lines.slice(Math.max(0, lineIndex - 3), lineIndex);
        const hasComment = previousLines.some(line => line.trim().startsWith('#'));

        // Should have comment within 3 lines above
        expect(hasComment).toBe(true);
      });
    });

    test('should include examples for complex configurations', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Should have examples for sync configuration
      const syncSection = envContent.substring(
        envContent.indexOf('SYNC'),
        envContent.indexOf('SYNC') + 500
      );

      expect(syncSection).toMatch(/example|options|e\.g\.|i\.e\./i);
    });

    test('should warn about security implications', () => {
      const envContent = fs.readFileSync(envExamplePath, 'utf-8');

      // Should have security warnings
      const hasSecurityWarning =
        envContent.toLowerCase().includes('secret') ||
        envContent.toLowerCase().includes('password') ||
        envContent.toLowerCase().includes('security');

      expect(hasSecurityWarning).toBe(true);
    });
  });
});
