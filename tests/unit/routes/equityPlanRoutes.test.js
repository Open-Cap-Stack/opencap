/**
 * Tests for equityPlanRoutes.js
 * Verifies routes use correct path patterns (no doubled prefixes)
 */
const express = require('express');

// Mock auth middleware
jest.mock('../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../../controllers/equityPlanController', () => ({
  createEquityPlan: jest.fn((req, res) => res.status(201).json({ id: '1' })),
  getEquityPlans: jest.fn((req, res) => res.status(200).json([])),
  getEquityPlanById: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  updateEquityPlan: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  deleteEquityPlan: jest.fn((req, res) => res.status(200).json({ message: 'deleted' }))
}));

const request = require('supertest');

describe('Equity Plan Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const equityPlanRoutes = require('../../../routes/v1/equityPlanRoutes');
    // Mount at the same path as app.js does
    app.use('/api/v1/equity-plans', equityPlanRoutes);
  });

  describe('Route path verification (no doubled prefixes)', () => {
    it('POST /api/v1/equity-plans should create an equity plan', async () => {
      const res = await request(app)
        .post('/api/v1/equity-plans')
        .send({ name: 'Test Plan' });
      expect(res.status).toBe(201);
    });

    it('GET /api/v1/equity-plans should list equity plans', async () => {
      const res = await request(app).get('/api/v1/equity-plans');
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/equity-plans/:id should get single plan', async () => {
      const res = await request(app).get('/api/v1/equity-plans/123');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('123');
    });

    it('PUT /api/v1/equity-plans/:id should update a plan', async () => {
      const res = await request(app)
        .put('/api/v1/equity-plans/123')
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/v1/equity-plans/:id should delete a plan', async () => {
      const res = await request(app).delete('/api/v1/equity-plans/123');
      expect(res.status).toBe(200);
    });

    it('should NOT respond at doubled path /api/v1/equity-plans/equity-plans', async () => {
      const res = await request(app).get('/api/v1/equity-plans/equity-plans');
      // This should hit /:id with id="equity-plans", not a collection endpoint
      // The key test is that the old doubled path no longer exists as a separate route
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('equity-plans'); // treated as an ID, not a collection
    });
  });
});
