/**
 * Employee Self-Service Controller Tests
 *
 * Phase 3: Employee self-service equity API
 *
 * TDD: Tests written before implementation (Red phase)
 * All /me/* endpoints MUST filter by req.user.userId — never return other users' data
 */

const httpMocks = require('node-mocks-http');

jest.mock('../../../services/databaseAdapter');
jest.mock('../../../models/Valuation409A');
jest.mock('../../../services/equityGrantService');

const databaseAdapter = require('../../../services/databaseAdapter');
const Valuation409A = require('../../../models/Valuation409A');
const equityGrantService = require('../../../services/equityGrantService');

const employeeSelfServiceController = require('../../../controllers/employeeSelfServiceController');

describe('EmployeeSelfServiceController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    req.user = {
      userId: 'user_emp_001',
      role: 'employee',
      companyId: 'company_abc'
    };
  });

  // -------------------------------------------------------------------------
  describe('getMyEquity', () => {
    it('should return equity grants for the authenticated user only', async () => {
      const grants = [
        {
          grantId: 'grant_001',
          userId: 'user_emp_001',
          companyId: 'company_abc',
          numberOfShares: 1000,
          vestingSchedule: { cliffMonths: 12, durationMonths: 48 }
        }
      ];

      databaseAdapter.find = jest.fn().mockResolvedValue(grants);
      equityGrantService.calculateVestedShares = jest.fn().mockReturnValue({
        vestedShares: 250,
        unvestedShares: 750
      });

      await employeeSelfServiceController.getMyEquity(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].grantId).toBe('grant_001');

      // Verify it queried with the user's own userId
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'EquityGrant',
        expect.objectContaining({ userId: 'user_emp_001' })
      );
    });

    it('should return empty array when no grants found', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      await employeeSelfServiceController.getMyEquity(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toEqual([]);
    });

    it('should attach vesting schedule info to each grant', async () => {
      const grants = [
        {
          grantId: 'grant_001',
          userId: 'user_emp_001',
          companyId: 'company_abc',
          numberOfShares: 1000
        }
      ];

      databaseAdapter.find = jest.fn().mockResolvedValue(grants);
      equityGrantService.calculateVestedShares = jest.fn().mockReturnValue({
        vestedShares: 250,
        unvestedShares: 750
      });

      await employeeSelfServiceController.getMyEquity(req, res);

      const data = res._getJSONData();
      expect(data[0].vestedShares).toBe(250);
      expect(data[0].unvestedShares).toBe(750);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find = jest.fn().mockRejectedValue(new Error('DB failure'));

      await employeeSelfServiceController.getMyEquity(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  describe('getMyDocuments', () => {
    it('should return only documents belonging to the authenticated user', async () => {
      const documents = [
        {
          documentId: 'doc_001',
          userId: 'user_emp_001',
          companyId: 'company_abc',
          documentType: 'offer_letter',
          title: 'Offer Letter'
        }
      ];

      databaseAdapter.find = jest.fn().mockResolvedValue(documents);

      await employeeSelfServiceController.getMyDocuments(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].documentId).toBe('doc_001');

      // Must query by userId
      expect(databaseAdapter.find).toHaveBeenCalledWith(
        expect.stringMatching(/[Dd]ocument/),
        expect.objectContaining({ userId: 'user_emp_001' })
      );
    });

    it('should return empty array when no documents found', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([]);

      await employeeSelfServiceController.getMyDocuments(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find = jest.fn().mockRejectedValue(new Error('DB failure'));

      await employeeSelfServiceController.getMyDocuments(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  describe('getMyValuation', () => {
    it('should return company valuation with employee share value', async () => {
      const latestValuation = {
        valuationId: 'val_001',
        companyId: 'company_abc',
        fairMarketValue: 10000000,
        pricePerShare: 10.50,
        effectiveDate: '2026-01-01',
        totalShares: 1000000
      };

      const grants = [
        {
          grantId: 'grant_001',
          userId: 'user_emp_001',
          companyId: 'company_abc',
          numberOfShares: 1000
        }
      ];

      Valuation409A.findOne = jest.fn().mockResolvedValue(latestValuation);
      databaseAdapter.find = jest.fn().mockResolvedValue(grants);
      equityGrantService.calculateVestedShares = jest.fn().mockReturnValue({
        vestedShares: 250,
        unvestedShares: 750
      });

      await employeeSelfServiceController.getMyValuation(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.pricePerShare).toBe(10.50);
      expect(data.valuationDate).toBe('2026-01-01');
      expect(data.totalShares).toBe(1000000);
      expect(typeof data.employeeShareValue).toBe('number');
      // 250 vested shares * 10.50 = 2625
      expect(data.employeeShareValue).toBeCloseTo(2625, 1);
    });

    it('should return 404 when no valuation exists for the company', async () => {
      Valuation409A.findOne = jest.fn().mockResolvedValue(null);

      await employeeSelfServiceController.getMyValuation(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should scope valuation query to the user\'s companyId', async () => {
      const latestValuation = {
        valuationId: 'val_001',
        companyId: 'company_abc',
        pricePerShare: 5.00,
        effectiveDate: '2026-01-01',
        totalShares: 500000
      };

      Valuation409A.findOne = jest.fn().mockResolvedValue(latestValuation);
      databaseAdapter.find = jest.fn().mockResolvedValue([]);
      equityGrantService.calculateVestedShares = jest.fn().mockReturnValue({ vestedShares: 0 });

      await employeeSelfServiceController.getMyValuation(req, res);

      // findOne is called with (query, options) — verify the query arg contains companyId
      const [[firstArg]] = Valuation409A.findOne.mock.calls;
      expect(firstArg).toMatchObject({ companyId: 'company_abc' });
    });

    it('should return 500 on database error', async () => {
      Valuation409A.findOne = jest.fn().mockRejectedValue(new Error('DB failure'));

      await employeeSelfServiceController.getMyValuation(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  describe('getMyProfile', () => {
    it('should return the authenticated user\'s own profile', async () => {
      const userProfile = {
        userId: 'user_emp_001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@acme.com',
        role: 'employee',
        companyId: 'company_abc',
        profile: { bio: 'Software Engineer', phoneNumber: '555-0100' }
      };

      databaseAdapter.findOne = jest.fn().mockResolvedValue(userProfile);

      await employeeSelfServiceController.getMyProfile(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.userId).toBe('user_emp_001');
      expect(data.email).toBe('jane@acme.com');
      // Password must not be exposed
      expect(data.password).toBeUndefined();
    });

    it('should not expose password in the response', async () => {
      const userProfile = {
        userId: 'user_emp_001',
        email: 'jane@acme.com',
        password: '$2b$10$hashed_password_value',
        role: 'employee'
      };

      databaseAdapter.findOne = jest.fn().mockResolvedValue(userProfile);

      await employeeSelfServiceController.getMyProfile(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.password).toBeUndefined();
    });

    it('should return 404 when user is not found', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);

      await employeeSelfServiceController.getMyProfile(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.findOne = jest.fn().mockRejectedValue(new Error('DB failure'));

      await employeeSelfServiceController.getMyProfile(req, res);

      expect(res.statusCode).toBe(500);
    });
  });
});
