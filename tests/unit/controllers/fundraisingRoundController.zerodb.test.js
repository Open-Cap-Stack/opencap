/**
 * FundraisingRound Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Tests for the fundraising round controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const fundraisingRoundController = require('../../../controllers/fundraisingRoundController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

describe('FundraisingRoundController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createFundraisingRound', () => {
    it('should create a fundraising round successfully', async () => {
      const roundData = {
        RoundID: 'FR-001',
        RoundName: 'Series A',
        TargetAmount: 10000000,
        RaisedAmount: 5000000,
        Status: 'Active',
        StartDate: new Date().toISOString(),
        EndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      };

      req.body = roundData;

      const mockCreatedRound = {
        _id: 'mongo_123',
        ...roundData
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedRound);

      await fundraisingRoundController.createFundraisingRound(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('FundraisingRound', roundData);
    });

    it('should handle validation errors', async () => {
      req.body = {}; // Empty body

      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await fundraisingRoundController.createFundraisingRound(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        RoundID: 'FR-001',
        RoundName: 'Series A',
        TargetAmount: 10000000
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await fundraisingRoundController.createFundraisingRound(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getFundraisingRounds', () => {
    it('should return all fundraising rounds', async () => {
      const mockRounds = [
        { _id: 'mongo_1', RoundID: 'FR-001', RoundName: 'Series A', Status: 'Active' },
        { _id: 'mongo_2', RoundID: 'FR-002', RoundName: 'Series B', Status: 'Completed' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRounds);

      await fundraisingRoundController.getFundraisingRounds(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('FundraisingRound', {}, expect.any(Object));
    });

    it('should return empty array when no rounds exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await fundraisingRoundController.getFundraisingRounds(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await fundraisingRoundController.getFundraisingRounds(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getFundraisingRoundById', () => {
    it('should return fundraising round by ID', async () => {
      req.params = { id: 'mongo_123' };
      const mockRound = {
        _id: 'mongo_123',
        RoundID: 'FR-001',
        RoundName: 'Series A',
        TargetAmount: 10000000
      };

      databaseAdapter.findById.mockResolvedValue(mockRound);

      await fundraisingRoundController.getFundraisingRoundById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('FundraisingRound', 'mongo_123');
    });

    it('should return 404 when round not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await fundraisingRoundController.getFundraisingRoundById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Fundraising round not found');
    });

    it('should handle database errors', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await fundraisingRoundController.getFundraisingRoundById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateFundraisingRound', () => {
    it('should update a fundraising round successfully', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { RaisedAmount: 7500000, Status: 'Active' };

      const mockUpdatedRound = {
        _id: 'mongo_123',
        RoundID: 'FR-001',
        RaisedAmount: 7500000,
        Status: 'Active'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedRound);

      await fundraisingRoundController.updateFundraisingRound(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'FundraisingRound',
        'mongo_123',
        req.body,
        expect.any(Object)
      );
    });

    it('should return 404 when round to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { Status: 'Completed' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await fundraisingRoundController.updateFundraisingRound(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Fundraising round not found');
    });

    it('should handle validation errors during update', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { TargetAmount: 'invalid' }; // Should be number

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Validation error'));

      await fundraisingRoundController.updateFundraisingRound(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteFundraisingRound', () => {
    it('should delete a fundraising round successfully', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await fundraisingRoundController.deleteFundraisingRound(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('FundraisingRound', 'mongo_123');
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Fundraising round deleted');
    });

    it('should return 404 when round to delete not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await fundraisingRoundController.deleteFundraisingRound(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Fundraising round not found');
    });

    it('should handle database errors during delete', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await fundraisingRoundController.deleteFundraisingRound(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      req.body = {
        RoundID: 'FR-001',
        RoundName: 'Series A',
        TargetAmount: 10000000
      };

      const zerodbResult = {
        id: 'zero_123',
        ...req.body
      };

      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await fundraisingRoundController.createFundraisingRound(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode consistency', async () => {
      req.params = { id: 'mongo_123' };

      const parallelResult = {
        _id: 'mongo_123',
        RoundID: 'FR-001',
        RoundName: 'Series A'
      };

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await fundraisingRoundController.getFundraisingRoundById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.RoundID).toBe('FR-001');
    });
  });
});
