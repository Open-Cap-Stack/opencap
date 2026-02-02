/**
 * Notification Controller Unit Tests
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 1)
 * Issue #124: Updated for new filtering response format
 * TDD Red Phase: Tests written before migration
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
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const notificationController = require('../../../controllers/Notification');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('Notification Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const validNotificationData = {
      notificationId: 'NOTIF001',
      notificationType: 'INFO',
      title: 'Test Notification',
      message: 'This is a test notification',
      recipient: 'user123',
      Timestamp: '2024-01-15T10:00:00Z',
      RelatedObjects: [],
      UserInvolved: 'admin123'
    };

    it('should create a notification successfully', async () => {
      req.body = validNotificationData;
      const mockSavedNotification = { _id: 'notif123', ...validNotificationData };
      databaseAdapter.create.mockResolvedValue(mockSavedNotification);

      await notificationController.createNotification(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Notification', expect.objectContaining({
        notificationId: 'NOTIF001',
        notificationType: 'INFO',
        title: 'Test Notification'
      }));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedNotification);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { notificationId: 'NOTIF001', title: 'Test' };

      await notificationController.createNotification(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Missing required fields');
    });

    it('should return 500 on database error', async () => {
      req.body = validNotificationData;
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await notificationController.createNotification(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to create notification');
    });
  });

  describe('getNotifications', () => {
    it('should return all notifications with pagination info', async () => {
      const mockNotifications = [
        { _id: 'notif1', notificationId: 'NOTIF001', title: 'Notification 1' },
        { _id: 'notif2', notificationId: 'NOTIF002', title: 'Notification 2' }
      ];
      databaseAdapter.find.mockResolvedValue(mockNotifications);
      databaseAdapter.count.mockResolvedValue(2);

      await notificationController.getNotifications(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('Notification', {}, expect.any(Object));
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.notifications).toEqual(mockNotifications);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
      expect(data).toHaveProperty('unreadCount');
    });

    it('should return empty array when no notifications exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await notificationController.getNotifications(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.notifications).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.hasMore).toBe(false);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await notificationController.getNotifications(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve notifications');
    });
  });

  describe('getNotificationById', () => {
    it('should return notification by ID', async () => {
      const mockNotification = { _id: 'notif123', notificationId: 'NOTIF001', title: 'Test Notification' };
      req.params = { id: 'notif123' };
      databaseAdapter.findById.mockResolvedValue(mockNotification);

      await notificationController.getNotificationById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('Notification', 'notif123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ notification: mockNotification });
    });

    it('should return 404 when notification not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await notificationController.getNotificationById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Notification not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'notif123' };
      databaseAdapter.findById.mockRejectedValue(new Error('Database error'));

      await notificationController.getNotificationById(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve notification');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      req.params = { id: 'notif123' };
      const mockDeletedNotification = { _id: 'notif123', notificationId: 'NOTIF001' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedNotification);

      await notificationController.deleteNotification(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Notification', 'notif123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Notification deleted');
    });

    it('should return 404 when notification not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await notificationController.deleteNotification(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Notification not found');
    });

    it('should return 500 on database error', async () => {
      req.params = { id: 'notif123' };
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await notificationController.deleteNotification(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to delete notification');
    });
  });
});
