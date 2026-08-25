/**
 * SAFE Controller — Required Field Validation Tests
 * Feature: Issue #164 - createSAFE required field validation
 */

jest.mock('../../../models/SAFE', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  canTransitionTo: jest.fn(),
  transitionTo: jest.fn(),
  addInvestorSignature: jest.fn(),
  addCompanySignature: jest.fn(),
  getTotalFundedAmount: jest.fn(),
  getPendingConversion: jest.fn()
}));
jest.mock('../../../models/SignatureRequest', () => ({
  create: jest.fn()
}));
jest.mock('../../../models/SAFEConversion');
jest.mock('../../../services/safeConversionService');

const SAFE = require('../../../models/SAFE');
const ctrl = require('../../../controllers/safeController');

describe('SAFE Controller - Required Field Validation (Issue #164)', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { _id: 'uid', displayName: 'Test User', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  it('should return 400 when all required fields are missing', async () => {
    req.body = {};

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.success).toBe(false);
    expect(response.error.message).toContain('Missing required fields');
    expect(response.error.message).toContain('investmentAmount');
    expect(response.error.message).toContain('safeType');
    expect(response.error.message).toContain('investorName');
    expect(response.error.message).toContain('investorEmail');
    // SAFE.create should NOT be called when validation fails
    expect(SAFE.create).not.toHaveBeenCalled();
  });

  it('should return 400 when investmentAmount is missing', async () => {
    req.body = {
      safeType: 'post-money',
      investorName: 'Jane Doe',
      investorEmail: 'jane@example.com'
    };

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.error.message).toContain('investmentAmount');
    expect(response.error).not.toContain('safeType');
    expect(response.error).not.toContain('investorName');
    expect(response.error).not.toContain('investorEmail');
    expect(SAFE.create).not.toHaveBeenCalled();
  });

  it('should return 400 when safeType is missing', async () => {
    req.body = {
      investmentAmount: 100000,
      investorName: 'Jane Doe',
      investorEmail: 'jane@example.com'
    };

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.error.message).toContain('safeType');
    expect(response.error).not.toContain('investmentAmount');
    expect(SAFE.create).not.toHaveBeenCalled();
  });

  it('should return 400 when investorName is missing', async () => {
    req.body = {
      investmentAmount: 100000,
      safeType: 'post-money',
      investorEmail: 'jane@example.com'
    };

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.error.message).toContain('investorName');
    expect(SAFE.create).not.toHaveBeenCalled();
  });

  it('should return 400 when investorEmail is missing', async () => {
    req.body = {
      investmentAmount: 100000,
      safeType: 'post-money',
      investorName: 'Jane Doe'
    };

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.error.message).toContain('investorEmail');
    expect(SAFE.create).not.toHaveBeenCalled();
  });

  it('should return 400 when multiple required fields are missing', async () => {
    req.body = {
      investorName: 'Jane Doe'
    };

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.error.message).toContain('investmentAmount');
    expect(response.error.message).toContain('safeType');
    expect(response.error.message).toContain('investorEmail');
    expect(response.error).not.toContain('investorName');
    expect(SAFE.create).not.toHaveBeenCalled();
  });

  it('should proceed to create when all required fields are present', async () => {
    req.body = {
      investmentAmount: 100000,
      safeType: 'post-money',
      investorName: 'Jane Doe',
      investorEmail: 'jane@example.com',
      valuationCap: 5000000
    };
    const createdSafe = { ...req.body, safeId: 'safe_abc', status: 'draft' };
    SAFE.create.mockResolvedValue(createdSafe);

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(SAFE.create).toHaveBeenCalledTimes(1);
    const response = res.json.mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.data.safeId).toBe('safe_abc');
  });

  it('should treat empty string values as missing', async () => {
    req.body = {
      investmentAmount: 0,
      safeType: '',
      investorName: '',
      investorEmail: 'jane@example.com'
    };

    await ctrl.createSAFE(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const response = res.json.mock.calls[0][0];
    expect(response.error.message).toContain('investmentAmount');
    expect(response.error.message).toContain('safeType');
    expect(response.error.message).toContain('investorName');
    expect(SAFE.create).not.toHaveBeenCalled();
  });
});
