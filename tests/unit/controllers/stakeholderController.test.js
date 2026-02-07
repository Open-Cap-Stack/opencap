/**
 * Stakeholder Controller Test Suite
 *
 * Tests for the ZeroDB-migrated stakeholder controller
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const Stakeholder = require('../../../models/Stakeholder');

// Mock Stakeholder model
jest.mock('../../../models/Stakeholder');

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

      expect(Stakeholder.create).toHaveBeenCalledWith(stakeholderData);
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
    it('should return all stakeholders successfully', async () => {
      const mockStakeholders = [
        { _id: '1', stakeholderId: 'STK-001', name: 'John Doe', role: 'Investor', projectId: 'PRJ-001' },
        { _id: '2', stakeholderId: 'STK-002', name: 'Jane Smith', role: 'Founder', projectId: 'PRJ-001' }
      ];

      Stakeholder.find.mockResolvedValue(mockStakeholders);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith({});
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

      expect(Stakeholder.find).toHaveBeenCalledWith({ companyId: 'COMP-001' });
    });

    it('should filter by projectId when provided', async () => {
      mockReq.query.projectId = 'PRJ-001';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith({ projectId: 'PRJ-001' });
    });

    it('should filter by role when provided', async () => {
      mockReq.query.role = 'Investor';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith({ role: 'Investor' });
    });

    it('should filter by status when provided', async () => {
      mockReq.query.status = 'Active';

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith({ status: 'Active' });
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
  });

  describe('getStakeholderById', () => {
    it('should return a stakeholder by id successfully', async () => {
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

    it('should return 404 when stakeholder is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      Stakeholder.findById.mockResolvedValue(null);

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
    it('should update a stakeholder successfully', async () => {
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
        { $set: mockReq.body },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        stakeholder: expect.objectContaining({ name: 'John Doe Updated' })
      });
    });

    it('should return 404 when stakeholder to update is not found', async () => {
      mockReq.params.id = 'non-existent-id';
      mockReq.body = { name: 'Updated Name' };

      Stakeholder.findByIdAndUpdate.mockResolvedValue(null);

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
    it('should delete a stakeholder successfully', async () => {
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

    it('should return 404 when stakeholder to delete is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      Stakeholder.findByIdAndDelete.mockResolvedValue(null);

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
    it('should handle empty request body for create', async () => {
      mockReq.body = {};

      Stakeholder.create.mockResolvedValue({
        _id: 'test-id',
        stakeholderId: 'stakeholder_generated',
        createdAt: new Date().toISOString()
      });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      // The controller now accepts any body (model handles defaults)
      expect(Stakeholder.create).toHaveBeenCalledWith({});
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle multiple query filters', async () => {
      mockReq.query = {
        companyId: 'COMP-001',
        projectId: 'PRJ-001',
        role: 'Investor',
        status: 'Active'
      };

      Stakeholder.find.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(Stakeholder.find).toHaveBeenCalledWith({
        companyId: 'COMP-001',
        projectId: 'PRJ-001',
        role: 'Investor',
        status: 'Active'
      });
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
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      Stakeholder.create.mockResolvedValue({ _id: '1', ...mockReq.body });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(Stakeholder.create).toHaveBeenCalledWith(mockReq.body);
    });

    it('should use Stakeholder.findByIdAndUpdate for updates', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      Stakeholder.findByIdAndUpdate.mockResolvedValue({ _id: '123', name: 'Updated Name' });

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(Stakeholder.findByIdAndUpdate).toHaveBeenCalledWith(
        'zerodb-id-123',
        { $set: { name: 'Updated Name' } },
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
