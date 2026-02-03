/**
 * Report Scheduling Controller Unit Tests
 * Issue #112: Create Report Scheduling System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const reportSchedulingController = require('../../../controllers/reportSchedulingController');
const ReportSchedulingService = require('../../../services/reportSchedulingService');

// Mock the service
jest.mock('../../../services/reportSchedulingService', () => ({
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  pauseSchedule: jest.fn(),
  resumeSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  getScheduleById: jest.fn(),
  getSchedulesByCompany: jest.fn(),
  runScheduledReport: jest.fn(),
  getUpcomingReports: jest.fn(),
  getExecutionHistory: jest.fn(),
  processSchedules: jest.fn(),
  updateExecutionStatus: jest.fn(),
  updateDeliveryStatus: jest.fn()
}));

describe('ReportSchedulingController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createSchedule', () => {
    const validScheduleData = {
      companyId: 'COMP-001',
      reportType: 'cap_table',
      name: 'Monthly Cap Table Report',
      schedule: '0 9 1 * *',
      recipients: ['cfo@company.com'],
      format: 'pdf'
    };

    it('should create a new schedule and return 201', async () => {
      mockReq.body = validScheduleData;
      const createdSchedule = { scheduleId: 'RS-001', ...validScheduleData };
      ReportSchedulingService.createSchedule.mockResolvedValue(createdSchedule);

      await reportSchedulingController.createSchedule(mockReq, mockRes);

      expect(ReportSchedulingService.createSchedule).toHaveBeenCalledWith(validScheduleData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdSchedule);
    });

    it('should return 400 for invalid data', async () => {
      mockReq.body = { companyId: 'COMP-001' }; // Missing required fields
      ReportSchedulingService.createSchedule.mockRejectedValue(new Error('Missing required fields'));

      await reportSchedulingController.createSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 for invalid cron expression', async () => {
      mockReq.body = { ...validScheduleData, schedule: 'invalid-cron' };
      ReportSchedulingService.createSchedule.mockRejectedValue(new Error('Invalid cron expression'));

      await reportSchedulingController.createSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid cron expression' });
    });
  });

  describe('getSchedules', () => {
    it('should return all schedules for a company', async () => {
      mockReq.query = { companyId: 'COMP-001' };
      const schedules = [{ scheduleId: 'RS-001' }, { scheduleId: 'RS-002' }];
      ReportSchedulingService.getSchedulesByCompany.mockResolvedValue(schedules);

      await reportSchedulingController.getSchedules(mockReq, mockRes);

      expect(ReportSchedulingService.getSchedulesByCompany).toHaveBeenCalledWith('COMP-001', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(schedules);
    });

    it('should filter by status when provided', async () => {
      mockReq.query = { companyId: 'COMP-001', status: 'active' };
      ReportSchedulingService.getSchedulesByCompany.mockResolvedValue([]);

      await reportSchedulingController.getSchedules(mockReq, mockRes);

      expect(ReportSchedulingService.getSchedulesByCompany).toHaveBeenCalledWith(
        'COMP-001',
        { status: 'active' }
      );
    });

    it('should return 400 when companyId is missing', async () => {
      mockReq.query = {};

      await reportSchedulingController.getSchedules(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'companyId is required' });
    });

    it('should return 500 on service error', async () => {
      mockReq.query = { companyId: 'COMP-001' };
      ReportSchedulingService.getSchedulesByCompany.mockRejectedValue(new Error('Database error'));

      await reportSchedulingController.getSchedules(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getScheduleById', () => {
    it('should return schedule when found', async () => {
      mockReq.params = { id: 'RS-001' };
      const schedule = { scheduleId: 'RS-001', name: 'Test Report' };
      ReportSchedulingService.getScheduleById.mockResolvedValue(schedule);

      await reportSchedulingController.getScheduleById(mockReq, mockRes);

      expect(ReportSchedulingService.getScheduleById).toHaveBeenCalledWith('RS-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(schedule);
    });

    it('should return 404 when schedule not found', async () => {
      mockReq.params = { id: 'RS-NONEXISTENT' };
      ReportSchedulingService.getScheduleById.mockResolvedValue(null);

      await reportSchedulingController.getScheduleById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Schedule not found' });
    });

    it('should return 500 on service error', async () => {
      mockReq.params = { id: 'RS-001' };
      ReportSchedulingService.getScheduleById.mockRejectedValue(new Error('Database error'));

      await reportSchedulingController.getScheduleById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule and return 200', async () => {
      mockReq.params = { id: 'RS-001' };
      mockReq.body = { name: 'Updated Name' };
      const updatedSchedule = { scheduleId: 'RS-001', name: 'Updated Name' };
      ReportSchedulingService.updateSchedule.mockResolvedValue(updatedSchedule);

      await reportSchedulingController.updateSchedule(mockReq, mockRes);

      expect(ReportSchedulingService.updateSchedule).toHaveBeenCalledWith('RS-001', { name: 'Updated Name' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedSchedule);
    });

    it('should return 404 when schedule not found', async () => {
      mockReq.params = { id: 'RS-NONEXISTENT' };
      mockReq.body = { name: 'Updated Name' };
      ReportSchedulingService.updateSchedule.mockRejectedValue(new Error('Schedule not found'));

      await reportSchedulingController.updateSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for invalid update data', async () => {
      mockReq.params = { id: 'RS-001' };
      mockReq.body = { schedule: 'invalid-cron' };
      ReportSchedulingService.updateSchedule.mockRejectedValue(new Error('Invalid cron expression'));

      await reportSchedulingController.updateSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete schedule and return 200', async () => {
      mockReq.params = { id: 'RS-001' };
      ReportSchedulingService.deleteSchedule.mockResolvedValue({ scheduleId: 'RS-001' });

      await reportSchedulingController.deleteSchedule(mockReq, mockRes);

      expect(ReportSchedulingService.deleteSchedule).toHaveBeenCalledWith('RS-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Schedule deleted successfully' });
    });

    it('should return 404 when schedule not found', async () => {
      mockReq.params = { id: 'RS-NONEXISTENT' };
      ReportSchedulingService.deleteSchedule.mockRejectedValue(new Error('Schedule not found'));

      await reportSchedulingController.deleteSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('pauseSchedule', () => {
    it('should pause schedule and return 200', async () => {
      mockReq.params = { id: 'RS-001' };
      const pausedSchedule = { scheduleId: 'RS-001', status: 'paused' };
      ReportSchedulingService.pauseSchedule.mockResolvedValue(pausedSchedule);

      await reportSchedulingController.pauseSchedule(mockReq, mockRes);

      expect(ReportSchedulingService.pauseSchedule).toHaveBeenCalledWith('RS-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(pausedSchedule);
    });

    it('should return 400 when cannot pause', async () => {
      mockReq.params = { id: 'RS-001' };
      ReportSchedulingService.pauseSchedule.mockRejectedValue(new Error('Cannot pause a non-active schedule'));

      await reportSchedulingController.pauseSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when schedule not found', async () => {
      mockReq.params = { id: 'RS-NONEXISTENT' };
      ReportSchedulingService.pauseSchedule.mockRejectedValue(new Error('Schedule not found'));

      await reportSchedulingController.pauseSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('resumeSchedule', () => {
    it('should resume schedule and return 200', async () => {
      mockReq.params = { id: 'RS-001' };
      const resumedSchedule = { scheduleId: 'RS-001', status: 'active' };
      ReportSchedulingService.resumeSchedule.mockResolvedValue(resumedSchedule);

      await reportSchedulingController.resumeSchedule(mockReq, mockRes);

      expect(ReportSchedulingService.resumeSchedule).toHaveBeenCalledWith('RS-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(resumedSchedule);
    });

    it('should return 400 when cannot resume', async () => {
      mockReq.params = { id: 'RS-001' };
      ReportSchedulingService.resumeSchedule.mockRejectedValue(new Error('Cannot resume a non-paused schedule'));

      await reportSchedulingController.resumeSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when schedule not found', async () => {
      mockReq.params = { id: 'RS-NONEXISTENT' };
      ReportSchedulingService.resumeSchedule.mockRejectedValue(new Error('Schedule not found'));

      await reportSchedulingController.resumeSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('runReport', () => {
    it('should run report and return execution details', async () => {
      mockReq.params = { id: 'RS-001' };
      const execution = { executionId: 'RE-001', scheduleId: 'RS-001', status: 'running' };
      ReportSchedulingService.runScheduledReport.mockResolvedValue(execution);

      await reportSchedulingController.runReport(mockReq, mockRes);

      expect(ReportSchedulingService.runScheduledReport).toHaveBeenCalledWith('RS-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(execution);
    });

    it('should return 404 when schedule not found', async () => {
      mockReq.params = { id: 'RS-NONEXISTENT' };
      ReportSchedulingService.runScheduledReport.mockRejectedValue(new Error('Schedule not found'));

      await reportSchedulingController.runReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when schedule is not active', async () => {
      mockReq.params = { id: 'RS-001' };
      ReportSchedulingService.runScheduledReport.mockRejectedValue(new Error('Cannot run a non-active schedule'));

      await reportSchedulingController.runReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getUpcomingReports', () => {
    it('should return upcoming reports', async () => {
      mockReq.query = { minutes: '60' };
      const upcoming = [{ scheduleId: 'RS-001' }, { scheduleId: 'RS-002' }];
      ReportSchedulingService.getUpcomingReports.mockResolvedValue(upcoming);

      await reportSchedulingController.getUpcomingReports(mockReq, mockRes);

      expect(ReportSchedulingService.getUpcomingReports).toHaveBeenCalledWith(60, undefined);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(upcoming);
    });

    it('should filter by companyId when provided', async () => {
      mockReq.query = { minutes: '60', companyId: 'COMP-001' };
      ReportSchedulingService.getUpcomingReports.mockResolvedValue([]);

      await reportSchedulingController.getUpcomingReports(mockReq, mockRes);

      expect(ReportSchedulingService.getUpcomingReports).toHaveBeenCalledWith(60, 'COMP-001');
    });

    it('should default to 60 minutes when not specified', async () => {
      mockReq.query = {};
      ReportSchedulingService.getUpcomingReports.mockResolvedValue([]);

      await reportSchedulingController.getUpcomingReports(mockReq, mockRes);

      expect(ReportSchedulingService.getUpcomingReports).toHaveBeenCalledWith(60, undefined);
    });
  });

  describe('getExecutionHistory', () => {
    it('should return execution history for a schedule', async () => {
      mockReq.params = { id: 'RS-001' };
      mockReq.query = {};
      const history = [{ executionId: 'RE-001' }, { executionId: 'RE-002' }];
      ReportSchedulingService.getExecutionHistory.mockResolvedValue(history);

      await reportSchedulingController.getExecutionHistory(mockReq, mockRes);

      expect(ReportSchedulingService.getExecutionHistory).toHaveBeenCalledWith('RS-001', {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(history);
    });

    it('should pass limit and status options', async () => {
      mockReq.params = { id: 'RS-001' };
      mockReq.query = { limit: '10', status: 'completed' };
      ReportSchedulingService.getExecutionHistory.mockResolvedValue([]);

      await reportSchedulingController.getExecutionHistory(mockReq, mockRes);

      expect(ReportSchedulingService.getExecutionHistory).toHaveBeenCalledWith(
        'RS-001',
        { limit: 10, status: 'completed' }
      );
    });
  });

  describe('processSchedules', () => {
    it('should process due schedules and return results', async () => {
      const result = { processed: 5, failed: 1, errors: [] };
      ReportSchedulingService.processSchedules.mockResolvedValue(result);

      await reportSchedulingController.processSchedules(mockReq, mockRes);

      expect(ReportSchedulingService.processSchedules).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });

    it('should return 500 on processing error', async () => {
      ReportSchedulingService.processSchedules.mockRejectedValue(new Error('Processing failed'));

      await reportSchedulingController.processSchedules(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
