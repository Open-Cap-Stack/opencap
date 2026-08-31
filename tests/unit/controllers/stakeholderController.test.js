/**
 * Stakeholder Controller Test Suite
 *
 * Tests for the ZeroDB-migrated stakeholder controller
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const Stakeholder = require('../../../models/Stakeholder');

// Mock Stakeholder model
jest.mock('../../../models/Stakeholder');

// Mock databaseAdapter (used by enrichWithLiveVesting)
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn().mockResolvedValue([]),
}));
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock equityGrantService (used by enrichWithLiveVesting)
jest.mock('../../../services/equityGrantService', () => ({
  calculateVestedShares: jest.fn(),
}));
const equityGrantService = require('../../../services/equityGrantService');

// Mock pagination middleware
jest.mock('../../../middleware/pagination', () => ({
  parsePagination: jest.fn((query) => ({
    limit: parseInt(query.limit) || 20,
    skip: parseInt(query.skip) || 0
  }))
}));

const { parsePagination } = require('../../../middleware/pagination');

// Import controller after mocking
const stakeholderController = require('../../../controllers/stakeholderController');

describe('Stakeholder Controller (ZeroDB)', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request and response
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user_123', companyId: 'company_123', role: 'employee', permissions: [] }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createStakeholder', () => {
    it('should create a new stakeholder successfully', async () => {
      const stakeholderData = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Investor',
        projectId: 'PRJ-001',
        companyId: 'COMP-001'
      };
      mockReq.body = stakeholderData;

      const mockCreatedStakeholder = {
        _id: 'zerodb-id-123',
        ...stakeholderData,
        createdAt: new Date().toISOString()
      };

      Stakeholder.create.mockResolvedValue(mockCreatedStakeholder);

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(Stakeholder.create).toHaveBeenCalledWith({
        ...stakeholderData,
        companyId: 'company_123', // user's companyId overrides body
        role: 'investor'
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        stakeholderId: 'STK-001',
        name: 'John Doe'
      }));
    });

    it('should return 500 when Stakeholder.create fails', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      Stakeholder.create.mockRejectedValue(new Error('Database connection error'));

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database connection error',
        error: 'Database connection error'
      });
    });
  });

  describe('getAllStakeholders', () => {
    it('should return all stakeholders with pagination', async () => {
      const mockStakeholders = [
        { _id: '1', stakeholderId: 'STK-001', name: 'John Doe', role: 'founder', projectId: 'PRJ-001' },
        { _id: '2', stakeholderId: 'STK-002', name: 'Jane Smith', role: 'employee', projectId: 'PRJ-001' }
      ];

      // Controller queries each non-investor role separately and merges
      Stakeholder.find.mockResolvedValue(mockStakeholders);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(parsePagination).toHaveBeenCalledWith({});
      // Called multiple times (once per non-investor role)
      expect(Stakeholder.find).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ stakeholderId: 'STK-001' }),
        expect.objectContaining({ stakeholderId: 'STK-002' })
      ]));
    });

    it('should filter by companyId when provided', async () => {
      mockReq.query.companyId = 'COMP-001';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      // Multi-role query: each call includes the companyId
      expect(Stakeholder.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'COMP-001' }),
        expect.objectContaining({ skip: 0 })
      );
    });

    it('should filter by projectId when provided', async () => {
      mockReq.query.projectId = 'PRJ-001';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company_123', projectId: 'PRJ-001' }),
        expect.objectContaining({ skip: 0 })
      );
    });

    it('should filter by role when provided', async () => {
      mockReq.query.role = 'Investor';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      // When role is explicitly set, it uses single query (not multi-role)
      expect(Stakeholder.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company_123', role: 'investor' }),
        expect.objectContaining({ skip: 0 })
      );
    });

    it('should filter by status when provided', async () => {
      mockReq.query.status = 'Active';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company_123', status: 'active' }),
        expect.objectContaining({ skip: 0 })
      );
    });

    it('should return empty array when no stakeholders exist', async () => {
      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should return empty when all role queries fail gracefully', async () => {
      // Multi-role queries catch errors individually, so total failure returns empty
      Stakeholder.find.mockRejectedValue(new Error('Database query error'));

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should pass custom pagination params', async () => {
      mockReq.query = { limit: '10', skip: '5' };

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(parsePagination).toHaveBeenCalledWith({ limit: '10', skip: '5' });
      expect(Stakeholder.find).toHaveBeenCalled();
    });
  });

  describe('getStakeholderById', () => {
    it('should return a stakeholder by _id successfully', async () => {
      const stakeholderId = 'zerodb-id-123';
      mockReq.params.id = stakeholderId;

      const mockStakeholder = {
        _id: stakeholderId,
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      Stakeholder.findById.mockResolvedValue(mockStakeholder);

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith(stakeholderId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        stakeholder: expect.objectContaining({ stakeholderId: 'STK-001' })
      });
    });

    it('should fall back to stakeholderId lookup when _id not found', async () => {
      mockReq.params.id = 'STK-001';

      const mockStakeholder = {
        _id: 'zerodb-id-123',
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor'
      };

      Stakeholder.findById.mockResolvedValue(null);
      Stakeholder.findOne.mockResolvedValue(mockStakeholder);

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith('STK-001');
      expect(Stakeholder.findOne).toHaveBeenCalledWith({ stakeholderId: 'STK-001' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        stakeholder: expect.objectContaining({ stakeholderId: 'STK-001' })
      });
    });

    it('should return 404 when stakeholder is not found by either id', async () => {
      mockReq.params.id = 'non-existent-id';

      Stakeholder.findById.mockResolvedValue(null);
      Stakeholder.findOne.mockResolvedValue(null);

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when Stakeholder.findById fails', async () => {
      mockReq.params.id = 'zerodb-id-123';

      Stakeholder.findById.mockRejectedValue(new Error('Database query error'));

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error fetching stakeholder' });
    });
  });

  describe('updateStakeholderById', () => {
    it('should update a stakeholder by _id successfully', async () => {
      const stakeholderId = 'zerodb-id-123';
      mockReq.params.id = stakeholderId;
      mockReq.body = {
        name: 'John Doe Updated',
        role: 'Lead Investor'
      };

      const mockUpdatedStakeholder = {
        _id: stakeholderId,
        stakeholderId: 'STK-001',
        name: 'John Doe Updated',
        role: 'lead_investor',
        projectId: 'PRJ-001'
      };

      // Ownership pre-check
      Stakeholder.findById.mockResolvedValue({ _id: stakeholderId });
      Stakeholder.findByIdAndUpdate.mockResolvedValue(mockUpdatedStakeholder);

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith(stakeholderId);
      // role gets normalized to lowercase with underscores
      expect(Stakeholder.findByIdAndUpdate).toHaveBeenCalledWith(
        stakeholderId,
        expect.objectContaining({ name: 'John Doe Updated', role: 'lead_investor' }),
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        stakeholder: expect.objectContaining({ name: 'John Doe Updated' })
      });
    });

    it('should fall back to stakeholderId lookup for update', async () => {
      mockReq.params.id = 'STK-001';
      mockReq.body = { name: 'Updated Name' };

      const mockUpdatedStakeholder = {
        _id: 'zerodb-id-123',
        stakeholderId: 'STK-001',
        name: 'Updated Name'
      };

      // Ownership pre-check: findById returns null, findOne returns result
      Stakeholder.findById.mockResolvedValue(null);
      Stakeholder.findOne.mockResolvedValue({ _id: 'zerodb-id-123', stakeholderId: 'STK-001' });
      Stakeholder.findByIdAndUpdate.mockResolvedValue(null);
      Stakeholder.findOneAndUpdate.mockResolvedValue(mockUpdatedStakeholder);

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findByIdAndUpdate).toHaveBeenCalledWith('STK-001', mockReq.body, { new: true });
      expect(Stakeholder.findOneAndUpdate).toHaveBeenCalledWith(
        { stakeholderId: 'STK-001' },
        mockReq.body,
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when stakeholder to update is not found', async () => {
      mockReq.params.id = 'non-existent-id';
      mockReq.body = { name: 'Updated Name' };

      // Ownership pre-check returns nothing
      Stakeholder.findById.mockResolvedValue(null);
      Stakeholder.findOne.mockResolvedValue(null);

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when Stakeholder.findById fails during ownership check', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      Stakeholder.findById.mockRejectedValue(new Error('Database update error'));

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error updating stakeholder' });
    });
  });

  describe('deleteStakeholderById', () => {
    it('should delete a stakeholder by _id successfully', async () => {
      const stakeholderId = 'zerodb-id-123';
      mockReq.params.id = stakeholderId;

      const mockDeletedStakeholder = {
        _id: stakeholderId,
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor'
      };

      // Ownership pre-check
      Stakeholder.findById.mockResolvedValue(mockDeletedStakeholder);
      Stakeholder.findByIdAndDelete.mockResolvedValue(mockDeletedStakeholder);

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith(stakeholderId);
      expect(Stakeholder.findByIdAndDelete).toHaveBeenCalledWith(stakeholderId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Stakeholder deleted' });
    });

    it('should fall back to stakeholderId lookup for delete', async () => {
      mockReq.params.id = 'STK-001';

      const mockDeletedStakeholder = {
        _id: 'zerodb-id-123',
        stakeholderId: 'STK-001',
        name: 'John Doe'
      };

      // Ownership pre-check: findById null, findOne finds it
      Stakeholder.findById.mockResolvedValue(null);
      Stakeholder.findOne.mockResolvedValue(mockDeletedStakeholder);
      Stakeholder.findByIdAndDelete.mockResolvedValue(null);
      Stakeholder.findOneAndDelete.mockResolvedValue(mockDeletedStakeholder);

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith('STK-001');
      expect(Stakeholder.findByIdAndDelete).toHaveBeenCalledWith('STK-001');
      expect(Stakeholder.findOneAndDelete).toHaveBeenCalledWith({ stakeholderId: 'STK-001' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Stakeholder deleted' });
    });

    it('should return 404 when stakeholder to delete is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      // Ownership pre-check returns nothing
      Stakeholder.findById.mockResolvedValue(null);
      Stakeholder.findOne.mockResolvedValue(null);

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when Stakeholder.findById fails during ownership check', async () => {
      mockReq.params.id = 'zerodb-id-123';

      Stakeholder.findById.mockRejectedValue(new Error('Database delete error'));

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error deleting stakeholder' });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should return 400 for empty request body on create', async () => {
      mockReq.body = {};

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Name is required' });
      expect(Stakeholder.create).not.toHaveBeenCalled();
    });

    it('should handle multiple query filters with pagination', async () => {
      mockReq.query = {
        companyId: 'COMP-001',
        projectId: 'PRJ-001',
        role: 'Investor',
        status: 'Active'
      };

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        {
          companyId: 'COMP-001',
          projectId: 'PRJ-001',
          role: 'investor',
          status: 'active'
        },
        expect.objectContaining({ skip: 0 })
      );
    });

    it('should normalize hyphenated roles to underscore format on create', async () => {
      mockReq.body = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'Co-Founder'
      };

      Stakeholder.create.mockResolvedValue({ _id: '1', ...mockReq.body, role: 'co_founder' });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(Stakeholder.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'co_founder' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should normalize spaced roles to underscore format on create', async () => {
      mockReq.body = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'Venture Capitalist',
        companyId: 'COMP-001'
      };

      Stakeholder.create.mockResolvedValue({ _id: '1', ...mockReq.body, role: 'venture_capitalist' });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(Stakeholder.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'venture_capitalist' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should normalize spaced roles in query filter to underscore format', async () => {
      mockReq.query.role = 'Board Member';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        { companyId: 'company_123', role: 'board_member' },
        expect.objectContaining({ skip: 0 })
      );
    });

    it('should convert underscore roles to title case in display response', async () => {
      const mockStakeholder = {
        _id: '1',
        stakeholderId: 'STK-001',
        name: 'Jane Doe',
        role: 'co_founder',
        status: 'active',
        type: 'common'
      };

      Stakeholder.find.mockResolvedValue([mockStakeholder]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'Co Founder', status: 'Active', type: 'Common' })
        ])
      );
    });
  });

  describe('Integration with Stakeholder Model', () => {
    it('should use Stakeholder.find for fetching stakeholders', async () => {
      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalled();
    });

    it('should use Stakeholder.create for creating stakeholders', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Investor',
        projectId: 'PRJ-001',
        companyId: 'COMP-001'
      };

      Stakeholder.create.mockResolvedValue({ _id: '1', ...mockReq.body });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(Stakeholder.create).toHaveBeenCalledWith({
        stakeholderId: 'STK-001',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'investor',
        projectId: 'PRJ-001',
        companyId: 'company_123' // user's companyId overrides body
      });
    });

    it('should use Stakeholder.findByIdAndUpdate for updates', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      // Ownership check calls findById first
      Stakeholder.findById.mockResolvedValue({ _id: 'zerodb-id-123', name: 'Old Name' });
      Stakeholder.findByIdAndUpdate.mockResolvedValue({ _id: '123', name: 'Updated Name' });

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith('zerodb-id-123');
      expect(Stakeholder.findByIdAndUpdate).toHaveBeenCalledWith(
        'zerodb-id-123',
        { name: 'Updated Name' },
        { new: true }
      );
    });

    it('should use Stakeholder.findByIdAndDelete for deletion', async () => {
      mockReq.params.id = 'zerodb-id-123';

      // Ownership check calls findById first
      Stakeholder.findById.mockResolvedValue({ _id: 'zerodb-id-123' });
      Stakeholder.findByIdAndDelete.mockResolvedValue({ _id: 'zerodb-id-123' });

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findById).toHaveBeenCalledWith('zerodb-id-123');
      expect(Stakeholder.findByIdAndDelete).toHaveBeenCalledWith('zerodb-id-123');
    });
  });

  describe('Vesting-aware share display', () => {
    it('should show vested shares in sharesHeld, not total granted', async () => {
      const advisorStakeholder = {
        row_id: 'stk-advisor-001',
        name: 'Test Advisor',
        role: 'advisor',
        totalGrantedShares: 25000,
        ownershipPercentage: 0.25,
      };

      Stakeholder.find.mockResolvedValue([advisorStakeholder]);

      // Mock finding a linked grant with 20-month vesting on a 4-year schedule
      databaseAdapter.find.mockResolvedValue([{
        employeeId: 'stk-advisor-001',
        numberOfShares: 25000,
        status: 'active',
        grantDate: '2026-01-01',
        vestingSchedule: {
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
          vestingStartDate: '2026-01-01',
        },
      }]);

      // Mock the vesting calculation to return 20 months vested
      equityGrantService.calculateVestedShares.mockReturnValue({
        vestedShares: 10416,
        vestedPercentage: 41.67,
        unvestedShares: 14584,
      });

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const result = mockRes.json.mock.calls[0][0];
      const advisor = result.find(s => s.name === 'Test Advisor');

      expect(advisor).toBeDefined();
      expect(advisor.sharesHeld).toBe(10416);
      expect(advisor.sharesOwned).toBe(10416);
      expect(advisor.shares).toBe(10416);
      expect(advisor.issuedShares).toBe(25000);
    });

    it('should compute vestedOwnershipPercentage proportionally', async () => {
      const advisorStakeholder = {
        row_id: 'stk-advisor-002',
        name: 'Ownership Advisor',
        role: 'advisor',
        totalGrantedShares: 25000,
        ownershipPercentage: 0.25,
      };

      Stakeholder.find.mockResolvedValue([advisorStakeholder]);

      databaseAdapter.find.mockResolvedValue([{
        employeeId: 'stk-advisor-002',
        numberOfShares: 25000,
        status: 'active',
        vestingSchedule: {
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
          vestingStartDate: '2025-01-01',
        },
      }]);

      // 50% vested
      equityGrantService.calculateVestedShares.mockReturnValue({
        vestedShares: 12500,
        vestedPercentage: 50,
        unvestedShares: 12500,
      });

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      const result = mockRes.json.mock.calls[0][0];
      const advisor = result.find(s => s.name === 'Ownership Advisor');

      // Full ownership is 0.25%, 50% vested = 0.125% vested ownership
      expect(advisor.vestedOwnershipPercentage).toBe(0.125);
      expect(advisor.sharesHeld).toBe(12500);
    });

    it('should show zero shares before cliff period', async () => {
      const advisorStakeholder = {
        row_id: 'stk-new-001',
        name: 'New Advisor',
        role: 'advisor',
        totalGrantedShares: 25000,
        ownershipPercentage: 0.25,
      };

      Stakeholder.find.mockResolvedValue([advisorStakeholder]);

      databaseAdapter.find.mockResolvedValue([{
        employeeId: 'stk-new-001',
        numberOfShares: 25000,
        status: 'active',
        vestingSchedule: {
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
          vestingStartDate: '2026-08-01',
        },
      }]);

      // Before cliff — 0 vested
      equityGrantService.calculateVestedShares.mockReturnValue({
        vestedShares: 0,
        vestedPercentage: 0,
        unvestedShares: 25000,
      });

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      const result = mockRes.json.mock.calls[0][0];
      const advisor = result.find(s => s.name === 'New Advisor');

      expect(advisor.sharesHeld).toBe(0);
      expect(advisor.vestedOwnershipPercentage).toBe(0);
      expect(advisor.issuedShares).toBe(25000);
    });

    it('should fallback gracefully when grant lookup fails', async () => {
      const advisorStakeholder = {
        row_id: 'stk-error-001',
        name: 'Error Advisor',
        role: 'advisor',
        totalGrantedShares: 25000,
        totalVestedShares: 5000,
        ownershipPercentage: 0.25,
      };

      Stakeholder.find.mockResolvedValue([advisorStakeholder]);

      // Simulate database error
      databaseAdapter.find.mockRejectedValue(new Error('Connection timeout'));

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const result = mockRes.json.mock.calls[0][0];
      const advisor = result.find(s => s.name === 'Error Advisor');

      // Should fallback to stored totalVestedShares
      expect(advisor.sharesHeld).toBe(5000);
    });

    it('should enrich single stakeholder with live vesting on getById', async () => {
      mockReq.params.id = 'stk-detail-001';

      const mockStakeholder = {
        row_id: 'stk-detail-001',
        name: 'Detail Advisor',
        role: 'advisor',
        companyId: 'company_123',
        totalGrantedShares: 10000,
        ownershipPercentage: 0.1,
      };

      Stakeholder.findById.mockResolvedValue(mockStakeholder);

      databaseAdapter.find.mockResolvedValue([{
        employeeId: 'stk-detail-001',
        numberOfShares: 10000,
        status: 'active',
        vestingSchedule: {
          vestingPeriodMonths: 24,
          cliffMonths: 0,
          vestingFrequency: 'monthly',
          vestingStartDate: '2026-01-01',
        },
      }]);

      // 8 months vested on a 24-month schedule = ~3333 shares
      equityGrantService.calculateVestedShares.mockReturnValue({
        vestedShares: 3333,
        vestedPercentage: 33.33,
        unvestedShares: 6667,
      });

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const result = mockRes.json.mock.calls[0][0];
      const stakeholder = result.stakeholder;

      expect(stakeholder.sharesHeld).toBe(3333);
      expect(stakeholder.issuedShares).toBe(10000);
      expect(stakeholder.vestedOwnershipPercentage).toBeCloseTo(0.0333, 3);
    });
  });
});
