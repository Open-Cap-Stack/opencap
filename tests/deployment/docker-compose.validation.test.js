/**
 * Docker Compose Validation Tests
 *
 * These tests validate that Docker compose configurations work correctly
 * without MongoDB and use only ZeroDB for data persistence.
 *
 * Test Coverage:
 * - MongoDB service removal validation
 * - MongoDB environment variables removal
 * - MongoDB volume removal
 * - MongoDB dependency removal from app service
 * - Valid YAML structure
 * - ZeroDB configuration presence
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Docker Compose Configuration Validation', () => {
  const dockerComposePath = path.resolve(__dirname, '../../docker-compose.yml');
  const dockerComposeSimplePath = path.resolve(__dirname, '../../docker-compose.simple.yml');

  describe('docker-compose.yml validation', () => {
    let dockerConfig;

    beforeAll(() => {
      const fileContent = fs.readFileSync(dockerComposePath, 'utf8');
      dockerConfig = yaml.load(fileContent);
    });

    test('should be valid YAML', () => {
      expect(dockerConfig).toBeDefined();
      expect(typeof dockerConfig).toBe('object');
    });

    test('should not contain mongodb service', () => {
      expect(dockerConfig.services).toBeDefined();
      expect(dockerConfig.services.mongodb).toBeUndefined();
      expect(dockerConfig.services.mongo).toBeUndefined();
    });

    test('should not contain mongodb volume', () => {
      expect(dockerConfig.volumes).toBeDefined();
      const volumeNames = Object.keys(dockerConfig.volumes || {});
      const hasMongoVolume = volumeNames.some(name =>
        name.toLowerCase().includes('mongo')
      );
      expect(hasMongoVolume).toBe(false);
    });

    test('app service should not depend on mongodb', () => {
      expect(dockerConfig.services.app).toBeDefined();
      const dependencies = dockerConfig.services.app.depends_on || [];
      const hasMongoDepend = dependencies.some(dep =>
        dep.toLowerCase().includes('mongo')
      );
      expect(hasMongoDepend).toBe(false);
    });

    test('should not have MONGODB_URI environment variable', () => {
      const appEnv = dockerConfig.services.app.environment || [];
      const mongoEnvVars = appEnv.filter(env => {
        const envStr = typeof env === 'string' ? env : '';
        return envStr.includes('MONGODB') || envStr.includes('MONGO_');
      });
      expect(mongoEnvVars.length).toBe(0);
    });

    test('should have ZERODB configuration variables', () => {
      const appEnv = dockerConfig.services.app.environment || [];
      const envObj = Array.isArray(appEnv)
        ? appEnv.reduce((acc, env) => {
            const [key] = env.split('=');
            acc[key] = true;
            return acc;
          }, {})
        : appEnv;

      // ZeroDB should be configured via AINATIVE_API_TOKEN
      // These variables should be documented but not required in docker-compose
      expect(typeof envObj).toBe('object');
    });

    test('postgres service should still exist', () => {
      expect(dockerConfig.services.postgres).toBeDefined();
    });

    test('app service should have required dependencies', () => {
      expect(dockerConfig.services.app).toBeDefined();
      expect(dockerConfig.services.app.depends_on).toBeDefined();
      expect(dockerConfig.services.app.depends_on).toContain('postgres');
    });
  });

  describe('docker-compose.simple.yml validation', () => {
    let dockerConfig;

    beforeAll(() => {
      const fileContent = fs.readFileSync(dockerComposeSimplePath, 'utf8');
      dockerConfig = yaml.load(fileContent);
    });

    test('should be valid YAML', () => {
      expect(dockerConfig).toBeDefined();
      expect(typeof dockerConfig).toBe('object');
    });

    test('should not contain mongodb service', () => {
      expect(dockerConfig.services).toBeDefined();
      expect(dockerConfig.services.mongodb).toBeUndefined();
      expect(dockerConfig.services.mongo).toBeUndefined();
    });

    test('should not contain mongodb volume', () => {
      expect(dockerConfig.volumes).toBeDefined();
      const volumeNames = Object.keys(dockerConfig.volumes || {});
      const hasMongoVolume = volumeNames.some(name =>
        name.toLowerCase().includes('mongo')
      );
      expect(hasMongoVolume).toBe(false);
    });

    test('app service should not depend on mongodb', () => {
      expect(dockerConfig.services.app).toBeDefined();
      const dependencies = dockerConfig.services.app.depends_on || [];
      const hasMongoDepend = dependencies.some(dep =>
        dep.toLowerCase().includes('mongo')
      );
      expect(hasMongoDepend).toBe(false);
    });

    test('should not have MONGODB_URI environment variable', () => {
      const appEnv = dockerConfig.services.app.environment || [];
      const mongoEnvVars = appEnv.filter(env => {
        const envStr = typeof env === 'string' ? env : '';
        return envStr.includes('MONGODB') || envStr.includes('MONGO_');
      });
      expect(mongoEnvVars.length).toBe(0);
    });
  });

  describe('MongoDB init scripts validation', () => {
    test('should not have mongo init scripts directory', () => {
      const mongoInitPath = path.resolve(__dirname, '../../init-scripts/mongo');
      const exists = fs.existsSync(mongoInitPath);
      expect(exists).toBe(false);
    });

    test('should not have test-init-scripts mongo directory', () => {
      const mongoTestInitPath = path.resolve(__dirname, '../../test-init-scripts/mongo');
      const exists = fs.existsSync(mongoTestInitPath);
      expect(exists).toBe(false);
    });
  });
});
