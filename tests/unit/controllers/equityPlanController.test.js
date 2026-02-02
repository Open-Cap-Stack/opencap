/**
 * EquityPlan Controller Unit Tests
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 1)
 * TDD Red Phase: Tests written before migration
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const equityPlanController = require('../../../controllers/equityPlanController');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityPlan Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createEquityPlan', () => {
    const validPlanData = {
      planName: 'Employee Stock Option Plan',
      planType: 'ISO',
      totalShares: 1000000,
      vestingSchedule: '4 years with 1 year cliff',
      startDate: '2024-01-01'
    };

    it('should create an equity plan successfully', async () => {
      req.body = validPlanData;
      const mockSavedPlan = { _id: 'plan123', ...validPlanData };
      databaseAdapter.create.mockResolvedValue(mockSavedPlan);

      await equityPlanController.createEquityPlan(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('EquityPlan', validPlanData);
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedPlan);
    });

    it('should return 400 on validation error', async () => {
      req.body = validPlanData;
      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await equityPlanController.createEquityPlan(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getEquityPlans', () => {
    it('should return all equity plans', async () => {
      const mockPlans = [
        { _id: 'plan1', planName: 'Plan A', totalShares: 1000000 },
        { _id: 'plan2', planName: 'Plan B', totalShares: 2000000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockPlans);

      await equityPlanController.getEquityPlans(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityPlan', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockPlans);
    });

    it('should return empty array when no plans exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await equityPlanController.getEquityPlans(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await equityPlanController.getEquityPlans(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getEquityPlanById', () => {
    it('should return equity plan by ID', async () => {
      const mockPlan = { _id: 'plan123', planName: 'Plan A', totalShares: 1000000 };
      req.params = { id: 'plan123' };
      databaseAdapter.findById.mockResolvedValue(mockPlan);

      await equityPlanController.getEquityPlanById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('EquityPlan', 'plan123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockPlan);
    });

    it('should return 404 when plan not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await equityPlanController.getEquityPlanById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity plan not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'plan123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await equityPlanController.getEquityPlanById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('updateEquityPlan', () => {
    it('should update equity plan successfully', async () => {
      req.params = { id: 'plan123' };
      req.body = { planName: 'Updated Plan Name', totalShares: 1500000 };
      const mockUpdatedPlan = { _id: 'plan123', planName: 'Updated Plan Name', totalShares: 1500000 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedPlan);

      await equityPlanController.updateEquityPlan(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith('EquityPlan', 'plan123', req.body, { new: true });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedPlan);
    });

    it('should return 404 when plan not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { planName: 'Updated Plan Name' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await equityPlanController.updateEquityPlan(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity plan not found');
    });

    it('should return 400 on validation error', async () => {
      req.params = { id: 'plan123' };
      req.body = { totalShares: -1000 };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Validation error'));

      await equityPlanController.updateEquityPlan(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('deleteEquityPlan', () => {
    it('should delete equity plan successfully', async () => {
      req.params = { id: 'plan123' };
      const mockDeletedPlan = { _id: 'plan123', planName: 'Plan A' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedPlan);

      await equityPlanController.deleteEquityPlan(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('EquityPlan', 'plan123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity plan deleted');
    });

    it('should return 404 when plan not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await equityPlanController.deleteEquityPlan(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Equity plan not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'plan123' };
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await equityPlanController.deleteEquityPlan(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });
});
