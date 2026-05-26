'use strict';

/**
 * Audit Log Middleware Unit Tests
 * Phase 5: Audit logging middleware
 * TDD Red Phase: Tests written before implementation
 */

process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/auditLogService', () => ({
  logAction: jest.fn().mockResolvedValue(undefined)
}));

const auditLogMiddleware = require('../../../middleware/auditLog');
const auditLogService = require('../../../services/auditLogService');

const makeReq = (overrides = {}) => ({
  user: { userId: 'user-1', role: 'admin', companyId: 'co-1' },
  ip: '127.0.0.1',
  headers: { 'user-agent': 'jest/1.0' },
  ...overrides
});

const makeRes = (statusCode = 200) => {
  const res = {
    statusCode,
    json: jest.fn()
  };
  // json needs to call the real underlying json before any wrapper
  res._originalJson = res.json;
  return res;
};

describe('auditLog middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auditAction factory', () => {
    it('should export an auditAction function', () => {
      expect(typeof auditLogMiddleware.auditAction).toBe('function');
    });

    it('should return an express middleware function', () => {
      const middleware = auditLogMiddleware.auditAction('login', 'auth');
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // (req, res, next)
    });
  });

  describe('middleware behavior', () => {
    it('should call next() immediately', () => {
      const middleware = auditLogMiddleware.auditAction('login', 'auth');
      const req = makeReq();
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should intercept res.json and log action on success (2xx)', async () => {
      const middleware = auditLogMiddleware.auditAction('create_equity_grant', 'equity_grant');
      const req = makeReq();
      const res = makeRes(201);
      const next = jest.fn();

      middleware(req, res, next);

      // Simulate controller calling res.json
      res.json({ id: 'grant-1' });

      // Allow any promises to settle
      await Promise.resolve();

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          userRole: 'admin',
          companyId: 'co-1',
          action: 'create_equity_grant',
          resource: 'equity_grant',
          outcome: 'success'
        })
      );
    });

    it('should log outcome "denied" for 403 responses', async () => {
      const middleware = auditLogMiddleware.auditAction('view_investor_db', 'investor_database');
      const req = makeReq({ user: { userId: 'user-2', role: 'employee', companyId: 'co-1' } });
      const res = makeRes(403);
      const next = jest.fn();

      middleware(req, res, next);
      res.json({ error: 'Forbidden' });

      await Promise.resolve();

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'denied' })
      );
    });

    it('should log outcome "error" for 5xx responses', async () => {
      const middleware = auditLogMiddleware.auditAction('delete_document', 'document');
      const req = makeReq();
      const res = makeRes(500);
      const next = jest.fn();

      middleware(req, res, next);
      res.json({ error: 'Internal Server Error' });

      await Promise.resolve();

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'error' })
      );
    });

    it('should log outcome "error" for 4xx (non-403) responses', async () => {
      const middleware = auditLogMiddleware.auditAction('update_equity_grant', 'equity_grant');
      const req = makeReq();
      const res = makeRes(400);
      const next = jest.fn();

      middleware(req, res, next);
      res.json({ error: 'Bad Request' });

      await Promise.resolve();

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'error' })
      );
    });

    it('should pass req to logAction for IP/user-agent extraction', async () => {
      const middleware = auditLogMiddleware.auditAction('login', 'auth');
      const req = makeReq();
      const res = makeRes(200);
      const next = jest.fn();

      middleware(req, res, next);
      res.json({ token: 'abc' });

      await Promise.resolve();

      const call = auditLogService.logAction.mock.calls[0][0];
      expect(call.req).toBe(req);
    });

    it('should not throw if req.user is undefined', async () => {
      const middleware = auditLogMiddleware.auditAction('login', 'auth');
      const req = makeReq({ user: undefined });
      const res = makeRes(200);
      const next = jest.fn();

      expect(() => middleware(req, res, next)).not.toThrow();
      res.json({ ok: true });

      await Promise.resolve();

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
          userRole: undefined,
          companyId: undefined
        })
      );
    });

    it('should still call the original res.json with original body', () => {
      const middleware = auditLogMiddleware.auditAction('login', 'auth');
      const req = makeReq();
      const originalJsonFn = jest.fn();
      const res = { statusCode: 200, json: originalJsonFn };
      const next = jest.fn();

      middleware(req, res, next);

      const body = { token: 'xyz' };
      res.json(body);

      expect(originalJsonFn).toHaveBeenCalledWith(body);
    });

    it('should not throw if auditLogService.logAction rejects', async () => {
      auditLogService.logAction.mockRejectedValue(new Error('DB error'));

      const middleware = auditLogMiddleware.auditAction('login', 'auth');
      const req = makeReq();
      const res = makeRes(200);
      const next = jest.fn();

      middleware(req, res, next);

      expect(() => res.json({ ok: true })).not.toThrow();

      // Let any unhandled promise rejection surface
      await Promise.resolve();
    });
  });
});
