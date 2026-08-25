/**
 * Company Auth Middleware - Comprehensive Coverage Tests
 * Issue #41: Middleware Test Suite
 *
 * Additional tests for: superadmin bypass, super_admin bypass,
 * allowMissing option, extractRequestCompanyId standalone.
 */
process.env.SKIP_DB_SETUP = 'true';

const { verifyCompanyAccess, extractRequestCompanyId } = require('../../../middleware/companyAuth');

describe('companyAuth - Comprehensive Coverage', () => {
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

  // ---------------------------------------------------------------
  // extractRequestCompanyId
  // ---------------------------------------------------------------
  describe('extractRequestCompanyId', () => {
    it('should extract companyId from body', () => {
      req.body.companyId = 'comp-body';
      expect(extractRequestCompanyId(req)).toBe('comp-body');
    });

    it('should extract companyId from params', () => {
      req.params.companyId = 'comp-params';
      expect(extractRequestCompanyId(req)).toBe('comp-params');
    });

    it('should extract companyId from query', () => {
      req.query.companyId = 'comp-query';
      expect(extractRequestCompanyId(req)).toBe('comp-query');
    });

    it('should prioritize body over params and query', () => {
      req.body.companyId = 'comp-body';
      req.params.companyId = 'comp-params';
      req.query.companyId = 'comp-query';
      expect(extractRequestCompanyId(req)).toBe('comp-body');
    });

    it('should prioritize params over query when body is absent', () => {
      req.params.companyId = 'comp-params';
      req.query.companyId = 'comp-query';
      expect(extractRequestCompanyId(req)).toBe('comp-params');
    });

    it('should return null when no companyId found', () => {
      expect(extractRequestCompanyId(req)).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // superadmin and super_admin bypass
  // ---------------------------------------------------------------
  describe('admin role variants bypass', () => {
    it('should allow superadmin to access any company data', () => {
      req.user.role = 'superadmin';
      req.query.companyId = 'company-B';

      verifyCompanyAccess()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow super_admin to access any company data', () => {
      req.user.role = 'super_admin';
      req.query.companyId = 'company-C';

      verifyCompanyAccess()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // allowMissing option
  // ---------------------------------------------------------------
  describe('allowMissing option', () => {
    it('should block mutation for user without company when allowMissing is false (default)', () => {
      req.user.companyId = null;
      req.method = 'POST';

      verifyCompanyAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow mutation for user without company when allowMissing is true', () => {
      req.user.companyId = null;
      req.method = 'POST';

      verifyCompanyAccess({ allowMissing: true })(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow GET for user without company when allowMissing is false', () => {
      req.user.companyId = null;
      req.method = 'GET';

      verifyCompanyAccess()(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block PUT for user without company when allowMissing is false', () => {
      req.user.companyId = null;
      req.method = 'PUT';

      verifyCompanyAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block DELETE for user without company when allowMissing is false', () => {
      req.user.companyId = null;
      req.method = 'DELETE';

      verifyCompanyAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block PATCH for user without company when allowMissing is false', () => {
      req.user.companyId = null;
      req.method = 'PATCH';

      verifyCompanyAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------------------------------------------------------------
  // Auto-injection edge cases
  // ---------------------------------------------------------------
  describe('auto-injection edge cases', () => {
    it('should initialize req.query if undefined before injection', () => {
      req.query = undefined;

      // Use Object.defineProperty to make query accessible but not yet set
      const reqObj = {
        user: { userId: 'u1', companyId: 'comp-test', role: 'employee' },
        body: {},
        params: {},
        method: 'GET'
      };
      // query is undefined initially

      verifyCompanyAccess()(reqObj, res, next);

      expect(next).toHaveBeenCalled();
      // The middleware should have set req.query.companyId
      expect(reqObj.query.companyId).toBe('comp-test');
    });
  });

  // ---------------------------------------------------------------
  // Company mismatch scenarios
  // ---------------------------------------------------------------
  describe('company mismatch scenarios', () => {
    it('should deny when body companyId differs from user companyId', () => {
      req.body.companyId = 'other-company';

      verifyCompanyAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('do not have permission')
        })
      );
    });

    it('should deny when params companyId differs from user companyId', () => {
      req.params.companyId = 'different-company';

      verifyCompanyAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow when query companyId matches user companyId', () => {
      req.query.companyId = 'company-A';

      verifyCompanyAccess()(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
