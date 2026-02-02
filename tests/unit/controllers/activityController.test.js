/**
 * Activity Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 * Issue #124: Updated for new filtering response format
 *
 * Tests for the activity controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const activityController = require('../../../controllers/activityController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

describe('ActivityController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createActivity', () => {
    it('should create an activity successfully', async () => {
      const activityData = {
        ActivityID: 'ACT-001',
        Type: 'EQUITY_GRANT',
        Description: 'New equity grant issued',
        Timestamp: new Date().toISOString(),
        UserId: 'USER-001',
        CompanyId: 'COMP-001'
      };

      req.body = activityData;

      const mockCreatedActivity = {
        _id: 'mongo_123',
        ...activityData
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedActivity);

      await activityController.createActivity(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('Activity', activityData);
    });

    it('should return 400 when activity data is invalid', async () => {
      req.body = {}; // Empty body

      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await activityController.createActivity(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        ActivityID: 'ACT-001',
        Type: 'EQUITY_GRANT'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database connection failed'));

      await activityController.createActivity(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getActivities', () => {
    it('should return all activities with pagination info', async () => {
      const mockActivities = [
        { _id: 'mongo_1', ActivityID: 'ACT-001', Type: 'EQUITY_GRANT' },
        { _id: 'mongo_2', ActivityID: 'ACT-002', Type: 'SHARE_TRANSFER' }
      ];

      databaseAdapter.find.mockResolvedValue(mockActivities);
      databaseAdapter.count.mockResolvedValue(2);

      await activityController.getActivities(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('Activity', {}, expect.any(Object));
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('activities');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
    });

    it('should return empty array when no activities exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await activityController.getActivities(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.activities).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.hasMore).toBe(false);
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await activityController.getActivities(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should support pagination with page parameter', async () => {
      req.query = { page: 2, limit: 10 };
      const mockActivities = [{ _id: 'mongo_1', ActivityID: 'ACT-001' }];

      databaseAdapter.find.mockResolvedValue(mockActivities);
      databaseAdapter.count.mockResolvedValue(15);

      await activityController.getActivities(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Activity',
        {},
        expect.objectContaining({ skip: 10, limit: 10 })
      );
    });
  });

  describe('getActivityById', () => {
    it('should return activity by ID', async () => {
      req.params = { id: 'mongo_123' };
      const mockActivity = {
        _id: 'mongo_123',
        ActivityID: 'ACT-001',
        Type: 'EQUITY_GRANT'
      };

      databaseAdapter.findById.mockResolvedValue(mockActivity);

      await activityController.getActivityById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('Activity', 'mongo_123');
    });

    it('should return 404 when activity not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await activityController.getActivityById(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      databaseAdapter.findById.mockRejectedValue(new Error('Invalid ID format'));

      await activityController.getActivityById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateActivity', () => {
    it('should update an activity successfully', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { Description: 'Updated description' };

      const mockUpdatedActivity = {
        _id: 'mongo_123',
        ActivityID: 'ACT-001',
        Description: 'Updated description'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedActivity);

      await activityController.updateActivity(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Activity',
        'mongo_123',
        req.body,
        expect.any(Object)
      );
    });

    it('should return 404 when activity to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { Description: 'Updated description' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await activityController.updateActivity(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle validation errors during update', async () => {
      req.params = { id: 'mongo_123' };
      req.body = { Type: 'INVALID_TYPE' };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Validation error'));

      await activityController.updateActivity(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteActivity', () => {
    it('should delete an activity successfully', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await activityController.deleteActivity(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Activity', 'mongo_123');
    });

    it('should return success even when activity not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await activityController.deleteActivity(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should handle database errors during delete', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await activityController.deleteActivity(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      // Verify that the controller works when databaseAdapter is in zerodb-only mode
      req.body = {
        ActivityID: 'ACT-001',
        Type: 'EQUITY_GRANT'
      };

      const zerodbResult = {
        id: 'zero_123',
        ActivityID: 'ACT-001',
        Type: 'EQUITY_GRANT'
      };

      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await activityController.createActivity(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode consistency', async () => {
      req.params = { id: 'mongo_123' };

      // Simulate parallel mode returning MongoDB result
      const parallelResult = {
        _id: 'mongo_123',
        ActivityID: 'ACT-001'
      };

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await activityController.getActivityById(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      // Handle both string and object response
      const activity = typeof data === 'string' ? JSON.parse(data) : data;
      expect(activity.ActivityID).toBe('ACT-001');
    });
  });
});
