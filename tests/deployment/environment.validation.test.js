/**
 * Environment Configuration Validation Tests
 *
 * These tests validate that environment variable configurations
 * are properly set up for ZeroDB-only deployment without MongoDB.
 *
 * Test Coverage:
 * - .env.example has no MongoDB variables
 * - ZeroDB variables are properly documented
 * - Required environment variables are present
 * - Sync configuration references are removed
 */

const fs = require('fs');
const path = require('path');

describe('Environment Configuration Validation', () => {
  const envExamplePath = path.resolve(__dirname, '../../.env.example');
  let envContent;
  let envLines;

  beforeAll(() => {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
    envLines = envContent.split('\n');
  });

  describe('.env.example validation', () => {
    test('should exist and be readable', () => {
      expect(envContent).toBeDefined();
      expect(envContent.length).toBeGreaterThan(0);
    });

    test('should not contain MONGODB_URI variable', () => {
      const hasMongoUri = envLines.some(line =>
        line.trim().startsWith('MONGODB_URI=')
      );
      expect(hasMongoUri).toBe(false);
    });

    test('should not contain MONGODB_URI_TEST variable', () => {
      const hasMongoUriTest = envLines.some(line =>
        line.trim().startsWith('MONGODB_URI_TEST=')
      );
      expect(hasMongoUriTest).toBe(false);
    });

    test('should not contain any MongoDB related variables', () => {
      const mongoVars = envLines.filter(line => {
        const trimmed = line.trim();
        return (
          !trimmed.startsWith('#') &&
          trimmed.length > 0 &&
          (trimmed.includes('MONGODB') || trimmed.includes('MONGO_'))
        );
      });
      expect(mongoVars.length).toBe(0);
    });

    test('should not contain MongoDB sync configuration', () => {
      const mongoSyncVars = [
        'ENABLE_MONGO_CHANGESTREAM',
        'SYNC_COLLECTIONS',
        'CHANGESTREAM_BATCH_SIZE',
        'CHANGESTREAM_MAX_AWAIT_TIME_MS',
        'CHANGESTREAM_FULL_DOCUMENT'
      ];

      mongoSyncVars.forEach(varName => {
        const hasVar = envLines.some(line =>
          line.trim().startsWith(`${varName}=`)
        );
        expect(hasVar).toBe(false);
      });
    });

    test('should not contain bidirectional sync configuration', () => {
      const bidirectionalSyncVars = [
        'ENABLE_SYNC',
        'SYNC_DIRECTION',
        'SYNC_CONFLICT_STRATEGY',
        'ZERODB_SYNC_ENABLED'
      ];

      bidirectionalSyncVars.forEach(varName => {
        const hasVar = envLines.some(line =>
          line.trim().startsWith(`${varName}=`)
        );
        expect(hasVar).toBe(false);
      });
    });

    test('should have ZERODB configuration section', () => {
      const hasZerodbSection = envContent.includes('ZERODB CONFIGURATION') ||
                               envContent.includes('ZeroDB Configuration');
      expect(hasZerodbSection).toBe(true);
    });

    test('should have AINATIVE_API_TOKEN variable documented', () => {
      const hasAinativeToken = envLines.some(line =>
        line.includes('AINATIVE_API_TOKEN') ||
        line.includes('ZERODB_API_KEY')
      );
      expect(hasAinativeToken).toBe(true);
    });

    test('should have ZERODB_PROJECT_ID variable documented', () => {
      const hasProjectId = envLines.some(line =>
        line.includes('ZERODB_PROJECT_ID')
      );
      expect(hasProjectId).toBe(true);
    });

    test('should have ZERODB_BASE_URL variable documented', () => {
      const hasBaseUrl = envLines.some(line =>
        line.includes('ZERODB_BASE_URL')
      );
      expect(hasBaseUrl).toBe(true);
    });

    test('should have PORT configuration', () => {
      const hasPort = envLines.some(line =>
        line.trim().startsWith('PORT=')
      );
      expect(hasPort).toBe(true);
    });

    test('should have NODE_ENV configuration', () => {
      const hasNodeEnv = envLines.some(line =>
        line.trim().startsWith('NODE_ENV=')
      );
      expect(hasNodeEnv).toBe(true);
    });

    test('should have JWT configuration', () => {
      const hasJwtSecret = envLines.some(line =>
        line.trim().startsWith('JWT_SECRET=')
      );
      expect(hasJwtSecret).toBe(true);
    });
  });

  describe('Configuration file structure', () => {
    test('should have clear section separators', () => {
      const hasSeparators = envContent.includes('===') ||
                           envContent.includes('---');
      expect(hasSeparators).toBe(true);
    });

    test('should have comments explaining ZeroDB setup', () => {
      const hasComments = envLines.some(line =>
        line.trim().startsWith('#') &&
        (line.toLowerCase().includes('zerodb') || line.toLowerCase().includes('ainative'))
      );
      expect(hasComments).toBe(true);
    });

    test('should not have conflicting database instructions', () => {
      const hasMongoDatabaseComment = envLines.some(line =>
        line.trim().startsWith('#') &&
        line.toLowerCase().includes('database configuration') &&
        line.toLowerCase().includes('mongodb')
      );
      expect(hasMongoDatabaseComment).toBe(false);
    });
  });
});
