/**
 * EquityGrant Controller — exerciseGrant unit tests
 * Issue #178: exerciseGrant must use resolvedId (not raw req.params.id) for the update call.
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

jest.mock('../../../services/equityGrantService', () => ({
  generateGrantId: jest.fn().mockReturnValue('GRANT-AUTO'),
  validateExercise: jest.fn().mockReturnValue({ valid: true, errors: [], exercisableShares: 1000, requestedShares: 100 }),
  getGrantTemplates: jest.fn().mockReturnValue([]),
  applyTemplate: jest.fn(),
  calculateVestedShares: jest.fn(),
  calculateExercisableShares: jest.fn(),
  calculateTotalEquityValue: jest.fn(),
  getGrantSummary: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const equityGrantController = require('../../../controllers/equityGrantController');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('exerciseGrant — resolvedId fix (Issue #178)', () => {
  let req, res;

  const baseGrant = {
    _id: 'abc123',
    grantId: 'GRANT-001',
    companyId: 'COMP-001',
    employeeId: 'EMP-001',
    grantType: 'ISO',
    numberOfShares: 1000,
    strikePrice: 1.5,
    status: 'active',
    exercisedShares: 0,
    exerciseHistory: [],
    vestingSchedule: {
      vestingStartDate: '2024-01-15',
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'monthly'
    }
  };

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { userId: 'user_1', companyId: 'COMP-001', role: 'admin', permissions: [] };
    req.body = { sharesToExercise: 100 };
    jest.clearAllMocks();
  });

  it('should exercise correctly when grant is found by _id', async () => {
    const internalId = 'abc123';
    req.params = { id: internalId };

    databaseAdapter.findById.mockResolvedValue({ ...baseGrant, _id: internalId });
    databaseAdapter.findByIdAndUpdate.mockResolvedValue({
      ...baseGrant,
      _id: internalId,
      exercisedShares: 100,
      status: 'active'
    });

    await equityGrantController.exerciseGrant(req, res);

    expect(res.statusCode).toBe(200);
    // The update must target the same internal _id
    expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
      'EquityGrant',
      internalId,
      expect.objectContaining({ exercisedShares: 100 }),
      { new: true }
    );
  });

  it('should exercise correctly when grant is found by grantId', async () => {
    const grantId = 'GRANT-001';
    const internalId = 'resolved-internal-id-999';
    req.params = { id: grantId };

    // resolveGrantId will call find to look up by grantId
    databaseAdapter.find.mockResolvedValue([{ ...baseGrant, _id: internalId, grantId }]);
    // findById uses the resolved internal ID
    databaseAdapter.findById.mockResolvedValue({ ...baseGrant, _id: internalId, grantId });
    databaseAdapter.findByIdAndUpdate.mockResolvedValue({
      ...baseGrant,
      _id: internalId,
      exercisedShares: 100,
      status: 'active'
    });

    await equityGrantController.exerciseGrant(req, res);

    expect(res.statusCode).toBe(200);
    // The update MUST target the resolved internal ID, not the grantId string
    expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
      'EquityGrant',
      internalId,
      expect.objectContaining({ exercisedShares: 100 }),
      { new: true }
    );
    // Crucially, it must NOT use the raw grantId for the update
    expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalledWith(
      'EquityGrant',
      grantId,
      expect.anything(),
      expect.anything()
    );
  });

  it('should pass the resolved ID — not req.params.id — to the update call', async () => {
    const grantId = 'GRANT-XYZ';
    const resolvedInternalId = 'row-id-42';
    req.params = { id: grantId };

    databaseAdapter.find.mockResolvedValue([{ ...baseGrant, _id: resolvedInternalId, grantId }]);
    databaseAdapter.findById.mockResolvedValue({ ...baseGrant, _id: resolvedInternalId, grantId });
    databaseAdapter.findByIdAndUpdate.mockResolvedValue({
      ...baseGrant,
      _id: resolvedInternalId,
      exercisedShares: 100
    });

    await equityGrantController.exerciseGrant(req, res);

    const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
    // Second argument (index 1) is the ID — must be the resolved one
    expect(updateCall[1]).toBe(resolvedInternalId);
    expect(updateCall[1]).not.toBe(grantId);
  });
});
