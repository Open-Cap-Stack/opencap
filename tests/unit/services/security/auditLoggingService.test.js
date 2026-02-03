/**
 * AuditLoggingService Tests
 *
 * Test suite for audit trail logging service
 * Tests data modification logging, user action tracking, API call recording
 */

const AuditLoggingService = require('../../../../services/security/auditLoggingService');

describe('AuditLoggingService', () => {
  let auditService;

  beforeEach(() => {
    auditService = new AuditLoggingService();
  });

  afterEach(() => {
    auditService.clear();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(auditService).toBeDefined();
      expect(auditService.logs).toBeDefined();
      expect(auditService.config).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customService = new AuditLoggingService({
        maxLogSize: 5000,
        retentionDays: 90
      });
      expect(customService.config.maxLogSize).toBe(5000);
      expect(customService.config.retentionDays).toBe(90);
    });

    it('should have default retention of 365 days', () => {
      expect(auditService.config.retentionDays).toBe(365);
    });
  });

  describe('logDataModification', () => {
    it('should log create operations', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        newData: { name: 'John Doe', email: 'john@example.com' }
      });

      expect(entry.id).toBeDefined();
      expect(entry.operation).toBe('CREATE');
      expect(entry.collection).toBe('users');
      expect(entry.documentId).toBe('user123');
      expect(entry.userId).toBe('admin1');
      expect(entry.timestamp).toBeDefined();
      expect(entry.newData).toEqual({ name: 'John Doe', email: 'john@example.com' });
    });

    it('should log update operations with old and new data', () => {
      const entry = auditService.logDataModification({
        operation: 'UPDATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        oldData: { name: 'John Doe' },
        newData: { name: 'John Smith' }
      });

      expect(entry.operation).toBe('UPDATE');
      expect(entry.oldData).toEqual({ name: 'John Doe' });
      expect(entry.newData).toEqual({ name: 'John Smith' });
    });

    it('should log delete operations', () => {
      const entry = auditService.logDataModification({
        operation: 'DELETE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        oldData: { name: 'John Doe', email: 'john@example.com' }
      });

      expect(entry.operation).toBe('DELETE');
      expect(entry.oldData).toEqual({ name: 'John Doe', email: 'john@example.com' });
    });

    it('should include IP address and user agent when provided', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        newData: { name: 'Test' }
      });

      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.userAgent).toBe('Mozilla/5.0');
    });

    it('should generate unique IDs for each log entry', () => {
      const entry1 = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: {}
      });

      const entry2 = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user2',
        userId: 'admin1',
        newData: {}
      });

      expect(entry1.id).not.toBe(entry2.id);
    });

    it('should sanitize sensitive fields from logged data', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        newData: {
          name: 'John Doe',
          password: 'secretPassword123',
          ssn: '123-45-6789',
          creditCard: '4111111111111111'
        }
      });

      expect(entry.newData.name).toBe('John Doe');
      expect(entry.newData.password).toBe('[REDACTED]');
      expect(entry.newData.ssn).toBe('[REDACTED]');
      expect(entry.newData.creditCard).toBe('[REDACTED]');
    });
  });

  describe('logUserAction', () => {
    it('should log user login events', () => {
      const entry = auditService.logUserAction({
        action: 'LOGIN',
        userId: 'user123',
        success: true,
        ipAddress: '192.168.1.1'
      });

      expect(entry.action).toBe('LOGIN');
      expect(entry.userId).toBe('user123');
      expect(entry.success).toBe(true);
      expect(entry.category).toBe('USER_ACTION');
    });

    it('should log user logout events', () => {
      const entry = auditService.logUserAction({
        action: 'LOGOUT',
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      expect(entry.action).toBe('LOGOUT');
    });

    it('should log failed login attempts', () => {
      const entry = auditService.logUserAction({
        action: 'LOGIN',
        userId: 'user123',
        success: false,
        reason: 'Invalid password',
        ipAddress: '192.168.1.1'
      });

      expect(entry.success).toBe(false);
      expect(entry.reason).toBe('Invalid password');
    });

    it('should log permission changes', () => {
      const entry = auditService.logUserAction({
        action: 'PERMISSION_CHANGE',
        userId: 'admin1',
        targetUserId: 'user123',
        oldPermissions: ['read'],
        newPermissions: ['read', 'write'],
        ipAddress: '192.168.1.1'
      });

      expect(entry.action).toBe('PERMISSION_CHANGE');
      expect(entry.targetUserId).toBe('user123');
      expect(entry.oldPermissions).toEqual(['read']);
      expect(entry.newPermissions).toEqual(['read', 'write']);
    });

    it('should log password reset events', () => {
      const entry = auditService.logUserAction({
        action: 'PASSWORD_RESET',
        userId: 'user123',
        initiatedBy: 'admin1',
        ipAddress: '192.168.1.1'
      });

      expect(entry.action).toBe('PASSWORD_RESET');
      expect(entry.initiatedBy).toBe('admin1');
    });
  });

  describe('logAPICall', () => {
    it('should log successful API calls', () => {
      const entry = auditService.logAPICall({
        method: 'GET',
        endpoint: '/api/v1/users',
        userId: 'user123',
        statusCode: 200,
        responseTime: 45,
        ipAddress: '192.168.1.1'
      });

      expect(entry.method).toBe('GET');
      expect(entry.endpoint).toBe('/api/v1/users');
      expect(entry.statusCode).toBe(200);
      expect(entry.responseTime).toBe(45);
      expect(entry.category).toBe('API_CALL');
    });

    it('should log failed API calls', () => {
      const entry = auditService.logAPICall({
        method: 'POST',
        endpoint: '/api/v1/users',
        userId: 'user123',
        statusCode: 400,
        errorMessage: 'Validation failed',
        responseTime: 12,
        ipAddress: '192.168.1.1'
      });

      expect(entry.statusCode).toBe(400);
      expect(entry.errorMessage).toBe('Validation failed');
    });

    it('should log request body for write operations (sanitized)', () => {
      const entry = auditService.logAPICall({
        method: 'POST',
        endpoint: '/api/v1/users',
        userId: 'admin1',
        statusCode: 201,
        requestBody: { name: 'John', password: 'secret123' },
        responseTime: 100,
        ipAddress: '192.168.1.1'
      });

      expect(entry.requestBody.name).toBe('John');
      expect(entry.requestBody.password).toBe('[REDACTED]');
    });

    it('should log query parameters', () => {
      const entry = auditService.logAPICall({
        method: 'GET',
        endpoint: '/api/v1/users',
        userId: 'user123',
        statusCode: 200,
        queryParams: { page: 1, limit: 20, search: 'john' },
        responseTime: 30,
        ipAddress: '192.168.1.1'
      });

      expect(entry.queryParams).toEqual({ page: 1, limit: 20, search: 'john' });
    });

    it('should track rate-limited requests', () => {
      const entry = auditService.logAPICall({
        method: 'GET',
        endpoint: '/api/v1/users',
        userId: 'user123',
        statusCode: 429,
        rateLimited: true,
        responseTime: 5,
        ipAddress: '192.168.1.1'
      });

      expect(entry.statusCode).toBe(429);
      expect(entry.rateLimited).toBe(true);
    });
  });

  describe('searchLogs', () => {
    beforeEach(() => {
      // Create test data
      auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: { name: 'User 1' }
      });
      auditService.logDataModification({
        operation: 'UPDATE',
        collection: 'users',
        documentId: 'user2',
        userId: 'admin2',
        oldData: { name: 'Old' },
        newData: { name: 'New' }
      });
      auditService.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: true,
        ipAddress: '192.168.1.1'
      });
      auditService.logAPICall({
        method: 'GET',
        endpoint: '/api/v1/documents',
        userId: 'user1',
        statusCode: 200,
        responseTime: 50,
        ipAddress: '192.168.1.1'
      });
    });

    it('should search logs by userId', () => {
      const results = auditService.searchLogs({ userId: 'admin1' });
      expect(results.length).toBe(1);
      expect(results[0].userId).toBe('admin1');
    });

    it('should search logs by category', () => {
      const results = auditService.searchLogs({ category: 'DATA_MODIFICATION' });
      expect(results.length).toBe(2);
      results.forEach(r => expect(r.category).toBe('DATA_MODIFICATION'));
    });

    it('should search logs by date range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const results = auditService.searchLogs({
        startDate: oneHourAgo,
        endDate: now
      });
      expect(results.length).toBe(4);
    });

    it('should search logs by collection', () => {
      const results = auditService.searchLogs({ collection: 'users' });
      expect(results.length).toBe(2);
    });

    it('should search logs by operation type', () => {
      const results = auditService.searchLogs({ operation: 'CREATE' });
      expect(results.length).toBe(1);
      expect(results[0].operation).toBe('CREATE');
    });

    it('should support pagination', () => {
      const results = auditService.searchLogs({ limit: 2, offset: 0 });
      expect(results.length).toBe(2);
    });

    it('should return logs sorted by timestamp (newest first)', () => {
      const results = auditService.searchLogs({});
      for (let i = 1; i < results.length; i++) {
        expect(new Date(results[i - 1].timestamp) >= new Date(results[i].timestamp)).toBe(true);
      }
    });

    it('should search by IP address', () => {
      const results = auditService.searchLogs({ ipAddress: '192.168.1.1' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => expect(r.ipAddress).toBe('192.168.1.1'));
    });

    it('should combine multiple search criteria', () => {
      const results = auditService.searchLogs({
        userId: 'user1',
        category: 'API_CALL'
      });
      expect(results.length).toBe(1);
      expect(results[0].userId).toBe('user1');
      expect(results[0].category).toBe('API_CALL');
    });
  });

  describe('getLogById', () => {
    it('should retrieve a specific log entry by ID', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        newData: { name: 'Test' }
      });

      const retrieved = auditService.getLogById(entry.id);
      expect(retrieved).toEqual(entry);
    });

    it('should return null for non-existent log ID', () => {
      const result = auditService.getLogById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getLogsByDocumentId', () => {
    it('should retrieve all logs for a specific document', () => {
      auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin1',
        newData: { name: 'Initial' }
      });
      auditService.logDataModification({
        operation: 'UPDATE',
        collection: 'users',
        documentId: 'user123',
        userId: 'admin2',
        oldData: { name: 'Initial' },
        newData: { name: 'Updated' }
      });

      const logs = auditService.getLogsByDocumentId('user123');
      expect(logs.length).toBe(2);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      // Create varied test data
      for (let i = 0; i < 5; i++) {
        auditService.logDataModification({
          operation: 'CREATE',
          collection: 'users',
          documentId: `user${i}`,
          userId: 'admin1',
          newData: {}
        });
      }
      for (let i = 0; i < 3; i++) {
        auditService.logUserAction({
          action: 'LOGIN',
          userId: `user${i}`,
          success: true,
          ipAddress: '192.168.1.1'
        });
      }
      auditService.logUserAction({
        action: 'LOGIN',
        userId: 'user_failed',
        success: false,
        ipAddress: '10.0.0.1'
      });
    });

    it('should return total log count', () => {
      const stats = auditService.getStatistics();
      expect(stats.totalLogs).toBe(9);
    });

    it('should return logs grouped by category', () => {
      const stats = auditService.getStatistics();
      expect(stats.byCategory.DATA_MODIFICATION).toBe(5);
      expect(stats.byCategory.USER_ACTION).toBe(4);
    });

    it('should return logs grouped by operation', () => {
      const stats = auditService.getStatistics();
      expect(stats.byOperation.CREATE).toBe(5);
    });

    it('should track failed vs successful user actions', () => {
      const stats = auditService.getStatistics();
      expect(stats.userActions.successful).toBe(3);
      expect(stats.userActions.failed).toBe(1);
    });

    it('should track unique users', () => {
      const stats = auditService.getStatistics();
      expect(stats.uniqueUsers).toBeGreaterThan(0);
    });
  });

  describe('exportLogs', () => {
    beforeEach(() => {
      auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: { name: 'Test' }
      });
    });

    it('should export logs as JSON', () => {
      const exported = auditService.exportLogs({ format: 'json' });
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export logs as CSV', () => {
      const exported = auditService.exportLogs({ format: 'csv' });
      expect(typeof exported).toBe('string');
      expect(exported).toContain('id,');
      expect(exported).toContain('timestamp,');
    });

    it('should filter exported logs by criteria', () => {
      auditService.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: true,
        ipAddress: '192.168.1.1'
      });

      const exported = auditService.exportLogs({
        format: 'json',
        filter: { category: 'DATA_MODIFICATION' }
      });
      const parsed = JSON.parse(exported);
      expect(parsed.length).toBe(1);
    });
  });

  describe('log retention and cleanup', () => {
    it('should remove logs older than retention period', () => {
      jest.useFakeTimers();

      auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: {}
      });

      // Fast forward past retention period (365 days + 1 day)
      jest.advanceTimersByTime(366 * 24 * 60 * 60 * 1000);

      auditService.cleanup();

      const stats = auditService.getStatistics();
      expect(stats.totalLogs).toBe(0);

      jest.useRealTimers();
    });

    it('should respect custom retention period', () => {
      jest.useFakeTimers();

      const shortRetentionService = new AuditLoggingService({ retentionDays: 30 });

      shortRetentionService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: {}
      });

      // Fast forward past 30 days + 1 day
      jest.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

      shortRetentionService.cleanup();

      expect(shortRetentionService.getStatistics().totalLogs).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('event listeners', () => {
    it('should emit events on new log entries', (done) => {
      auditService.on('log', (entry) => {
        expect(entry.operation).toBe('CREATE');
        done();
      });

      auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: {}
      });
    });

    it('should emit events for security-related actions', (done) => {
      auditService.on('security', (entry) => {
        expect(entry.action).toBe('LOGIN');
        expect(entry.success).toBe(false);
        done();
      });

      auditService.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: false,
        ipAddress: '192.168.1.1'
      });
    });
  });

  describe('compliance features', () => {
    it('should mark logs as immutable after creation', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: { name: 'Test' }
      });

      expect(entry.immutable).toBe(true);
    });

    it('should generate hash for log integrity verification', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: { name: 'Test' }
      });

      expect(entry.hash).toBeDefined();
      expect(typeof entry.hash).toBe('string');
    });

    it('should verify log integrity', () => {
      const entry = auditService.logDataModification({
        operation: 'CREATE',
        collection: 'users',
        documentId: 'user1',
        userId: 'admin1',
        newData: { name: 'Test' }
      });

      const isValid = auditService.verifyLogIntegrity(entry.id);
      expect(isValid).toBe(true);
    });
  });
});
