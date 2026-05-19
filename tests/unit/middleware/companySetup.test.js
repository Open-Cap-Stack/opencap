/**
 * Tests for company setup onboarding middleware
 * Fixes: New users with 'user' role cannot create their first company
 * because POST /api/companies requires write:companies (admin/founder/manager only).
 *
 * The allowCompanySetup middleware allows authenticated users without a companyId
 * to create their first company, while falling back to normal RBAC for users
 * who already have a company.
 */

const { hasPermission } = require('../../../middleware/rbacMiddleware');
const { allowCompanySetup } = require('../../../middleware/companySetupMiddleware');

describe('allowCompanySetup middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 'user-1', role: 'user', companyId: null }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should allow request when user has no companyId (first-time setup)', () => {
    allowCompanySetup('write:companies')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow request when user companyId is undefined', () => {
    req.user.companyId = undefined;

    allowCompanySetup('write:companies')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should fall back to permission check when user already has a companyId', () => {
    req.user.companyId = 'existing-company-123';
    req.user.role = 'user'; // 'user' role does NOT have write:companies

    allowCompanySetup('write:companies')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow request when user has companyId AND has the required permission', () => {
    req.user.companyId = 'existing-company-123';
    req.user.role = 'admin'; // 'admin' role HAS write:companies

    allowCompanySetup('write:companies')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', () => {
    req.user = null;

    allowCompanySetup('write:companies')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow founder with companyId', () => {
    req.user.companyId = 'existing-company-123';
    req.user.role = 'founder';

    allowCompanySetup('write:companies')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow manager with companyId', () => {
    req.user.companyId = 'existing-company-123';
    req.user.role = 'manager';

    allowCompanySetup('write:companies')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
