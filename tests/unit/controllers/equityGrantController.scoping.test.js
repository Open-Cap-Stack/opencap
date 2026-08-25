/**
 * EquityGrant Controller — Company Scoping Tests
 * Issue #185: getGrantsByEmployee and getEmployeeGrantSummary must filter by companyId
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn()
}));

jest.mock('../../../services/documentTemplateService', () => ({
  generateDocument: jest.fn().mockResolvedValue({ content: '', htmlContent: '' })
}));

const httpMocks = require('node-mocks-http');
const equityGrantController = require('../../../controllers/equityGrantController');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityGrant Controller — Company Scoping (Issue #185)', () => {
  let req, res;

  const COMPANY_A = 'COMP-AAA';
  const COMPANY_B = 'COMP-BBB';
  const EMPLOYEE_ID = 'EMP-001';

  const grantsCompanyA = [
    { _id: 'g1', grantId: 'GRANT-A1', employeeId: EMPLOYEE_ID, companyId: COMPANY_A, grantType: 'ISO', numberOfShares: 5000, status: 'active' },
    { _id: 'g2', grantId: 'GRANT-A2', employeeId: EMPLOYEE_ID, companyId: COMPANY_A, grantType: 'NSO', numberOfShares: 3000, status: 'pending' }
  ];

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_1', companyId: COMPANY_A, role: 'admin', permissions: [] };
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // getGrantsByEmployee
  // ----------------------------------------------------------------
  describe('getGrantsByEmployee', () => {
    it('should include companyId in the database query', async () => {
      req.params = { employeeId: EMPLOYEE_ID };
      databaseAdapter.find.mockResolvedValue(grantsCompanyA);

      await equityGrantController.getGrantsByEmployee(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', {
        employeeId: EMPLOYEE_ID,
        companyId: COMPANY_A
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body).toHaveLength(2);
    });

    it('should return empty array when user belongs to a different company', async () => {
      req.user.companyId = COMPANY_B;
      req.params = { employeeId: EMPLOYEE_ID };
      databaseAdapter.find.mockResolvedValue([]);

      await equityGrantController.getGrantsByEmployee(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', {
        employeeId: EMPLOYEE_ID,
        companyId: COMPANY_B
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  // getEmployeeGrantSummary
  // ----------------------------------------------------------------
  describe('getEmployeeGrantSummary', () => {
    it('should pass companyId to the service so grants are scoped', async () => {
      req.params = { employeeId: EMPLOYEE_ID };
      // The service calls databaseAdapter.find internally
      databaseAdapter.find.mockResolvedValue(grantsCompanyA);

      await equityGrantController.getEmployeeGrantSummary(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', {
        employeeId: EMPLOYEE_ID,
        companyId: COMPANY_A
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body.totalGrants).toBe(2);
      expect(body.totalShares).toBe(8000);
    });

    it('should return zero-summary when user belongs to a different company', async () => {
      req.user.companyId = COMPANY_B;
      req.params = { employeeId: EMPLOYEE_ID };
      databaseAdapter.find.mockResolvedValue([]);

      await equityGrantController.getEmployeeGrantSummary(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('EquityGrant', {
        employeeId: EMPLOYEE_ID,
        companyId: COMPANY_B
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body.totalGrants).toBe(0);
      expect(body.totalShares).toBe(0);
    });
  });
});
