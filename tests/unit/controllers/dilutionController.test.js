/**
 * DilutionController Tests
 *
 * Issue #342: Division by zero risk in dilutionController.js
 *
 * Tests for input validation, CRUD operations, and edge cases.
 */

const httpMocks = require('node-mocks-http');
const dilutionController = require('../../../controllers/dilutionController');
const DilutionCalculatorService = require('../../../services/dilutionCalculationService');
const SAFEDilutionService = require('../../../services/safeDilutionService');
const OptionPoolCalculatorService = require('../../../services/optionPoolCalculatorService');
const DilutionScenario = require('../../../models/DilutionScenario');
const DilutionCalculation = require('../../../models/DilutionCalculation');

// Mock the services and models
jest.mock('../../../services/dilutionCalculationService');
jest.mock('../../../services/safeDilutionService');
jest.mock('../../../services/optionPoolCalculatorService');
jest.mock('../../../models/DilutionScenario');
jest.mock('../../../models/DilutionCalculation');

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
      };

      await dilutionController.calculate(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 500 when service throws', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: 5000000,
        existingShares: 1000000
      };
      DilutionCalculatorService.calculateFundingRound = jest.fn().mockRejectedValue(new Error('Service error'));

      await dilutionController.calculate(req, res);
      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });

    it('should use default sharePrice when not provided', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: 5000000,
        existingShares: 1000000
      };
      DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue({ totalShares: 1500000 });

      await dilutionController.calculate(req, res);
      expect(DilutionCalculatorService.calculateFundingRound).toHaveBeenCalledWith(
        expect.objectContaining({ sharePrice: 10 })
      );
    });

    it('should use provided sharePrice', async () => {
      req.body = {
        companyId: 'company-123',
        preMoney: 10000000,
        newInvestment: 5000000,
        existingShares: 1000000,
        sharePrice: 15
      };
      DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue({ totalShares: 1500000 });

      await dilutionController.calculate(req, res);
      expect(DilutionCalculatorService.calculateFundingRound).toHaveBeenCalledWith(
        expect.objectContaining({ sharePrice: 15 })
      );
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
    });

    it('should return 400 when neither valuationCap nor discountRate is provided', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000
      };

      await dilutionController.calculateSAFE(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Either valuationCap or discountRate');
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { companyId: 'company-123' };

      await dilutionController.calculateSAFE(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 500 when service throws', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000,
        valuationCap: 10000000
      };
      SAFEDilutionService.calculateSAFEDilution = jest.fn().mockRejectedValue(new Error('DB error'));

      await dilutionController.calculateSAFE(req, res);
      expect(res.statusCode).toBe(500);
    });

    it('should return 400 when negative discountRate', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000,
        discountRate: -5
      };

      await dilutionController.calculateSAFE(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('discountRate must be between 0 and 100');
    });

    it('should return 400 when valuationCap is zero (treated as missing)', async () => {
      req.body = {
        companyId: 'company-123',
        safeAmount: 1000000,
        existingShares: 1000000,
        valuationCap: 0
      };

      await dilutionController.calculateSAFE(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      // valuationCap=0 is falsy, so it triggers the "either valuationCap or discountRate" check
      expect(data.error).toContain('Either valuationCap or discountRate');
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
    });

    it('should return 400 when currentTotalShares is negative', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: -1000000
      };

      await dilutionController.calculateOptionPool(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when targetPoolPercentage is out of range', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 150,
        currentTotalShares: 1000000
      };

      await dilutionController.calculateOptionPool(req, res);
      expect(res.statusCode).toBe(400);
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
    });

    it('should calculate option pool dilution successfully', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: 1000000,
        currentPoolShares: 50000
      };

      const mockResult = { newPoolShares: 100000, dilutionPercentage: 10.0 };
      OptionPoolCalculatorService.calculateOptionPoolDilution = jest.fn().mockResolvedValue(mockResult);

      await dilutionController.calculateOptionPool(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { companyId: 'company-123' };

      await dilutionController.calculateOptionPool(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 500 when service throws', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: 15,
        currentTotalShares: 1000000
      };
      OptionPoolCalculatorService.calculateOptionPoolDilution = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.calculateOptionPool(req, res);
      expect(res.statusCode).toBe(500);
    });

    it('should return 400 when targetPoolPercentage is negative', async () => {
      req.body = {
        companyId: 'company-123',
        targetPoolPercentage: -5,
        currentTotalShares: 1000000
      };

      await dilutionController.calculateOptionPool(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('calculateMultiRound', () => {
    it('should return 400 when initial existingShares is zero', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [{ existingShares: 0, preMoney: 10000000, newInvestment: 5000000 }]
      };

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when round preMoney is negative', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [{ existingShares: 1000000, preMoney: -10000000, newInvestment: 5000000 }]
      };

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when rounds array is empty', async () => {
      req.body = { companyId: 'company-123', rounds: [] };

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should calculate multi-round dilution successfully', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [
          { name: 'Series A', existingShares: 1000000, preMoney: 10000000, newInvestment: 5000000 }
        ]
      };

      const mockRoundResult = {
        postMoney: 15000000, newShares: 500000, totalShares: 1500000, dilutionPercentage: 33.33
      };
      DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue(mockRoundResult);

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.roundCount).toBe(1);
    });

    it('should return 400 when rounds is not an array', async () => {
      req.body = { companyId: 'company-123', rounds: 'not-array' };

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = { rounds: [{ existingShares: 1000 }] };

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 500 when service throws', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [{ existingShares: 1000000, preMoney: 10000000, newInvestment: 5000000 }]
      };
      DilutionCalculatorService.calculateFundingRound = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(500);
    });

    it('should calculate multiple rounds sequentially', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [
          { existingShares: 1000000, preMoney: 10000000, newInvestment: 5000000 },
          { preMoney: 20000000, newInvestment: 10000000 }
        ]
      };

      DilutionCalculatorService.calculateFundingRound = jest.fn()
        .mockResolvedValueOnce({ totalShares: 1500000, postMoney: 15000000 })
        .mockResolvedValueOnce({ totalShares: 2250000, postMoney: 30000000 });

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.rounds.length).toBe(2);
      expect(data.data.summary.roundCount).toBe(2);
    });

    it('should return 400 when round newInvestment is negative', async () => {
      req.body = {
        companyId: 'company-123',
        rounds: [{ existingShares: 1000000, preMoney: 10000000, newInvestment: -5000000 }]
      };

      await dilutionController.calculateMultiRound(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('compareScenarios', () => {
    it('should compare scenarios successfully', async () => {
      req.body = { scenarioIds: ['scen_1', 'scen_2'] };
      DilutionCalculatorService.compareScenarios = jest.fn().mockResolvedValue({
        scenarios: [], bestCase: 'scen_1'
      });

      await dilutionController.compareScenarios(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });

    it('should return 400 when fewer than 2 scenarios', async () => {
      req.body = { scenarioIds: ['scen_1'] };

      await dilutionController.compareScenarios(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('At least 2 scenario IDs');
    });

    it('should return 400 when scenarioIds is not an array', async () => {
      req.body = { scenarioIds: 'not-array' };

      await dilutionController.compareScenarios(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when scenarioIds is missing', async () => {
      req.body = {};

      await dilutionController.compareScenarios(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 500 when service throws', async () => {
      req.body = { scenarioIds: ['scen_1', 'scen_2'] };
      DilutionCalculatorService.compareScenarios = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.compareScenarios(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getHistory', () => {
    it('should return dilution history', async () => {
      req.params = { companyId: 'company-123' };
      DilutionCalculatorService.getCompanyDilutionHistory = jest.fn().mockResolvedValue([]);

      await dilutionController.getHistory(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });

    it('should return 500 when service throws', async () => {
      req.params = { companyId: 'company-123' };
      DilutionCalculatorService.getCompanyDilutionHistory = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getHistory(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('createScenario', () => {
    it('should create scenario successfully', async () => {
      req.body = { companyId: 'company-123', name: 'Series A', type: 'funding_round' };
      DilutionScenario.create = jest.fn().mockResolvedValue({
        scenarioId: 'scen_1', companyId: 'company-123'
      });

      await dilutionController.createScenario(req, res);
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });

    it('should return 400 when creation fails', async () => {
      req.body = {};
      DilutionScenario.create = jest.fn().mockRejectedValue(new Error('Validation error'));

      await dilutionController.createScenario(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('getScenario', () => {
    it('should return scenario by ID', async () => {
      req.params = { scenarioId: 'scen_1' };
      DilutionScenario.findByScenarioId = jest.fn().mockResolvedValue({
        scenarioId: 'scen_1', name: 'Series A'
      });

      await dilutionController.getScenario(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });

    it('should return 404 when scenario not found', async () => {
      req.params = { scenarioId: 'nonexistent' };
      DilutionScenario.findByScenarioId = jest.fn().mockResolvedValue(null);

      await dilutionController.getScenario(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 when service throws', async () => {
      req.params = { scenarioId: 'scen_1' };
      DilutionScenario.findByScenarioId = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getScenario(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getScenarios', () => {
    it('should return scenarios for a company', async () => {
      req.params = { companyId: 'company-123' };
      req.query = {};
      DilutionScenario.find = jest.fn().mockResolvedValue([{ scenarioId: 'scen_1' }]);

      await dilutionController.getScenarios(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(1);
    });

    it('should filter by type when provided', async () => {
      req.params = { companyId: 'company-123' };
      req.query = { type: 'funding_round' };
      DilutionScenario.find = jest.fn().mockResolvedValue([]);

      await dilutionController.getScenarios(req, res);
      expect(DilutionScenario.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'funding_round' }),
        expect.any(Object)
      );
    });

    it('should return 500 when service throws', async () => {
      req.params = { companyId: 'company-123' };
      req.query = {};
      DilutionScenario.find = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getScenarios(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateScenario', () => {
    it('should update scenario successfully', async () => {
      req.params = { scenarioId: 'scen_1' };
      req.body = { name: 'Updated Name' };
      DilutionScenario.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      DilutionScenario.findByScenarioId = jest.fn().mockResolvedValue({
        scenarioId: 'scen_1', name: 'Updated Name'
      });

      await dilutionController.updateScenario(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when scenario not found', async () => {
      req.params = { scenarioId: 'nonexistent' };
      req.body = { name: 'Updated' };
      DilutionScenario.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 0 });

      await dilutionController.updateScenario(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when update fails', async () => {
      req.params = { scenarioId: 'scen_1' };
      req.body = { name: 'Updated' };
      DilutionScenario.updateOne = jest.fn().mockRejectedValue(new Error('Validation error'));

      await dilutionController.updateScenario(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteScenario', () => {
    it('should delete scenario successfully', async () => {
      req.params = { scenarioId: 'scen_1' };
      DilutionScenario.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await dilutionController.deleteScenario(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('deleted');
    });

    it('should return 404 when scenario not found', async () => {
      req.params = { scenarioId: 'nonexistent' };
      DilutionScenario.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });

      await dilutionController.deleteScenario(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 when service throws', async () => {
      req.params = { scenarioId: 'scen_1' };
      DilutionScenario.deleteOne = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.deleteScenario(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getCalculation', () => {
    it('should return calculation by ID', async () => {
      req.params = { calculationId: 'calc_1' };
      DilutionCalculation.findByCalculationId = jest.fn().mockResolvedValue({
        calculationId: 'calc_1', type: 'funding_round'
      });

      await dilutionController.getCalculation(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when calculation not found', async () => {
      req.params = { calculationId: 'nonexistent' };
      DilutionCalculation.findByCalculationId = jest.fn().mockResolvedValue(null);

      await dilutionController.getCalculation(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 500 when service throws', async () => {
      req.params = { calculationId: 'calc_1' };
      DilutionCalculation.findByCalculationId = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getCalculation(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getScenarioCalculations', () => {
    it('should return calculations for a scenario', async () => {
      req.params = { scenarioId: 'scen_1' };
      DilutionCalculation.findByScenario = jest.fn().mockResolvedValue([
        { calculationId: 'calc_1' }
      ]);

      await dilutionController.getScenarioCalculations(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.count).toBe(1);
    });

    it('should return 500 when service throws', async () => {
      req.params = { scenarioId: 'scen_1' };
      DilutionCalculation.findByScenario = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getScenarioCalculations(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getFullyDiluted', () => {
    it('should return fully diluted cap table', async () => {
      req.params = { companyId: 'company-123' };
      req.query = {};
      DilutionCalculatorService.calculateFullyDiluted = jest.fn().mockResolvedValue({
        totalShares: 2000000
      });

      await dilutionController.getFullyDiluted(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should pass query flags correctly', async () => {
      req.params = { companyId: 'company-123' };
      req.query = { includeOptions: 'false', includeWarrants: 'true', includeSAFEs: 'false' };
      DilutionCalculatorService.calculateFullyDiluted = jest.fn().mockResolvedValue({});

      await dilutionController.getFullyDiluted(req, res);
      expect(DilutionCalculatorService.calculateFullyDiluted).toHaveBeenCalledWith({
        companyId: 'company-123',
        includeOptions: false,
        includeWarrants: true,
        includeSAFEs: false
      });
    });

    it('should return 500 when service throws', async () => {
      req.params = { companyId: 'company-123' };
      req.query = {};
      DilutionCalculatorService.calculateFullyDiluted = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getFullyDiluted(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getOptionPoolSummary', () => {
    it('should return option pool summary', async () => {
      req.params = { companyId: 'company-123' };
      OptionPoolCalculatorService.getCompanyOptionPoolSummary = jest.fn().mockResolvedValue({
        totalPool: 150000
      });

      await dilutionController.getOptionPoolSummary(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 500 when service throws', async () => {
      req.params = { companyId: 'company-123' };
      OptionPoolCalculatorService.getCompanyOptionPoolSummary = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getOptionPoolSummary(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSAFESummary', () => {
    it('should return SAFE dilution summary', async () => {
      req.params = { companyId: 'company-123' };
      SAFEDilutionService.getCompanySAFEDilution = jest.fn().mockResolvedValue({
        totalSAFEAmount: 2000000
      });

      await dilutionController.getSAFESummary(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 500 when service throws', async () => {
      req.params = { companyId: 'company-123' };
      SAFEDilutionService.getCompanySAFEDilution = jest.fn().mockRejectedValue(new Error('Error'));

      await dilutionController.getSAFESummary(req, res);
      expect(res.statusCode).toBe(500);
    });
  });
});
