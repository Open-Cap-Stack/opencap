/**
 * Exercise Routes Tests
 * Feature: Issue #79 - Build Exercise Management System
 */
const express = require('express');
const request = require('supertest');

// Mock the controller
jest.mock('../../../../controllers/exerciseController', () => ({
  createExerciseRequest: jest.fn((req, res) => res.status(201).json({ id: 'test' })),
  getExerciseRequestById: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
  getExerciseRequestsByCompany: jest.fn((req, res) => res.status(200).json([])),
  getExerciseRequestsByStakeholder: jest.fn((req, res) => res.status(200).json([])),
  approveExerciseRequest: jest.fn((req, res) => res.status(200).json({ status: 'approved' })),
  rejectExerciseRequest: jest.fn((req, res) => res.status(200).json({ status: 'rejected' })),
  processExerciseRequest: jest.fn((req, res) => res.status(200).json({ status: 'processed' })),
  completeExerciseRequest: jest.fn((req, res) => res.status(200).json({ status: 'completed' })),
  cancelExerciseRequest: jest.fn((req, res) => res.status(200).json({ status: 'cancelled' })),
  checkExerciseWindow: jest.fn((req, res) => res.status(200).json({ isValid: true })),
  calculateExercisePreview: jest.fn((req, res) => res.status(200).json({ preview: {} })),
  getExerciseSummaryByGrant: jest.fn((req, res) => res.status(200).json({ totalExercisedShares: 0 })),
  getExercisesByGrant: jest.fn((req, res) => res.status(200).json([])),
  validatePartialExercise: jest.fn((req, res) => res.status(200).json({ isValid: true })),
  getISOExercisesForTaxYear: jest.fn((req, res) => res.status(200).json({ exercises: [] })),
  generateForm3921: jest.fn((req, res) => res.status(201).json({ form3921: {} }))
}));

// Mock authentication middleware
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'user-001', userId: 'user-001' };
    next();
  }),
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'user-001', userId: 'user-001' };
    next();
  })
}));

const exerciseController = require('../../../../controllers/exerciseController');

describe('Exercise Routes', () => {
  let app;
  let exerciseRoutes;

  beforeAll(() => {
    exerciseRoutes = require('../../../../routes/v1/exerciseRoutes');

    app = express();
    app.use(express.json());
    app.use('/api/v1', exerciseRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/exercise-requests', () => {
    it('should call createExerciseRequest controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests')
        .send({
          companyId: 'company-123',
          stakeholderId: 'stakeholder-456',
          equityGrantId: 'grant-789',
          optionType: 'ISO',
          sharesRequested: 1000,
          exercisePrice: 1.00,
          currentFMV: 10.00,
          paymentMethod: 'cash'
        });

      expect(response.status).toBe(201);
      expect(exerciseController.createExerciseRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/exercise-requests/:id', () => {
    it('should call getExerciseRequestById controller', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/request-123');

      expect(response.status).toBe(200);
      expect(exerciseController.getExerciseRequestById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/exercise-requests/company/:companyId', () => {
    it('should call getExerciseRequestsByCompany controller', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/company/company-123');

      expect(response.status).toBe(200);
      expect(exerciseController.getExerciseRequestsByCompany).toHaveBeenCalled();
    });

    it('should pass status query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/company/company-123?status=pending');

      expect(response.status).toBe(200);
      expect(exerciseController.getExerciseRequestsByCompany).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/exercise-requests/stakeholder/:stakeholderId', () => {
    it('should call getExerciseRequestsByStakeholder controller', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/stakeholder/stakeholder-456');

      expect(response.status).toBe(200);
      expect(exerciseController.getExerciseRequestsByStakeholder).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/:id/approve', () => {
    it('should call approveExerciseRequest controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/request-123/approve');

      expect(response.status).toBe(200);
      expect(exerciseController.approveExerciseRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/:id/reject', () => {
    it('should call rejectExerciseRequest controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/request-123/reject')
        .send({ reason: 'Insufficient shares' });

      expect(response.status).toBe(200);
      expect(exerciseController.rejectExerciseRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/:id/process', () => {
    it('should call processExerciseRequest controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/request-123/process');

      expect(response.status).toBe(200);
      expect(exerciseController.processExerciseRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/:id/complete', () => {
    it('should call completeExerciseRequest controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/request-123/complete')
        .send({ certificateNumber: 'CERT-001' });

      expect(response.status).toBe(200);
      expect(exerciseController.completeExerciseRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/:id/cancel', () => {
    it('should call cancelExerciseRequest controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/request-123/cancel')
        .send({ reason: 'User requested' });

      expect(response.status).toBe(200);
      expect(exerciseController.cancelExerciseRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/check-window', () => {
    it('should call checkExerciseWindow controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/check-window')
        .send({
          exerciseWindow: {
            windowStart: new Date().toISOString(),
            windowEnd: new Date().toISOString(),
            windowType: 'open'
          }
        });

      expect(response.status).toBe(200);
      expect(exerciseController.checkExerciseWindow).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/preview', () => {
    it('should call calculateExercisePreview controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/preview')
        .send({
          sharesRequested: 1000,
          exercisePrice: 1.00,
          currentFMV: 10.00,
          optionType: 'NSO'
        });

      expect(response.status).toBe(200);
      expect(exerciseController.calculateExercisePreview).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/exercise-requests/grant/:equityGrantId/summary', () => {
    it('should call getExerciseSummaryByGrant controller', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/grant/grant-123/summary');

      expect(response.status).toBe(200);
      expect(exerciseController.getExerciseSummaryByGrant).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/exercise-requests/grant/:equityGrantId', () => {
    it('should call getExercisesByGrant controller', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/grant/grant-123');

      expect(response.status).toBe(200);
      expect(exerciseController.getExercisesByGrant).toHaveBeenCalled();
    });

    it('should pass status query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/grant/grant-123?status=completed');

      expect(response.status).toBe(200);
      expect(exerciseController.getExercisesByGrant).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/validate-partial', () => {
    it('should call validatePartialExercise controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/validate-partial')
        .send({
          equityGrantId: 'grant-123',
          sharesRequested: 300,
          vestedShares: 1000
        });

      expect(response.status).toBe(200);
      expect(exerciseController.validatePartialExercise).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/exercise-requests/company/:companyId/iso-exercises/:taxYear', () => {
    it('should call getISOExercisesForTaxYear controller', async () => {
      const response = await request(app)
        .get('/api/v1/exercise-requests/company/company-123/iso-exercises/2024');

      expect(response.status).toBe(200);
      expect(exerciseController.getISOExercisesForTaxYear).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/exercise-requests/:id/generate-form-3921', () => {
    it('should call generateForm3921 controller', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-requests/request-123/generate-form-3921')
        .send({
          companyName: 'Test Company',
          companyEIN: '12-3456789'
        });

      expect(response.status).toBe(201);
      expect(exerciseController.generateForm3921).toHaveBeenCalled();
    });
  });
});
