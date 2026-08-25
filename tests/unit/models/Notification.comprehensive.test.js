/**
 * Notification Model Unit Tests
 * Tests for notification model including creation, validation,
 * business logic methods (send, markAsRead, findUnread), and edge cases.
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const Notification = require('../../../models/Notification');
const zerodbService = require('../../../services/zerodbService');

describe('Notification Model', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose notificationTypes', () => {
      expect(Notification.notificationTypes).toEqual(['system', 'user-generated']);
    });

    it('should have tableName set to compliance_events', () => {
      expect(Notification.tableName).toBe('compliance_events');
    });
  });

  // ─── Schema ──────────────────────────────────────────────────

  describe('Schema', () => {
    it('should define required fields', () => {
      expect(Notification.schema.notificationId.required).toBe(true);
      expect(Notification.schema.notificationType.required).toBe(true);
      expect(Notification.schema.title.required).toBe(true);
      expect(Notification.schema.message.required).toBe(true);
      expect(Notification.schema.recipient.required).toBe(true);
      expect(Notification.schema.Timestamp.required).toBe(true);
      expect(Notification.schema.UserInvolved.required).toBe(true);
    });

    it('should define notificationType enum', () => {
      expect(Notification.schema.notificationType.enum).toEqual(['system', 'user-generated']);
    });

    it('should have default for read field', () => {
      expect(Notification.schema.read.default).toBe(false);
    });
  });

  // ─── create() ────────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      notificationType: 'system',
      title: 'Document Uploaded',
      message: 'A new document has been uploaded.',
      recipient: 'user-001',
      UserInvolved: 'user-002'
    };

    it('should create a notification with valid data', async () => {
      const result = await Notification.create(validData);

      expect(result).toBeDefined();
      expect(result.title).toBe('Document Uploaded');
      expect(result.recipient).toBe('user-001');
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'compliance_events',
        expect.objectContaining({ title: 'Document Uploaded' })
      );
    });

    it('should auto-generate notificationId if not provided', async () => {
      const result = await Notification.create(validData);
      expect(result.notificationId).toBeDefined();
      expect(result.notificationId).toMatch(/^notif_/);
    });

    it('should preserve provided notificationId', async () => {
      const result = await Notification.create({
        ...validData,
        notificationId: 'custom-notif-id'
      });
      expect(result.notificationId).toBe('custom-notif-id');
    });

    it('should set Timestamp if not provided', async () => {
      const result = await Notification.create(validData);
      expect(result.Timestamp).toBeDefined();
      expect(typeof result.Timestamp).toBe('string');
    });

    it('should preserve provided Timestamp', async () => {
      const ts = '2025-06-01T12:00:00.000Z';
      const result = await Notification.create({
        ...validData,
        Timestamp: ts
      });
      expect(result.Timestamp).toBe(ts);
    });

    it('should default read to false', async () => {
      const result = await Notification.create(validData);
      expect(result.read).toBe(false);
    });

    it('should preserve read value if provided', async () => {
      const result = await Notification.create({
        ...validData,
        read: true
      });
      expect(result.read).toBe(true);
    });

    it('should throw for invalid notification type', async () => {
      await expect(
        Notification.create({ ...validData, notificationType: 'invalid-type' })
      ).rejects.toThrow(/Invalid notification type/);
    });

    it('should accept system notification type', async () => {
      const result = await Notification.create({
        ...validData,
        notificationType: 'system'
      });
      expect(result.notificationType).toBe('system');
    });

    it('should accept user-generated notification type', async () => {
      const result = await Notification.create({
        ...validData,
        notificationType: 'user-generated'
      });
      expect(result.notificationType).toBe('user-generated');
    });

    it('should not throw when notificationType is undefined (skips validation)', async () => {
      const result = await Notification.create({
        ...validData,
        notificationType: undefined
      });
      // When undefined, the validation is skipped
      expect(result).toBeDefined();
    });

    it('should add timestamps (createdAt, updatedAt)', async () => {
      const result = await Notification.create(validData);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ─── findByNotificationId() ─────────────────────────────────

  describe('findByNotificationId()', () => {
    it('should find notification by notificationId', async () => {
      await Notification.create({
        notificationId: 'notif-find-001',
        notificationType: 'system',
        title: 'Test',
        message: 'Test message',
        recipient: 'user-001',
        UserInvolved: 'user-002'
      });

      const found = await Notification.findByNotificationId('notif-find-001');
      expect(found).toBeDefined();
      expect(found.notificationId).toBe('notif-find-001');
    });

    it('should return null for non-existent notificationId', async () => {
      const found = await Notification.findByNotificationId('notif-nonexistent');
      expect(found).toBeNull();
    });
  });

  // ─── findByRecipient() ──────────────────────────────────────

  describe('findByRecipient()', () => {
    it('should find notifications for a recipient', async () => {
      await Notification.create({
        notificationType: 'system',
        title: 'Notif 1',
        message: 'Message 1',
        recipient: 'user-recipient',
        UserInvolved: 'user-002'
      });
      await Notification.create({
        notificationType: 'system',
        title: 'Notif 2',
        message: 'Message 2',
        recipient: 'user-recipient',
        UserInvolved: 'user-003'
      });
      await Notification.create({
        notificationType: 'system',
        title: 'Notif 3',
        message: 'Message 3',
        recipient: 'user-other',
        UserInvolved: 'user-002'
      });

      const results = await Notification.findByRecipient('user-recipient');
      expect(results.length).toBe(2);
    });

    it('should return empty array for recipient with no notifications', async () => {
      const results = await Notification.findByRecipient('user-none');
      expect(results).toEqual([]);
    });
  });

  // ─── findUnread() ───────────────────────────────────────────

  describe('findUnread()', () => {
    it('should find unread notifications for a recipient', async () => {
      await Notification.create({
        notificationType: 'system',
        title: 'Unread 1',
        message: 'Unread message',
        recipient: 'user-unread',
        UserInvolved: 'user-002',
        read: false
      });
      await Notification.create({
        notificationType: 'system',
        title: 'Read 1',
        message: 'Read message',
        recipient: 'user-unread',
        UserInvolved: 'user-002',
        read: true
      });

      const results = await Notification.findUnread('user-unread');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Unread 1');
    });

    it('should return empty array when all are read', async () => {
      await Notification.create({
        notificationType: 'system',
        title: 'All Read',
        message: 'Message',
        recipient: 'user-allread',
        UserInvolved: 'user-002',
        read: true
      });

      const results = await Notification.findUnread('user-allread');
      expect(results).toEqual([]);
    });
  });

  // ─── markAsRead() ───────────────────────────────────────────

  describe('markAsRead()', () => {
    it('should mark a notification as read', async () => {
      await Notification.create({
        notificationId: 'notif-mark-read',
        notificationType: 'system',
        title: 'Mark Me',
        message: 'Mark me as read',
        recipient: 'user-001',
        UserInvolved: 'user-002',
        read: false
      });

      const result = await Notification.markAsRead('notif-mark-read');
      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
      expect(result.modifiedCount).toBe(1);
    });

    it('should return modifiedCount 0 for non-existent notification', async () => {
      const result = await Notification.markAsRead('notif-nonexistent');
      expect(result.modifiedCount).toBe(0);
    });
  });

  // ─── markAllAsRead() ────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('should mark all unread notifications as read for a user', async () => {
      await Notification.create({
        notificationType: 'system',
        title: 'Notif A',
        message: 'A',
        recipient: 'user-markall',
        UserInvolved: 'u2',
        read: false
      });
      await Notification.create({
        notificationType: 'system',
        title: 'Notif B',
        message: 'B',
        recipient: 'user-markall',
        UserInvolved: 'u3',
        read: false
      });

      const result = await Notification.markAllAsRead('user-markall');
      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
    });
  });

  // ─── send() ─────────────────────────────────────────────────

  describe('send()', () => {
    it('should create a notification via send helper', async () => {
      const result = await Notification.send(
        'system',
        'Alert',
        'System alert message',
        'user-recv',
        'user-sender',
        'related-obj-123'
      );

      expect(result).toBeDefined();
      expect(result.notificationType).toBe('system');
      expect(result.title).toBe('Alert');
      expect(result.message).toBe('System alert message');
      expect(result.recipient).toBe('user-recv');
      expect(result.UserInvolved).toBe('user-sender');
      expect(result.RelatedObjects).toBe('related-obj-123');
      expect(result.Timestamp).toBeDefined();
    });

    it('should create notification with empty relatedObjects by default', async () => {
      const result = await Notification.send(
        'user-generated',
        'Mention',
        'You were mentioned',
        'user-recv',
        'user-sender'
      );

      expect(result.RelatedObjects).toBe('');
    });

    it('should auto-generate notificationId', async () => {
      const result = await Notification.send(
        'system',
        'Test',
        'Test message',
        'user-recv',
        'user-sender'
      );

      expect(result.notificationId).toBeDefined();
      expect(result.notificationId).toMatch(/^notif_/);
    });

    it('should default read to false', async () => {
      const result = await Notification.send(
        'system',
        'Test',
        'Test message',
        'user-recv',
        'user-sender'
      );
      expect(result.read).toBe(false);
    });
  });

  // ─── Exposed base model methods ─────────────────────────────

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof Notification.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof Notification.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof Notification.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof Notification.updateOne).toBe('function');
    });

    it('should expose updateMany method', () => {
      expect(typeof Notification.updateMany).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof Notification.deleteOne).toBe('function');
    });

    it('should expose deleteMany method', () => {
      expect(typeof Notification.deleteMany).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof Notification.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(typeof Notification.exists).toBe('function');
    });

    it('should expose distinct method', () => {
      expect(typeof Notification.distinct).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(typeof Notification.aggregate).toBe('function');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle long message content', async () => {
      const longMessage = 'A'.repeat(5000);
      const result = await Notification.create({
        notificationType: 'system',
        title: 'Long Message',
        message: longMessage,
        recipient: 'user-001',
        UserInvolved: 'user-002'
      });
      expect(result.message.length).toBe(5000);
    });

    it('should handle special characters in message', async () => {
      const specialMsg = 'Hello <script>alert("xss")</script> & entities "quotes"';
      const result = await Notification.create({
        notificationType: 'system',
        title: 'Special',
        message: specialMsg,
        recipient: 'user-001',
        UserInvolved: 'user-002'
      });
      expect(result.message).toBe(specialMsg);
    });

    it('should handle RelatedObjects field', async () => {
      const result = await Notification.create({
        notificationType: 'system',
        title: 'With Related',
        message: 'Test',
        recipient: 'user-001',
        UserInvolved: 'user-002',
        RelatedObjects: 'doc-123,txn-456'
      });
      expect(result.RelatedObjects).toBe('doc-123,txn-456');
    });

    it('should handle notification without RelatedObjects', async () => {
      const result = await Notification.create({
        notificationType: 'system',
        title: 'No Related',
        message: 'Test',
        recipient: 'user-001',
        UserInvolved: 'user-002'
      });
      expect(result.RelatedObjects).toBeUndefined();
    });

    it('should handle multiple notifications for same recipient', async () => {
      for (let i = 0; i < 5; i++) {
        await Notification.create({
          notificationType: 'system',
          title: `Notif ${i}`,
          message: `Message ${i}`,
          recipient: 'user-multi',
          UserInvolved: 'user-002'
        });
      }

      const results = await Notification.findByRecipient('user-multi');
      expect(results.length).toBe(5);
    });
  });
});
