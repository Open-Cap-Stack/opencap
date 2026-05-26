'use strict';

/**
 * Engagement Scope Middleware Tests
 *
 * Phase 4: Service provider engagement-scoped access
 *
 * TDD: Red -> Green -> Refactor
 */

const { requireEngagementScope } = require('../../../middleware/engagementScope');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireEngagementScope middleware', () => {
  it('calls next() for non-service_provider roles (normal RBAC applies)', () => {
    const roles = ['admin', 'founder', 'manager', 'accountant', 'investor', 'employee', 'client', 'super_admin'];
    roles.forEach(role => {
      const req = { user: { userId: 'u-1', role } };
      const res = mockRes();
      const next = jest.fn();

      requireEngagementScope('documents')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it('calls next() when service_provider has the required scope', () => {
    const req = {
      user: {
        userId: 'sp-1',
        role: 'service_provider',
        profile: { accessScopes: ['documents', 'compliance'] },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('documents')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when service_provider lacks the required scope', () => {
    const req = {
      user: {
        userId: 'sp-1',
        role: 'service_provider',
        profile: { accessScopes: ['compliance'] },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('documents')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/scope/i) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when service_provider has no profile set', () => {
    const req = {
      user: {
        userId: 'sp-1',
        role: 'service_provider',
        // no profile field
      },
    };
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('documents')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when service_provider profile.accessScopes is empty', () => {
    const req = {
      user: {
        userId: 'sp-1',
        role: 'service_provider',
        profile: { accessScopes: [] },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('documents')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when service_provider profile.accessScopes is undefined', () => {
    const req = {
      user: {
        userId: 'sp-1',
        role: 'service_provider',
        profile: {},
      },
    };
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('compliance')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is not set', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('documents')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('works with cap_table_read scope', () => {
    const req = {
      user: {
        userId: 'sp-1',
        role: 'service_provider',
        profile: { accessScopes: ['cap_table_read'] },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    requireEngagementScope('cap_table_read')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
