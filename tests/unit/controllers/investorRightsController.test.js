/**
 * InvestorRights Controller Tests
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * TDD: Writing tests FIRST before implementation
 * Tests for the investorRightsController using DatabaseAdapter
 */

const httpMocks = require('node-mocks-http');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

// Controller will be implemented after tests
let investorRightsController;

describe('InvestorRightsController', () => {
  let req, res;

  beforeAll(() => {
    try {
      investorRightsController = require('../../../controllers/investorRightsController');
    } catch (error) {
      investorRightsController = null;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createInvestorRight', () => {
    it('should create an investor right successfully', async () => {
      expect(investorRightsController).not.toBeNull();

      const rightData = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        shareClassId: 'SC-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE',
        terms: {
          percentage: 10,
          description: 'Pro-rata participation right'
        },
        expirationDate: '2030-12-31'
      };

      req.body = rightData;

      const mockCreatedRight = {
        _id: 'mongo_123',
        ...rightData
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedRight);

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('InvestorRights', expect.objectContaining({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        rightType: 'PRO_RATA'
      }));
    });

    it('should return 400 when rightId is missing', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA'
      };

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('required');
    });

    it('should return 400 when investorId is missing', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        rightId: 'RIGHT-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA'
      };

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when companyId is missing', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        rightType: 'PRO_RATA'
      };

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when rightType is missing', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001'
      };

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Error');
    });
  });

  describe('getInvestorRightById', () => {
    it('should return investor right by ID', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };
      const mockRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE'
      };

      databaseAdapter.findById.mockResolvedValue(mockRight);

      await investorRightsController.getInvestorRightById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('InvestorRights', 'mongo_123');
      const data = JSON.parse(res._getData());
      expect(data.investorRight).toBeDefined();
      expect(data.investorRight.rightId).toBe('RIGHT-001');
    });

    it('should return 404 when investor right not found', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await investorRightsController.getInvestorRightById(req, res);

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('not found');
    });

    it('should handle database errors', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };

      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await investorRightsController.getInvestorRightById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getAllInvestorRights', () => {
    it('should return all investor rights', async () => {
      expect(investorRightsController).not.toBeNull();

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', rightType: 'PRO_RATA' },
        { _id: 'mongo_2', rightId: 'RIGHT-002', rightType: 'BOARD_SEAT' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investorRights).toBeDefined();
      expect(data.investorRights.length).toBe(2);
    });

    it('should filter by investorId', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = { investorId: 'INV-001' };

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', investorId: 'INV-001' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        expect.objectContaining({ investorId: 'INV-001' }),
        expect.any(Object)
      );
    });

    it('should filter by companyId', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = { companyId: 'COMP-001' };

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', companyId: 'COMP-001' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        expect.objectContaining({ companyId: 'COMP-001' }),
        expect.any(Object)
      );
    });

    it('should filter by rightType', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = { rightType: 'PRO_RATA' };

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', rightType: 'PRO_RATA' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should filter by status', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = { status: 'ACTIVE' };

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', status: 'ACTIVE' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should filter by shareClassId', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = { shareClassId: 'SC-001' };

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', shareClassId: 'SC-001' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return empty array when no rights exist', async () => {
      expect(investorRightsController).not.toBeNull();

      databaseAdapter.find.mockResolvedValue([]);

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investorRights).toEqual([]);
    });

    it('should handle database errors', async () => {
      expect(investorRightsController).not.toBeNull();

      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await investorRightsController.getAllInvestorRights(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateInvestorRight', () => {
    it('should update an investor right successfully', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };
      req.body = {
        status: 'WAIVED',
        terms: {
          percentage: 15,
          description: 'Updated terms'
        }
      };

      const existingRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        terms: { percentage: 10 },
        auditLog: []
      };

      const mockUpdatedRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        status: 'WAIVED',
        terms: req.body.terms
      };

      // Service calls findById first, then findByIdAndUpdate
      databaseAdapter.findById.mockResolvedValue(existingRight);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedRight);

      await investorRightsController.updateInvestorRight(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'InvestorRights',
        'mongo_123',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should return 404 when investor right to update not found', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'nonexistent_id' };
      req.body = { status: 'WAIVED' };

      // Service calls findById first, which returns null
      databaseAdapter.findById.mockResolvedValue(null);

      await investorRightsController.updateInvestorRight(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle database errors during update', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };
      req.body = { status: 'WAIVED' };

      const existingRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        auditLog: []
      };

      databaseAdapter.findById.mockResolvedValue(existingRight);
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await investorRightsController.updateInvestorRight(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('deleteInvestorRight', () => {
    it('should delete an investor right successfully', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await investorRightsController.deleteInvestorRight(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('InvestorRights', 'mongo_123');
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('deleted');
    });

    it('should return 404 when investor right to delete not found', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await investorRightsController.deleteInvestorRight(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle database errors during delete', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await investorRightsController.deleteInvestorRight(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('exerciseRight', () => {
    it('should exercise a right successfully', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };
      req.body = {
        exerciseAmount: 50000,
        exerciseDate: '2025-06-15',
        notes: 'Exercised pro-rata for Series B'
      };

      const mockRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        rightType: 'PRO_RATA',
        expirationDate: new Date('2030-12-31')
      };

      databaseAdapter.findById.mockResolvedValue(mockRight);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockRight,
        exerciseHistory: [req.body]
      });

      await investorRightsController.exerciseRight(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('exercised');
    });

    it('should return 400 when right is not exercisable (expired)', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };
      req.body = { exerciseAmount: 50000 };

      const mockRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        rightType: 'PRO_RATA',
        expirationDate: new Date('2020-01-01') // Expired
      };

      databaseAdapter.findById.mockResolvedValue(mockRight);

      await investorRightsController.exerciseRight(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('expired');
    });

    it('should return 400 when right is already exercised', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };
      req.body = { exerciseAmount: 50000 };

      const mockRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        status: 'EXERCISED',
        rightType: 'PRO_RATA'
      };

      databaseAdapter.findById.mockResolvedValue(mockRight);

      await investorRightsController.exerciseRight(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when right not found', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'nonexistent_id' };
      req.body = { exerciseAmount: 50000 };

      databaseAdapter.findById.mockResolvedValue(null);

      await investorRightsController.exerciseRight(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getExpiringRights', () => {
    it('should return rights expiring within specified days', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = { days: '30' };

      const mockExpiringRights = [
        {
          _id: 'mongo_1',
          rightId: 'RIGHT-001',
          expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockExpiringRights);

      await investorRightsController.getExpiringRights(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.expiringRights).toBeDefined();
    });

    it('should default to 30 days if not specified', async () => {
      expect(investorRightsController).not.toBeNull();

      req.query = {};

      databaseAdapter.find.mockResolvedValue([]);

      await investorRightsController.getExpiringRights(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('checkConflicts', () => {
    it('should detect conflicts between rights', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        companyId: 'COMP-001',
        investorId: 'INV-001',
        rightType: 'BOARD_SEAT'
      };

      const existingRights = [
        {
          _id: 'mongo_1',
          rightId: 'RIGHT-001',
          investorId: 'INV-002',
          companyId: 'COMP-001',
          rightType: 'BOARD_SEAT',
          status: 'ACTIVE',
          terms: { totalSeats: 5, assignedSeats: 5 }
        }
      ];

      databaseAdapter.find.mockResolvedValue(existingRights);

      await investorRightsController.checkConflicts(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.conflicts).toBeDefined();
    });

    it('should return no conflicts when none exist', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        companyId: 'COMP-001',
        investorId: 'INV-001',
        rightType: 'PRO_RATA'
      };

      databaseAdapter.find.mockResolvedValue([]);

      await investorRightsController.checkConflicts(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.conflicts).toEqual([]);
      expect(data.hasConflicts).toBe(false);
    });
  });

  describe('getRightsByShareClass', () => {
    it('should return rights for a specific share class', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { shareClassId: 'SC-001' };

      const mockRights = [
        {
          _id: 'mongo_1',
          rightId: 'RIGHT-001',
          shareClassId: 'SC-001',
          rightType: 'PRO_RATA'
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      await investorRightsController.getRightsByShareClass(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        expect.objectContaining({ shareClassId: 'SC-001' }),
        expect.any(Object)
      );
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history for a right', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };

      const mockRight = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        auditLog: [
          {
            action: 'CREATED',
            timestamp: new Date('2025-01-01'),
            userId: 'user_1',
            changes: { status: 'ACTIVE' }
          },
          {
            action: 'UPDATED',
            timestamp: new Date('2025-02-01'),
            userId: 'user_2',
            changes: { terms: { percentage: 15 } }
          }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockRight);

      await investorRightsController.getAuditHistory(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.auditLog).toBeDefined();
      expect(data.auditLog.length).toBe(2);
    });

    it('should return 404 when right not found', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await investorRightsController.getAuditHistory(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      expect(investorRightsController).not.toBeNull();

      req.body = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA'
      };

      const zerodbResult = {
        id: 'zero_123',
        ...req.body
      };

      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await investorRightsController.createInvestorRight(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode consistency', async () => {
      expect(investorRightsController).not.toBeNull();

      req.params = { id: 'mongo_123' };

      const parallelResult = {
        _id: 'mongo_123',
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        rightType: 'PRO_RATA'
      };

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await investorRightsController.getInvestorRightById(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.investorRight.rightId).toBe('RIGHT-001');
    });
  });
});
