/**
 * VestingSchedule Controller Unit Tests
 * Issue #78: Implement Automated Vesting Schedules
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
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
  getVisualizationData: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const vestingScheduleController = require('../../../controllers/vestingScheduleController');
const databaseAdapter = require('../../../services/databaseAdapter');
const VestingCalculatorService = require('../../../services/vestingCalculatorService');

describe('VestingSchedule Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createVestingSchedule', () => {
    const validScheduleData = {
      equityPlanId: 'plan123',
      stakeholderId: 'stakeholder123',
      totalShares: 10000,
      grantDate: '2023-01-01',
      vestingStartDate: '2023-01-01',
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly'
    };

    it('should create a vesting schedule successfully', async () => {
      req.body = validScheduleData;
      const mockSavedSchedule = { _id: 'schedule123', ...validScheduleData };
      databaseAdapter.create.mockResolvedValue(mockSavedSchedule);

      await vestingScheduleController.createVestingSchedule(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'VestingSchedule',
        expect.objectContaining({
          ...validScheduleData,
          vestedShares: 0,
          unvestedShares: 10000,
          status: 'active'
        })
      );
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toHaveProperty('_id', 'schedule123');
    });

    it('should return 400 on validation error', async () => {
      req.body = { ...validScheduleData, totalShares: -1000 };
      databaseAdapter.create.mockRejectedValue(new Error('Validation error'));

      await vestingScheduleController.createVestingSchedule(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should auto-generate scheduleId if not provided', async () => {
      req.body = validScheduleData;
      databaseAdapter.create.mockResolvedValue({ _id: 'schedule123', scheduleId: 'VS-123' });

      await vestingScheduleController.createVestingSchedule(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'VestingSchedule',
        expect.objectContaining({
          scheduleId: expect.stringMatching(/^VS-/)
        })
      );
    });
  });

  describe('getVestingSchedules', () => {
    it('should return all vesting schedules', async () => {
      const mockSchedules = [
        { _id: 'schedule1', totalShares: 10000 },
        { _id: 'schedule2', totalShares: 20000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockSchedules);

      await vestingScheduleController.getVestingSchedules(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('VestingSchedule', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockSchedules);
    });

    it('should filter by stakeholderId', async () => {
      req.query = { stakeholderId: 'stakeholder123' };
      databaseAdapter.find.mockResolvedValue([]);

      await vestingScheduleController.getVestingSchedules(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'VestingSchedule',
        { stakeholderId: 'stakeholder123' }
      );
    });

    it('should filter by status', async () => {
      req.query = { status: 'active' };
      databaseAdapter.find.mockResolvedValue([]);

      await vestingScheduleController.getVestingSchedules(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'VestingSchedule',
        { status: 'active' }
      );
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await vestingScheduleController.getVestingSchedules(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getVestingScheduleById', () => {
    it('should return vesting schedule by ID', async () => {
      const mockSchedule = { _id: 'schedule123', totalShares: 10000 };
      req.params = { id: 'schedule123' };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);

      await vestingScheduleController.getVestingScheduleById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('VestingSchedule', 'schedule123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockSchedule);
    });

    it('should return 404 when schedule not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await vestingScheduleController.getVestingScheduleById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Vesting schedule not found');
    });
  });

  describe('updateVestingSchedule', () => {
    it('should update vesting schedule successfully', async () => {
      req.params = { id: 'schedule123' };
      req.body = { cliffPeriodMonths: 6 };
      const mockUpdatedSchedule = { _id: 'schedule123', cliffPeriodMonths: 6 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedSchedule);

      await vestingScheduleController.updateVestingSchedule(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule',
        'schedule123',
        req.body,
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when schedule not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { cliffPeriodMonths: 6 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await vestingScheduleController.updateVestingSchedule(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteVestingSchedule', () => {
    it('should delete vesting schedule successfully', async () => {
      req.params = { id: 'schedule123' };
      const mockDeletedSchedule = { _id: 'schedule123' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedSchedule);

      await vestingScheduleController.deleteVestingSchedule(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('VestingSchedule', 'schedule123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Vesting schedule deleted');
    });

    it('should return 404 when schedule not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await vestingScheduleController.deleteVestingSchedule(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('calculateVesting', () => {
    it('should calculate current vesting status', async () => {
      req.params = { id: 'schedule123' };
      const mockSchedule = {
        _id: 'schedule123',
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'monthly'
      };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      VestingCalculatorService.calculateVestedShares.mockReturnValue({
        vestedShares: 2500,
        unvestedShares: 7500,
        vestingPercentage: 25
      });

      await vestingScheduleController.calculateVesting(req, res);

      expect(VestingCalculatorService.calculateVestedShares).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('vestedShares', 2500);
      expect(response).toHaveProperty('unvestedShares', 7500);
    });

    it('should allow calculation for specific date', async () => {
      req.params = { id: 'schedule123' };
      req.query = { date: '2024-06-01' };
      const mockSchedule = { _id: 'schedule123', totalShares: 10000 };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      VestingCalculatorService.calculateVestedShares.mockReturnValue({
        vestedShares: 3750,
        unvestedShares: 6250,
        vestingPercentage: 37.5
      });

      await vestingScheduleController.calculateVesting(req, res);

      expect(VestingCalculatorService.calculateVestedShares).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Date)
      );
    });
  });

  describe('applyAcceleration', () => {
    it('should apply acceleration to schedule', async () => {
      req.params = { id: 'schedule123' };
      req.body = {
        type: 'change_of_control',
        date: '2024-06-01'
      };
      const mockSchedule = {
        _id: 'schedule123',
        totalShares: 10000,
        accelerationTerms: {
          singleTrigger: { enabled: true, accelerationPercentage: 100 }
        }
      };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      VestingCalculatorService.calculateAcceleration.mockReturnValue({
        acceleratedShares: 10000,
        accelerationType: 'single_trigger'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockSchedule,
        vestedShares: 10000,
        status: 'accelerated'
      });

      await vestingScheduleController.applyAcceleration(req, res);

      expect(VestingCalculatorService.calculateAcceleration).toHaveBeenCalled();
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if acceleration not applicable', async () => {
      req.params = { id: 'schedule123' };
      req.body = { type: 'change_of_control', date: '2024-06-01' };
      const mockSchedule = {
        _id: 'schedule123',
        accelerationTerms: {
          singleTrigger: { enabled: false },
          doubleTrigger: { enabled: false }
        }
      };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      VestingCalculatorService.calculateAcceleration.mockReturnValue({
        acceleratedShares: 0,
        accelerationType: null
      });

      await vestingScheduleController.applyAcceleration(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Acceleration not applicable');
    });
  });

  describe('getVestingTimeline', () => {
    it('should return vesting timeline', async () => {
      req.params = { id: 'schedule123' };
      const mockSchedule = { _id: 'schedule123', totalShares: 10000 };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      VestingCalculatorService.generateVestingTimeline.mockReturnValue([
        { eventDate: '2024-01-01', eventType: 'cliff', sharesToVest: 2500 },
        { eventDate: '2024-02-01', eventType: 'periodic', sharesToVest: 208 }
      ]);

      await vestingScheduleController.getVestingTimeline(req, res);

      expect(VestingCalculatorService.generateVestingTimeline).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('timeline');
      expect(response.timeline.length).toBe(2);
    });
  });

  describe('getVisualizationData', () => {
    it('should return data for visualization', async () => {
      req.params = { id: 'schedule123' };
      const mockSchedule = { _id: 'schedule123', totalShares: 10000 };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      VestingCalculatorService.getVisualizationData.mockReturnValue({
        labels: ['Q1 2023', 'Q2 2023'],
        vestedData: [0, 0],
        unvestedData: [10000, 10000],
        milestones: [{ type: 'cliff', date: '2024-01-01' }]
      });

      await vestingScheduleController.getVisualizationData(req, res);

      expect(VestingCalculatorService.getVisualizationData).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('labels');
      expect(response).toHaveProperty('vestedData');
      expect(response).toHaveProperty('unvestedData');
      expect(response).toHaveProperty('milestones');
    });
  });

  describe('pauseVestingSchedule', () => {
    it('should pause active vesting schedule', async () => {
      req.params = { id: 'schedule123' };
      const mockSchedule = { _id: 'schedule123', status: 'active' };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockSchedule, status: 'paused' });

      await vestingScheduleController.pauseVestingSchedule(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule',
        'schedule123',
        expect.objectContaining({ status: 'paused' }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 if schedule is not active', async () => {
      req.params = { id: 'schedule123' };
      const mockSchedule = { _id: 'schedule123', status: 'completed' };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);

      await vestingScheduleController.pauseVestingSchedule(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Cannot pause a non-active schedule');
    });
  });

  describe('resumeVestingSchedule', () => {
    it('should resume paused vesting schedule', async () => {
      req.params = { id: 'schedule123' };
      const mockSchedule = { _id: 'schedule123', status: 'paused' };
      databaseAdapter.findById.mockResolvedValue(mockSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockSchedule, status: 'active' });

      await vestingScheduleController.resumeVestingSchedule(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule',
        'schedule123',
        expect.objectContaining({ status: 'active' }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });
  });
});
