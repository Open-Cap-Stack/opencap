/**
 * Activity Controller Filtering Tests
 * Issue #124: Add Activity and Notification Filtering by Company
 *
 * TDD Red Phase: Tests written before implementation
 */

process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
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

const httpMocks = require('node-mocks-http');
const activityController = require('../../../controllers/activityController');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('Activity Controller - Filtering (Issue #124)', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('getActivities with filtering', () => {
    describe('companyId filter', () => {
      it('should filter activities by companyId query parameter', async () => {
        req.query = { companyId: 'COMP-001' };
        const mockActivities = [
          { _id: 'act1', activityId: 'ACT-001', companyId: 'COMP-001', activityType: 'DocumentUpload' },
          { _id: 'act2', activityId: 'ACT-002', companyId: 'COMP-001', activityType: 'UserLogin' }
        ];

        databaseAdapter.find.mockResolvedValue(mockActivities);
        databaseAdapter.count.mockResolvedValue(2);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({ companyId: 'COMP-001' }),
          expect.any(Object)
        );
      });

      it('should return empty array when no activities match companyId', async () => {
        req.query = { companyId: 'NONEXISTENT' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.activities).toEqual([]);
        expect(data.total).toBe(0);
      });
    });

    describe('type filter', () => {
      it('should filter activities by type query parameter', async () => {
        req.query = { type: 'DocumentUpload' };
        const mockActivities = [
          { _id: 'act1', activityId: 'ACT-001', activityType: 'DocumentUpload' }
        ];

        databaseAdapter.find.mockResolvedValue(mockActivities);
        databaseAdapter.count.mockResolvedValue(1);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({ activityType: 'DocumentUpload' }),
          expect.any(Object)
        );
      });

      it('should filter by multiple types', async () => {
        req.query = { type: 'DocumentUpload,UserLogin' };
        const mockActivities = [
          { _id: 'act1', activityType: 'DocumentUpload' },
          { _id: 'act2', activityType: 'UserLogin' }
        ];

        databaseAdapter.find.mockResolvedValue(mockActivities);
        databaseAdapter.count.mockResolvedValue(2);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({
            activityType: { $in: ['DocumentUpload', 'UserLogin'] }
          }),
          expect.any(Object)
        );
      });
    });

    describe('dateRange filter', () => {
      it('should filter activities by startDate', async () => {
        const startDate = '2024-01-01T00:00:00.000Z';
        req.query = { startDate };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({
            timestamp: expect.objectContaining({ $gte: new Date(startDate) })
          }),
          expect.any(Object)
        );
      });

      it('should filter activities by endDate', async () => {
        const endDate = '2024-12-31T23:59:59.999Z';
        req.query = { endDate };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({
            timestamp: expect.objectContaining({ $lte: new Date(endDate) })
          }),
          expect.any(Object)
        );
      });

      it('should filter activities by date range (startDate and endDate)', async () => {
        const startDate = '2024-01-01T00:00:00.000Z';
        const endDate = '2024-12-31T23:59:59.999Z';
        req.query = { startDate, endDate };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }),
          expect.any(Object)
        );
      });
    });

    describe('pagination (limit and offset)', () => {
      it('should support limit parameter', async () => {
        req.query = { limit: '10' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(50);

        await activityController.getActivities(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.any(Object),
          expect.objectContaining({ limit: 10 })
        );
      });

      it('should support offset parameter', async () => {
        req.query = { offset: '20' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(50);

        await activityController.getActivities(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.any(Object),
          expect.objectContaining({ skip: 20 })
        );
      });

      it('should support both limit and offset together', async () => {
        req.query = { limit: '10', offset: '20' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(50);

        await activityController.getActivities(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.any(Object),
          expect.objectContaining({ limit: 10, skip: 20 })
        );
      });

      it('should default limit to 100 and offset to 0', async () => {
        req.query = {};

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.any(Object),
          expect.objectContaining({ limit: 100, skip: 0 })
        );
      });
    });

    describe('response format', () => {
      it('should return properly formatted response with activities, total, and hasMore', async () => {
        req.query = { limit: '10' };
        const mockActivities = [
          { _id: 'act1', activityId: 'ACT-001' },
          { _id: 'act2', activityId: 'ACT-002' }
        ];

        databaseAdapter.find.mockResolvedValue(mockActivities);
        databaseAdapter.count.mockResolvedValue(25);

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('activities');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('hasMore');
        expect(data.activities).toEqual(mockActivities);
        expect(data.total).toBe(25);
        expect(data.hasMore).toBe(true);
      });

      it('should set hasMore to false when all results returned', async () => {
        req.query = { limit: '100' };
        const mockActivities = [
          { _id: 'act1', activityId: 'ACT-001' }
        ];

        databaseAdapter.find.mockResolvedValue(mockActivities);
        databaseAdapter.count.mockResolvedValue(1);

        await activityController.getActivities(req, res);

        const data = JSON.parse(res._getData());
        expect(data.hasMore).toBe(false);
      });
    });

    describe('combined filters', () => {
      it('should combine companyId, type, and dateRange filters', async () => {
        const startDate = '2024-01-01T00:00:00.000Z';
        const endDate = '2024-12-31T23:59:59.999Z';
        req.query = {
          companyId: 'COMP-001',
          type: 'DocumentUpload',
          startDate,
          endDate,
          limit: '10',
          offset: '5'
        };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Activity',
          expect.objectContaining({
            companyId: 'COMP-001',
            activityType: 'DocumentUpload',
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }),
          expect.objectContaining({ limit: 10, skip: 5 })
        );
      });
    });

    describe('error handling', () => {
      it('should return 500 on database error', async () => {
        req.query = { companyId: 'COMP-001' };
        databaseAdapter.find.mockRejectedValue(new Error('Database connection error'));

        await activityController.getActivities(req, res);

        expect(res.statusCode).toBe(500);
      });

      it('should handle invalid date format gracefully', async () => {
        req.query = { startDate: 'invalid-date' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await activityController.getActivities(req, res);

        // Should still work, query will have invalid date
        expect(res.statusCode).toBe(200);
      });
    });
  });
});
