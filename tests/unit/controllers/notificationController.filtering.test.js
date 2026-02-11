/**
 * Notification Controller Filtering Tests
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
  count: jest.fn(),
  update: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const notificationController = require('../../../controllers/Notification');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('Notification Controller - Filtering (Issue #124)', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('getNotifications with filtering', () => {
    describe('companyId filter', () => {
      it('should filter notifications by companyId query parameter', async () => {
        req.query = { companyId: 'COMP-001' };
        const mockNotifications = [
          { _id: 'notif1', notificationId: 'NOTIF-001', companyId: 'COMP-001' },
          { _id: 'notif2', notificationId: 'NOTIF-002', companyId: 'COMP-001' }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockResolvedValue(2);

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.objectContaining({ companyId: 'COMP-001' }),
          expect.any(Object)
        );
      });

      it('should return empty array when no notifications match companyId', async () => {
        req.query = { companyId: 'NONEXISTENT' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.notifications).toEqual([]);
        expect(data.total).toBe(0);
      });
    });

    describe('unread filter', () => {
      it('should filter unread notifications when unread=true', async () => {
        req.query = { unread: 'true' };
        const mockNotifications = [
          { _id: 'notif1', notificationId: 'NOTIF-001', isRead: false }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockResolvedValue(1);

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.objectContaining({ isRead: false }),
          expect.any(Object)
        );
      });

      it('should filter read notifications when unread=false', async () => {
        req.query = { unread: 'false' };
        const mockNotifications = [
          { _id: 'notif1', notificationId: 'NOTIF-001', isRead: true }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockResolvedValue(1);

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.objectContaining({ isRead: true }),
          expect.any(Object)
        );
      });
    });

    describe('type filter', () => {
      it('should filter notifications by type query parameter', async () => {
        req.query = { type: 'system' };
        const mockNotifications = [
          { _id: 'notif1', notificationId: 'NOTIF-001', notificationType: 'system' }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockResolvedValue(1);

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.objectContaining({ notificationType: 'system' }),
          expect.any(Object)
        );
      });

      it('should filter by multiple notification types', async () => {
        req.query = { type: 'system,user-generated' };
        const mockNotifications = [
          { _id: 'notif1', notificationType: 'system' },
          { _id: 'notif2', notificationType: 'user-generated' }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockResolvedValue(2);

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.objectContaining({
            notificationType: { $in: ['system', 'user-generated'] }
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

        await notificationController.getNotifications(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.any(Object),
          expect.objectContaining({ limit: 10 })
        );
      });

      it('should support offset parameter', async () => {
        req.query = { offset: '20' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(50);

        await notificationController.getNotifications(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.any(Object),
          expect.objectContaining({ skip: 20 })
        );
      });

      it('should support both limit and offset together', async () => {
        req.query = { limit: '10', offset: '20' };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(50);

        await notificationController.getNotifications(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.any(Object),
          expect.objectContaining({ limit: 10, skip: 20 })
        );
      });

      it('should default limit to 20 and offset to 0', async () => {
        req.query = {};

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await notificationController.getNotifications(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.any(Object),
          expect.objectContaining({ limit: 20, skip: 0 })
        );
      });
    });

    describe('response format with unreadCount', () => {
      it('should return properly formatted response with notifications, total, hasMore, and unreadCount', async () => {
        req.query = { limit: '10' };
        const mockNotifications = [
          { _id: 'notif1', notificationId: 'NOTIF-001', isRead: false },
          { _id: 'notif2', notificationId: 'NOTIF-002', isRead: true }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockImplementation((model, query) => {
          if (query && query.isRead === false) {
            return Promise.resolve(5); // unread count
          }
          return Promise.resolve(25); // total count
        });

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('notifications');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('hasMore');
        expect(data).toHaveProperty('unreadCount');
        expect(data.notifications).toEqual(mockNotifications);
        expect(data.total).toBe(25);
        expect(data.hasMore).toBe(true);
        expect(data.unreadCount).toBe(5);
      });

      it('should set hasMore to false when all results returned', async () => {
        req.query = { limit: '100' };
        const mockNotifications = [
          { _id: 'notif1', notificationId: 'NOTIF-001' }
        ];

        databaseAdapter.find.mockResolvedValue(mockNotifications);
        databaseAdapter.count.mockResolvedValue(1);

        await notificationController.getNotifications(req, res);

        const data = JSON.parse(res._getData());
        expect(data.hasMore).toBe(false);
      });
    });

    describe('combined filters', () => {
      it('should combine companyId, type, and unread filters', async () => {
        req.query = {
          companyId: 'COMP-001',
          type: 'system',
          unread: 'true',
          limit: '10',
          offset: '5'
        };

        databaseAdapter.find.mockResolvedValue([]);
        databaseAdapter.count.mockResolvedValue(0);

        await notificationController.getNotifications(req, res);

        expect(databaseAdapter.find).toHaveBeenCalledWith(
          'Notification',
          expect.objectContaining({
            companyId: 'COMP-001',
            notificationType: 'system',
            isRead: false
          }),
          expect.objectContaining({ limit: 10, skip: 5 })
        );
      });
    });

    describe('error handling', () => {
      it('should return 500 on database error', async () => {
        req.query = { companyId: 'COMP-001' };
        databaseAdapter.find.mockRejectedValue(new Error('Database connection error'));

        await notificationController.getNotifications(req, res);

        expect(res.statusCode).toBe(500);
      });
    });
  });

  describe('markNotificationsRead (POST /notifications/mark-read)', () => {
    it('should mark single notification as read', async () => {
      req.body = { notificationIds: ['notif1'] };
      const mockUpdatedNotification = { _id: 'notif1', isRead: true };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedNotification);

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Notification',
        'notif1',
        { isRead: true, readAt: expect.any(Date) },
        expect.any(Object)
      );
    });

    it('should mark multiple notifications as read', async () => {
      req.body = { notificationIds: ['notif1', 'notif2', 'notif3'] };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ isRead: true });

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledTimes(3);
    });

    it('should mark all notifications as read when markAll=true', async () => {
      req.body = { markAll: true };

      databaseAdapter.update.mockResolvedValue({ modifiedCount: 10 });

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.update).toHaveBeenCalledWith(
        'Notification',
        { isRead: false },
        { isRead: true, readAt: expect.any(Date) },
        expect.any(Object)
      );
    });

    it('should mark all notifications as read for specific companyId', async () => {
      req.body = { markAll: true, companyId: 'COMP-001' };

      databaseAdapter.update.mockResolvedValue({ modifiedCount: 5 });

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.update).toHaveBeenCalledWith(
        'Notification',
        { isRead: false, companyId: 'COMP-001' },
        { isRead: true, readAt: expect.any(Date) },
        expect.any(Object)
      );
    });

    it('should return 400 when notificationIds is not provided and markAll is false', async () => {
      req.body = {};

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('notificationIds');
    });

    it('should return 400 when notificationIds is empty array', async () => {
      req.body = { notificationIds: [] };

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return success response with updated count', async () => {
      req.body = { notificationIds: ['notif1', 'notif2'] };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ isRead: true });

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('updatedCount');
      expect(data.updatedCount).toBe(2);
    });

    it('should return 500 on database error', async () => {
      req.body = { notificationIds: ['notif1'] };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      await notificationController.markNotificationsRead(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
