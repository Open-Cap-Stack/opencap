/**
 * EquityGrant Routes Unit Tests
 * Issue #77: Create Equity Grant Model and Workflow
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock auth middleware before requiring routes
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  },
  authenticate: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  }
}));

// Mock controller before requiring routes
jest.mock('../../../../controllers/equityGrantController', () => ({
  createEquityGrant: jest.fn((req, res) => res.status(201).json({ success: true })),
  getEquityGrants: jest.fn((req, res) => res.status(200).json([])),
  getEquityGrantById: jest.fn((req, res) => res.status(200).json({ grantId: 'GRANT-001' })),
  updateEquityGrant: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteEquityGrant: jest.fn((req, res) => res.status(200).json({ message: 'deleted' })),
  updateGrantStatus: jest.fn((req, res) => res.status(200).json({ status: 'approved' })),
  exerciseGrant: jest.fn((req, res) => res.status(200).json({ exercised: true })),
  getGrantsByEmployee: jest.fn((req, res) => res.status(200).json([])),
  getGrantTemplates: jest.fn((req, res) => res.status(200).json([])),
  createGrantFromTemplate: jest.fn((req, res) => res.status(201).json({ success: true })),
  getVestingSchedule: jest.fn((req, res) => res.status(200).json({ vestedShares: 2500 })),
  getEmployeeGrantSummary: jest.fn((req, res) => res.status(200).json({ totalGrants: 2 })),
  calculateEquityValue: jest.fn((req, res) => res.status(200).json({ netValue: 50000 }))
}));

const equityGrantRoutes = require('../../../../routes/v1/equityGrantRoutes');
const equityGrantController = require('../../../../controllers/equityGrantController');

describe('EquityGrant Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/equity-grants', equityGrantRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/equity-grants', () => {
    it('should create a new equity grant', async () => {
      const grantData = {
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        grantType: 'ISO',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: '2024-01-15'
      };

      const response = await request(app)
        .post('/api/v1/equity-grants')
        .send(grantData);

      expect(response.status).toBe(201);
      expect(equityGrantController.createEquityGrant).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants', () => {
    it('should get all equity grants', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants');

      expect(response.status).toBe(200);
      expect(equityGrantController.getEquityGrants).toHaveBeenCalled();
    });

    it('should support query filters', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants?status=active&employeeId=EMP-001');

      expect(response.status).toBe(200);
      expect(equityGrantController.getEquityGrants).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants/:id', () => {
    it('should get a specific equity grant', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants/grant123');

      expect(response.status).toBe(200);
      expect(equityGrantController.getEquityGrantById).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/equity-grants/:id', () => {
    it('should update an equity grant', async () => {
      const updateData = { numberOfShares: 15000 };

      const response = await request(app)
        .put('/api/v1/equity-grants/grant123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(equityGrantController.updateEquityGrant).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/equity-grants/:id', () => {
    it('should delete an equity grant', async () => {
      const response = await request(app)
        .delete('/api/v1/equity-grants/grant123');

      expect(response.status).toBe(200);
      expect(equityGrantController.deleteEquityGrant).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/equity-grants/:id/status', () => {
    it('should update grant status', async () => {
      const response = await request(app)
        .patch('/api/v1/equity-grants/grant123/status')
        .send({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(equityGrantController.updateGrantStatus).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/equity-grants/:id/exercise', () => {
    it('should exercise shares from a grant', async () => {
      const response = await request(app)
        .post('/api/v1/equity-grants/grant123/exercise')
        .send({ sharesToExercise: 2500, exercisePrice: 5.00 });

      expect(response.status).toBe(200);
      expect(equityGrantController.exerciseGrant).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants/templates', () => {
    it('should get available grant templates', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants/templates');

      expect(response.status).toBe(200);
      expect(equityGrantController.getGrantTemplates).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/equity-grants/from-template', () => {
    it('should create a grant from template', async () => {
      const response = await request(app)
        .post('/api/v1/equity-grants/from-template')
        .send({
          templateName: 'Standard ISO - 4 Year Vesting',
          employeeId: 'EMP-001',
          numberOfShares: 10000
        });

      expect(response.status).toBe(201);
      expect(equityGrantController.createGrantFromTemplate).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants/:id/vesting', () => {
    it('should get vesting schedule for a grant', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants/grant123/vesting');

      expect(response.status).toBe(200);
      expect(equityGrantController.getVestingSchedule).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants/:id/value', () => {
    it('should calculate equity value for a grant', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants/grant123/value?currentPrice=10.00');

      expect(response.status).toBe(200);
      expect(equityGrantController.calculateEquityValue).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants/employee/:employeeId', () => {
    it('should get grants for a specific employee', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants/employee/EMP-001');

      expect(response.status).toBe(200);
      expect(equityGrantController.getGrantsByEmployee).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/equity-grants/employee/:employeeId/summary', () => {
    it('should get grant summary for an employee', async () => {
      const response = await request(app)
        .get('/api/v1/equity-grants/employee/EMP-001/summary');

      expect(response.status).toBe(200);
      expect(equityGrantController.getEmployeeGrantSummary).toHaveBeenCalled();
    });
  });
});
