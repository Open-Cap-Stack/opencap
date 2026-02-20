/**
 * Stakeholder Controller Test Suite
 *
 * Tests for the ZeroDB-migrated stakeholder controller
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const Stakeholder = require('../../../models/Stakeholder');

// Mock Stakeholder model
jest.mock('../../../models/Stakeholder');

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
      query: {}
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
        projectId: 'PRJ-001'
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
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error creating stakeholder' });
    });
  });

  describe('getAllStakeholders', () => {
    it('should return all stakeholders with pagination', async () => {
      const mockStakeholders = [
        { _id: '1', stakeholderId: 'STK-001', name: 'John Doe', role: 'Investor', projectId: 'PRJ-001' },
        { _id: '2', stakeholderId: 'STK-002', name: 'Jane Smith', role: 'Founder', projectId: 'PRJ-001' }
      ];

      Stakeholder.find.mockResolvedValue(mockStakeholders);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(parsePagination).toHaveBeenCalledWith({});
      expect(Stakeholder.find).toHaveBeenCalledWith({}, { limit: 20, skip: 0 });
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

      expect(Stakeholder.find).toHaveBeenCalledWith(
        { companyId: 'COMP-001' },
        expect.objectContaining({ limit: 20, skip: 0 })
      );
    });

    it('should filter by projectId when provided', async () => {
      mockReq.query.projectId = 'PRJ-001';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        { projectId: 'PRJ-001' },
        expect.objectContaining({ limit: 20, skip: 0 })
      );
    });

    it('should filter by role when provided', async () => {
      mockReq.query.role = 'Investor';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        { role: 'investor' },
        expect.objectContaining({ limit: 20, skip: 0 })
      );
    });

    it('should filter by status when provided', async () => {
      mockReq.query.status = 'Active';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith(
        { status: 'active' },
        expect.objectContaining({ limit: 20, skip: 0 })
      );
    });

    it('should return empty array when no stakeholders exist', async () => {
      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 when Stakeholder.find fails', async () => {
      Stakeholder.find.mockRejectedValue(new Error('Database query error'));

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error fetching stakeholders' });
    });

    it('should pass custom pagination params', async () => {
      mockReq.query = { limit: '10', skip: '5' };

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(parsePagination).toHaveBeenCalledWith({ limit: '10', skip: '5' });
      expect(Stakeholder.find).toHaveBeenCalledWith({}, { limit: 10, skip: 5 });
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
        role: 'Lead Investor',
        projectId: 'PRJ-001'
      };

      Stakeholder.findByIdAndUpdate.mockResolvedValue(mockUpdatedStakeholder);

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findByIdAndUpdate).toHaveBeenCalledWith(
        stakeholderId,
        mockReq.body,
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

      Stakeholder.findByIdAndUpdate.mockResolvedValue(null);
      Stakeholder.findOneAndUpdate.mockResolvedValue(null);

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when Stakeholder.findByIdAndUpdate fails', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      Stakeholder.findByIdAndUpdate.mockRejectedValue(new Error('Database update error'));

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

      Stakeholder.findByIdAndDelete.mockResolvedValue(mockDeletedStakeholder);

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

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

      Stakeholder.findByIdAndDelete.mockResolvedValue(null);
      Stakeholder.findOneAndDelete.mockResolvedValue(mockDeletedStakeholder);

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findByIdAndDelete).toHaveBeenCalledWith('STK-001');
      expect(Stakeholder.findOneAndDelete).toHaveBeenCalledWith({ stakeholderId: 'STK-001' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Stakeholder deleted' });
    });

    it('should return 404 when stakeholder to delete is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      Stakeholder.findByIdAndDelete.mockResolvedValue(null);
      Stakeholder.findOneAndDelete.mockResolvedValue(null);

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when Stakeholder.findByIdAndDelete fails', async () => {
      mockReq.params.id = 'zerodb-id-123';

      Stakeholder.findByIdAndDelete.mockRejectedValue(new Error('Database delete error'));

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
        expect.objectContaining({ limit: 20, skip: 0 })
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
        role: 'Venture Capitalist'
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
        { role: 'board_member' },
        expect.objectContaining({ limit: 20, skip: 0 })
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

      expect(mockRes.json).toHaveBeenCalledWith([
        expect.objectContaining({ role: 'Co Founder', status: 'Active', type: 'Common' })
      ]);
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
        projectId: 'PRJ-001'
      };

      Stakeholder.create.mockResolvedValue({ _id: '1', ...mockReq.body });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(Stakeholder.create).toHaveBeenCalledWith({
        stakeholderId: 'STK-001',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'investor',
        projectId: 'PRJ-001'
      });
    });

    it('should use Stakeholder.findByIdAndUpdate for updates', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      Stakeholder.findByIdAndUpdate.mockResolvedValue({ _id: '123', name: 'Updated Name' });

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findByIdAndUpdate).toHaveBeenCalledWith(
        'zerodb-id-123',
        { name: 'Updated Name' },
        { new: true }
      );
    });

    it('should use Stakeholder.findByIdAndDelete for deletion', async () => {
      mockReq.params.id = 'zerodb-id-123';

      Stakeholder.findByIdAndDelete.mockResolvedValue({ _id: 'zerodb-id-123' });

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findByIdAndDelete).toHaveBeenCalledWith('zerodb-id-123');
    });
  });
});
