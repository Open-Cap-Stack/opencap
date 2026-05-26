'use strict';

/**
 * Audit Log Service Unit Tests
 * Phase 5: Audit logging for all role-gated actions
 * TDD Red Phase: Tests written before implementation
 */

process.env.SKIP_DB_SETUP = 'true';

const { v4: uuidv4 } = require('uuid');

// Mock zerodbService before requiring the service
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  queryRows: jest.fn(),
  useLocalFallback: false,
  _localStore: {}
}));

const auditLogService = require('../../../services/auditLogService');
const zerodbService = require('../../../services/zerodbService');

const makeReq = (overrides = {}) => ({
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest-test-agent' },
  ...overrides
});

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── logAction ────────────────────────────────────────────────────────────

  describe('logAction', () => {
    it('should insert a row into the audit_logs table', async () => {
      const fakeRow = { row_id: uuidv4(), row_data: {} };
      zerodbService.insertRow.mockResolvedValue({ data: [fakeRow] });

      await auditLogService.logAction({
        userId: 'user-1',
        userRole: 'admin',
        companyId: 'company-1',
        action: 'view_investor_db',
        resource: 'investor_database',
        resourceId: null,
        outcome: 'success',
        metadata: {},
        req: makeReq()
      });

      expect(zerodbService.insertRow).toHaveBeenCalledTimes(1);
      const [tableName, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(tableName).toBe('audit_logs');
      expect(rowData.userId).toBe('user-1');
      expect(rowData.userRole).toBe('admin');
      expect(rowData.companyId).toBe('company-1');
      expect(rowData.action).toBe('view_investor_db');
      expect(rowData.resource).toBe('investor_database');
      expect(rowData.outcome).toBe('success');
    });

    it('should capture IP address and user agent from req', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await auditLogService.logAction({
        userId: 'user-2',
        userRole: 'founder',
        companyId: 'company-2',
        action: 'create_equity_grant',
        resource: 'equity_grant',
        outcome: 'success',
        req: makeReq({ ip: '10.0.0.1', headers: { 'user-agent': 'TestBrowser/1.0' } })
      });

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.ipAddress).toBe('10.0.0.1');
      expect(rowData.userAgent).toBe('TestBrowser/1.0');
    });

    it('should include a timestamp in ISO format', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await auditLogService.logAction({
        userId: 'user-3',
        userRole: 'admin',
        companyId: 'company-3',
        action: 'login',
        resource: 'auth',
        outcome: 'success',
        req: makeReq()
      });

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.timestamp).toBeDefined();
      expect(() => new Date(rowData.timestamp)).not.toThrow();
    });

    it('should assign a unique logId (uuid) to each log entry', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await auditLogService.logAction({
        userId: 'u1',
        userRole: 'admin',
        action: 'login',
        resource: 'auth',
        outcome: 'success',
        req: makeReq()
      });

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.logId).toBeDefined();
      expect(typeof rowData.logId).toBe('string');
      expect(rowData.logId.length).toBeGreaterThan(0);
    });

    it('should record outcome "denied" for 403 responses', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await auditLogService.logAction({
        userId: 'user-4',
        userRole: 'employee',
        companyId: 'company-4',
        action: 'view_investor_db',
        resource: 'investor_database',
        outcome: 'denied',
        req: makeReq()
      });

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.outcome).toBe('denied');
    });

    it('should record outcome "error" when an internal error occurs', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await auditLogService.logAction({
        userId: 'user-5',
        userRole: 'admin',
        action: 'delete_document',
        resource: 'document',
        outcome: 'error',
        req: makeReq()
      });

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.outcome).toBe('error');
    });

    it('should not throw if zerodbService.insertRow fails (fire-and-forget safety)', async () => {
      zerodbService.insertRow.mockRejectedValue(new Error('ZeroDB unavailable'));

      await expect(
        auditLogService.logAction({
          userId: 'user-6',
          userRole: 'admin',
          action: 'login',
          resource: 'auth',
          outcome: 'success',
          req: makeReq()
        })
      ).resolves.not.toThrow();
    });

    it('should handle req being undefined gracefully', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await expect(
        auditLogService.logAction({
          userId: 'user-7',
          userRole: 'admin',
          action: 'login',
          resource: 'auth',
          outcome: 'success',
          req: undefined
        })
      ).resolves.not.toThrow();

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.ipAddress).toBeNull();
      expect(rowData.userAgent).toBeNull();
    });

    it('should store optional metadata when provided', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{}] });

      await auditLogService.logAction({
        userId: 'user-8',
        userRole: 'admin',
        action: 'update_equity_grant',
        resource: 'equity_grant',
        resourceId: 'grant-123',
        outcome: 'success',
        metadata: { grantType: 'ISO', shares: 1000 },
        req: makeReq()
      });

      const [, rowData] = zerodbService.insertRow.mock.calls[0];
      expect(rowData.resourceId).toBe('grant-123');
      expect(rowData.metadata).toBeDefined();
    });
  });

  // ─── getAuditLogs ─────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    it('should query audit_logs table with companyId filter', async () => {
      const fakeResults = {
        data: [
          { row_id: 'r1', row_data: { action: 'login', companyId: 'co-1', outcome: 'success' } }
        ]
      };
      zerodbService.queryTable.mockResolvedValue(fakeResults);

      const result = await auditLogService.getAuditLogs({ companyId: 'co-1' });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'audit_logs',
        expect.objectContaining({ filter: expect.objectContaining({ companyId: 'co-1' }) })
      );
      expect(result).toEqual(expect.any(Array));
    });

    it('should apply userId filter when provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await auditLogService.getAuditLogs({ companyId: 'co-1', userId: 'user-99' });

      const [, opts] = zerodbService.queryTable.mock.calls[0];
      expect(opts.filter.userId).toBe('user-99');
    });

    it('should apply action filter when provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await auditLogService.getAuditLogs({ action: 'login' });

      const [, opts] = zerodbService.queryTable.mock.calls[0];
      expect(opts.filter.action).toBe('login');
    });

    it('should apply limit and skip for pagination', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await auditLogService.getAuditLogs({ limit: 20, skip: 40 });

      const [, opts] = zerodbService.queryTable.mock.calls[0];
      expect(opts.limit).toBe(20);
      expect(opts.skip).toBe(40);
    });

    it('should default limit to 50 when not specified', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await auditLogService.getAuditLogs({});

      const [, opts] = zerodbService.queryTable.mock.calls[0];
      expect(opts.limit).toBe(50);
    });

    it('should return empty array when table query returns no data', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      const result = await auditLogService.getAuditLogs({ companyId: 'co-x' });

      expect(result).toEqual([]);
    });
  });

  // ─── getAuditLogById ──────────────────────────────────────────────────────

  describe('getAuditLogById', () => {
    it('should query audit_logs by logId and return the record', async () => {
      const fakeLog = { row_id: 'r1', row_data: { logId: 'log-abc', action: 'login' } };
      zerodbService.queryTable.mockResolvedValue({ data: [fakeLog] });

      const result = await auditLogService.getAuditLogById('log-abc');

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'audit_logs',
        expect.objectContaining({ filter: expect.objectContaining({ logId: 'log-abc' }) })
      );
      expect(result).toBeDefined();
    });

    it('should return null when no log is found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await auditLogService.getAuditLogById('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
