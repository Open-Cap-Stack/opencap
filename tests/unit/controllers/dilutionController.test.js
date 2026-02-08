/**
 * DilutionController Tests
 *
 * Issue #342: Division by zero risk in dilutionController.js
 *
 * Tests for input validation and edge cases to prevent division by zero errors.
 */

const httpMocks = require('node-mocks-http');
const dilutionController = require('../../../controllers/dilutionController');
const DilutionCalculatorService = require('../../../services/dilutionCalculationService');
const SAFEDilutionService = require('../../../services/safeDilutionService');
const OptionPoolCalculatorService = require('../../../services/optionPoolCalculatorService');

// Mock the services
jest.mock('../../../services/dilutionCalculationService');
jest.mock('../../../services/safeDilutionService');
jest.mock('../../../services/optionPoolCalculatorService');

describe('DilutionController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('calculate', () => {
    it('should return 400 when existingShares is zero', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: 5000000,
        existingShares: 0
      };

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      // Zero is treated as a missing required field (falsy value)
      expect(data.error).toBeDefined();
    });

    it('should return 400 when existingShares is negative', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: 5000000,
        existingShares: -100
      };

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('existingShares must be a positive number');
    });

    it('should return 400 when preMoney is negative', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: -10000000,
        newInvestment: 5000000,
        existingShares: 1000000
      };

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('preMoney and newInvestment cannot be negative');
    });

    it('should return 400 when newInvestment is negative', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: -5000000,
        existingShares: 1000000
      };

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('preMoney and newInvestment cannot be negative');
    });

    it('should calculate dilution successfully with valid inputs', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: 5000000,
        existingShares: 1000000
      };

      const mockResult = {
        postMoney: 15000000,
        newShares: 500000,
        dilutionPercentage: 33.33
      };

      DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue(mockResult);

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        companyId: 'company-123'
        // Missing preMoney, newInvestment, existingShares
      };

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('calculateSAFE', () => {
    it('should return 400 when existingShares is zero', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 0,
        valuationCap: 10000000
      };

      await dilutionController.calculateSAFE(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      // Zero is treated as a missing required field (falsy value)
      expect(data.error).toBeDefined();
    });

    it('should return 400 when existingShares is negative', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: -500,
        valuationCap: 10000000
      };

      await dilutionController.calculateSAFE(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('existingShares must be a positive number');
    });

    it('should return 400 when safeAmount is negative', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: -1000000,
        existingShares: 1000000,
        valuationCap: 10000000
      };

      await dilutionController.calculateSAFE(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('safeAmount cannot be negative');
    });

    it('should return 400 when valuationCap is zero or negative', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000,
        valuationCap: -1000
      };

      await dilutionController.calculateSAFE(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('valuationCap must be a positive number');
    });

    it('should return 400 when discountRate is out of range', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000,
        discountRate: 150
      };

      await dilutionController.calculateSAFE(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('discountRate must be between 0 and 100');
    });

    it('should calculate SAFE dilution successfully with valid inputs', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000,
        valuationCap: 10000000
      };

      const mockResult = {
        safeShares: 100000,
        dilutionPercentage: 9.09
      };

      SAFEDilutionService.calculateSAFEDilution = jest.fn().mockResolvedValue(mockResult);

      await dilutionController.calculateSAFE(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });
  });

  describe('calculateOptionPool', () => {
    it('should return 400 when currentTotalShares is zero', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: 0
      };

      await dilutionController.calculateOptionPool(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      // Zero is treated as a missing required field (falsy value)
      expect(data.error).toBeDefined();
    });

    it('should return 400 when currentTotalShares is negative', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: -1000000
      };

      await dilutionController.calculateOptionPool(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('currentTotalShares must be a positive number');
    });

    it('should return 400 when targetPoolPercentage is out of range', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 150,
        currentTotalShares: 1000000
      };

      await dilutionController.calculateOptionPool(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('targetPoolPercentage must be between 0 and 100');
    });

    it('should return 400 when currentPoolShares is negative', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: 1000000,
        currentPoolShares: -50000
      };

      await dilutionController.calculateOptionPool(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('currentPoolShares cannot be negative');
    });

    it('should calculate option pool dilution successfully with valid inputs', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: 1000000,
        currentPoolShares: 50000
      };

      const mockResult = {
        newPoolShares: 100000,
        dilutionPercentage: 10.0
      };

      OptionPoolCalculatorService.calculateOptionPoolDilution = jest.fn().mockResolvedValue(mockResult);

      await dilutionController.calculateOptionPool(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });
  });

  describe('calculateMultiRound', () => {
    it('should return 400 when initial existingShares is zero', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [
          {
            existingShares: 0,
            preMoney: 10000000,
            newInvestment: 5000000
          }
        ]
      };

      await dilutionController.calculateMultiRound(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('initial existingShares must be a positive number');
    });

    it('should return 400 when round preMoney is negative', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [
          {
            existingShares: 1000000,
            preMoney: -10000000,
            newInvestment: 5000000
          }
        ]
      };

      await dilutionController.calculateMultiRound(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('preMoney and newInvestment cannot be negative');
    });

    it('should return 400 when rounds array is empty', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: []
      };

      await dilutionController.calculateMultiRound(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });

    it('should calculate multi-round dilution successfully with valid inputs', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [
          {
            name: 'Series A',
            existingShares: 1000000,
            preMoney: 10000000,
            newInvestment: 5000000
          }
        ]
      };

      const mockRoundResult = {
        postMoney: 15000000,
        newShares: 500000,
        totalShares: 1500000,
        dilutionPercentage: 33.33
      };

      DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue(mockRoundResult);

      await dilutionController.calculateMultiRound(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.rounds).toBeDefined();
      expect(data.data.summary).toBeDefined();
    });
  });
});
