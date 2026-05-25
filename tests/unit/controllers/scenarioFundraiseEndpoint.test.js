/**
 * Tests for unified scenario fundraise endpoint
 * Issue #661: POST /api/v1/scenarios/fundraise
 */

jest.mock('../../../services/dilutionCalculationService');
jest.mock('../../../services/safeDilutionService');

const DilutionCalculatorService = require('../../../services/dilutionCalculationService');
const SAFEDilutionService = require('../../../services/safeDilutionService');
const scenarioFundraiseController = require('../../../controllers/scenarioFundraiseController');

function makeReq(overrides = {}) {
  return {
    body: {
      preMoney: 10000000,
      raiseAmount: 2000000,
      instrument: 'priced',
      optionPoolExpansionPct: 10,
      stakeholders: [
        { stakeholderId: 'sh-1', name: 'Alice', sharesOwned: 1000000 },
        { stakeholderId: 'sh-2', name: 'Bob', sharesOwned: 500000 }
      ],
      existingShares: 1500000
    },
    user: { userId: 'user-1', companyId: 'co-1' },
    ...overrides
  };
}

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('scenarioFundraiseController.fundraise', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 when preMoney is missing', async () => {
    const req = makeReq({ body: { raiseAmount: 2000000, instrument: 'priced', existingShares: 1000000 } });
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when raiseAmount is missing', async () => {
    const req = makeReq({ body: { preMoney: 10000000, instrument: 'priced', existingShares: 1000000 } });
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for invalid instrument type', async () => {
    const req = makeReq({ body: { preMoney: 10000000, raiseAmount: 2000000, instrument: 'invalid', existingShares: 1000000 } });
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should call dilution calculator for priced instrument', async () => {
    DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue({
      newSharePrice: 10,
      newShares: 200000,
      stakeholders: [
        { stakeholderId: 'sh-1', preOwnership: 66.67, postOwnership: 55.56 },
        { stakeholderId: 'sh-2', preOwnership: 33.33, postOwnership: 27.78 }
      ]
    });

    const req = makeReq();
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData).toHaveProperty('scenarioId');
    expect(responseData).toHaveProperty('ownershipTable');
    expect(Array.isArray(responseData.ownershipTable)).toBe(true);
  });

  it('should call SAFE dilution service for SAFE instrument', async () => {
    SAFEDilutionService.calculateSAFEDilution = jest.fn().mockResolvedValue({
      conversionShares: 150000,
      effectiveDiscount: 0.2,
      stakeholders: [
        { stakeholderId: 'sh-1', preOwnership: 66.67, postOwnership: 58.33 }
      ]
    });

    const req = makeReq({
      body: {
        preMoney: 10000000,
        raiseAmount: 1000000,
        instrument: 'safe',
        valuationCap: 8000000,
        discountRate: 0.2,
        existingShares: 1500000,
        stakeholders: [
          { stakeholderId: 'sh-1', name: 'Alice', sharesOwned: 1000000 }
        ]
      }
    });
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return per-stakeholder pre and post ownership table', async () => {
    DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue({
      newSharePrice: 10,
      newShares: 200000,
      stakeholders: [
        { stakeholderId: 'sh-1', name: 'Alice', preOwnership: 66.67, postOwnership: 55.56, sharesOwned: 1000000 }
      ]
    });

    const req = makeReq();
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.ownershipTable).toBeDefined();
    const row = responseData.ownershipTable[0];
    expect(row).toHaveProperty('stakeholderId');
    expect(row).toHaveProperty('preOwnershipPct');
    expect(row).toHaveProperty('postOwnershipPct');
  });

  it('should include a scenario ID in the response', async () => {
    DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue({
      newSharePrice: 10,
      newShares: 200000,
      stakeholders: []
    });

    const req = makeReq();
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.scenarioId).toBeDefined();
    expect(typeof responseData.scenarioId).toBe('string');
    expect(responseData.scenarioId.length).toBeGreaterThan(0);
  });

  it('should include scenario inputs summary in response', async () => {
    DilutionCalculatorService.calculateFundingRound = jest.fn().mockResolvedValue({
      newSharePrice: 10,
      newShares: 200000,
      stakeholders: []
    });

    const req = makeReq();
    const res = makeRes();

    await scenarioFundraiseController.fundraise(req, res);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.inputs).toBeDefined();
    expect(responseData.inputs.preMoney).toBe(10000000);
    expect(responseData.inputs.raiseAmount).toBe(2000000);
    expect(responseData.inputs.instrument).toBe('priced');
  });
});
