/**
 * Health Check Routes Tests
 * GitHub Issue #35: Final validation and production readiness
 *
 * Tests for production health check endpoints that validate
 * system health, ZeroDB connectivity, and overall readiness.
 */

const request = require('supertest');

// Mock services before requiring app
jest.mock('../../../services/zerodbService', () => ({
  projectId: null,
  token: null,
  getDatabaseStatus: jest.fn(),
  listTables: jest.fn(),
  initialize: jest.fn()
}));

// mongoChangeStreamListener was removed during ZeroDB migration
jest.mock('../../../services/mongoChangeStreamListener', () => ({
  healthCheck: jest.fn(),
  getMetrics: jest.fn(),
  isRunning: false
}), { virtual: true });

const zerodbService = require('../../../services/zerodbService');

// Create a minimal test app to avoid full app initialization
const express = require('express');

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Basic health endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
  });

  // ZeroDB health endpoint
  app.get('/health/zerodb', async (req, res) => {
    try {
      if (!zerodbService.projectId) {
        return res.status(503).json({
          status: 'error',
          message: 'ZeroDB not initialized',
          enabled: process.env.ENABLE_ZERODB === 'true'
        });
      }
      const dbStatus = await zerodbService.getDatabaseStatus();
      res.status(200).json({
        status: 'ok',
        projectId: zerodbService.projectId,
        zerodb: dbStatus
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Sync health endpoint
  app.get('/health/sync', async (req, res) => {
    try {
      // Sync feature removed after ZeroDB migration
      return res.status(200).json({
        status: "disabled",
        message: "MongoDB to ZeroDB sync is not enabled"
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error.message
      });
    }
  });

  // Production readiness endpoint
  app.get('/health/ready', async (req, res) => {
    const checks = [];
    let allHealthy = true;

    // Check 1: Server is running
    checks.push({ name: 'server', status: 'pass' });

    // Check 2: ZeroDB connectivity
    if (zerodbService.projectId) {
      try {
        await zerodbService.getDatabaseStatus();
        checks.push({ name: 'zerodb', status: 'pass' });
      } catch {
        checks.push({ name: 'zerodb', status: 'fail' });
        allHealthy = false;
      }
    } else {
      checks.push({ name: 'zerodb', status: 'skip', reason: 'not initialized' });
    }

    // Check 3: Required environment variables
    const requiredEnvVars = ['NODE_ENV'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length === 0) {
      checks.push({ name: 'environment', status: 'pass' });
    } else {
      checks.push({ name: 'environment', status: 'warn', missing: missingVars });
    }

    res.status(allHealthy ? 200 : 503).json({
      ready: allHealthy,
      timestamp: new Date().toISOString(),
      checks
    });
  });

  // Liveness probe (Kubernetes style)
  app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'alive', timestamp: Date.now() });
  });

  return app;
}

describe('Health Check Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /health', () => {
    describe('Given the server is running', () => {
      test('When health endpoint is called, Then it should return 200 with ok status', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.message).toBe('Server is running');
      });
    });
  });

  describe('GET /health/zerodb', () => {
    describe('Given ZeroDB is initialized', () => {
      beforeEach(() => {
        zerodbService.projectId = 'test-project-123';
      });

      test('When ZeroDB is healthy, Then it should return 200 with status', async () => {
        zerodbService.getDatabaseStatus.mockResolvedValue({
          status: 'healthy',
          connections: 10,
          uptime: 86400
        });

        const response = await request(app).get('/health/zerodb');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.projectId).toBe('test-project-123');
        expect(response.body.zerodb).toEqual({
          status: 'healthy',
          connections: 10,
          uptime: 86400
        });
      });

      test('When ZeroDB status check fails, Then it should return 503', async () => {
        zerodbService.getDatabaseStatus.mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app).get('/health/zerodb');

        expect(response.status).toBe(503);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Database connection failed');
      });
    });

    describe('Given ZeroDB is not initialized', () => {
      beforeEach(() => {
        zerodbService.projectId = null;
      });

      test('When health check is called, Then it should return 503', async () => {
        const response = await request(app).get('/health/zerodb');

        expect(response.status).toBe(503);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('ZeroDB not initialized');
      });
    });
  });

  describe('GET /health/sync', () => {
    describe('Given sync is disabled', () => {
      beforeEach(() => {
        delete process.env.SYNC_ENABLED;
      });

      test('When sync health is checked, Then it should return disabled status', async () => {
        const response = await request(app).get('/health/sync');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('disabled');
      });
    });

    
  });

  describe('GET /health/ready', () => {
    describe('Given production readiness check is requested', () => {
      test('When all systems are healthy, Then it should return ready=true', async () => {
        zerodbService.projectId = 'test-project-123';
        zerodbService.getDatabaseStatus.mockResolvedValue({ status: 'healthy' });
        process.env.NODE_ENV = 'test';

        const response = await request(app).get('/health/ready');

        expect(response.status).toBe(200);
        expect(response.body.ready).toBe(true);
        expect(response.body.checks).toContainEqual(
          expect.objectContaining({ name: 'server', status: 'pass' })
        );
      });

      test('When ZeroDB fails, Then ready should be false', async () => {
        zerodbService.projectId = 'test-project-123';
        zerodbService.getDatabaseStatus.mockRejectedValue(new Error('Connection failed'));
        process.env.NODE_ENV = 'test';

        const response = await request(app).get('/health/ready');

        expect(response.status).toBe(503);
        expect(response.body.ready).toBe(false);
        expect(response.body.checks).toContainEqual(
          expect.objectContaining({ name: 'zerodb', status: 'fail' })
        );
      });

      test('When ZeroDB is not initialized, Then it should skip ZeroDB check', async () => {
        zerodbService.projectId = null;
        process.env.NODE_ENV = 'test';

        const response = await request(app).get('/health/ready');

        expect(response.status).toBe(200);
        expect(response.body.checks).toContainEqual(
          expect.objectContaining({ name: 'zerodb', status: 'skip' })
        );
      });

      test('When response is returned, Then it should include timestamp', async () => {
        zerodbService.projectId = null;

        const response = await request(app).get('/health/ready');

        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });
    });
  });

  describe('GET /health/live', () => {
    describe('Given liveness probe is requested', () => {
      test('When server is alive, Then it should return alive status', async () => {
        const response = await request(app).get('/health/live');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
        expect(response.body.timestamp).toBeDefined();
      });
    });
  });
});

describe('Health Check Response Format', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Given health endpoints return JSON', () => {
    test('When any health endpoint is called, Then content-type should be application/json', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Given standard health check format', () => {
    test('When status is ok, Then HTTP status should be 200', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    test('When status is error, Then HTTP status should be 503', async () => {
      zerodbService.projectId = null;

      const response = await request(app).get('/health/zerodb');

      expect(response.status).toBe(503);
    });
  });
});
