'use strict';

/**
 * Audit Log Controller Unit Tests
 * Phase 5: Audit log query endpoints
 * TDD Red Phase: Tests written before implementation
 */

process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/auditLogService', () => ({
  getAuditLogs: jest.fn(),
  getAuditLogById: jest.fn()
}));

const auditLogController = require('../../../controllers/auditLogController');
const auditLogService = require('../../../services/auditLogService');

const makeReq = (overrides = {}) => ({
  user: { userId: 'admin-1', role: 'admin', companyId: 'co-1' },
  query: {},
  params: {},
  ...overrides
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AuditLogController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getAuditLogs ─────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    it('should return 200 with audit logs array', async () => {
      const fakeLogs = [
        { logId: 'l1', action: 'login', outcome: 'success' },
        { logId: 'l2', action: 'view_investor_db', outcome: 'denied' }
      ];
      auditLogService.getAuditLogs.mockResolvedValue(fakeLogs);

      const req = makeReq({ query: {} });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ logs: fakeLogs })
      );
    });

    it('should pass companyId from req.user when not super_admin', async () => {
      auditLogService.getAuditLogs.mockResolvedValue([]);

      const req = makeReq({ user: { userId: 'a1', role: 'admin', companyId: 'co-99' }, query: {} });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'co-99' })
      );
    });

    it('should allow super_admin to query without companyId restriction', async () => {
      auditLogService.getAuditLogs.mockResolvedValue([]);

      const req = makeReq({
        user: { userId: 'sa-1', role: 'super_admin', companyId: undefined },
        query: { companyId: 'any-co' }
      });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'any-co' })
      );
    });

    it('should pass action filter from query string', async () => {
      auditLogService.getAuditLogs.mockResolvedValue([]);

      const req = makeReq({ query: { action: 'login' } });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'login' })
      );
    });

    it('should pass userId filter from query string', async () => {
      auditLogService.getAuditLogs.mockResolvedValue([]);

      const req = makeReq({ query: { userId: 'user-xyz' } });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-xyz' })
      );
    });

    it('should parse limit and skip from query string as integers', async () => {
      auditLogService.getAuditLogs.mockResolvedValue([]);

      const req = makeReq({ query: { limit: '25', skip: '50' } });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, skip: 50 })
      );
    });

    it('should call next with error when service throws', async () => {
      const err = new Error('DB failure');
      auditLogService.getAuditLogs.mockRejectedValue(err);

      const req = makeReq();
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── getAuditLogById ──────────────────────────────────────────────────────

  describe('getAuditLogById', () => {
    it('should return 200 with the log when found', async () => {
      const fakeLog = { logId: 'log-abc', action: 'login', outcome: 'success' };
      auditLogService.getAuditLogById.mockResolvedValue(fakeLog);

      const req = makeReq({ params: { id: 'log-abc' } });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ log: fakeLog })
      );
    });

    it('should return 404 when log is not found', async () => {
      auditLogService.getAuditLogById.mockResolvedValue(null);

      const req = makeReq({ params: { id: 'nonexistent' } });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should call next with error when service throws', async () => {
      const err = new Error('DB failure');
      auditLogService.getAuditLogById.mockRejectedValue(err);

      const req = makeReq({ params: { id: 'log-abc' } });
      const res = makeRes();
      const next = jest.fn();

      await auditLogController.getAuditLogById(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
