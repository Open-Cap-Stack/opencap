/**
 * Vesting Cron Job Unit Tests
 * Issue #78: Implement Automated Vesting Schedules
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Create mock functions that persist across tests
const mockFind = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockCreate = jest.fn();
const mockCalculateVestedShares = jest.fn();
const mockGetNextVestingEvent = jest.fn();

jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  find: mockFind,
  findByIdAndUpdate: mockFindByIdAndUpdate,
  create: mockCreate
}));

jest.mock('../../../services/vestingCalculatorService', () => ({
  calculateVestedShares: mockCalculateVestedShares,
  getNextVestingEvent: mockGetNextVestingEvent
}));

const vestingCronJob = require('../../../jobs/vestingCronJob');

describe('VestingCronJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processVestingSchedules', () => {
    it('should fetch all active vesting schedules', async () => {
      mockFind.mockResolvedValue([]);

      await vestingCronJob.processVestingSchedules();

      expect(mockFind).toHaveBeenCalledWith(
        'VestingSchedule',
        { status: 'active' }
      );
    });

    it('should update vested shares for each schedule', async () => {
      const mockSchedules = [
        {
          _id: 'schedule1',
          scheduleId: 'VS-001',
          totalShares: 10000,
          vestedShares: 2500,
          unvestedShares: 7500,
          stakeholderId: 'stakeholder1',
          grantDate: new Date('2023-01-01'),
          vestingStartDate: new Date('2023-01-01'),
          cliffPeriodMonths: 12,
          vestingPeriodMonths: 48,
          vestingFrequency: 'monthly'
        }
      ];
      mockFind.mockResolvedValue(mockSchedules);
      mockCalculateVestedShares.mockReturnValue({
        vestedShares: 2708,
        unvestedShares: 7292,
        vestingPercentage: 27.08
      });
      mockGetNextVestingEvent.mockReturnValue({
        eventDate: new Date('2024-03-01'),
        eventType: 'periodic',
        sharesToVest: 208
      });
      mockFindByIdAndUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({ _id: 'notification1' });

      await vestingCronJob.processVestingSchedules();

      expect(mockCalculateVestedShares).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'schedule1' }),
        expect.any(Date)
      );
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule',
        'schedule1',
        expect.objectContaining({
          vestedShares: 2708,
          unvestedShares: 7292
        }),
        expect.any(Object)
      );
    });

    it('should mark schedule as completed when fully vested', async () => {
      const mockSchedules = [
        {
          _id: 'schedule1',
          totalShares: 10000,
          vestedShares: 9800,
          stakeholderId: 'stakeholder1'
        }
      ];
      mockFind.mockResolvedValue(mockSchedules);
      mockCalculateVestedShares.mockReturnValue({
        vestedShares: 10000,
        unvestedShares: 0,
        vestingPercentage: 100
      });
      mockGetNextVestingEvent.mockReturnValue(null);
      mockFindByIdAndUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({ _id: 'notification1' });

      await vestingCronJob.processVestingSchedules();

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'VestingSchedule',
        'schedule1',
        expect.objectContaining({
          status: 'completed',
          vestedShares: 10000,
          unvestedShares: 0
        }),
        expect.any(Object)
      );
    });

    it('should skip schedules with no vesting change', async () => {
      const mockSchedules = [
        {
          _id: 'schedule1',
          totalShares: 10000,
          vestedShares: 2500,
          unvestedShares: 7500,
          stakeholderId: 'stakeholder1'
        }
      ];
      mockFind.mockResolvedValue(mockSchedules);
      mockCalculateVestedShares.mockReturnValue({
        vestedShares: 2500, // No change
        unvestedShares: 7500,
        vestingPercentage: 25
      });
      mockGetNextVestingEvent.mockReturnValue({
        eventDate: new Date('2024-02-01'),
        eventType: 'periodic'
      });
      mockFindByIdAndUpdate.mockResolvedValue({});

      await vestingCronJob.processVestingSchedules();

      // Should only update nextVestingDate, not trigger notification
      expect(mockFindByIdAndUpdate).toHaveBeenCalled();
      // Should not create a notification since no shares vested
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFind.mockRejectedValue(new Error('Database error'));

      await expect(vestingCronJob.processVestingSchedules()).rejects.toThrow('Database error');
    });

    it('should continue processing other schedules if one fails', async () => {
      const mockSchedules = [
        { _id: 'schedule1', totalShares: 10000, vestedShares: 0, stakeholderId: 'stakeholder1' },
        { _id: 'schedule2', totalShares: 20000, vestedShares: 0, stakeholderId: 'stakeholder2' }
      ];
      mockFind.mockResolvedValue(mockSchedules);
      mockCalculateVestedShares
        .mockImplementationOnce(() => { throw new Error('Calculation error'); })
        .mockReturnValueOnce({
          vestedShares: 5000,
          unvestedShares: 15000,
          vestingPercentage: 25
        });
      mockGetNextVestingEvent.mockReturnValue({
        eventDate: new Date('2024-02-01'),
        eventType: 'periodic'
      });
      mockFindByIdAndUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({ _id: 'notification1' });

      const result = await vestingCronJob.processVestingSchedules();

      // Should process schedule2 even if schedule1 fails
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
    });
  });

  describe('createVestingNotification', () => {
    it('should create notification for vesting event', async () => {
      const vestingEvent = {
        scheduleId: 'VS-001',
        stakeholderId: 'stakeholder1',
        sharesVested: 208,
        totalVested: 2708,
        totalShares: 10000,
        vestingPercentage: 27.08
      };
      mockCreate.mockResolvedValue({ _id: 'notification1' });

      await vestingCronJob.createVestingNotification(vestingEvent);

      expect(mockCreate).toHaveBeenCalledWith(
        'Notification',
        expect.objectContaining({
          notificationType: 'system',
          title: expect.stringContaining('Vesting Event'),
          recipient: 'stakeholder1'
        })
      );
    });

    it('should create notification for full vest completion', async () => {
      const vestingEvent = {
        scheduleId: 'VS-001',
        stakeholderId: 'stakeholder1',
        sharesVested: 200,
        totalVested: 10000,
        totalShares: 10000,
        vestingPercentage: 100,
        isComplete: true
      };
      mockCreate.mockResolvedValue({ _id: 'notification1' });

      await vestingCronJob.createVestingNotification(vestingEvent);

      expect(mockCreate).toHaveBeenCalledWith(
        'Notification',
        expect.objectContaining({
          title: expect.stringContaining('Vesting Complete')
        })
      );
    });
  });

  describe('sendVestingEmail', () => {
    it('should prepare email data for vesting event', () => {
      const vestingEvent = {
        scheduleId: 'VS-001',
        stakeholderId: 'stakeholder1',
        email: 'stakeholder@example.com',
        sharesVested: 208,
        totalVested: 2708,
        totalShares: 10000
      };

      const emailData = vestingCronJob.prepareVestingEmailData(vestingEvent);

      expect(emailData).toHaveProperty('to', 'stakeholder@example.com');
      expect(emailData).toHaveProperty('subject');
      expect(emailData).toHaveProperty('body');
      expect(emailData.subject).toContain('Vesting');
    });
  });

  describe('getJobSchedule', () => {
    it('should return cron schedule expression', () => {
      const schedule = vestingCronJob.getJobSchedule();

      // Default should be daily at midnight
      expect(schedule).toBe('0 0 * * *');
    });
  });

  describe('getJobSummary', () => {
    it('should return summary of last job run', async () => {
      const mockSchedules = [
        { _id: 'schedule1', totalShares: 10000, vestedShares: 2500, stakeholderId: 's1' },
        { _id: 'schedule2', totalShares: 20000, vestedShares: 5000, stakeholderId: 's2' }
      ];
      mockFind.mockResolvedValue(mockSchedules);
      mockCalculateVestedShares
        .mockReturnValueOnce({ vestedShares: 2708, unvestedShares: 7292, vestingPercentage: 27.08 })
        .mockReturnValueOnce({ vestedShares: 5000, unvestedShares: 15000, vestingPercentage: 25 });
      mockGetNextVestingEvent.mockReturnValue({
        eventDate: new Date('2024-02-01'),
        eventType: 'periodic'
      });
      mockFindByIdAndUpdate.mockResolvedValue({});
      mockCreate.mockResolvedValue({ _id: 'notification1' });

      const result = await vestingCronJob.processVestingSchedules();

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('notifications');
    });
  });
});
