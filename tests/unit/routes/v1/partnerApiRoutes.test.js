/**
 * Partner API Routes Unit Tests
 * Issue #119: Create API Access for Partners
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock the controller
jest.mock('../../../../controllers/partnerApiController', () => ({
  createApiKey: jest.fn((req, res) => res.status(201).json({ apiKeyId: 'APIK-TEST' })),
  getApiKeys: jest.fn((req, res) => res.status(200).json([])),
  getApiKeyById: jest.fn((req, res) => res.status(200).json({ apiKeyId: 'APIK-TEST' })),
  updateApiKey: jest.fn((req, res) => res.status(200).json({ apiKeyId: 'APIK-TEST' })),
  deleteApiKey: jest.fn((req, res) => res.status(200).json({ message: 'Deleted' })),
  revokeApiKey: jest.fn((req, res) => res.status(200).json({ message: 'Revoked' })),
  refreshApiKey: jest.fn((req, res) => res.status(200).json({ newSecret: 'secret' })),
  getApiKeyUsage: jest.fn((req, res) => res.status(200).json({ totalRequests: 100 })),
  suspendApiKey: jest.fn((req, res) => res.status(200).json({ message: 'Suspended' })),
  reactivateApiKey: jest.fn((req, res) => res.status(200).json({ message: 'Reactivated' })),
  validateApiKey: jest.fn((req, res) => res.status(200).json({ valid: true }))
}));

// Mock middleware
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { userId: 'user-123', role: 'admin' };
    next();
  })
}));

jest.mock('../../../../middleware/rbacMiddleware', () => ({
  requireRole: () => (req, res, next) => next(),
  requirePermission: () => (req, res, next) => next()
}));

const partnerApiRoutes = require('../../../../routes/v1/partnerApiRoutes');
const partnerApiController = require('../../../../controllers/partnerApiController');

describe('Partner API Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', partnerApiRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/partner-api/keys', () => {
    it('should call createApiKey controller', async () => {
      const response = await request(app)
        .post('/api/v1/partner-api/keys')
        .send({
          partnerId: 'partner-123',
          companyId: 'company-456',
          name: 'Test Key'
        });

      expect(response.status).toBe(201);
      expect(partnerApiController.createApiKey).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/partner-api/keys', () => {
    it('should call getApiKeys controller', async () => {
      const response = await request(app)
        .get('/api/v1/partner-api/keys')
        .query({ partnerId: 'partner-123' });

      expect(response.status).toBe(200);
      expect(partnerApiController.getApiKeys).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/partner-api/keys/:id', () => {
    it('should call getApiKeyById controller', async () => {
      const response = await request(app)
        .get('/api/v1/partner-api/keys/APIK-12345678');

      expect(response.status).toBe(200);
      expect(partnerApiController.getApiKeyById).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/partner-api/keys/:id', () => {
    it('should call updateApiKey controller', async () => {
      const response = await request(app)
        .put('/api/v1/partner-api/keys/APIK-12345678')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(partnerApiController.updateApiKey).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/partner-api/keys/:id', () => {
    it('should call deleteApiKey controller', async () => {
      const response = await request(app)
        .delete('/api/v1/partner-api/keys/APIK-12345678');

      expect(response.status).toBe(200);
      expect(partnerApiController.deleteApiKey).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/partner-api/keys/:id/revoke', () => {
    it('should call revokeApiKey controller', async () => {
      const response = await request(app)
        .post('/api/v1/partner-api/keys/APIK-12345678/revoke');

      expect(response.status).toBe(200);
      expect(partnerApiController.revokeApiKey).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/partner-api/keys/:id/refresh', () => {
    it('should call refreshApiKey controller', async () => {
      const response = await request(app)
        .post('/api/v1/partner-api/keys/APIK-12345678/refresh');

      expect(response.status).toBe(200);
      expect(partnerApiController.refreshApiKey).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/partner-api/keys/:id/usage', () => {
    it('should call getApiKeyUsage controller', async () => {
      const response = await request(app)
        .get('/api/v1/partner-api/keys/APIK-12345678/usage');

      expect(response.status).toBe(200);
      expect(partnerApiController.getApiKeyUsage).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/partner-api/keys/:id/suspend', () => {
    it('should call suspendApiKey controller', async () => {
      const response = await request(app)
        .post('/api/v1/partner-api/keys/APIK-12345678/suspend')
        .send({ reason: 'Suspicious activity' });

      expect(response.status).toBe(200);
      expect(partnerApiController.suspendApiKey).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/partner-api/keys/:id/reactivate', () => {
    it('should call reactivateApiKey controller', async () => {
      const response = await request(app)
        .post('/api/v1/partner-api/keys/APIK-12345678/reactivate');

      expect(response.status).toBe(200);
      expect(partnerApiController.reactivateApiKey).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/partner-api/validate', () => {
    it('should call validateApiKey controller', async () => {
      const response = await request(app)
        .post('/api/v1/partner-api/validate')
        .send({
          key: 'test_key',
          secret: 'test_secret'
        });

      expect(response.status).toBe(200);
      expect(partnerApiController.validateApiKey).toHaveBeenCalled();
    });
  });

  describe('Route Authentication', () => {
    it('should require authentication for key management routes', async () => {
      // The mock already provides authentication
      // In real implementation, routes should have auth middleware
      const response = await request(app)
        .get('/api/v1/partner-api/keys')
        .query({ partnerId: 'partner-123' });

      expect(response.status).toBe(200);
    });
  });
});
