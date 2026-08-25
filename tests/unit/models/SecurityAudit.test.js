/**
 * SecurityAudit Model Tests
 * Feature: Issue #40 - Model Test Coverage
 * Tests for security audit event tracking, risk scoring, and query methods
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

const SecurityAudit = require('../../../models/SecurityAudit');
const zerodbService = require('../../../services/zerodbService');

describe('SecurityAudit Model', () => {
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

    // Mock deleteRows
    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    // Mock deleteRowById
    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      store = store.filter((_, i) => i + 1 !== rowId);
      return Promise.resolve({ deleted_count: 1 });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose EVENT_TYPES', () => {
      expect(SecurityAudit.EVENT_TYPES).toBeDefined();
      expect(SecurityAudit.EVENT_TYPES).toContain('auth.login.success');
      expect(SecurityAudit.EVENT_TYPES).toContain('auth.login.failure');
      expect(SecurityAudit.EVENT_TYPES).toContain('auth.logout');
      expect(SecurityAudit.EVENT_TYPES).toContain('auth.unauthorized');
      expect(SecurityAudit.EVENT_TYPES).toContain('data.access');
      expect(SecurityAudit.EVENT_TYPES).toContain('data.modification');
      expect(SecurityAudit.EVENT_TYPES).toContain('data.deletion');
      expect(SecurityAudit.EVENT_TYPES).toContain('admin.action');
      expect(SecurityAudit.EVENT_TYPES).toContain('security.suspicious_activity');
      expect(SecurityAudit.EVENT_TYPES).toContain('security.rate_limit_exceeded');
    });

    it('should have 17 event types', () => {
      expect(SecurityAudit.EVENT_TYPES.length).toBe(17);
    });

    it('should expose LEVELS', () => {
      expect(SecurityAudit.LEVELS).toEqual(['low', 'medium', 'high', 'critical']);
    });
  });

  // ─── Schema Validation ───────────────────────────────────────

  describe('Schema Validation', () => {
    it('should have the correct schema fields', () => {
      expect(SecurityAudit.schema).toBeDefined();
      expect(SecurityAudit.schema.eventId).toBeDefined();
      expect(SecurityAudit.schema.eventType).toBeDefined();
      expect(SecurityAudit.schema.level).toBeDefined();
      expect(SecurityAudit.schema.timestamp).toBeDefined();
      expect(SecurityAudit.schema.userContext).toBeDefined();
      expect(SecurityAudit.schema.requestContext).toBeDefined();
      expect(SecurityAudit.schema.details).toBeDefined();
      expect(SecurityAudit.schema.reviewed).toBeDefined();
      expect(SecurityAudit.schema.riskScore).toBeDefined();
      expect(SecurityAudit.schema.tags).toBeDefined();
    });

    it('should require eventId', () => {
      expect(SecurityAudit.schema.eventId.required).toBe(true);
      expect(SecurityAudit.schema.eventId.unique).toBe(true);
    });

    it('should require eventType with enum', () => {
      expect(SecurityAudit.schema.eventType.required).toBe(true);
      expect(SecurityAudit.schema.eventType.enum).toEqual(SecurityAudit.EVENT_TYPES);
    });

    it('should require level with enum', () => {
      expect(SecurityAudit.schema.level.required).toBe(true);
      expect(SecurityAudit.schema.level.enum).toEqual(['low', 'medium', 'high', 'critical']);
    });

    it('should require requestContext.ip', () => {
      expect(SecurityAudit.schema.requestContext.ip.required).toBe(true);
    });

    it('should require details', () => {
      expect(SecurityAudit.schema.details.required).toBe(true);
    });

    it('should default reviewed to false', () => {
      expect(SecurityAudit.schema.reviewed.default).toBe(false);
    });

    it('should default environment to unknown', () => {
      expect(SecurityAudit.schema.environment.default).toBe('unknown');
    });

    it('should have riskScore with min 0 and max 100', () => {
      expect(SecurityAudit.schema.riskScore.min).toBe(0);
      expect(SecurityAudit.schema.riskScore.max).toBe(100);
    });
  });

  // ─── Create ──────────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      eventId: 'evt-001',
      eventType: 'auth.login.success',
      level: 'low',
      requestContext: { ip: '192.168.1.1', userAgent: 'Chrome/100' },
      details: { message: 'User logged in successfully' },
      userContext: { userId: 'user-001', userEmail: 'user@company.com' }
    };

    it('should create a valid security audit event', async () => {
      const result = await SecurityAudit.create(validData);

      expect(result).toBeDefined();
      expect(result.eventId).toBe('evt-001');
      expect(result.eventType).toBe('auth.login.success');
      expect(result.level).toBe('low');
      expect(result._type).toBe('security_audit');
    });

    it('should set timestamp if not provided', async () => {
      const result = await SecurityAudit.create(validData);
      expect(result.timestamp).toBeDefined();
    });

    it('should preserve provided timestamp', async () => {
      const timestamp = '2026-01-15T10:00:00.000Z';
      const result = await SecurityAudit.create({ ...validData, timestamp });
      expect(result.timestamp).toBe(timestamp);
    });

    it('should default reviewed to false', async () => {
      const result = await SecurityAudit.create(validData);
      expect(result.reviewed).toBe(false);
    });

    it('should default tags to empty array', async () => {
      const result = await SecurityAudit.create(validData);
      expect(result.tags).toEqual([]);
    });

    it('should set environment from NODE_ENV', async () => {
      const result = await SecurityAudit.create(validData);
      expect(result.environment).toBeDefined();
    });

    it('should set nodeVersion', async () => {
      const result = await SecurityAudit.create(validData);
      expect(result.nodeVersion).toBeDefined();
    });

    it('should auto-calculate riskScore if not provided', async () => {
      const result = await SecurityAudit.create(validData);
      expect(typeof result.riskScore).toBe('number');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should preserve provided riskScore', async () => {
      const result = await SecurityAudit.create({ ...validData, riskScore: 75 });
      expect(result.riskScore).toBe(75);
    });

    it('should throw validation error if eventId is missing', async () => {
      const data = { ...validData, eventId: undefined };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/eventId is required/);
    });

    it('should throw validation error if eventType is missing', async () => {
      const data = { ...validData, eventType: undefined };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/eventType is required/);
    });

    it('should throw validation error for invalid eventType', async () => {
      const data = { ...validData, eventType: 'invalid.type' };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/eventType must be one of/);
    });

    it('should throw validation error if level is missing', async () => {
      const data = { ...validData, level: undefined };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/level is required/);
    });

    it('should throw validation error for invalid level', async () => {
      const data = { ...validData, level: 'extreme' };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/level must be one of/);
    });

    it('should throw validation error if requestContext.ip is missing', async () => {
      const data = { ...validData, requestContext: {} };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/requestContext.ip is required/);
    });

    it('should throw validation error if requestContext is missing', async () => {
      const data = { ...validData, requestContext: undefined };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/requestContext.ip is required/);
    });

    it('should throw validation error if details is missing', async () => {
      const data = { ...validData, details: undefined };
      await expect(SecurityAudit.create(data)).rejects.toThrow(/details is required/);
    });

    it('should create all valid event types', async () => {
      for (let i = 0; i < SecurityAudit.EVENT_TYPES.length; i++) {
        const eventType = SecurityAudit.EVENT_TYPES[i];
        const result = await SecurityAudit.create({
          ...validData,
          eventId: `evt-type-${i}`,
          eventType
        });
        expect(result.eventType).toBe(eventType);
      }
    });

    it('should create all valid levels', async () => {
      for (let i = 0; i < SecurityAudit.LEVELS.length; i++) {
        const level = SecurityAudit.LEVELS[i];
        const result = await SecurityAudit.create({
          ...validData,
          eventId: `evt-level-${i}`,
          level
        });
        expect(result.level).toBe(level);
      }
    });
  });

  // ─── Risk Score Calculation ──────────────────────────────────

  describe('Risk Score Calculation', () => {
    it('should give low base score for low level events', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-low',
        eventType: 'auth.login.success',
        level: 'low',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'success' }
      });
      // low = 10 base, auth.login.success has no modifier, + time-based
      expect(result.riskScore).toBeLessThanOrEqual(25);
    });

    it('should give medium base score for medium level events', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-med',
        eventType: 'data.access',
        level: 'medium',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'data accessed' }
      });
      // medium = 30 base + time-based
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
    });

    it('should give high base score for high level events', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-high',
        eventType: 'data.access',
        level: 'high',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'sensitive data accessed' }
      });
      // high = 60 base + time-based
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
    });

    it('should give critical base score for critical level events', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-crit',
        eventType: 'security.suspicious_activity',
        level: 'critical',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'breach detected' }
      });
      // critical = 90 base + 15 for suspicious_activity + time-based, capped at 100
      expect(result.riskScore).toBe(100);
    });

    it('should add event type modifier for auth.login.failure', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-fail',
        eventType: 'auth.login.failure',
        level: 'low',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'wrong password' }
      });
      // low = 10, auth.login.failure = +5, + time bonus
      expect(result.riskScore).toBeGreaterThanOrEqual(15);
    });

    it('should add event type modifier for data.deletion', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-del',
        eventType: 'data.deletion',
        level: 'medium',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'record deleted' }
      });
      // medium = 30, data.deletion = +10, + time bonus
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('should cap risk score at 100', async () => {
      const result = await SecurityAudit.create({
        eventId: 'evt-rs-cap',
        eventType: 'security.suspicious_activity',
        level: 'critical',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'max risk' }
      });
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  // ─── findByEventId ───────────────────────────────────────────

  describe('findByEventId()', () => {
    it('should find audit by eventId', async () => {
      await SecurityAudit.create({
        eventId: 'evt-find-001',
        eventType: 'auth.login.success',
        level: 'low',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });

      const found = await SecurityAudit.findByEventId('evt-find-001');
      expect(found).toBeDefined();
      expect(found.eventId).toBe('evt-find-001');
    });

    it('should return null for non-existent eventId', async () => {
      const found = await SecurityAudit.findByEventId('evt-nonexistent');
      expect(found).toBeNull();
    });
  });

  // ─── findByLevel ─────────────────────────────────────────────

  describe('findByLevel()', () => {
    it('should find audits by level', async () => {
      await SecurityAudit.create({
        eventId: 'evt-lvl-001',
        eventType: 'auth.login.success',
        level: 'high',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });
      await SecurityAudit.create({
        eventId: 'evt-lvl-002',
        eventType: 'auth.login.failure',
        level: 'high',
        requestContext: { ip: '10.0.0.2' },
        details: { message: 'test' }
      });
      await SecurityAudit.create({
        eventId: 'evt-lvl-003',
        eventType: 'data.access',
        level: 'low',
        requestContext: { ip: '10.0.0.3' },
        details: { message: 'test' }
      });

      const results = await SecurityAudit.findByLevel('high');
      expect(results.length).toBe(2);
    });
  });

  // ─── getUnreviewedCritical ───────────────────────────────────

  describe('getUnreviewedCritical()', () => {
    it('should find unreviewed critical events', async () => {
      await SecurityAudit.create({
        eventId: 'evt-uc-001',
        eventType: 'security.suspicious_activity',
        level: 'critical',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'breach attempt' }
      });
      await SecurityAudit.create({
        eventId: 'evt-uc-002',
        eventType: 'auth.login.success',
        level: 'low',
        requestContext: { ip: '10.0.0.2' },
        details: { message: 'normal login' }
      });

      const results = await SecurityAudit.getUnreviewedCritical();
      expect(results.length).toBe(1);
      expect(results[0].level).toBe('critical');
      expect(results[0].reviewed).toBe(false);
    });
  });

  // ─── markReviewed ────────────────────────────────────────────

  describe('markReviewed()', () => {
    it('should mark an audit event as reviewed', async () => {
      await SecurityAudit.create({
        eventId: 'evt-rev-001',
        eventType: 'auth.login.failure',
        level: 'medium',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'failed attempt' }
      });

      const reviewed = await SecurityAudit.markReviewed('evt-rev-001', 'reviewer-001', 'Looks benign');

      expect(reviewed).toBeDefined();
      expect(reviewed.reviewed).toBe(true);
      expect(reviewed.reviewedBy).toBe('reviewer-001');
      expect(reviewed.reviewedAt).toBeDefined();
      expect(reviewed.notes).toBe('Looks benign');
    });

    it('should mark reviewed without notes', async () => {
      await SecurityAudit.create({
        eventId: 'evt-rev-002',
        eventType: 'data.access',
        level: 'low',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'data read' }
      });

      const reviewed = await SecurityAudit.markReviewed('evt-rev-002', 'reviewer-001');
      expect(reviewed.reviewed).toBe(true);
      expect(reviewed.reviewedBy).toBe('reviewer-001');
    });
  });

  // ─── addTag ──────────────────────────────────────────────────

  describe('addTag()', () => {
    it('should add a tag to an audit event', async () => {
      await SecurityAudit.create({
        eventId: 'evt-tag-001',
        eventType: 'auth.login.failure',
        level: 'medium',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });

      const tagged = await SecurityAudit.addTag('evt-tag-001', 'investigated');
      expect(tagged.tags).toContain('investigated');
    });

    it('should not add duplicate tags', async () => {
      await SecurityAudit.create({
        eventId: 'evt-tag-002',
        eventType: 'auth.login.failure',
        level: 'medium',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' },
        tags: ['investigated']
      });

      const tagged = await SecurityAudit.addTag('evt-tag-002', 'investigated');
      const count = tagged.tags.filter(t => t === 'investigated').length;
      expect(count).toBe(1);
    });

    it('should throw if audit event not found', async () => {
      await expect(
        SecurityAudit.addTag('evt-nonexistent', 'tag')
      ).rejects.toThrow(/Security audit not found/);
    });
  });

  // ─── find and findOne ────────────────────────────────────────

  describe('find() and findOne()', () => {
    it('should filter by _type security_audit in find', async () => {
      await SecurityAudit.create({
        eventId: 'evt-ff-001',
        eventType: 'auth.login.success',
        level: 'low',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });

      const results = await SecurityAudit.find({});
      expect(results.length).toBe(1);
      expect(results[0]._type).toBe('security_audit');
    });

    it('should filter by _type security_audit in findOne', async () => {
      await SecurityAudit.create({
        eventId: 'evt-fo-001',
        eventType: 'auth.login.success',
        level: 'low',
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });

      const result = await SecurityAudit.findOne({ eventId: 'evt-fo-001' });
      expect(result).toBeDefined();
      expect(result._type).toBe('security_audit');
    });
  });

  // ─── countDocuments ──────────────────────────────────────────

  describe('countDocuments()', () => {
    it('should count matching documents', async () => {
      zerodbService.queryTable.mockImplementationOnce(() =>
        Promise.resolve({ total: 5 })
      );

      const count = await SecurityAudit.countDocuments({});
      expect(count).toBe(5);
    });
  });

  // ─── getSecuritySummary ──────────────────────────────────────

  describe('getSecuritySummary()', () => {
    it('should group audits by eventType and level', async () => {
      const recentTimestamp = new Date().toISOString();

      await SecurityAudit.create({
        eventId: 'evt-sum-001',
        eventType: 'auth.login.success',
        level: 'low',
        timestamp: recentTimestamp,
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });
      await SecurityAudit.create({
        eventId: 'evt-sum-002',
        eventType: 'auth.login.success',
        level: 'low',
        timestamp: recentTimestamp,
        requestContext: { ip: '10.0.0.2' },
        details: { message: 'test' }
      });
      await SecurityAudit.create({
        eventId: 'evt-sum-003',
        eventType: 'auth.login.failure',
        level: 'medium',
        timestamp: recentTimestamp,
        requestContext: { ip: '10.0.0.3' },
        details: { message: 'test' }
      });

      const summary = await SecurityAudit.getSecuritySummary(7);
      expect(summary.length).toBeGreaterThanOrEqual(2);

      const loginSuccessGroup = summary.find(
        g => g.eventType === 'auth.login.success' && g.level === 'low'
      );
      expect(loginSuccessGroup).toBeDefined();
      expect(loginSuccessGroup.count).toBe(2);
    });

    it('should sort by count descending', async () => {
      const recentTimestamp = new Date().toISOString();

      // 3 of one type
      for (let i = 0; i < 3; i++) {
        await SecurityAudit.create({
          eventId: `evt-sort-a-${i}`,
          eventType: 'data.access',
          level: 'low',
          timestamp: recentTimestamp,
          requestContext: { ip: '10.0.0.1' },
          details: { message: 'test' }
        });
      }
      // 1 of another type
      await SecurityAudit.create({
        eventId: 'evt-sort-b-0',
        eventType: 'auth.logout',
        level: 'low',
        timestamp: recentTimestamp,
        requestContext: { ip: '10.0.0.1' },
        details: { message: 'test' }
      });

      const summary = await SecurityAudit.getSecuritySummary(7);
      expect(summary[0].count).toBeGreaterThanOrEqual(summary[summary.length - 1].count);
    });
  });
});
