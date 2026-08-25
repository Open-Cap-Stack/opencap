/**
 * VestingScheduleController Coverage Tests
 * Covers uncovered lines: getSchedulesDueForVesting, terminateVestingSchedule with
 * terminationDate, resumeVestingSchedule with pausedAt calculation, error paths for
 * timeline/visualization/acceleration/upcoming-events
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
const controller = require('../../../controllers/vestingScheduleController');
const databaseAdapter = require('../../../services/databaseAdapter');
const VestingCalculatorService = require('../../../services/vestingCalculatorService');

describe('VestingScheduleController - Coverage', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // ---- getSchedulesDueForVesting ----
  describe('getSchedulesDueForVesting', () => {
    it('should return schedules due today', async () => {
      const mockSchedules = [{ _id: 's1', nextVestingDate: new Date() }];
      databaseAdapter.find.mockResolvedValue(mockSchedules);

      await controller.getSchedulesDueForVesting(req, res);
      expect(databaseAdapter.find).toHaveBeenCalledWith('VestingSchedule', expect.objectContaining({
        status: 'active',
        nextVestingDate: expect.any(Object)
      }));
      expect(res.statusCode).toBe(200);
    });

    it('should handle error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('DB error'));
      await controller.getSchedulesDueForVesting(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // ---- terminateVestingSchedule - with terminationDate in body ----
  describe('terminateVestingSchedule - with specific terminationDate', () => {
    it('should use provided terminationDate', async () => {
      req.params = { id: 's1' };
      req.body = { terminationDate: '2026-06-15', terminationType: 'involuntary' };
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', totalShares: 10000, status: 'active' });
      VestingCalculatorService.calculateVestedShares.mockReturnValue({ vestedShares: 5000 });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'terminated' });

      await controller.terminateVestingSchedule(req, res);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule', 's1',
        expect.objectContaining({
          status: 'terminated',
          terminationType: 'involuntary',
          vestedShares: 5000,
          unvestedShares: 5000,
          nextVestingDate: null
        }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should use default terminationType if not provided', async () => {
      req.params = { id: 's1' };
      req.body = {};
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', totalShares: 10000, status: 'active' });
      VestingCalculatorService.calculateVestedShares.mockReturnValue({ vestedShares: 2500 });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'terminated' });

      await controller.terminateVestingSchedule(req, res);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule', 's1',
        expect.objectContaining({ terminationType: 'voluntary' }),
        { new: true }
      );
    });

    it('should return 400 for completed schedule', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', status: 'completed' });
      await controller.terminateVestingSchedule(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.terminateVestingSchedule(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.terminateVestingSchedule(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // ---- resumeVestingSchedule - with pausedAt ----
  describe('resumeVestingSchedule - paused days calculation', () => {
    it('should calculate paused days when pausedAt exists', async () => {
      req.params = { id: 's1' };
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      databaseAdapter.findById.mockResolvedValue({
        _id: 's1', status: 'paused', pausedAt: twoDaysAgo, pausedDays: 5
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'active', pausedDays: 7 });

      await controller.resumeVestingSchedule(req, res);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule', 's1',
        expect.objectContaining({ status: 'active', pausedAt: null }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should handle zero paused days when no pausedAt', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', status: 'paused' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'active' });

      await controller.resumeVestingSchedule(req, res);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule', 's1',
        expect.objectContaining({ pausedDays: 0 }),
        { new: true }
      );
    });

    it('should return 400 if not paused', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', status: 'active' });
      await controller.resumeVestingSchedule(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.resumeVestingSchedule(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.resumeVestingSchedule(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // ---- Error paths for various endpoints ----
  describe('getVestingTimeline - error', () => {
    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.getVestingTimeline(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.getVestingTimeline(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getVisualizationData - error', () => {
    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.getVisualizationData(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.getVisualizationData(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('calculateVesting - error', () => {
    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.calculateVesting(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.calculateVesting(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('applyAcceleration - error paths', () => {
    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.applyAcceleration(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.applyAcceleration(req, res);
      expect(res.statusCode).toBe(500);
    });

    it('should handle double trigger with dates', async () => {
      req.params = { id: 's1' };
      req.body = {
        type: 'double_trigger',
        date: '2026-06-01',
        changeOfControlDate: '2026-01-01',
        terminationDate: '2026-06-01',
        terminationType: 'involuntary'
      };
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', totalShares: 10000 });
      VestingCalculatorService.calculateAcceleration.mockReturnValue({
        acceleratedShares: 10000,
        accelerationType: 'double_trigger',
        previousVestedShares: 5000,
        newVestedShares: 10000
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'accelerated' });

      await controller.applyAcceleration(req, res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('pauseVestingSchedule - error paths', () => {
    it('should return 404 if not found', async () => {
      req.params = { id: 'missing' };
      databaseAdapter.findById.mockResolvedValue(null);
      await controller.pauseVestingSchedule(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.pauseVestingSchedule(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateVestingSchedule - error', () => {
    it('should handle error', async () => {
      req.params = { id: 's1' };
      req.body = { totalShares: 5000 };
      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('DB'));
      await controller.updateVestingSchedule(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteVestingSchedule - error', () => {
    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('DB'));
      await controller.deleteVestingSchedule(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getVestingSchedules - with companyId from user', () => {
    it('should use companyId from req.user when not in query', async () => {
      req.user = { companyId: 'comp-1' };
      req.query = { equityPlanId: 'plan-1' };
      databaseAdapter.find.mockResolvedValue([]);

      await controller.getVestingSchedules(req, res);
      expect(databaseAdapter.find).toHaveBeenCalledWith('VestingSchedule', {
        companyId: 'comp-1',
        equityPlanId: 'plan-1'
      });
    });
  });

  describe('getUpcomingVestingEvents - with from date', () => {
    it('should use provided from date', async () => {
      req.params = { id: 's1' };
      req.query = { from: '2026-07-01' };
      databaseAdapter.findById.mockResolvedValue({ _id: 's1', scheduleId: 'VS-1' });
      VestingCalculatorService.getUpcomingVestingEvents = jest.fn().mockReturnValue([]);

      await controller.getUpcomingVestingEvents(req, res);
      expect(VestingCalculatorService.getUpcomingVestingEvents).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Date),
        10
      );
    });

    it('should handle error', async () => {
      req.params = { id: 's1' };
      databaseAdapter.findById.mockRejectedValue(new Error('DB'));
      await controller.getUpcomingVestingEvents(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('createVestingSchedule - with next vesting event', () => {
    it('should set nextVestingDate when event exists', async () => {
      req.body = { totalShares: 10000, vestingPeriod: 48, cliffPeriod: 12, startDate: '2023-01-01' };
      VestingCalculatorService.getNextVestingEvent.mockReturnValue({ eventDate: '2024-01-01' });
      databaseAdapter.create.mockResolvedValue({ _id: 's1', totalShares: 10000 });

      await controller.createVestingSchedule(req, res);
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'VestingSchedule',
        expect.objectContaining({ nextVestingDate: '2024-01-01' })
      );
    });

    it('should use provided scheduleId', async () => {
      req.body = { totalShares: 10000, vestingPeriod: 48, cliffPeriod: 12, startDate: '2023-01-01', scheduleId: 'VS-CUSTOM' };
      VestingCalculatorService.getNextVestingEvent.mockReturnValue(null);
      databaseAdapter.create.mockResolvedValue({ _id: 's1', scheduleId: 'VS-CUSTOM' });

      await controller.createVestingSchedule(req, res);
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'VestingSchedule',
        expect.objectContaining({ scheduleId: 'VS-CUSTOM' })
      );
    });
  });
});
