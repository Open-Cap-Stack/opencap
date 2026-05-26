/**
 * Tests for fundraisingRoundRoutes.js
 * Verifies routes use correct path patterns (no doubled prefixes)
 */
const express = require('express');

// Mock auth middleware
jest.mock('../../../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => next(),
  authenticateToken: (req, res, next) => next()
}));

// Mock RBAC middleware
jest.mock('../../../middleware/rbacMiddleware', () => ({
  hasRole: () => (req, res, next) => next(),
  requirePermission: () => (req, res, next) => next()
}));

// Mock controller
jest.mock('../../../controllers/fundraisingRoundController', () => ({
  createFundraisingRound: jest.fn((req, res) => res.status(201).json({ id: '1' })),
  getFundraisingRounds: jest.fn((req, res) => res.status(200).json([])),
  getFundraisingRoundById: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  updateFundraisingRound: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  deleteFundraisingRound: jest.fn((req, res) => res.status(200).json({ message: 'deleted' }))
}));

const request = require('supertest');

describe('Fundraising Round Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const fundraisingRoundRoutes = require('../../../routes/v1/fundraisingRoundRoutes');
    app.use('/api/v1/fundraising-rounds', fundraisingRoundRoutes);
  });

  describe('Route path verification (no doubled prefixes)', () => {
    it('POST /api/v1/fundraising-rounds should create a round', async () => {
      const res = await request(app)
        .post('/api/v1/fundraising-rounds')
        .send({ name: 'Series A' });
      expect(res.status).toBe(201);
    });

    it('GET /api/v1/fundraising-rounds should list rounds', async () => {
      const res = await request(app).get('/api/v1/fundraising-rounds');
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/fundraising-rounds/:id should get single round', async () => {
      const res = await request(app).get('/api/v1/fundraising-rounds/456');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('456');
    });

    it('PUT /api/v1/fundraising-rounds/:id should update a round', async () => {
      const res = await request(app)
        .put('/api/v1/fundraising-rounds/456')
        .send({ name: 'Series B' });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/fundraising-rounds/:id should delete a round', async () => {
      const res = await request(app).delete('/api/v1/fundraising-rounds/456');
      expect(res.status).toBe(200);
    });

    it('should NOT respond at doubled path /api/v1/fundraising-rounds/fundraising-rounds', async () => {
      const res = await request(app).get('/api/v1/fundraising-rounds/fundraising-rounds');
      expect(res.body.id).toBe('fundraising-rounds'); // treated as ID, not collection
    });
  });
});
