/**
 * InvestorRights Service Tests
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * TDD: Writing tests FIRST before implementation
 * Tests for the investorRightsService business logic
 */

const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

// Service will be implemented after tests
let investorRightsService;

describe('InvestorRightsService', () => {
  beforeAll(() => {
    try {
      investorRightsService = require('../../../services/investorRightsService');
    } catch (error) {
      investorRightsService = null;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRight', () => {
    it('should create a new investor right with audit entry', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightData = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        shareClassId: 'SC-001',
        rightType: 'PRO_RATA',
        terms: { percentage: 10 }
      };

      const userId = 'user_123';

      const mockCreatedRight = {
        _id: 'mongo_123',
        ...rightData,
        status: 'ACTIVE',
        auditLog: [{
          action: 'CREATED',
          userId,
          timestamp: expect.any(Date),
          changes: rightData
        }]
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedRight);

      const result = await investorRightsService.createRight(rightData, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('ACTIVE');
      expect(databaseAdapter.create).toHaveBeenCalled();
    });

    it('should check for conflicts before creating', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightData = {
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'BOARD_SEAT'
      };

      // Mock finding existing board seat rights that are at capacity
      databaseAdapter.find.mockResolvedValue([
        {
          rightType: 'BOARD_SEAT',
          status: 'ACTIVE',
          terms: { totalSeats: 5, assignedSeats: 5 }
        }
      ]);

      await expect(investorRightsService.createRight(rightData, 'user_123'))
        .rejects.toThrow(/conflict/i);
    });

    it('should generate rightId if not provided', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightData = {
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA'
      };

      // Mock find returning empty for conflict check
      databaseAdapter.find.mockResolvedValue([]);

      // Mock create returning the created right with a generated rightId
      databaseAdapter.create.mockImplementation((modelName, data) => {
        return Promise.resolve({
          _id: 'mongo_123',
          ...data
        });
      });

      const result = await investorRightsService.createRight(rightData, 'user_123');

      expect(result.rightId).toBeDefined();
      expect(typeof result.rightId).toBe('string');
      expect(result.rightId.startsWith('RIGHT-')).toBe(true);
    });
  });

  describe('updateRight', () => {
    it('should update a right and add audit entry', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';
      const updateData = {
        status: 'SUSPENDED',
        terms: { percentage: 15 }
      };
      const userId = 'user_456';

      const existingRight = {
        _id: rightId,
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        terms: { percentage: 10 },
        auditLog: []
      };

      databaseAdapter.findById.mockResolvedValue(existingRight);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...existingRight,
        ...updateData,
        auditLog: [{
          action: 'UPDATED',
          userId,
          timestamp: expect.any(Date),
          previousValues: { status: 'ACTIVE', terms: { percentage: 10 } },
          newValues: updateData
        }]
      });

      const result = await investorRightsService.updateRight(rightId, updateData, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('SUSPENDED');
    });

    it('should throw error when right not found', async () => {
      expect(investorRightsService).not.toBeNull();

      databaseAdapter.findById.mockResolvedValue(null);

      await expect(investorRightsService.updateRight('nonexistent', {}, 'user_123'))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('exerciseRight', () => {
    it('should exercise a right and update history', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';
      const exerciseData = {
        exerciseAmount: 50000,
        exerciseDate: new Date(),
        notes: 'Series B participation'
      };
      const userId = 'user_789';

      const existingRight = {
        _id: rightId,
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        rightType: 'PRO_RATA',
        expirationDate: new Date(Date.now() + 86400000 * 365), // 1 year from now
        exerciseHistory: []
      };

      databaseAdapter.findById.mockResolvedValue(existingRight);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...existingRight,
        exerciseHistory: [{
          ...exerciseData,
          exercisedBy: userId,
          timestamp: expect.any(Date)
        }]
      });

      const result = await investorRightsService.exerciseRight(rightId, exerciseData, userId);

      expect(result).toBeDefined();
      expect(result.exerciseHistory.length).toBe(1);
    });

    it('should throw error when right is expired', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';
      const exerciseData = { exerciseAmount: 50000 };

      const expiredRight = {
        _id: rightId,
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() - 86400000) // Yesterday
      };

      databaseAdapter.findById.mockResolvedValue(expiredRight);

      await expect(investorRightsService.exerciseRight(rightId, exerciseData, 'user_123'))
        .rejects.toThrow(/expired/i);
    });

    it('should throw error when right status is not exercisable', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';

      const nonExercisableRight = {
        _id: rightId,
        status: 'WAIVED',
        expirationDate: new Date(Date.now() + 86400000)
      };

      databaseAdapter.findById.mockResolvedValue(nonExercisableRight);

      await expect(investorRightsService.exerciseRight(rightId, {}, 'user_123'))
        .rejects.toThrow(/cannot be exercised/i);
    });

    it('should mark one-time rights as EXERCISED', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';
      const exerciseData = { boardMember: 'John Doe' };

      const boardSeatRight = {
        _id: rightId,
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        rightType: 'BOARD_SEAT',
        expirationDate: new Date(Date.now() + 86400000 * 365),
        exerciseHistory: []
      };

      databaseAdapter.findById.mockResolvedValue(boardSeatRight);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...boardSeatRight,
        status: 'EXERCISED',
        exerciseHistory: [{ ...exerciseData }]
      });

      const result = await investorRightsService.exerciseRight(rightId, exerciseData, 'user_123');

      expect(result.status).toBe('EXERCISED');
    });
  });

  describe('waiveRight', () => {
    it('should waive a right and add audit entry', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';
      const waiveData = {
        reason: 'Agreed to waive for this round',
        documentReference: 'waiver-doc-001'
      };
      const userId = 'user_123';

      const existingRight = {
        _id: rightId,
        rightId: 'RIGHT-001',
        status: 'ACTIVE',
        auditLog: []
      };

      databaseAdapter.findById.mockResolvedValue(existingRight);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...existingRight,
        status: 'WAIVED',
        waiveDetails: waiveData
      });

      const result = await investorRightsService.waiveRight(rightId, waiveData, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('WAIVED');
    });
  });

  describe('findExpiringRights', () => {
    it('should find rights expiring within specified days', async () => {
      expect(investorRightsService).not.toBeNull();

      const days = 30;
      const companyId = 'COMP-001';

      const expiringRights = [
        {
          _id: 'mongo_1',
          rightId: 'RIGHT-001',
          expirationDate: new Date(Date.now() + 86400000 * 15) // 15 days
        },
        {
          _id: 'mongo_2',
          rightId: 'RIGHT-002',
          expirationDate: new Date(Date.now() + 86400000 * 25) // 25 days
        }
      ];

      databaseAdapter.find.mockResolvedValue(expiringRights);

      const result = await investorRightsService.findExpiringRights(days, companyId);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        expect.objectContaining({
          companyId,
          status: 'ACTIVE',
          expirationDate: expect.any(Object)
        }),
        expect.any(Object)
      );
    });

    it('should default to 30 days if not specified', async () => {
      expect(investorRightsService).not.toBeNull();

      databaseAdapter.find.mockResolvedValue([]);

      await investorRightsService.findExpiringRights();

      expect(databaseAdapter.find).toHaveBeenCalled();
    });
  });

  describe('checkConflicts', () => {
    it('should detect board seat conflicts', async () => {
      expect(investorRightsService).not.toBeNull();

      const newRight = {
        companyId: 'COMP-001',
        investorId: 'INV-002',
        rightType: 'BOARD_SEAT'
      };

      const existingRights = [
        {
          rightType: 'BOARD_SEAT',
          status: 'ACTIVE',
          investorId: 'INV-001',
          terms: { totalSeats: 5, assignedSeats: 5 }
        }
      ];

      databaseAdapter.find.mockResolvedValue(existingRights);

      const conflicts = await investorRightsService.checkConflicts(newRight);

      expect(conflicts).toBeDefined();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('BOARD_SEAT_LIMIT');
    });

    it('should detect veto right conflicts', async () => {
      expect(investorRightsService).not.toBeNull();

      const newRight = {
        companyId: 'COMP-001',
        investorId: 'INV-002',
        rightType: 'VETO_RIGHTS',
        terms: { vetoScope: 'ALL_DECISIONS' }
      };

      const existingRights = [
        {
          rightType: 'VETO_RIGHTS',
          status: 'ACTIVE',
          investorId: 'INV-001',
          terms: { vetoScope: 'ALL_DECISIONS' }
        }
      ];

      databaseAdapter.find.mockResolvedValue(existingRights);

      const conflicts = await investorRightsService.checkConflicts(newRight);

      expect(conflicts).toBeDefined();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('VETO_OVERLAP');
    });

    it('should return empty array when no conflicts', async () => {
      expect(investorRightsService).not.toBeNull();

      const newRight = {
        companyId: 'COMP-001',
        investorId: 'INV-001',
        rightType: 'INFORMATION_RIGHTS'
      };

      databaseAdapter.find.mockResolvedValue([]);

      const conflicts = await investorRightsService.checkConflicts(newRight);

      expect(conflicts).toEqual([]);
    });

    it('should detect pro-rata percentage conflicts', async () => {
      expect(investorRightsService).not.toBeNull();

      const newRight = {
        companyId: 'COMP-001',
        investorId: 'INV-003',
        rightType: 'PRO_RATA',
        terms: { percentage: 30 }
      };

      const existingRights = [
        {
          rightType: 'PRO_RATA',
          status: 'ACTIVE',
          investorId: 'INV-001',
          terms: { percentage: 40 }
        },
        {
          rightType: 'PRO_RATA',
          status: 'ACTIVE',
          investorId: 'INV-002',
          terms: { percentage: 35 }
        }
      ];

      databaseAdapter.find.mockResolvedValue(existingRights);

      const conflicts = await investorRightsService.checkConflicts(newRight);

      expect(conflicts).toBeDefined();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('PRO_RATA_EXCEEDS_100');
    });
  });

  describe('getRightsByInvestor', () => {
    it('should return all rights for an investor', async () => {
      expect(investorRightsService).not.toBeNull();

      const investorId = 'INV-001';

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', investorId, rightType: 'PRO_RATA' },
        { _id: 'mongo_2', rightId: 'RIGHT-002', investorId, rightType: 'INFORMATION_RIGHTS' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      const result = await investorRightsService.getRightsByInvestor(investorId);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        { investorId },
        expect.any(Object)
      );
    });

    it('should filter by status if provided', async () => {
      expect(investorRightsService).not.toBeNull();

      const investorId = 'INV-001';
      const status = 'ACTIVE';

      databaseAdapter.find.mockResolvedValue([]);

      await investorRightsService.getRightsByInvestor(investorId, { status });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        { investorId, status },
        expect.any(Object)
      );
    });
  });

  describe('getRightsByShareClass', () => {
    it('should return all rights for a share class', async () => {
      expect(investorRightsService).not.toBeNull();

      const shareClassId = 'SC-001';

      const mockRights = [
        { _id: 'mongo_1', rightId: 'RIGHT-001', shareClassId, rightType: 'PRO_RATA' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      const result = await investorRightsService.getRightsByShareClass(shareClassId);

      expect(result).toBeDefined();
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InvestorRights',
        { shareClassId },
        expect.any(Object)
      );
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history for a right', async () => {
      expect(investorRightsService).not.toBeNull();

      const rightId = 'mongo_123';

      const mockRight = {
        _id: rightId,
        rightId: 'RIGHT-001',
        auditLog: [
          { action: 'CREATED', timestamp: new Date('2025-01-01') },
          { action: 'UPDATED', timestamp: new Date('2025-02-01') }
        ]
      };

      databaseAdapter.findById.mockResolvedValue(mockRight);

      const result = await investorRightsService.getAuditHistory(rightId);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should throw error when right not found', async () => {
      expect(investorRightsService).not.toBeNull();

      databaseAdapter.findById.mockResolvedValue(null);

      await expect(investorRightsService.getAuditHistory('nonexistent'))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('generateRightsReport', () => {
    it('should generate a summary report for a company', async () => {
      expect(investorRightsService).not.toBeNull();

      const companyId = 'COMP-001';

      const mockRights = [
        { rightType: 'PRO_RATA', status: 'ACTIVE', investorId: 'INV-001' },
        { rightType: 'PRO_RATA', status: 'ACTIVE', investorId: 'INV-002' },
        { rightType: 'BOARD_SEAT', status: 'ACTIVE', investorId: 'INV-001' },
        { rightType: 'BOARD_SEAT', status: 'EXERCISED', investorId: 'INV-002' },
        { rightType: 'INFORMATION_RIGHTS', status: 'ACTIVE', investorId: 'INV-003' }
      ];

      databaseAdapter.find.mockResolvedValue(mockRights);

      const report = await investorRightsService.generateRightsReport(companyId);

      expect(report).toBeDefined();
      expect(report.companyId).toBe(companyId);
      expect(report.totalRights).toBe(5);
      expect(report.byType).toBeDefined();
      expect(report.byStatus).toBeDefined();
      expect(report.byInvestor).toBeDefined();
    });
  });

  describe('validateRightData', () => {
    it('should validate required fields', () => {
      expect(investorRightsService).not.toBeNull();

      const invalidData = {
        investorId: 'INV-001'
        // Missing companyId and rightType
      };

      const result = investorRightsService.validateRightData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate rightType enum', () => {
      expect(investorRightsService).not.toBeNull();

      const invalidData = {
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'INVALID_TYPE'
      };

      const result = investorRightsService.validateRightData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({
        field: 'rightType'
      }));
    });

    it('should pass validation for valid data', () => {
      expect(investorRightsService).not.toBeNull();

      const validData = {
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        terms: { percentage: 10 }
      };

      const result = investorRightsService.validateRightData(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
