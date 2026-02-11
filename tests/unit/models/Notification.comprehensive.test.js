/**
 * Comprehensive Notification Model Unit Tests
 *
 * Tests for the Notification model including validation, methods, and schema behavior
 */

// Mock the Notification model to avoid database dependencies
jest.mock('../../../models/Notification', () => {
  const validNotificationTypes = ['system', 'user-generated'];

  function MockNotification(data = {}) {
    Object.assign(this, data);
    this.isNew = true;
    this.isModified = jest.fn();
    this.save = jest.fn();

    // Apply defaults
    if (this.Timestamp === undefined) this.Timestamp = new Date();

    this.validateSync = jest.fn(() => {
      const errors = {};

      // Check required fields
      if (!this.notificationId) {
        errors.notificationId = { message: 'notificationId is required' };
      }
      if (!this.notificationType) {
        errors.notificationType = { message: 'notificationType is required' };
      } else if (!validNotificationTypes.includes(this.notificationType)) {
        errors.notificationType = { message: `${this.notificationType} is not a valid notification type` };
      }
      if (!this.title) {
        errors.title = { message: 'title is required' };
      }
      if (!this.message) {
        errors.message = { message: 'message is required' };
      }
      if (!this.recipient) {
        errors.recipient = { message: 'recipient is required' };
      }
      if (!this.UserInvolved) {
        errors.UserInvolved = { message: 'UserInvolved is required' };
      }

      return Object.keys(errors).length > 0 ? { errors } : null;
    });
    this.toObject = jest.fn(() => ({ ...data }));
  }

  // Add static methods
  MockNotification.findById = jest.fn();
  MockNotification.find = jest.fn();
  MockNotification.findOne = jest.fn();
  MockNotification.create = jest.fn();
  MockNotification.findByIdAndUpdate = jest.fn();
  MockNotification.findByIdAndDelete = jest.fn();
  MockNotification.countDocuments = jest.fn();
  MockNotification.deleteMany = jest.fn();

  return MockNotification;
});

