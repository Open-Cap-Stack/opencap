/**
 * Activity Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Tests for the activity controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const activityController = require('../../../controllers/activityController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

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
  });

  describe('getActivities', () => {
    it('should return all activities', async () => {
      const mockActivities = [
        { _id: 'mongo_1', ActivityID: 'ACT-001', Type: 'EQUITY_GRANT' },
        { _id: 'mongo_2', ActivityID: 'ACT-002', Type: 'SHARE_TRANSFER' }
      ];

      databaseAdapter.find.mockResolvedValue(mockActivities);

      await activityController.getActivities(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('Activity', {}, expect.any(Object));
    });

    it('should support pagination', async () => {
      req.query = { page: 2, limit: 10 };
      const mockActivities = [{ _id: 'mongo_1', ActivityID: 'ACT-001' }];

      databaseAdapter.find.mockResolvedValue(mockActivities);

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
  });

  describe('deleteActivity', () => {
    it('should delete an activity successfully', async () => {
      req.params = { id: 'mongo_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'mongo_123' });

      await activityController.deleteActivity(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Activity', 'mongo_123');
    });
  });
});
