/**
 * Company Scope Middleware - Comprehensive Coverage Tests
 * Issue #41: Middleware Test Suite
 *
 * Tests for: enforceCompanyScope, resolveTargetCompanyId,
 * superadmin/super_admin role bypass in assertCompanyOwnership.
 */
'use strict';

const {
  requireCompanyScope,
  assertCompanyOwnership,
  assertUserOwnership,
  resolveTargetCompanyId,
  enforceCompanyScope
} = require('../../../middleware/companyScope');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('CompanyScope Middleware - Comprehensive Coverage', () => {

  // ---------------------------------------------------------------
  // resolveTargetCompanyId
  // ---------------------------------------------------------------
  describe('resolveTargetCompanyId', () => {
    it('should return user companyId for regular users regardless of body companyId', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-A' },
        body: { companyId: 'company-B' },
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBe('company-A');
    });

    it('should return body companyId for admin users', () => {
      const req = {
        user: { role: 'admin', companyId: 'company-A' },
        body: { companyId: 'company-B' },
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBe('company-B');
    });

    it('should return query companyId for admin when body has none', () => {
      const req = {
        user: { role: 'admin', companyId: 'company-A' },
        body: {},
        query: { companyId: 'company-Q' }
      };
      expect(resolveTargetCompanyId(req)).toBe('company-Q');
    });

    it('should fall back to user companyId for admin when no body/query companyId', () => {
      const req = {
        user: { role: 'admin', companyId: 'company-A' },
        body: {},
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBe('company-A');
    });

    it('should return null for admin with no companyId anywhere', () => {
      const req = {
        user: { role: 'admin' },
        body: {},
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBeNull();
    });

    it('should return null for regular user with no companyId', () => {
      const req = {
        user: { role: 'employee' },
        body: {},
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBeNull();
    });

    it('should treat superadmin as admin role', () => {
      const req = {
        user: { role: 'superadmin', companyId: 'company-A' },
        body: { companyId: 'company-X' },
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBe('company-X');
    });

    it('should treat super_admin as admin role', () => {
      const req = {
        user: { role: 'super_admin', companyId: 'company-A' },
        body: { companyId: 'company-Y' },
        query: {}
      };
      expect(resolveTargetCompanyId(req)).toBe('company-Y');
    });

    it('should handle missing user gracefully', () => {
      const req = { body: {}, query: {} };
      expect(resolveTargetCompanyId(req)).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // enforceCompanyScope
  // ---------------------------------------------------------------
  describe('enforceCompanyScope', () => {
    it('should call next without modifying anything when no user', () => {
      const req = { method: 'GET', body: {}, query: {} };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should inject companyId into body for POST requests', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-A' },
        method: 'POST',
        body: { name: 'Test' },
        query: {}
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(req.body.companyId).toBe('company-A');
      expect(req.resolvedCompanyId).toBe('company-A');
      expect(next).toHaveBeenCalled();
    });

    it('should inject companyId into body for PUT requests', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-B' },
        method: 'PUT',
        body: { name: 'Updated' },
        query: {}
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(req.body.companyId).toBe('company-B');
      expect(next).toHaveBeenCalled();
    });

    it('should inject companyId into body for PATCH requests', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-C' },
        method: 'PATCH',
        body: { field: 'value' },
        query: {}
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(req.body.companyId).toBe('company-C');
      expect(next).toHaveBeenCalled();
    });

    it('should override query companyId on GET requests when query.companyId is set', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-A' },
        method: 'GET',
        body: {},
        query: { companyId: 'company-spoofed' }
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      // For non-admin users, resolveTargetCompanyId returns their own companyId
      expect(req.query.companyId).toBe('company-A');
      expect(next).toHaveBeenCalled();
    });

    it('should NOT override query companyId on GET when query.companyId is absent', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-A' },
        method: 'GET',
        body: {},
        query: {}
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      // When no companyId in query, it should not be added for GET
      expect(req.query.companyId).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should allow admin to target a different company in body', () => {
      const req = {
        user: { role: 'admin', companyId: 'admin-company' },
        method: 'POST',
        body: { name: 'New Entity', companyId: 'target-company' },
        query: {}
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(req.body.companyId).toBe('target-company');
      expect(req.resolvedCompanyId).toBe('target-company');
    });

    it('should handle DELETE with query companyId', () => {
      const req = {
        user: { role: 'employee', companyId: 'company-D' },
        method: 'DELETE',
        body: {},
        query: { companyId: 'company-spoofed' }
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(req.query.companyId).toBe('company-D');
    });

    it('should set resolvedCompanyId on the request object', () => {
      const req = {
        user: { role: 'founder', companyId: 'founder-company' },
        method: 'GET',
        body: {},
        query: {}
      };
      const res = mockRes();
      const next = jest.fn();

      enforceCompanyScope(req, res, next);

      expect(req.resolvedCompanyId).toBe('founder-company');
    });
  });

  // ---------------------------------------------------------------
  // assertCompanyOwnership - additional role checks
  // ---------------------------------------------------------------
  describe('assertCompanyOwnership - role bypass', () => {
    it('should bypass for superadmin role', () => {
      const req = { user: { companyId: 'company-a', role: 'superadmin' } };
      const res = mockRes();
      const resource = { id: 'r-1', companyId: 'company-different' };

      const result = assertCompanyOwnership(req, res, resource);
      expect(result).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should bypass for super_admin role', () => {
      const req = { user: { companyId: 'company-a', role: 'super_admin' } };
      const res = mockRes();
      const resource = { id: 'r-1', companyId: 'company-different' };

      const result = assertCompanyOwnership(req, res, resource);
      expect(result).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny for founder when resource has different companyId', () => {
      const req = { user: { companyId: 'company-a', role: 'founder' } };
      const res = mockRes();
      const resource = { id: 'r-1', companyId: 'company-b' };

      const result = assertCompanyOwnership(req, res, resource);
      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle undefined resource', () => {
      const req = { user: { companyId: 'company-a', role: 'admin' } };
      const res = mockRes();

      const result = assertCompanyOwnership(req, res, undefined);
      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ---------------------------------------------------------------
  // assertUserOwnership - additional scenarios
  // ---------------------------------------------------------------
  describe('assertUserOwnership - additional scenarios', () => {
    it('should handle undefined resource', () => {
      const req = { user: { userId: 'u-1' } };
      const res = mockRes();

      const result = assertUserOwnership(req, res, undefined);
      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return true when resource matches user on custom field', () => {
      const req = { user: { userId: 'u-1' } };
      const res = mockRes();
      const resource = { grantId: 'g-1', ownerId: 'u-1' };

      const result = assertUserOwnership(req, res, resource, 'ownerId');
      expect(result).toBe(true);
    });
  });
});