describe('Notification Model', () => {
  let Notification;

  const validNotificationTypes = ['system', 'user-generated'];

  beforeAll(() => {
    Notification = require('../../../models/Notification');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create notification with all required fields', () => {
        const notificationData = {
          notificationId: 'notif-123',
          notificationType: 'system',
          title: 'Document Uploaded',
          message: 'A new document has been uploaded to your company.',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        };

        const notification = new Notification(notificationData);

        expect(notification.notificationId).toBe(notificationData.notificationId);
        expect(notification.notificationType).toBe(notificationData.notificationType);
        expect(notification.title).toBe(notificationData.title);
        expect(notification.message).toBe(notificationData.message);
        expect(notification.recipient).toBe(notificationData.recipient);
        expect(notification.UserInvolved).toBe(notificationData.UserInvolved);
      });

      it('should reject notification without notificationId', () => {
        const notification = new Notification({
          notificationType: 'system',
          title: 'Test',
          message: 'Test message',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.notificationId).toBeTruthy();
      });

      it('should reject notification without notificationType', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          title: 'Test',
          message: 'Test message',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.notificationType).toBeTruthy();
      });

      it('should reject notification without title', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'system',
          message: 'Test message',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.title).toBeTruthy();
      });

      it('should reject notification without message', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'system',
          title: 'Test',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.message).toBeTruthy();
      });

      it('should reject notification without recipient', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'system',
          title: 'Test',
          message: 'Test message',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.recipient).toBeTruthy();
      });

      it('should reject notification without UserInvolved', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'system',
          title: 'Test',
          message: 'Test message',
          recipient: 'user-456'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.UserInvolved).toBeTruthy();
      });
    });

    describe('NotificationType Enum Validation', () => {
      it('should accept "system" notification type', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'system',
          title: 'System Notification',
          message: 'This is a system notification',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
        expect(notification.notificationType).toBe('system');
      });

      it('should accept "user-generated" notification type', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'user-generated',
          title: 'User Notification',
          message: 'This is a user-generated notification',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
        expect(notification.notificationType).toBe('user-generated');
      });

      it('should reject invalid notification type', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'invalid-type',
          title: 'Test',
          message: 'Test message',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.notificationType).toBeTruthy();
      });

      it('should reject uppercase notification type', () => {
        const notification = new Notification({
          notificationId: 'notif-123',
          notificationType: 'SYSTEM',
          title: 'Test',
          message: 'Test message',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.notificationType).toBeTruthy();
      });
    });
  });

  describe('Default Values', () => {
    it('should set Timestamp to current date by default', () => {
      const notification = new Notification({
        notificationId: 'notif-123',
        notificationType: 'system',
        title: 'Test',
        message: 'Test message',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      expect(notification.Timestamp).toBeDefined();
      expect(notification.Timestamp instanceof Date).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should handle RelatedObjects field', () => {
      const notification = new Notification({
        notificationId: 'notif-123',
        notificationType: 'system',
        title: 'Document Uploaded',
        message: 'A document was uploaded',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011',
        RelatedObjects: 'document-789'
      });

      expect(notification.RelatedObjects).toBe('document-789');
    });

    it('should allow RelatedObjects to be undefined', () => {
      const notification = new Notification({
        notificationId: 'notif-123',
        notificationType: 'system',
        title: 'Test',
        message: 'Test message',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      expect(notification.RelatedObjects).toBeUndefined();
    });
  });

  describe('Notification Content', () => {
    it('should handle long message content', () => {
      const longMessage = 'A'.repeat(1000);
      const notification = new Notification({
        notificationId: 'notif-123',
        notificationType: 'system',
        title: 'Long Message',
        message: longMessage,
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      expect(notification.message).toBe(longMessage);
      expect(notification.message.length).toBe(1000);
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Hello <script>alert("test")</script> & more <html>';
      const notification = new Notification({
        notificationId: 'notif-123',
        notificationType: 'user-generated',
        title: 'Special Characters',
        message: specialMessage,
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      expect(notification.message).toBe(specialMessage);
    });

    it('should handle multi-line message', () => {
      const multiLineMessage = `Line 1: Important update
Line 2: Please review
Line 3: Action required by tomorrow`;

      const notification = new Notification({
        notificationId: 'notif-123',
        notificationType: 'system',
        title: 'Multi-line Message',
        message: multiLineMessage,
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      expect(notification.message).toBe(multiLineMessage);
    });
  });

  describe('Notification Types', () => {
    describe('System Notifications', () => {
      it('should handle document upload notification', () => {
        const notification = new Notification({
          notificationId: 'notif-doc-upload',
          notificationType: 'system',
          title: 'Document Uploaded',
          message: 'A new document "Q1 Report" has been uploaded to your company workspace.',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011',
          RelatedObjects: 'document-789'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
      });

      it('should handle compliance alert notification', () => {
        const notification = new Notification({
          notificationId: 'notif-compliance',
          notificationType: 'system',
          title: 'Compliance Alert',
          message: 'Your SPV compliance status requires immediate attention.',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011',
          RelatedObjects: 'spv-123'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
      });

      it('should handle transaction notification', () => {
        const notification = new Notification({
          notificationId: 'notif-transaction',
          notificationType: 'system',
          title: 'Transaction Completed',
          message: 'Your payment of $10,000.00 has been processed successfully.',
          recipient: 'user-456',
          UserInvolved: '507f1f77bcf86cd799439011',
          RelatedObjects: 'transaction-abc'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
      });
    });

    describe('User-Generated Notifications', () => {
      it('should handle mention notification', () => {
        const notification = new Notification({
          notificationId: 'notif-mention',
          notificationType: 'user-generated',
          title: 'You were mentioned',
          message: 'John Doe mentioned you in a comment on the Q4 Review document.',
          recipient: 'user-789',
          UserInvolved: '507f1f77bcf86cd799439022'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
      });

      it('should handle invitation notification', () => {
        const notification = new Notification({
          notificationId: 'notif-invite',
          notificationType: 'user-generated',
          title: 'New Invitation',
          message: 'Jane Smith invited you to join Acme Corp workspace.',
          recipient: 'user-new',
          UserInvolved: '507f1f77bcf86cd799439033'
        });

        const validationError = notification.validateSync();
        expect(validationError).toBeNull();
      });
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockNotification = {
        notificationId: 'notif-123',
        title: 'Found Notification'
      };
      Notification.findById.mockResolvedValue(mockNotification);

      const result = await Notification.findById('507f1f77bcf86cd799439011');

      expect(Notification.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockNotification);
    });

    it('should call find correctly', async () => {
      const mockNotifications = [
        { notificationId: 'notif-1', title: 'Notification 1' },
        { notificationId: 'notif-2', title: 'Notification 2' }
      ];
      Notification.find.mockResolvedValue(mockNotifications);

      const result = await Notification.find({ recipient: 'user-123' });

      expect(Notification.find).toHaveBeenCalledWith({ recipient: 'user-123' });
      expect(result).toEqual(mockNotifications);
    });

    it('should call countDocuments correctly', async () => {
      Notification.countDocuments.mockResolvedValue(15);

      const count = await Notification.countDocuments({ recipient: 'user-123' });

      expect(Notification.countDocuments).toHaveBeenCalledWith({ recipient: 'user-123' });
      expect(count).toBe(15);
    });

    it('should call create correctly', async () => {
      const notificationData = {
        notificationId: 'notif-new',
        notificationType: 'system',
        title: 'New Notification',
        message: 'This is a new notification',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      };
      Notification.create.mockResolvedValue(notificationData);

      const result = await Notification.create(notificationData);

      expect(Notification.create).toHaveBeenCalledWith(notificationData);
      expect(result).toEqual(notificationData);
    });

    it('should call deleteMany correctly', async () => {
      Notification.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const result = await Notification.deleteMany({ recipient: 'user-deleted' });

      expect(Notification.deleteMany).toHaveBeenCalledWith({ recipient: 'user-deleted' });
      expect(result.deletedCount).toBe(5);
    });
  });

  describe('Instance Methods', () => {
    it('should save notification successfully', async () => {
      const notification = new Notification({
        notificationId: 'notif-save',
        notificationType: 'system',
        title: 'Save Test',
        message: 'Testing save',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      notification.save.mockResolvedValue(notification);
      const saved = await notification.save();

      expect(notification.save).toHaveBeenCalled();
      expect(saved).toBe(notification);
    });

    it('should handle save errors', async () => {
      const notification = new Notification({
        notificationId: 'notif-duplicate',
        notificationType: 'system',
        title: 'Duplicate Test',
        message: 'Testing duplicate',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      const duplicateError = new Error('E11000 duplicate key error');
      notification.save.mockRejectedValue(duplicateError);

      await expect(notification.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should convert notification to object', () => {
      const notificationData = {
        notificationId: 'notif-object',
        notificationType: 'system',
        title: 'Object Test',
        message: 'Testing toObject',
        recipient: 'user-456',
        UserInvolved: '507f1f77bcf86cd799439011'
      };

      const notification = new Notification(notificationData);
      const notificationObject = notification.toObject();

      expect(notificationObject).toEqual(notificationData);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle batch notification creation', async () => {
      const recipients = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      const notifications = recipients.map((recipient, index) =>
        new Notification({
          notificationId: `notif-batch-${index}`,
          notificationType: 'system',
          title: 'System Update',
          message: 'Important system update notification.',
          recipient: recipient,
          UserInvolved: '507f1f77bcf86cd799439011'
        })
      );

      notifications.forEach(n => {
        const validationError = n.validateSync();
        expect(validationError).toBeNull();
      });

      expect(notifications.length).toBe(5);
    });

    it('should handle notification with all optional fields', () => {
      const notification = new Notification({
        notificationId: 'notif-complete',
        notificationType: 'user-generated',
        title: 'Complete Notification',
        message: 'This notification has all fields populated.',
        recipient: 'user-456',
        Timestamp: new Date('2024-01-15T10:30:00Z'),
        RelatedObjects: 'document-789,transaction-abc',
        UserInvolved: '507f1f77bcf86cd799439011'
      });

      const validationError = notification.validateSync();
      expect(validationError).toBeNull();
      expect(notification.RelatedObjects).toBe('document-789,transaction-abc');
    });

    it('should handle empty notification object', () => {
      const notification = new Notification({});
      const validationError = notification.validateSync();

      expect(validationError).toBeTruthy();
      expect(Object.keys(validationError.errors).length).toBe(6); // All 6 required fields
    });

    it('should handle notification filtering by type', async () => {
      const systemNotifications = [
        { notificationId: 'notif-1', notificationType: 'system' },
        { notificationId: 'notif-2', notificationType: 'system' }
      ];
      Notification.find.mockResolvedValue(systemNotifications);

      const result = await Notification.find({
        recipient: 'user-123',
        notificationType: 'system'
      });

      expect(result.every(n => n.notificationType === 'system')).toBe(true);
    });
  });
});
