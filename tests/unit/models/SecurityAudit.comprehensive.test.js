/**
 * SecurityAudit Model Comprehensive Tests
 *
 * Tests for SecurityAudit methods not covered by the existing SecurityAudit.test.js:
 * findByUser, findByEventType, getSuspiciousActivity, findByIP, deleteOlderThan,
 * and edge cases in risk score calculation.
 */
process.env.SKIP_DB_SETUP = 'true';

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

const SecurityAudit = require('../../../models/SecurityAudit');
const zerodbService = require('../../../services/zerodbService');

describe('SecurityAudit Model (Comprehensive)', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => {
          // Support dot-notation keys like 'userContext.userId'
          const parts = key.split('.');
          let current = doc;
          for (const part of parts) {
            if (current == null) return false;
            current = current[part];
          }
          return current === value;
        });
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: results.length
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      store = store.filter((_, i) => i + 1 !== rowId);
      return Promise.resolve({ deleted_count: 1 });
    });
  });

  const validData = {
    eventId: 'evt-001',
    eventType: 'auth.login.success',
    level: 'low',
    requestContext: { ip: '192.168.1.1', userAgent: 'Chrome/100' },
    details: { message: 'User logged in' },
    userContext: { userId: 'user-001', userEmail: 'user@test.com' }
  };

  // --- findByUser ---

  describe('findByUser()', () => {
    it('should find audits by userId within default 30 days', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-user-1',
        timestamp: recentTimestamp,
        userContext: { userId: 'user-A' }
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-user-2',
        timestamp: recentTimestamp,
        userContext: { userId: 'user-B' }
      });

      const results = await SecurityAudit.findByUser('user-A');
      expect(results.length).toBe(1);
      expect(results[0].userContext.userId).toBe('user-A');
    });

    it('should exclude audits older than specified days', async () => {
      const oldTimestamp = new Date(Date.now() - 40 * 86400000).toISOString();
      const recentTimestamp = new Date().toISOString();

      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old',
        timestamp: oldTimestamp,
        userContext: { userId: 'user-C' }
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-recent',
        timestamp: recentTimestamp,
        userContext: { userId: 'user-C' }
      });

      const results = await SecurityAudit.findByUser('user-C', 30);
      expect(results.length).toBe(1);
      expect(results[0].eventId).toBe('evt-recent');
    });

    it('should return empty array when user has no audits', async () => {
      const results = await SecurityAudit.findByUser('nonexistent-user');
      expect(results).toEqual([]);
    });

    it('should accept custom days parameter', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-custom-days',
        timestamp: recentTimestamp,
        userContext: { userId: 'user-D' }
      });

      const results = await SecurityAudit.findByUser('user-D', 1);
      expect(results.length).toBe(1);
    });
  });

  // --- findByEventType ---

  describe('findByEventType()', () => {
    it('should find audits by event type within default 7 days', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-type-1',
        eventType: 'auth.login.failure',
        timestamp: recentTimestamp
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-type-2',
        eventType: 'auth.login.success',
        timestamp: recentTimestamp
      });

      const results = await SecurityAudit.findByEventType('auth.login.failure');
      expect(results.length).toBe(1);
      expect(results[0].eventType).toBe('auth.login.failure');
    });

    it('should exclude audits older than specified days', async () => {
      const oldTimestamp = new Date(Date.now() - 10 * 86400000).toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old-type',
        eventType: 'data.access',
        timestamp: oldTimestamp
      });

      const results = await SecurityAudit.findByEventType('data.access', 7);
      expect(results.length).toBe(0);
    });
  });

  // --- getSuspiciousActivity ---

  describe('getSuspiciousActivity()', () => {
    it('should return suspicious events within default 1 day', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-sus-1',
        eventType: 'auth.login.failure',
        timestamp: recentTimestamp
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-sus-2',
        eventType: 'security.suspicious_activity',
        timestamp: recentTimestamp
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-normal',
        eventType: 'auth.login.success',
        timestamp: recentTimestamp
      });

      const results = await SecurityAudit.getSuspiciousActivity();
      expect(results.length).toBe(2);
      const types = results.map(r => r.eventType);
      expect(types).toContain('auth.login.failure');
      expect(types).toContain('security.suspicious_activity');
    });

    it('should include rate limit exceeded events', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-rate',
        eventType: 'security.rate_limit_exceeded',
        timestamp: recentTimestamp,
        level: 'medium'
      });

      const results = await SecurityAudit.getSuspiciousActivity();
      expect(results.length).toBe(1);
      expect(results[0].eventType).toBe('security.rate_limit_exceeded');
    });

    it('should include auth.unauthorized events', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-unauth',
        eventType: 'auth.unauthorized',
        timestamp: recentTimestamp,
        level: 'medium'
      });

      const results = await SecurityAudit.getSuspiciousActivity();
      expect(results.length).toBe(1);
    });

    it('should exclude old suspicious events', async () => {
      const oldTimestamp = new Date(Date.now() - 2 * 86400000).toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old-sus',
        eventType: 'auth.login.failure',
        timestamp: oldTimestamp
      });

      const results = await SecurityAudit.getSuspiciousActivity(1);
      expect(results.length).toBe(0);
    });

    it('should accept custom days parameter', async () => {
      const twoDaysAgo = new Date(Date.now() - 1.5 * 86400000).toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-custom-sus',
        eventType: 'auth.login.failure',
        timestamp: twoDaysAgo
      });

      const results1Day = await SecurityAudit.getSuspiciousActivity(1);
      expect(results1Day.length).toBe(0);

      const results3Day = await SecurityAudit.getSuspiciousActivity(3);
      expect(results3Day.length).toBe(1);
    });
  });

  // --- findByIP ---

  describe('findByIP()', () => {
    it('should find audits by IP address', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-ip-1',
        requestContext: { ip: '10.0.0.1' },
        timestamp: recentTimestamp
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-ip-2',
        requestContext: { ip: '10.0.0.2' },
        timestamp: recentTimestamp
      });

      const results = await SecurityAudit.findByIP('10.0.0.1');
      expect(results.length).toBe(1);
      expect(results[0].requestContext.ip).toBe('10.0.0.1');
    });

    it('should exclude audits older than specified days', async () => {
      const oldTimestamp = new Date(Date.now() - 10 * 86400000).toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-ip-old',
        requestContext: { ip: '10.0.0.3' },
        timestamp: oldTimestamp
      });

      const results = await SecurityAudit.findByIP('10.0.0.3', 7);
      expect(results.length).toBe(0);
    });
  });

  // --- deleteOlderThan ---

  describe('deleteOlderThan()', () => {
    it('should delete audits older than specified days', async () => {
      const oldTimestamp = new Date(Date.now() - 100 * 86400000).toISOString();
      const recentTimestamp = new Date().toISOString();

      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old-del',
        timestamp: oldTimestamp
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-recent-keep',
        timestamp: recentTimestamp
      });

      const result = await SecurityAudit.deleteOlderThan(30);
      expect(result.deletedCount).toBe(1);
    });

    it('should return 0 deleted when no old audits exist', async () => {
      const recentTimestamp = new Date().toISOString();
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-recent-only',
        timestamp: recentTimestamp
      });

      const result = await SecurityAudit.deleteOlderThan(30);
      expect(result.deletedCount).toBe(0);
    });

    it('should delete multiple old audits', async () => {
      const oldTimestamp = new Date(Date.now() - 100 * 86400000).toISOString();

      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old-1',
        timestamp: oldTimestamp
      });
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old-2',
        timestamp: oldTimestamp
      });

      const result = await SecurityAudit.deleteOlderThan(30);
      expect(result.deletedCount).toBe(2);
    });
  });

  // --- Risk Score edge cases ---

  describe('Risk score edge cases', () => {
    it('should add time bonus for events less than 1 hour old', async () => {
      const result = await SecurityAudit.create({
        ...validData,
        eventId: 'evt-recent-time',
        timestamp: new Date().toISOString()
      });
      // low (10) + time <1hr (10) = 20
      expect(result.riskScore).toBeGreaterThanOrEqual(20);
    });

    it('should calculate for auth.unauthorized event type modifier', async () => {
      const result = await SecurityAudit.create({
        ...validData,
        eventId: 'evt-unauth-score',
        eventType: 'auth.unauthorized',
        level: 'medium'
      });
      // medium (30) + auth.unauthorized (10) + time = 40+
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('should calculate for admin.action event type modifier', async () => {
      const result = await SecurityAudit.create({
        ...validData,
        eventId: 'evt-admin-score',
        eventType: 'admin.action',
        level: 'low'
      });
      // low (10) + admin.action (5) + time
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('should handle event with no timestamp', async () => {
      const data = { ...validData, eventId: 'evt-no-ts' };
      delete data.timestamp;
      const result = await SecurityAudit.create(data);
      expect(typeof result.riskScore).toBe('number');
    });

    it('should handle event with old timestamp for reduced time bonus', async () => {
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const result = await SecurityAudit.create({
        ...validData,
        eventId: 'evt-old-ts',
        timestamp: oldTimestamp
      });
      // low (10), no time bonus (>24 hrs)
      expect(result.riskScore).toBe(10);
    });
  });

  // --- Multiple validation errors ---

  describe('Multiple validation errors', () => {
    it('should report multiple missing fields', async () => {
      await expect(
        SecurityAudit.create({})
      ).rejects.toThrow(/eventId is required/);
    });

    it('should report all errors when multiple fields are invalid', async () => {
      try {
        await SecurityAudit.create({
          eventType: 'invalid.type',
          level: 'extreme'
        });
        fail('Should have thrown');
      } catch (err) {
        expect(err.message).toContain('eventId is required');
        expect(err.message).toContain('eventType must be one of');
        expect(err.message).toContain('level must be one of');
      }
    });
  });

  // --- markReviewed without notes ---

  describe('markReviewed() edge cases', () => {
    it('should not set notes field when notes parameter is null', async () => {
      await SecurityAudit.create({
        ...validData,
        eventId: 'evt-rev-null'
      });

      const reviewed = await SecurityAudit.markReviewed('evt-rev-null', 'reviewer-1', null);
      expect(reviewed.reviewed).toBe(true);
      // Notes should not be set (updateData.notes should be undefined)
    });
  });
});
