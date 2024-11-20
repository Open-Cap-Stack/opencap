// __tests__/app.test.js
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Custom logger to suppress expected test errors
const logger = {
  error: (...args) => {
    if (process.env.SUPPRESS_TEST_LOGS) return;
    console.error(...args);
  }
};

function testMiddleware(req, res, next) {
  req.testMiddleware = true;
  next();
}

const createMockRoute = (path) => {
  const router = express.Router();
  
  router.get('/', (req, res) => {
    res.json({ 
      message: `OK from ${path}`,
      middlewareApplied: req.testMiddleware || false
    });
  });
  
  router.post('/', (req, res) => {
    res.status(201).json({
      ...req.body,
      middlewareApplied: req.testMiddleware || false
    });
  });
  
  router.get('/error', (req, res, next) => {
    next(new Error('Test error'));
  });
  
  return router;
};

class TestApp {
  constructor() {
    this.app = null;
    this.mongoServer = null;
    this.initialize();
  }

  initialize() {
    process.env.NODE_ENV = "test";
    process.env.SUPPRESS_TEST_LOGS = "true";
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(testMiddleware);
  }

  setupRoutes() {
    const routes = {
      '/api/financial-reports': createMockRoute('financial-reports'),
      '/api/users': createMockRoute('users'),
      '/api/shareClasses': createMockRoute('shareClasses'),
      '/api/stakeholders': createMockRoute('stakeholders'),
      '/api/documents': createMockRoute('documents'),
      '/api/fundraisingRounds': createMockRoute('fundraisingRounds'),
      '/api/equityPlans': createMockRoute('equityPlans'),
      '/api/documentEmbeddings': createMockRoute('documentEmbeddings'),
      '/api/employees': createMockRoute('employees'),
      '/api/activities': createMockRoute('activities'),
      '/api/investments': createMockRoute('investments'),
      '/api/admins': createMockRoute('admins'),
      '/api/documentAccesses': createMockRoute('documentAccesses'),
      '/api/investors': createMockRoute('investors'),
      '/api/companies': createMockRoute('companies'),
      '/auth': createMockRoute('auth'),
      '/api/communications': createMockRoute('communications'),
      '/api/notifications': createMockRoute('notifications'),
      '/api/invites': createMockRoute('invites'),
      '/api/spv': createMockRoute('spv'),
      '/api/spv-assets': createMockRoute('spv-assets'),
      '/api/compliance-checks': createMockRoute('compliance-checks'),
      '/api/integration-modules': createMockRoute('integration-modules'),
      '/api/taxCalculations': createMockRoute('taxCalculations')
    };

    Object.entries(routes).forEach(([path, handler]) => {
      this.app.use(path, handler);
    });

    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  setupErrorHandling() {
    this.app.use((err, req, res, next) => {
      logger.error("Test Error:", err.message);
      res.status(err.statusCode || 500).json({
        error: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === 'test' ? err.stack : undefined
      });
    });
  }

  getApp() {
    return this.app;
  }
}

const testApp = new TestApp();

describe('App Configuration', () => {
  let app;

  beforeAll(() => {
    app = testApp.getApp();
  });

  it('should have json middleware configured', () => {
    expect(app._router.stack.some(layer => 
      layer.name === 'jsonParser'
    )).toBe(true);
  });

  it('should have custom middleware configured', () => {
    expect(app._router.stack.some(layer => 
      layer.name === 'testMiddleware'
    )).toBe(true);
  });

  it('should have routes configured', () => {
    const routes = app._router.stack
      .filter(layer => layer.route || layer.name === 'router');
    expect(routes.length).toBeGreaterThan(0);
  });
});

describe('API Routes', () => {
  let request;

  beforeAll(() => {
    request = require('supertest')(testApp.getApp());
  });

  it('should respond to GET /api/financial-reports', async () => {
    const response = await request.get('/api/financial-reports');
    expect(response.status).toBe(200);
    expect(response.body.middlewareApplied).toBe(true);
  });

  it('should respond to POST /api/users', async () => {
    const testUser = { name: 'Test User' };
    const response = await request
      .post('/api/users')
      .send(testUser);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(testUser);
    expect(response.body.middlewareApplied).toBe(true);
  });

  it('should handle not found routes', async () => {
    const response = await request.get('/api/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Route not found');
  });
});

describe('Error Handling', () => {
  let request;

  beforeAll(() => {
    request = require('supertest')(testApp.getApp());
  });

  it('should handle errors gracefully', async () => {
    const response = await request.get('/api/financial-reports/error');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });

  it('should include stack trace in test environment', async () => {
    const response = await request.get('/api/financial-reports/error');
    expect(response.body).toHaveProperty('stack');
  });
});

describe('Middleware Functionality', () => {
  let request;

  beforeAll(() => {
    request = require('supertest')(testApp.getApp());
  });

  it('should parse JSON bodies correctly', async () => {
    const testData = { test: 'data' };
    const response = await request
      .post('/api/financial-reports')
      .send(testData);
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(testData);
  });

  it('should apply custom middleware to all routes', async () => {
    const response = await request.get('/api/users');
    expect(response.body.middlewareApplied).toBe(true);
  });
});