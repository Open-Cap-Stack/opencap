/**
 * Docker Configuration Validation Tests
 * Tests that MongoDB has been successfully removed from Docker configurations
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('Docker Configuration - MongoDB Removal', () => {
  describe('docker-compose.yml', () => {
    let config;

    beforeAll(() => {
      const filePath = path.resolve(__dirname, '../../docker-compose.yml');
      const content = fs.readFileSync(filePath, 'utf8');
      config = yaml.load(content);
    });

    test('should not have mongodb service', () => {
      expect(config.services.mongodb).toBeUndefined();
    });

    test('app service should not depend on mongodb', () => {
      const dependencies = config.services.app.depends_on || [];
      expect(dependencies).not.toContain('mongodb');
    });

    test('should not have mongodb_data volume', () => {
      const volumes = Object.keys(config.volumes || {});
      expect(volumes).not.toContain('mongodb_data');
    });

    test('app environment should not have MONGODB_URI', () => {
      const env = config.services.app.environment || [];
      const hasMongoUri = env.some(e => e.includes('MONGODB_URI'));
      expect(hasMongoUri).toBe(false);
    });

    test('app environment should have ENABLE_ZERODB', () => {
      const env = config.services.app.environment || [];
      const hasZeroDB = env.some(e => e.includes('ENABLE_ZERODB=true'));
      expect(hasZeroDB).toBe(true);
    });
  });

  describe('docker-compose.simple.yml', () => {
    let config;

    beforeAll(() => {
      const filePath = path.resolve(__dirname, '../../docker-compose.simple.yml');
      const content = fs.readFileSync(filePath, 'utf8');
      config = yaml.load(content);
    });

    test('should not have mongodb service', () => {
      expect(config.services.mongodb).toBeUndefined();
    });

    test('app service should not depend on mongodb', () => {
      const dependencies = config.services.app.depends_on || [];
      expect(dependencies).not.toContain('mongodb');
    });

    test('should not have mongodb_data volume', () => {
      const volumes = Object.keys(config.volumes || {});
      expect(volumes).not.toContain('mongodb_data');
    });

    test('app environment should not have MONGODB_URI', () => {
      const env = config.services.app.environment || [];
      const hasMongoUri = env.some(e => e.includes('MONGODB_URI'));
      expect(hasMongoUri).toBe(false);
    });
  });

  describe('.env.example', () => {
    let content;

    beforeAll(() => {
      const filePath = path.resolve(__dirname, '../../.env.example');
      content = fs.readFileSync(filePath, 'utf8');
    });

    test('should not have MONGODB_URI variable', () => {
      expect(content).not.toContain('MONGODB_URI=');
    });

    test('should have ZERODB configuration', () => {
      expect(content).toContain('ZERODB_API_KEY');
      expect(content).toContain('ZERODB_PROJECT_ID');
    });

    test('should have ENABLE_ZERODB variable', () => {
      expect(content).toContain('ENABLE_ZERODB=true');
    });

    test('should not have sync configuration', () => {
      expect(content).not.toContain('ENABLE_SYNC');
      expect(content).not.toContain('ENABLE_MONGO_CHANGESTREAM');
    });
  });

  describe('MongoDB init scripts', () => {
    test('should not have mongo init scripts directory', () => {
      const initPath = path.resolve(__dirname, '../../init-scripts/mongo');
      expect(fs.existsSync(initPath)).toBe(false);
    });

    test('should not have test mongo init scripts directory', () => {
      const testInitPath = path.resolve(__dirname, '../../test-init-scripts/mongo');
      expect(fs.existsSync(testInitPath)).toBe(false);
    });
  });

  describe('Kubernetes deployment', () => {
    test('should not have mongodb.yaml deployment', () => {
      const k8sMongoPath = path.resolve(__dirname, '../../deployment/kubernetes/mongodb.yaml');
      expect(fs.existsSync(k8sMongoPath)).toBe(false);
    });
  });
});
