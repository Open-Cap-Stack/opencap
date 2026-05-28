'use strict';

/**
 * 83(b) Election Routes Test Suite
 * Issue #667: 83(b) deadline tracking and automated email reminders
 *
 * Tests API endpoint behavior for:
 *   GET  /api/v1/compliance/83b-status
 *   POST /api/v1/compliance/83b-filed
 *   POST /api/v1/compliance/83b-remind
 */

const express = require('express');
const request = require('supertest');

// Mock auth middleware to pass through
jest.mock('../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user', role: 'admin', companyId: 'company-1' };
    next();
  },
}));

jest.mock('../../../middleware/rbacMiddleware', () => ({
  hasRole: () => (req, res, next) => next(),
}));

jest.mock('../../../services/eightythreeBService', () => ({
  get83bStatus: jest.fn(),
  mark83bFiled: jest.fn(),
  sendManualReminder: jest.fn(),
}));

const eightythreeBService = require('../../../services/eightythreeBService');
const eightythreeBRoutes = require('../../../routes/v1/eightythreeBRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/compliance', eightythreeBRoutes);
  return app;
}

describe('83(b) Election Routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /83b-status ───────────────────────────────────────────────────────

  describe('GET /api/v1/compliance/83b-status', () => {
    it('should return 400 when companyId is missing', async () => {
      const res = await request(app).get('/api/v1/compliance/83b-status');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('companyId');
    });

    it('should return 200 with grant statuses', async () => {
      const mockStatuses = [
        {
          grantId: 'g1',
          stakeholderName: 'Jane Doe',
          stakeholderEmail: 'jane@test.com',
          status: 'pending',
          daysRemaining: 20,
        },
      ];
      eightythreeBService.get83bStatus.mockResolvedValueOnce(mockStatuses);

      const res = await request(app)
        .get('/api/v1/compliance/83b-status')
        .query({ companyId: 'company-1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.grants).toHaveLength(1);
      expect(res.body.grants[0].grantId).toBe('g1');
      expect(res.body.companyId).toBe('company-1');
    });

    it('should return 500 on service error', async () => {
      eightythreeBService.get83bStatus.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/v1/compliance/83b-status')
        .query({ companyId: 'company-1' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /83b-filed ───────────────────────────────────────────────────────

  describe('POST /api/v1/compliance/83b-filed', () => {
    it('should return 400 when grantId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/compliance/83b-filed')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 on success', async () => {
      eightythreeBService.mark83bFiled.mockResolvedValueOnce({
        _id: 'g1',
        eightythreeBFiled: true,
      });

      const res = await request(app)
        .post('/api/v1/compliance/83b-filed')
        .send({ grantId: 'g1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('filed');
    });

    it('should return 404 when grant not found', async () => {
      eightythreeBService.mark83bFiled.mockRejectedValueOnce(
        new Error('Equity grant not found')
      );

      const res = await request(app)
        .post('/api/v1/compliance/83b-filed')
        .send({ grantId: 'nonexistent' });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /83b-remind ──────────────────────────────────────────────────────

  describe('POST /api/v1/compliance/83b-remind', () => {
    it('should return 400 when params are missing', async () => {
      const res = await request(app)
        .post('/api/v1/compliance/83b-remind')
        .send({ grantId: 'g1' }); // missing stakeholderId

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 on successful reminder', async () => {
      eightythreeBService.sendManualReminder.mockResolvedValueOnce({
        success: true,
        email: 'jane@test.com',
        daysRemaining: 15,
      });

      const res = await request(app)
        .post('/api/v1/compliance/83b-remind')
        .send({ stakeholderId: 'sh-1', grantId: 'g1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.email).toBe('jane@test.com');
    });

    it('should return 404 when stakeholder not found', async () => {
      eightythreeBService.sendManualReminder.mockRejectedValueOnce(
        new Error('Stakeholder not found')
      );

      const res = await request(app)
        .post('/api/v1/compliance/83b-remind')
        .send({ stakeholderId: 'missing', grantId: 'g1' });

      expect(res.status).toBe(404);
    });

    it('should return 400 when stakeholder has no email', async () => {
      eightythreeBService.sendManualReminder.mockRejectedValueOnce(
        new Error('Stakeholder has no email address')
      );

      const res = await request(app)
        .post('/api/v1/compliance/83b-remind')
        .send({ stakeholderId: 'sh-1', grantId: 'g1' });

      expect(res.status).toBe(400);
    });
  });
});
