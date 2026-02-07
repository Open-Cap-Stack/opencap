/**
 * Report Scheduling Service Unit Tests
 * Issue #112: Create Report Scheduling System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const ReportSchedulingService = require('../../../services/reportSchedulingService');

// Mock the databaseAdapter
jest.mock('../../../services/databaseAdapter', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');

describe('ReportSchedulingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    const validScheduleData = {
      companyId: 'COMP-001',
      reportType: 'cap_table',
      name: 'Monthly Cap Table Report',
      schedule: '0 9 1 * *', // First day of month at 9 AM
      recipients: ['cfo@company.com', 'ceo@company.com'],
      format: 'pdf',
      timezone: 'America/New_York'
    };

    it('should create a new scheduled report with valid data', async () => {
      const expectedResult = {
        ...validScheduleData,
        scheduleId: expect.stringMatching(/^RS-/),
        status: 'active',
        nextRunAt: expect.any(Date)
      };

      databaseAdapter.create.mockResolvedValue(expectedResult);

      const result = await ReportSchedulingService.createSchedule(validScheduleData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledReport',
        expect.objectContaining({
          companyId: validScheduleData.companyId,
          reportType: validScheduleData.reportType,
          name: validScheduleData.name,
          schedule: validScheduleData.schedule,
          status: 'active'
        })
      );
      expect(result).toEqual(expectedResult);
    });

    it('should generate a unique scheduleId', async () => {
      databaseAdapter.create.mockResolvedValue({ scheduleId: 'RS-12345678' });

      await ReportSchedulingService.createSchedule(validScheduleData);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ScheduledReport',
        expect.objectContaining({
          scheduleId: expect.stringMatching(/^RS-[A-Z0-9]{8}$/)
        })
      );
    });

    it('should calculate nextRunAt based on cron schedule', async () => {
      databaseAdapter.create.mockResolvedValue({});

      await ReportSchedulingService.createSchedule(validScheduleData);

      const createCall = databaseAdapter.create.mock.calls[0][1];
      expect(createCall.nextRunAt).toBeDefined();
      expect(createCall.nextRunAt instanceof Date).toBe(true);
    });

    it('should throw error for invalid cron expression', async () => {
      const invalidData = { ...validScheduleData, schedule: 'invalid-cron' };

      await expect(ReportSchedulingService.createSchedule(invalidData))
        .rejects.toThrow('Invalid cron expression');
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = { companyId: 'COMP-001' };

      await expect(ReportSchedulingService.createSchedule(invalidData))
        .rejects.toThrow();
    });

    it('should validate email format in recipients', async () => {
      const invalidData = {
        ...validScheduleData,
        recipients: ['invalid-email', 'valid@email.com']
      };

      await expect(ReportSchedulingService.createSchedule(invalidData))
        .rejects.toThrow('Invalid email');
    });
  });

  describe('updateSchedule', () => {
    const scheduleId = 'RS-12345678';
    const updateData = {
      name: 'Updated Report Name',
      recipients: ['new@email.com']
    };

    it('should update an existing schedule', async () => {
      const existingSchedule = {
        scheduleId,
        companyId: 'COMP-001',
        name: 'Original Name',
        status: 'active'
      };
      const updatedSchedule = { ...existingSchedule, ...updateData };

      databaseAdapter.findOne.mockResolvedValue(existingSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedSchedule);

      const result = await ReportSchedulingService.updateSchedule(scheduleId, updateData);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.name).toBe(updateData.name);
    });

    it('should recalculate nextRunAt when schedule is updated', async () => {
      const existingSchedule = {
        scheduleId,
        schedule: '0 9 1 * *',
        status: 'active'
      };
      const newSchedule = '0 10 15 * *';

      databaseAdapter.findOne.mockResolvedValue(existingSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await ReportSchedulingService.updateSchedule(scheduleId, { schedule: newSchedule });

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(updateCall.nextRunAt).toBeDefined();
    });

    it('should throw error when schedule not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(ReportSchedulingService.updateSchedule('nonexistent', updateData))
        .rejects.toThrow('Schedule not found');
    });

    it('should not allow updating scheduleId', async () => {
      databaseAdapter.findOne.mockResolvedValue({ scheduleId });

      await ReportSchedulingService.updateSchedule(scheduleId, { scheduleId: 'RS-NEW' });

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(updateCall.scheduleId).toBeUndefined();
    });
  });

  describe('pauseSchedule', () => {
    const scheduleId = 'RS-12345678';

    it('should pause an active schedule', async () => {
      const existingSchedule = { scheduleId, status: 'active' };
      const pausedSchedule = { ...existingSchedule, status: 'paused', pausedAt: expect.any(Date) };

      databaseAdapter.findOne.mockResolvedValue(existingSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(pausedSchedule);

      const result = await ReportSchedulingService.pauseSchedule(scheduleId);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ScheduledReport',
        scheduleId,
        expect.objectContaining({ status: 'paused' }),
        expect.any(Object)
      );
      expect(result.status).toBe('paused');
    });

    it('should throw error when pausing non-active schedule', async () => {
      databaseAdapter.findOne.mockResolvedValue({ scheduleId, status: 'paused' });

      await expect(ReportSchedulingService.pauseSchedule(scheduleId))
        .rejects.toThrow('Cannot pause a non-active schedule');
    });

    it('should throw error when schedule not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(ReportSchedulingService.pauseSchedule('nonexistent'))
        .rejects.toThrow('Schedule not found');
    });
  });

  describe('resumeSchedule', () => {
    const scheduleId = 'RS-12345678';

    it('should resume a paused schedule', async () => {
      const existingSchedule = {
        scheduleId,
        status: 'paused',
        schedule: '0 9 1 * *'
      };
      const resumedSchedule = {
        ...existingSchedule,
        status: 'active',
        nextRunAt: expect.any(Date)
      };

      databaseAdapter.findOne.mockResolvedValue(existingSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(resumedSchedule);

      const result = await ReportSchedulingService.resumeSchedule(scheduleId);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ScheduledReport',
        scheduleId,
        expect.objectContaining({ status: 'active' }),
        expect.any(Object)
      );
      expect(result.status).toBe('active');
    });

    it('should recalculate nextRunAt when resuming', async () => {
      const existingSchedule = {
        scheduleId,
        status: 'paused',
        schedule: '0 9 1 * *'
      };

      databaseAdapter.findOne.mockResolvedValue(existingSchedule);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await ReportSchedulingService.resumeSchedule(scheduleId);

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0][2];
      expect(updateCall.nextRunAt).toBeDefined();
    });

    it('should throw error when resuming non-paused schedule', async () => {
      databaseAdapter.findOne.mockResolvedValue({ scheduleId, status: 'active' });

      await expect(ReportSchedulingService.resumeSchedule(scheduleId))
        .rejects.toThrow('Cannot resume a non-paused schedule');
    });
  });

  describe('deleteSchedule', () => {
    const scheduleId = 'RS-12345678';

    it('should delete an existing schedule', async () => {
      const existingSchedule = { scheduleId, status: 'active' };

      databaseAdapter.findOne.mockResolvedValue(existingSchedule);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(existingSchedule);

      const result = await ReportSchedulingService.deleteSchedule(scheduleId);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith(
        'ScheduledReport',
        scheduleId
      );
      expect(result).toEqual(existingSchedule);
    });

    it('should throw error when schedule not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(ReportSchedulingService.deleteSchedule('nonexistent'))
        .rejects.toThrow('Schedule not found');
    });
  });

  describe('getScheduleById', () => {
    const scheduleId = 'RS-12345678';

    it('should return schedule by ID', async () => {
      const schedule = { scheduleId, name: 'Test Report' };
      databaseAdapter.findOne.mockResolvedValue(schedule);

      const result = await ReportSchedulingService.getScheduleById(scheduleId);

      expect(databaseAdapter.findOne).toHaveBeenCalledWith(
        'ScheduledReport',
        { scheduleId }
      );
      expect(result).toEqual(schedule);
    });

    it('should return null when schedule not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await ReportSchedulingService.getScheduleById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSchedulesByCompany', () => {
    const companyId = 'COMP-001';

    it('should return all schedules for a company', async () => {
      const schedules = [
        { scheduleId: 'RS-001', companyId },
        { scheduleId: 'RS-002', companyId }
      ];
      databaseAdapter.find.mockResolvedValue(schedules);

      const result = await ReportSchedulingService.getSchedulesByCompany(companyId);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ScheduledReport',
        { companyId }
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await ReportSchedulingService.getSchedulesByCompany(companyId, { status: 'active' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ScheduledReport',
        { companyId, status: 'active' }
      );
    });
  });

  describe('runScheduledReport', () => {
    const scheduleId = 'RS-12345678';

    it('should create an execution record and run the report', async () => {
      const schedule = {
        scheduleId,
        reportType: 'cap_table',
        companyId: 'COMP-001',
        format: 'pdf',
        recipients: ['user@company.com'],
        parameters: {},
        status: 'active',
        schedule: '0 9 1 * *'
      };

      databaseAdapter.findOne.mockResolvedValue(schedule);
      databaseAdapter.create.mockResolvedValue({
        executionId: 'RE-001',
        scheduleId,
        status: 'running'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await ReportSchedulingService.runScheduledReport(scheduleId);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'ReportExecution',
        expect.objectContaining({
          scheduleId,
          status: 'running',
          startedAt: expect.any(Date)
        })
      );
      expect(result).toHaveProperty('executionId');
    });

    it('should update schedule lastRunAt after execution', async () => {
      const schedule = {
        scheduleId,
        reportType: 'cap_table',
        companyId: 'COMP-001',
        status: 'active',
        schedule: '0 9 1 * *'
      };

      databaseAdapter.findOne.mockResolvedValue(schedule);
      databaseAdapter.create.mockResolvedValue({ executionId: 'RE-001' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await ReportSchedulingService.runScheduledReport(scheduleId);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ScheduledReport',
        scheduleId,
        expect.objectContaining({
          lastRunAt: expect.any(Date),
          nextRunAt: expect.any(Date)
        }),
        expect.any(Object)
      );
    });

    it('should throw error when schedule not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await expect(ReportSchedulingService.runScheduledReport('nonexistent'))
        .rejects.toThrow('Schedule not found');
    });

    it('should throw error when schedule is not active', async () => {
      databaseAdapter.findOne.mockResolvedValue({ scheduleId, status: 'paused' });

      await expect(ReportSchedulingService.runScheduledReport(scheduleId))
        .rejects.toThrow('Cannot run a non-active schedule');
    });
  });

  describe('getUpcomingReports', () => {
    it('should return reports due within specified time window', async () => {
      const upcomingReports = [
        { scheduleId: 'RS-001', nextRunAt: new Date() },
        { scheduleId: 'RS-002', nextRunAt: new Date() }
      ];
      databaseAdapter.find.mockResolvedValue(upcomingReports);

      const result = await ReportSchedulingService.getUpcomingReports(60); // 60 minutes

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ScheduledReport',
        expect.objectContaining({
          status: 'active',
          nextRunAt: expect.any(Object)
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should default to 60 minutes when window not specified', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await ReportSchedulingService.getUpcomingReports();

      expect(databaseAdapter.find).toHaveBeenCalled();
    });

    it('should filter by company when provided', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await ReportSchedulingService.getUpcomingReports(60, 'COMP-001');

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ScheduledReport',
        expect.objectContaining({ companyId: 'COMP-001' })
      );
    });
  });

  describe('getExecutionHistory', () => {
    const scheduleId = 'RS-12345678';

    it('should return execution history for a schedule', async () => {
      const executions = [
        { executionId: 'RE-001', scheduleId, status: 'completed' },
        { executionId: 'RE-002', scheduleId, status: 'completed' }
      ];
      databaseAdapter.find.mockResolvedValue(executions);

      const result = await ReportSchedulingService.getExecutionHistory(scheduleId);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ReportExecution',
        { scheduleId },
        expect.objectContaining({ sort: { startedAt: -1 } })
      );
      expect(result).toHaveLength(2);
    });

    it('should limit results when specified', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await ReportSchedulingService.getExecutionHistory(scheduleId, { limit: 10 });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ReportExecution',
        { scheduleId },
        expect.objectContaining({ limit: 10 })
      );
    });

    it('should filter by status when specified', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await ReportSchedulingService.getExecutionHistory(scheduleId, { status: 'failed' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'ReportExecution',
        { scheduleId, status: 'failed' },
        expect.any(Object)
      );
    });
  });

  describe('processSchedules', () => {
    it('should process all due schedules', async () => {
      const dueSchedules = [
        { scheduleId: 'RS-001', status: 'active', reportType: 'cap_table', companyId: 'COMP-001' },
        { scheduleId: 'RS-002', status: 'active', reportType: 'financial_summary', companyId: 'COMP-001' }
      ];
      databaseAdapter.find.mockResolvedValueOnce(dueSchedules);
      databaseAdapter.findOne.mockResolvedValue({ status: 'active', companyId: 'COMP-001', reportType: 'cap_table' });
      databaseAdapter.create.mockResolvedValue({ executionId: 'RE-001' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await ReportSchedulingService.processSchedules();

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('failed');
    });

    it('should handle errors gracefully and continue processing', async () => {
      const dueSchedules = [
        { scheduleId: 'RS-001', status: 'active' },
        { scheduleId: 'RS-002', status: 'active' }
      ];
      databaseAdapter.find.mockResolvedValueOnce(dueSchedules);
      databaseAdapter.findOne
        .mockResolvedValueOnce(null) // First one fails
        .mockResolvedValueOnce({ scheduleId: 'RS-002', status: 'active', companyId: 'COMP-001', reportType: 'cap_table' });
      databaseAdapter.create.mockResolvedValue({ executionId: 'RE-001' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await ReportSchedulingService.processSchedules();

      expect(result.failed).toBeGreaterThanOrEqual(1);
    });

    it('should return empty result when no schedules are due', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await ReportSchedulingService.processSchedules();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('updateExecutionStatus', () => {
    const executionId = 'RE-12345678';

    it('should update execution status to completed', async () => {
      const completedExecution = {
        executionId,
        status: 'completed',
        completedAt: expect.any(Date),
        fileUrl: 'https://storage.example.com/report.pdf',
        fileSize: 1024
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(completedExecution);

      const result = await ReportSchedulingService.updateExecutionStatus(executionId, {
        status: 'completed',
        fileUrl: 'https://storage.example.com/report.pdf',
        fileSize: 1024
      });

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ReportExecution',
        executionId,
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date)
        }),
        expect.any(Object)
      );
      expect(result.status).toBe('completed');
    });

    it('should update execution status to failed with error', async () => {
      const failedExecution = {
        executionId,
        status: 'failed',
        completedAt: expect.any(Date),
        error: 'Report generation failed'
      };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(failedExecution);

      const result = await ReportSchedulingService.updateExecutionStatus(executionId, {
        status: 'failed',
        error: 'Report generation failed'
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Report generation failed');
    });
  });

  describe('updateDeliveryStatus', () => {
    const executionId = 'RE-12345678';
    const recipient = 'user@company.com';

    it('should update delivery status for a recipient', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        executionId,
        deliveryStatus: [{ recipient, status: 'delivered', deliveredAt: expect.any(Date) }]
      });

      const result = await ReportSchedulingService.updateDeliveryStatus(executionId, recipient, {
        status: 'delivered',
        deliveredAt: new Date()
      });

      expect(result.deliveryStatus).toContainEqual(
        expect.objectContaining({ recipient, status: 'delivered' })
      );
    });

    it('should add failed delivery status with error', async () => {
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        executionId,
        deliveryStatus: [{ recipient, status: 'failed', error: 'Email delivery failed' }]
      });

      const result = await ReportSchedulingService.updateDeliveryStatus(executionId, recipient, {
        status: 'failed',
        error: 'Email delivery failed'
      });

      expect(result.deliveryStatus).toContainEqual(
        expect.objectContaining({ recipient, status: 'failed' })
      );
    });
  });

  describe('validateCronExpression', () => {
    it('should validate correct cron expressions', () => {
      const validExpressions = [
        '0 9 * * *',         // Every day at 9 AM
        '0 9 1 * *',         // First day of month at 9 AM
        '0 9 * * 1',         // Every Monday at 9 AM
        '*/15 * * * *',      // Every 15 minutes
        '0 0 1 1 *'          // January 1st at midnight
      ];

      validExpressions.forEach(expr => {
        expect(ReportSchedulingService.validateCronExpression(expr)).toBe(true);
      });
    });

    it('should reject invalid cron expressions', () => {
      const invalidExpressions = [
        'invalid',
        '60 * * * *',        // Invalid minute
        '* 25 * * *',        // Invalid hour
        'not a cron'
      ];

      invalidExpressions.forEach(expr => {
        expect(ReportSchedulingService.validateCronExpression(expr)).toBe(false);
      });
    });
  });

  describe('calculateNextRunTime', () => {
    it('should calculate next run time from cron expression', () => {
      const cronExpression = '0 9 * * *'; // Every day at 9 AM
      const timezone = 'UTC';

      const nextRun = ReportSchedulingService.calculateNextRunTime(cronExpression, timezone);

      expect(nextRun instanceof Date).toBe(true);
      expect(nextRun > new Date()).toBe(true);
    });

    it('should respect timezone when calculating next run', () => {
      const cronExpression = '0 9 * * *';
      const timezone1 = 'America/New_York';
      const timezone2 = 'Europe/London';

      const nextRun1 = ReportSchedulingService.calculateNextRunTime(cronExpression, timezone1);
      const nextRun2 = ReportSchedulingService.calculateNextRunTime(cronExpression, timezone2);

      // Different timezones should produce different UTC times
      expect(nextRun1.getTime()).not.toBe(nextRun2.getTime());
    });
  });
});
