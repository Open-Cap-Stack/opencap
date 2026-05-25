'use strict';

const { requireCompanyScope, assertCompanyOwnership, assertUserOwnership } = require('../../../middleware/companyScope');

// Helper to build a minimal Express-like mock
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireCompanyScope middleware', () => {
  it('returns 403 when req.user is undefined', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireCompanyScope(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No company scope — access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user exists but companyId is missing', () => {
    const req = { user: { userId: 'u-1', role: 'employee' } };
    const res = mockRes();
    const next = jest.fn();

    requireCompanyScope(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'No company scope — access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.companyId when companyId is present', () => {
    const req = { user: { userId: 'u-1', companyId: 'company-abc' } };
    const res = mockRes();
    const next = jest.fn();

    requireCompanyScope(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.companyId).toBe('company-abc');
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('assertCompanyOwnership', () => {
  it('returns false and sends 404 when resource is null', () => {
    const req = { user: { companyId: 'company-a' } };
    const res = mockRes();

    const result = assertCompanyOwnership(req, res, null);

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });

  it('returns false and sends 403 when resource.companyId differs from user companyId', () => {
    const req = { user: { companyId: 'company-a' } };
    const res = mockRes();
    const resource = { id: 'r-1', companyId: 'company-b' };

    const result = assertCompanyOwnership(req, res, resource);

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied: resource belongs to another company' });
  });

  it('returns true when resource.companyId matches user companyId', () => {
    const req = { user: { companyId: 'company-a' } };
    const res = mockRes();
    const resource = { id: 'r-1', companyId: 'company-a' };

    const result = assertCompanyOwnership(req, res, resource);

    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns true when resource has no companyId (no restriction — open access)', () => {
    const req = { user: { companyId: 'company-a', role: 'employee' } };
    const res = mockRes();
    const resource = { id: 'r-1' }; // no companyId field

    const result = assertCompanyOwnership(req, res, resource);

    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns true for admin role even when resource.companyId differs (platform-wide access)', () => {
    const req = { user: { companyId: 'company-a', role: 'admin' } };
    const res = mockRes();
    const resource = { id: 'r-1', companyId: 'company-b' };

    const result = assertCompanyOwnership(req, res, resource);

    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns false and sends 403 when non-admin user has no companyId but resource has one', () => {
    const req = { user: { role: 'employee' } }; // no companyId
    const res = mockRes();
    const resource = { id: 'r-1', companyId: 'company-a' };

    // Deny when the resource has a companyId but the non-admin user does not
    const result = assertCompanyOwnership(req, res, resource);

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('assertUserOwnership', () => {
  it('returns false and sends 404 when resource is null', () => {
    const req = { user: { userId: 'u-1' } };
    const res = mockRes();

    const result = assertUserOwnership(req, res, null);

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });

  it('returns false and sends 403 when resource userId differs from req.user.userId', () => {
    const req = { user: { userId: 'u-1' } };
    const res = mockRes();
    const resource = { grantId: 'g-1', userId: 'u-2' };

    const result = assertUserOwnership(req, res, resource);

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied: resource belongs to another user' });
  });

  it('returns true when resource userId matches req.user.userId', () => {
    const req = { user: { userId: 'u-1' } };
    const res = mockRes();
    const resource = { grantId: 'g-1', userId: 'u-1' };

    const result = assertUserOwnership(req, res, resource);

    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('supports a custom userIdField', () => {
    const req = { user: { userId: 'u-1' } };
    const res = mockRes();
    const resource = { grantId: 'g-1', employeeId: 'u-99' };

    const result = assertUserOwnership(req, res, resource, 'employeeId');

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns true when resource has no userIdField set (field absent — no restriction)', () => {
    const req = { user: { userId: 'u-1' } };
    const res = mockRes();
    const resource = { grantId: 'g-1' }; // no userId field

    const result = assertUserOwnership(req, res, resource);

    expect(result).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });
});
