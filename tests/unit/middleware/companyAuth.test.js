/**
 * Company Authorization Middleware Tests
 * Tests for T0-4: Company-scope authorization
 */
process.env.SKIP_DB_SETUP = 'true';

const { verifyCompanyAccess } = require('../../../middleware/companyAuth');

describe('verifyCompanyAccess middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { userId: 'user-1', companyId: 'company-A', role: 'employee' },
      body: {},
      params: {},
      query: {},
      method: 'GET'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should allow access when user companyId matches request companyId', () => {
    req.query.companyId = 'company-A';

    verifyCompanyAccess()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should deny access when user companyId does not match request companyId', () => {
    req.query.companyId = 'company-B';

    verifyCompanyAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow admin users to access any company data', () => {
    req.user.role = 'admin';
    req.query.companyId = 'company-B';

    verifyCompanyAccess()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should auto-inject user companyId when not in request', () => {
    verifyCompanyAccess()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.companyId).toBe('company-A');
  });

  it('should not auto-inject when injectCompanyId is false', () => {
    verifyCompanyAccess({ injectCompanyId: false })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.companyId).toBeUndefined();
  });

  it('should check companyId from body', () => {
    req.body.companyId = 'company-B';

    verifyCompanyAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should check companyId from params', () => {
    req.params.companyId = 'company-B';

    verifyCompanyAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should skip check when no user is authenticated', () => {
    req.user = null;

    verifyCompanyAccess()(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should block mutation for user without companyId', () => {
    req.user.companyId = null;
    req.method = 'POST';

    verifyCompanyAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Company association required') })
    );
  });

  it('should allow GET for user without companyId', () => {
    req.user.companyId = null;
    req.method = 'GET';

    verifyCompanyAccess()(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
