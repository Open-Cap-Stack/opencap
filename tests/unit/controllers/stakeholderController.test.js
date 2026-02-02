/**
 * Stakeholder Controller Test Suite
 *
 * Tests for the ZeroDB-migrated stakeholder controller
 * Issue #17: Migrate Stakeholder controller to ZeroDB
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

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
      params: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset ZeroDB service mock
    zerodbService.insertRow = jest.fn();
    zerodbService.queryRows = jest.fn();
    zerodbService.queryTable = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
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
        id: 'zerodb-id-123',
        ...stakeholderData,
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow.mockResolvedValue({
        rows: [mockCreatedStakeholder]
      });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', stakeholderData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreatedStakeholder);
    });

    it('should return 400 when stakeholderId is missing', async () => {
      mockReq.body = {
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should return 400 when role is missing', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        projectId: 'PRJ-001'
      };

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should return 400 when projectId is missing', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor'
      };

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should return 500 when ZeroDB insert fails', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      zerodbService.insertRow.mockRejectedValue(new Error('ZeroDB connection error'));

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error creating stakeholder' });
    });
  });

  describe('getAllStakeholders', () => {
    it('should return all stakeholders successfully', async () => {
      const mockStakeholders = [
        { id: '1', stakeholderId: 'STK-001', name: 'John Doe', role: 'Investor', projectId: 'PRJ-001' },
        { id: '2', stakeholderId: 'STK-002', name: 'Jane Smith', role: 'Founder', projectId: 'PRJ-001' }
      ];

      zerodbService.queryTable.mockResolvedValue(mockStakeholders);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('stakeholders', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStakeholders);
    });

    it('should return empty array when no stakeholders exist', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should return 500 when ZeroDB query fails', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query error'));

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
        id: stakeholderId,
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      zerodbService.queryTable.mockResolvedValue([mockStakeholder]);

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('stakeholders', {
        filter: { id: stakeholderId }
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ stakeholder: mockStakeholder });
    });

    it('should return 404 when stakeholder is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      zerodbService.queryTable.mockResolvedValue([]);

      await stakeholderController.getStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when ZeroDB query fails', async () => {
      mockReq.params.id = 'zerodb-id-123';

      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query error'));

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
        id: stakeholderId,
        stakeholderId: 'STK-001',
        name: 'John Doe Updated',
        role: 'Lead Investor',
        projectId: 'PRJ-001'
      };

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 1,
        rows: [mockUpdatedStakeholder]
      });

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'stakeholders',
        { id: stakeholderId },
        { $set: mockReq.body }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ stakeholder: mockUpdatedStakeholder });
    });

    it('should return 404 when stakeholder to update is not found', async () => {
      mockReq.params.id = 'non-existent-id';
      mockReq.body = { name: 'Updated Name' };

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 0,
        rows: []
      });

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when ZeroDB update fails', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      zerodbService.updateRows.mockRejectedValue(new Error('ZeroDB update error'));

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error updating stakeholder' });
    });
  });

  describe('deleteStakeholderById', () => {
    it('should delete a stakeholder successfully', async () => {
      const stakeholderId = 'zerodb-id-123';
      mockReq.params.id = stakeholderId;

      zerodbService.deleteRows.mockResolvedValue({
        deletedCount: 1
      });

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith('stakeholders', { id: stakeholderId });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Stakeholder deleted' });
    });

    it('should return 404 when stakeholder to delete is not found', async () => {
      mockReq.params.id = 'non-existent-id';

      zerodbService.deleteRows.mockResolvedValue({
        deletedCount: 0
      });

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Stakeholder not found' });
    });

    it('should return 500 when ZeroDB delete fails', async () => {
      mockReq.params.id = 'zerodb-id-123';

      zerodbService.deleteRows.mockRejectedValue(new Error('ZeroDB delete error'));

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error deleting stakeholder' });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty request body gracefully', async () => {
      mockReq.body = {};

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should handle null values in request body', async () => {
      mockReq.body = {
        stakeholderId: null,
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should handle undefined values in request body', async () => {
      mockReq.body = {
        stakeholderId: undefined,
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'All fields are required' });
    });

    it('should handle ZeroDB service returning unexpected data format', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      // Return unexpected format without rows array
      zerodbService.insertRow.mockResolvedValue({});

      await stakeholderController.createStakeholder(mockReq, mockRes);

      // Should still handle gracefully
      expect(mockRes.status).toHaveBeenCalled();
    });
  });

  describe('Integration with ZeroDB Service Methods', () => {
    it('should use queryTable for fetching stakeholders', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      await stakeholderController.getAllStakeholders(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('stakeholders', {});
    });

    it('should use insertRow for creating stakeholders', async () => {
      mockReq.body = {
        stakeholderId: 'STK-001',
        name: 'John Doe',
        role: 'Investor',
        projectId: 'PRJ-001'
      };

      zerodbService.insertRow.mockResolvedValue({ rows: [{ id: '1', ...mockReq.body }] });

      await stakeholderController.createStakeholder(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', mockReq.body);
    });

    it('should use updateRows with $set operator for updates', async () => {
      mockReq.params.id = 'zerodb-id-123';
      mockReq.body = { name: 'Updated Name' };

      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1, rows: [{ id: '123', name: 'Updated Name' }] });

      await stakeholderController.updateStakeholderById(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'stakeholders',
        { id: 'zerodb-id-123' },
        { $set: { name: 'Updated Name' } }
      );
    });

    it('should use deleteRows with id filter for deletion', async () => {
      mockReq.params.id = 'zerodb-id-123';

      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      await stakeholderController.deleteStakeholderById(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith('stakeholders', { id: 'zerodb-id-123' });
    });
  });
});
