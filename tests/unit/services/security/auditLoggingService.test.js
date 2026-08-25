/**
 * Unit tests for AuditLoggingService
 */

const AuditLoggingService = require('../../../../services/security/auditLoggingService');

describe('AuditLoggingService', () => {
  let audit;

  beforeEach(() => {
    audit = new AuditLoggingService({
      maxLogSize: 100,
      retentionDays: 30
    });
  });

  afterEach(() => {
    audit.clear();
    audit.removeAllListeners();
  });

  // ============ Constructor ============

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const service = new AuditLoggingService();
      expect(service.config.maxLogSize).toBe(10000);
      expect(service.config.retentionDays).toBe(365);
    });

    it('should accept custom config', () => {
      expect(audit.config.maxLogSize).toBe(100);
      expect(audit.config.retentionDays).toBe(30);
    });
  });

  // ============ Data Sanitization ============

  describe('sanitizeData', () => {
    it('should redact sensitive fields', () => {
      const data = {
        name: 'John',
        password: 'secret123',
        ssn: '123-45-6789',
        creditCardNumber: '4111111111111111'
      };
      const sanitized = audit.sanitizeData(data);
      expect(sanitized.name).toBe('John');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.ssn).toBe('[REDACTED]');
      expect(sanitized.creditCardNumber).toBe('[REDACTED]');
    });

    it('should handle nested sensitive fields', () => {
      const data = {
        user: {
          name: 'Jane',
          bankAccount: '12345'
        }
      };
      const sanitized = audit.sanitizeData(data);
      expect(sanitized.user.name).toBe('Jane');
      expect(sanitized.user.bankAccount).toBe('[REDACTED]');
    });

    it('should return primitive values unchanged', () => {
      expect(audit.sanitizeData('hello')).toBe('hello');
      expect(audit.sanitizeData(42)).toBe(42);
      expect(audit.sanitizeData(null)).toBe(null);
      expect(audit.sanitizeData(undefined)).toBe(undefined);
    });

    it('should handle arrays', () => {
      const data = [{ password: 'secret' }, { name: 'ok' }];
      const sanitized = audit.sanitizeData(data);
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].name).toBe('ok');
    });
  });

  // ============ Log Data Modification ============

  describe('logDataModification', () => {
    it('should create a data modification log entry', () => {
      const entry = audit.logDataModification({
        operation: 'CREATE',
        collection: 'stakeholders',
        documentId: 'doc1',
        userId: 'user1',
        newData: { name: 'New Stakeholder' },
        ipAddress: '127.0.0.1',
        userAgent: 'Jest'
      });

      expect(entry.id).toBeDefined();
      expect(entry.category).toBe('DATA_MODIFICATION');
      expect(entry.operation).toBe('CREATE');
      expect(entry.collection).toBe('stakeholders');
      expect(entry.documentId).toBe('doc1');
      expect(entry.hash).toBeDefined();
      expect(entry.immutable).toBe(true);
    });

    it('should sanitize old and new data', () => {
      const entry = audit.logDataModification({
        operation: 'UPDATE',
        collection: 'users',
        documentId: 'u1',
        userId: 'admin',
        oldData: { password: 'old_pw' },
        newData: { password: 'new_pw' },
        ipAddress: '10.0.0.1'
      });

      expect(entry.oldData.password).toBe('[REDACTED]');
      expect(entry.newData.password).toBe('[REDACTED]');
    });

    it('should handle missing old/new data', () => {
      const entry = audit.logDataModification({
        operation: 'DELETE',
        collection: 'documents',
        documentId: 'doc1',
        userId: 'user1'
      });
      expect(entry.oldData).toBeUndefined();
      expect(entry.newData).toBeUndefined();
    });
  });

  // ============ Log User Action ============

  describe('logUserAction', () => {
    it('should create a user action log entry', () => {
      const entry = audit.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: true,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome'
      });

      expect(entry.category).toBe('USER_ACTION');
      expect(entry.action).toBe('LOGIN');
      expect(entry.success).toBe(true);
    });

    it('should emit security event on failed user action', () => {
      const securityHandler = jest.fn();
      audit.on('security', securityHandler);

      audit.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: false,
        reason: 'Invalid password',
        ipAddress: '10.0.0.1'
      });

      expect(securityHandler).toHaveBeenCalledTimes(1);
      expect(securityHandler.mock.calls[0][0].success).toBe(false);
    });

    it('should not emit security event on successful action', () => {
      const securityHandler = jest.fn();
      audit.on('security', securityHandler);

      audit.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: true,
        ipAddress: '10.0.0.1'
      });

      expect(securityHandler).not.toHaveBeenCalled();
    });

    it('should store permission change details', () => {
      const entry = audit.logUserAction({
        action: 'PERMISSION_CHANGE',
        userId: 'admin',
        success: true,
        targetUserId: 'user2',
        oldPermissions: ['read'],
        newPermissions: ['read', 'write'],
        initiatedBy: 'admin'
      });

      expect(entry.targetUserId).toBe('user2');
      expect(entry.oldPermissions).toEqual(['read']);
      expect(entry.newPermissions).toEqual(['read', 'write']);
    });
  });

  // ============ Log API Call ============

  describe('logAPICall', () => {
    it('should create an API call log entry', () => {
      const entry = audit.logAPICall({
        method: 'GET',
        endpoint: '/api/stakeholders',
        userId: 'user1',
        statusCode: 200,
        responseTime: 45,
        ipAddress: '10.0.0.1',
        userAgent: 'Postman'
      });

      expect(entry.category).toBe('API_CALL');
      expect(entry.method).toBe('GET');
      expect(entry.endpoint).toBe('/api/stakeholders');
      expect(entry.statusCode).toBe(200);
    });

    it('should sanitize request body', () => {
      const entry = audit.logAPICall({
        method: 'POST',
        endpoint: '/api/auth/login',
        userId: 'user1',
        statusCode: 200,
        responseTime: 100,
        requestBody: { email: 'test@example.com', password: 'secret' },
        ipAddress: '10.0.0.1'
      });

      expect(entry.requestBody.email).toBe('test@example.com');
      expect(entry.requestBody.password).toBe('[REDACTED]');
    });

    it('should record error messages and rate limiting', () => {
      const entry = audit.logAPICall({
        method: 'POST',
        endpoint: '/api/data',
        userId: 'user1',
        statusCode: 429,
        responseTime: 5,
        errorMessage: 'Rate limited',
        rateLimited: true,
        ipAddress: '10.0.0.1'
      });

      expect(entry.rateLimited).toBe(true);
      expect(entry.errorMessage).toBe('Rate limited');
    });
  });

  // ============ Log Retrieval ============

  describe('Log Retrieval', () => {
    let logEntry;

    beforeEach(() => {
      logEntry = audit.logDataModification({
        operation: 'CREATE',
        collection: 'stakeholders',
        documentId: 'doc1',
        userId: 'user1',
        ipAddress: '127.0.0.1'
      });
    });

    describe('getLogById', () => {
      it('should return log entry by ID', () => {
        const found = audit.getLogById(logEntry.id);
        expect(found).toBeDefined();
        expect(found.id).toBe(logEntry.id);
      });

      it('should return null for non-existent ID', () => {
        expect(audit.getLogById('fake-id')).toBeNull();
      });
    });

    describe('getLogsByDocumentId', () => {
      it('should return logs for a document', () => {
        const logs = audit.getLogsByDocumentId('doc1');
        expect(logs).toHaveLength(1);
        expect(logs[0].documentId).toBe('doc1');
      });

      it('should return empty array when no logs exist', () => {
        expect(audit.getLogsByDocumentId('nonexistent')).toEqual([]);
      });
    });
  });

  // ============ Search Logs ============

  describe('searchLogs', () => {
    beforeEach(() => {
      audit.logDataModification({
        operation: 'CREATE',
        collection: 'stakeholders',
        documentId: 'doc1',
        userId: 'user1',
        ipAddress: '10.0.0.1'
      });
      audit.logDataModification({
        operation: 'UPDATE',
        collection: 'stakeholders',
        documentId: 'doc1',
        userId: 'user2',
        ipAddress: '10.0.0.2'
      });
      audit.logUserAction({
        action: 'LOGIN',
        userId: 'user1',
        success: true,
        ipAddress: '10.0.0.1'
      });
    });

    it('should return all logs when no filters', () => {
      const results = audit.searchLogs();
      expect(results).toHaveLength(3);
    });

    it('should filter by userId', () => {
      const results = audit.searchLogs({ userId: 'user1' });
      expect(results).toHaveLength(2);
    });

    it('should filter by category', () => {
      const results = audit.searchLogs({ category: 'USER_ACTION' });
      expect(results).toHaveLength(1);
    });

    it('should filter by collection', () => {
      const results = audit.searchLogs({ collection: 'stakeholders' });
      expect(results).toHaveLength(2);
    });

    it('should filter by operation', () => {
      const results = audit.searchLogs({ operation: 'CREATE' });
      expect(results).toHaveLength(1);
    });

    it('should filter by ipAddress', () => {
      const results = audit.searchLogs({ ipAddress: '10.0.0.2' });
      expect(results).toHaveLength(1);
    });

    it('should filter by date range', () => {
      const results = audit.searchLogs({
        startDate: new Date(Date.now() - 60000),
        endDate: new Date(Date.now() + 60000)
      });
      expect(results).toHaveLength(3);
    });

    it('should respect limit and offset', () => {
      const results = audit.searchLogs({ limit: 1, offset: 0 });
      expect(results).toHaveLength(1);
    });

    it('should sort by timestamp descending', () => {
      const results = audit.searchLogs();
      for (let i = 1; i < results.length; i++) {
        expect(new Date(results[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(results[i].timestamp).getTime());
      }
    });
  });

  // ============ Statistics ============

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });
      audit.logUserAction({
        action: 'LOGIN',
        userId: 'u1',
        success: true
      });
      audit.logUserAction({
        action: 'LOGIN',
        userId: 'u2',
        success: false,
        reason: 'Wrong password'
      });

      const stats = audit.getStatistics();
      expect(stats.totalLogs).toBe(3);
      expect(stats.byCategory.DATA_MODIFICATION).toBe(1);
      expect(stats.byCategory.USER_ACTION).toBe(2);
      expect(stats.byOperation.CREATE).toBe(1);
      expect(stats.userActions.successful).toBe(1);
      expect(stats.userActions.failed).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
    });

    it('should return zeroes when no logs exist', () => {
      const stats = audit.getStatistics();
      expect(stats.totalLogs).toBe(0);
      expect(stats.uniqueUsers).toBe(0);
    });
  });

  // ============ Export ============

  describe('exportLogs', () => {
    beforeEach(() => {
      audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1',
        ipAddress: '10.0.0.1'
      });
    });

    it('should export as JSON', () => {
      const exported = audit.exportLogs({ format: 'json' });
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should export as CSV', () => {
      const csv = audit.exportLogs({ format: 'csv' });
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('id');
    });

    it('should return empty string for CSV with no logs', () => {
      audit.clear();
      const csv = audit.exportLogs({ format: 'csv' });
      expect(csv).toBe('');
    });

    it('should throw for unsupported format', () => {
      expect(() => audit.exportLogs({ format: 'xml' })).toThrow('Unsupported format: xml');
    });
  });

  // ============ Cleanup ============

  describe('cleanup', () => {
    it('should remove logs older than retention period', () => {
      const entry = audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });
      const old = audit.logs.get(entry.id);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);
      old.timestamp = pastDate.toISOString();

      const deleted = audit.cleanup();
      expect(deleted).toBe(1);
      expect(audit.logs.size).toBe(0);
    });

    it('should keep logs within retention period', () => {
      audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });

      const deleted = audit.cleanup();
      expect(deleted).toBe(0);
      expect(audit.logs.size).toBe(1);
    });
  });

  // ============ Log Integrity ============

  describe('verifyLogIntegrity', () => {
    it('should return true for untampered log', () => {
      const entry = audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });
      expect(audit.verifyLogIntegrity(entry.id)).toBe(true);
    });

    it('should return false for tampered log', () => {
      const entry = audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });
      const log = audit.logs.get(entry.id);
      log.userId = 'hacker';
      expect(audit.verifyLogIntegrity(entry.id)).toBe(false);
    });

    it('should throw for non-existent log', () => {
      expect(() => audit.verifyLogIntegrity('nonexistent')).toThrow('Log not found: nonexistent');
    });
  });

  // ============ Max Log Size ============

  describe('maxLogSize enforcement', () => {
    it('should evict oldest log when max size exceeded', () => {
      const smallAudit = new AuditLoggingService({ maxLogSize: 2 });
      const first = smallAudit.logDataModification({
        operation: 'CREATE',
        collection: 'a',
        documentId: 'a1',
        userId: 'u1'
      });
      smallAudit.logDataModification({
        operation: 'CREATE',
        collection: 'b',
        documentId: 'b1',
        userId: 'u1'
      });
      smallAudit.logDataModification({
        operation: 'CREATE',
        collection: 'c',
        documentId: 'c1',
        userId: 'u1'
      });

      expect(smallAudit.logs.size).toBe(2);
      expect(smallAudit.getLogById(first.id)).toBeNull();
    });
  });

  // ============ Events ============

  describe('events', () => {
    it('should emit log event on every entry', () => {
      const handler = jest.fn();
      audit.on('log', handler);

      audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ============ Clear ============

  describe('clear', () => {
    it('should remove all logs and indices', () => {
      audit.logDataModification({
        operation: 'CREATE',
        collection: 'docs',
        documentId: 'd1',
        userId: 'u1'
      });
      audit.clear();
      expect(audit.logs.size).toBe(0);
      expect(audit.getLogsByDocumentId('d1')).toEqual([]);
    });
  });
});
