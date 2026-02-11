/**
 * Investor Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Tests for the investor controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const investorController = require('../../../controllers/investorController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('InvestorController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createInvestor', () => {
    it('should create an investor successfully', async () => {
      const investorData = {
        investorId: 'INV-001',
        investmentAmount: 1000000,
        equityPercentage: 10.5,
        investorType: 'Angel',
        relatedFundraisingRound: 'FR-001'
      };

      req.body = investorData;

      const mockCreatedInvestor = {
        _id: 'mongo_123',
        ...investorData
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedInvestor);

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('Investor', investorData);
    });

    it('should return 400 when investorId is missing', async () => {
      req.body = {
        investmentAmount: 1000000,
        equityPercentage: 10.5,
        investorType: 'Angel',
        relatedFundraisingRound: 'FR-001'
      };

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('All fields are required');
    });

    it('should return 400 when investmentAmount is missing', async () => {
      req.body = {
        investorId: 'INV-001',
        equityPercentage: 10.5,
        investorType: 'Angel',
        relatedFundraisingRound: 'FR-001'
      };

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when equityPercentage is missing', async () => {
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 1000000,
        investorType: 'Angel',
        relatedFundraisingRound: 'FR-001'
      };

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when investorType is missing', async () => {
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 1000000,
        equityPercentage: 10.5,
        relatedFundraisingRound: 'FR-001'
      };

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when relatedFundraisingRound is missing', async () => {
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 1000000,
        equityPercentage: 10.5,
        investorType: 'Angel'
      };

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 1000000,
        equityPercentage: 10.5,
        investorType: 'Angel',
        relatedFundraisingRound: 'FR-001'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Error creating investor');
    });
  });

  describe('getInvestorById', () => {
    it('should return investor by ID', async () => {
      req.params = { id: 'mongo_123' };
      const mockInvestor = {
        _id: 'mongo_123',
        investorId: 'INV-001',
        investmentAmount: 1000000,
        investorType: 'Angel'
      };

      databaseAdapter.findById.mockResolvedValue(mockInvestor);

      await investorController.getInvestorById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('Investor', 'mongo_123');
      const data = JSON.parse(res._getData());
      expect(data.investor).toBeDefined();
      expect(data.investor.investorId).toBe('INV-001');
    });

    it('should return 404 when investor not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await investorController.getInvestorById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Investor not found');
    });

    it('should handle database errors', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await investorController.getInvestorById(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Error fetching investor');
    });
  });

  describe('getAllInvestors', () => {
    it('should return all investors', async () => {
      const mockInvestors = [
        { _id: 'mongo_1', investorId: 'INV-001', investorType: 'Angel' },
        { _id: 'mongo_2', investorId: 'INV-002', investorType: 'VC' }
      ];

      databaseAdapter.find.mockResolvedValue(mockInvestors);

      await investorController.getAllInvestors(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('Investor', {}, expect.any(Object));
      const data = JSON.parse(res._getData());
      expect(data.investors).toBeDefined();
      expect(data.investors.length).toBe(2);
    });

    it('should return empty array when no investors exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await investorController.getAllInvestors(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investors).toEqual([]);
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await investorController.getAllInvestors(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Error fetching investors');
    });
  });

  describe('updateInvestor', () => {
    it('should update an investor successfully', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 2000000,
        equityPercentage: 15.0,
        investorType: 'VC',
        relatedFundraisingRound: 'FR-002'
      };

      const mockUpdatedInvestor = {
        _id: 'mongo_123',
        ...req.body
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedInvestor);

      await investorController.updateInvestor(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Investor',
        'mongo_123',
        expect.objectContaining({
          investorId: 'INV-001',
          investmentAmount: 2000000
        }),
        expect.any(Object)
      );
    });

    it('should return 400 when required fields are missing in update', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { investmentAmount: 2000000 }; // Missing other required fields

      await investorController.updateInvestor(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('All fields are required');
    });

    it('should return 404 when investor to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 2000000,
        equityPercentage: 15.0,
        investorType: 'VC',
        relatedFundraisingRound: 'FR-002'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await investorController.updateInvestor(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Investor not found');
    });

    it('should handle database errors during update', async () => {
      req.params = { id: 'mongo_123' };
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 2000000,
        equityPercentage: 15.0,
        investorType: 'VC',
        relatedFundraisingRound: 'FR-002'
      };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await investorController.updateInvestor(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Error updating investor');
    });
  });

  describe('deleteInvestor', () => {
    it('should delete an investor successfully', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await investorController.deleteInvestor(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Investor', 'mongo_123');
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Investor deleted');
    });

    it('should return 404 when investor to delete not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await investorController.deleteInvestor(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Investor not found');
    });

    it('should handle database errors during delete', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await investorController.deleteInvestor(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error.message).toBe('Error deleting investor');
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      req.body = {
        investorId: 'INV-001',
        investmentAmount: 1000000,
        equityPercentage: 10.5,
        investorType: 'Angel',
        relatedFundraisingRound: 'FR-001'
      };

      const zerodbResult = {
        id: 'zero_123',
        ...req.body
      };

      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await investorController.createInvestor(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode consistency', async () => {
      req.params = { id: 'mongo_123' };

      const parallelResult = {
        _id: 'mongo_123',
        investorId: 'INV-001',
        investmentAmount: 1000000
      };

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await investorController.getInvestorById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investor.investorId).toBe('INV-001');
    });
  });
});
