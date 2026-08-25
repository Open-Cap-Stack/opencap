/**
 * VestingSchedule Controller - Required Field Validation Tests
 * Issue #166: createVestingSchedule has no required field validation
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
  aggregate: jest.fn()
}));

jest.mock('../../../services/vestingCalculatorService', () => ({
  calculateVestedShares: jest.fn(),
  calculateAcceleration: jest.fn(),
  getNextVestingEvent: jest.fn(),
  generateVestingTimeline: jest.fn(),
  getVisualizationData: jest.fn(),
  getUpcomingVestingEvents: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const vestingScheduleController = require('../../../controllers/vestingScheduleController');
const databaseAdapter = require('../../../services/databaseAdapter');
const VestingCalculatorService = require('../../../services/vestingCalculatorService');

describe('VestingSchedule Controller - Field Validation', () => {
  let req, res;

  const validBody = {
    totalShares: 10000,
    vestingPeriod: 48,
    cliffPeriod: 12,
    startDate: '2025-01-01'
  };

  beforeEach(() => {
    req = httpMocks.createRequest({ method: 'POST', url: '/api/v1/vesting-schedules' });
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // --- Missing required fields ---

  it('should return 400 when totalShares is missing', async () => {
    const { totalShares, ...body } = validBody;
    req.body = body;

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('totalShares is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when vestingPeriod is missing', async () => {
    const { vestingPeriod, ...body } = validBody;
    req.body = body;

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('vestingPeriod is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when cliffPeriod is missing', async () => {
    const { cliffPeriod, ...body } = validBody;
    req.body = body;

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('cliffPeriod is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when startDate is missing', async () => {
    const { startDate, ...body } = validBody;
    req.body = body;

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('startDate is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 listing all missing fields when body is empty', async () => {
    req.body = {};

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('totalShares is required');
    expect(data.error.message).toContain('vestingPeriod is required');
    expect(data.error.message).toContain('cliffPeriod is required');
    expect(data.error.message).toContain('startDate is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  // --- Type / value validation ---

  it('should return 400 when totalShares is not a number', async () => {
    req.body = { ...validBody, totalShares: 'abc' };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('totalShares must be a positive number');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when totalShares is zero', async () => {
    req.body = { ...validBody, totalShares: 0 };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('totalShares must be a positive number');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when totalShares is negative', async () => {
    req.body = { ...validBody, totalShares: -500 };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('totalShares must be a positive number');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when vestingPeriod is not a number', async () => {
    req.body = { ...validBody, vestingPeriod: 'four years' };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('vestingPeriod must be a positive number');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when vestingPeriod is zero', async () => {
    req.body = { ...validBody, vestingPeriod: 0 };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('vestingPeriod must be a positive number');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when cliffPeriod is negative', async () => {
    req.body = { ...validBody, cliffPeriod: -1 };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('cliffPeriod must be a non-negative number');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when cliffPeriod exceeds vestingPeriod', async () => {
    req.body = { ...validBody, cliffPeriod: 60, vestingPeriod: 48 };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('cliffPeriod cannot exceed vestingPeriod');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when startDate is not a valid date', async () => {
    req.body = { ...validBody, startDate: 'not-a-date' };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('startDate must be a valid date');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  // --- Edge cases for empty / null values ---

  it('should return 400 when totalShares is null', async () => {
    req.body = { ...validBody, totalShares: null };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('totalShares is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  it('should return 400 when startDate is an empty string', async () => {
    req.body = { ...validBody, startDate: '' };

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error.message).toContain('startDate is required');
    expect(databaseAdapter.create).not.toHaveBeenCalled();
  });

  // --- Successful creation with valid data ---

  it('should allow cliffPeriod of 0 (immediate vesting, no cliff)', async () => {
    req.body = { ...validBody, cliffPeriod: 0 };
    const mockSaved = { _id: 'vs-001', ...req.body };
    databaseAdapter.create.mockResolvedValue(mockSaved);
    VestingCalculatorService.getNextVestingEvent.mockReturnValue(null);

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(201);
    expect(databaseAdapter.create).toHaveBeenCalledWith(
      'VestingSchedule',
      expect.objectContaining({
        totalShares: 10000,
        vestedShares: 0,
        unvestedShares: 10000,
        status: 'active'
      })
    );
  });

  it('should create schedule when all required fields are valid', async () => {
    req.body = { ...validBody };
    const mockSaved = { _id: 'vs-002', ...validBody, vestedShares: 0, unvestedShares: 10000, status: 'active' };
    databaseAdapter.create.mockResolvedValue(mockSaved);
    VestingCalculatorService.getNextVestingEvent.mockReturnValue(null);

    await vestingScheduleController.createVestingSchedule(req, res);

    expect(res.statusCode).toBe(201);
    expect(databaseAdapter.create).toHaveBeenCalledTimes(1);
    const responseData = JSON.parse(res._getData());
    expect(responseData._id).toBe('vs-002');
  });
});
