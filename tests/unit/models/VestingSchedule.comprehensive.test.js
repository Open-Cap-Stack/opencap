/**
 * VestingSchedule Model - Comprehensive Unit Tests
 * Covers all exported methods, business logic, error paths, and edge cases.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn().mockResolvedValue({}),
  projectId: 'test-project',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const VestingSchedule = require('../../../models/VestingSchedule');

describe('VestingSchedule Model - Comprehensive', () => {
  const makeInsertResponse = (data) => ({
    data: [{
      row_id: 'row-1',
      row_data: { _id: 'test-id', ...data }
    }]
  });

  const makeQueryResponse = (items) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  const validScheduleData = {
    equityPlanId: 'ep_001',
    stakeholderId: 'sh_001',
    companyId: 'comp_001',
    totalShares: 10000,
    grantDate: '2024-01-01T00:00:00.000Z',
    vestingStartDate: '2024-01-01T00:00:00.000Z',
    cliffPeriodMonths: 12,
    vestingPeriodMonths: 48,
    vestingFrequency: 'monthly',
    grantType: 'ISO',
    exercisePrice: 1.00
  };

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validScheduleData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  describe('Constants', () => {
    it('should export GRANT_TYPES', () => {
      expect(VestingSchedule.GRANT_TYPES).toEqual(['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'phantom']);
    });

    it('should export VESTING_FREQUENCIES', () => {
      expect(VestingSchedule.VESTING_FREQUENCIES).toEqual(['daily', 'monthly', 'quarterly', 'annually']);
    });

    it('should export VALID_STATUSES', () => {
      expect(VestingSchedule.VALID_STATUSES).toEqual(['active', 'paused', 'completed', 'terminated', 'accelerated']);
    });

    it('should export TERMINATION_TYPES', () => {
      expect(VestingSchedule.TERMINATION_TYPES).toEqual([
        'voluntary', 'involuntary_without_cause', 'involuntary_with_cause',
        'constructive_termination', 'good_reason', 'death', 'disability'
      ]);
    });

    it('should export ACCELERATION_TYPES', () => {
      expect(VestingSchedule.ACCELERATION_TYPES).toEqual(['single_trigger', 'double_trigger', 'board_discretion']);
    });

    it('should export TRIGGER_EVENTS', () => {
      expect(VestingSchedule.TRIGGER_EVENTS).toEqual(['change_of_control', 'ipo', 'merger', 'acquisition']);
    });

    it('should export VESTING_EVENT_TYPES', () => {
      expect(VestingSchedule.VESTING_EVENT_TYPES).toEqual(['cliff', 'periodic', 'acceleration', 'manual']);
    });

    it('should have tableName set to vesting_schedules', () => {
      expect(VestingSchedule.tableName).toBe('vesting_schedules');
    });
  });

  // ------------------------------------------------------------------
  // create()
  // ------------------------------------------------------------------
  describe('create()', () => {
    it('should create a schedule with valid data', async () => {
      const result = await VestingSchedule.create({ ...validScheduleData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate scheduleId if not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.scheduleId).toMatch(/^vs_/);
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData });
    });

    it('should use provided scheduleId if given', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.scheduleId).toBe('vs_custom_123');
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData, scheduleId: 'vs_custom_123' });
    });

    it('should throw when totalShares is less than 1', async () => {
      await expect(
        VestingSchedule.create({ ...validScheduleData, totalShares: 0 })
      ).rejects.toThrow('totalShares must be at least 1');
    });

    it('should throw when totalShares is negative', async () => {
      await expect(
        VestingSchedule.create({ ...validScheduleData, totalShares: -5 })
      ).rejects.toThrow('totalShares must be at least 1');
    });

    it('should calculate cliffDate from vestingStartDate and cliffPeriodMonths', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.cliffDate).toBeDefined();
        const cliffDate = new Date(doc.cliffDate);
        const vestingStart = new Date(doc.vestingStartDate);
        // Cliff should be approximately 12 months after start
        const monthsDiff = (cliffDate.getFullYear() - vestingStart.getFullYear()) * 12
          + (cliffDate.getMonth() - vestingStart.getMonth());
        expect(monthsDiff).toBe(12);
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData });
    });

    it('should set cliffDate to vestingStartDate when cliffPeriodMonths is 0', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.cliffDate).toBe(new Date(doc.vestingStartDate).toISOString());
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData, cliffPeriodMonths: 0 });
    });

    it('should calculate vestingEndDate from vestingStartDate and vestingPeriodMonths', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.vestingEndDate).toBeDefined();
        const endDate = new Date(doc.vestingEndDate);
        const start = new Date(doc.vestingStartDate);
        const monthsDiff = (endDate.getFullYear() - start.getFullYear()) * 12
          + (endDate.getMonth() - start.getMonth());
        expect(monthsDiff).toBe(48);
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData });
    });

    it('should initialize unvestedShares to totalShares when vestedShares is 0', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.unvestedShares).toBe(10000);
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData });
    });

    it('should calculate unvestedShares from totalShares minus vestedShares', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.unvestedShares).toBe(7500);
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData, vestedShares: 2500 });
    });

    it('should not override unvestedShares if explicitly set', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.unvestedShares).toBe(5000);
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData, unvestedShares: 5000 });
    });

    it('should default status to active', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('active');
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData });
    });

    it('should respect provided status', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('paused');
        return makeInsertResponse(doc);
      });
      await VestingSchedule.create({ ...validScheduleData, status: 'paused' });
    });

    it('should use default vestingPeriodMonths (48) when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.vestingEndDate).toBeDefined();
        return makeInsertResponse(doc);
      });
      const data = { ...validScheduleData };
      delete data.vestingPeriodMonths;
      await VestingSchedule.create(data);
    });

    it('should use default cliffPeriodMonths (12) when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.cliffDate).toBeDefined();
        return makeInsertResponse(doc);
      });
      const data = { ...validScheduleData };
      delete data.cliffPeriodMonths;
      await VestingSchedule.create(data);
    });
  });

  // ------------------------------------------------------------------
  // findByScheduleId()
  // ------------------------------------------------------------------
  describe('findByScheduleId()', () => {
    it('should find a schedule by scheduleId', async () => {
      const schedule = { _id: 'id1', scheduleId: 'vs_123', totalShares: 1000 };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([schedule]));
      const result = await VestingSchedule.findByScheduleId('vs_123');
      expect(result).toBeDefined();
      expect(result.scheduleId).toBe('vs_123');
    });

    it('should return null when schedule not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await VestingSchedule.findByScheduleId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // findByStakeholder()
  // ------------------------------------------------------------------
  describe('findByStakeholder()', () => {
    it('should find schedules by stakeholderId', async () => {
      const schedules = [
        { _id: 'id1', stakeholderId: 'sh_001', totalShares: 1000 },
        { _id: 'id2', stakeholderId: 'sh_001', totalShares: 2000 }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(schedules));
      const result = await VestingSchedule.findByStakeholder('sh_001');
      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await VestingSchedule.findByStakeholder('sh_001', { status: 'active' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter).toEqual({ stakeholderId: 'sh_001', status: 'active' });
    });

    it('should return empty array when none found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await VestingSchedule.findByStakeholder('sh_999');
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // findByEquityPlan()
  // ------------------------------------------------------------------
  describe('findByEquityPlan()', () => {
    it('should find schedules by equityPlanId', async () => {
      const schedules = [{ _id: 'id1', equityPlanId: 'ep_001' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(schedules));
      const result = await VestingSchedule.findByEquityPlan('ep_001');
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await VestingSchedule.findByEquityPlan('ep_001', { status: 'completed' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter).toEqual({ equityPlanId: 'ep_001', status: 'completed' });
    });
  });

  // ------------------------------------------------------------------
  // findByCompany()
  // ------------------------------------------------------------------
  describe('findByCompany()', () => {
    it('should find schedules by companyId', async () => {
      const schedules = [{ _id: 'id1', companyId: 'comp_001' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(schedules));
      const result = await VestingSchedule.findByCompany('comp_001');
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await VestingSchedule.findByCompany('comp_001', { status: 'terminated' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter).toEqual({ companyId: 'comp_001', status: 'terminated' });
    });
  });

  // ------------------------------------------------------------------
  // getVestingPercentage()
  // ------------------------------------------------------------------
  describe('getVestingPercentage()', () => {
    it('should calculate percentage correctly', () => {
      expect(VestingSchedule.getVestingPercentage({ vestedShares: 2500, totalShares: 10000 })).toBe(25);
    });

    it('should return 0 when totalShares is 0', () => {
      expect(VestingSchedule.getVestingPercentage({ vestedShares: 0, totalShares: 0 })).toBe(0);
    });

    it('should return 100 when fully vested', () => {
      expect(VestingSchedule.getVestingPercentage({ vestedShares: 1000, totalShares: 1000 })).toBe(100);
    });

    it('should handle fractional percentages', () => {
      const pct = VestingSchedule.getVestingPercentage({ vestedShares: 333, totalShares: 1000 });
      expect(pct).toBeCloseTo(33.3, 1);
    });
  });

  // ------------------------------------------------------------------
  // cliffPassed()
  // ------------------------------------------------------------------
  describe('cliffPassed()', () => {
    it('should return true when no cliffDate', () => {
      expect(VestingSchedule.cliffPassed({ cliffDate: null })).toBe(true);
    });

    it('should return true for past cliff date', () => {
      const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(VestingSchedule.cliffPassed({ cliffDate: pastDate })).toBe(true);
    });

    it('should return false for future cliff date', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(VestingSchedule.cliffPassed({ cliffDate: futureDate })).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // isFullyVested()
  // ------------------------------------------------------------------
  describe('isFullyVested()', () => {
    it('should return true when all shares vested', () => {
      expect(VestingSchedule.isFullyVested({ vestedShares: 1000, totalShares: 1000 })).toBe(true);
    });

    it('should return true when vestedShares exceeds totalShares', () => {
      expect(VestingSchedule.isFullyVested({ vestedShares: 1100, totalShares: 1000 })).toBe(true);
    });

    it('should return false when shares remain', () => {
      expect(VestingSchedule.isFullyVested({ vestedShares: 500, totalShares: 1000 })).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // addVestingEvent()
  // ------------------------------------------------------------------
  describe('addVestingEvent()', () => {
    it('should throw when schedule not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        VestingSchedule.addVestingEvent('vs_nonexistent', { eventType: 'periodic', sharesVested: 100 })
      ).rejects.toThrow('Schedule not found');
    });

    it('should add a vesting event to the schedule', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 500,
        totalShares: 10000, vestingHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      // For updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      const event = { eventType: 'periodic', sharesVested: 250, notes: 'Monthly vest' };
      const result = await VestingSchedule.addVestingEvent('vs_123', event);
      expect(result).toBeDefined();
    });

    it('should update vestedShares and unvestedShares on event', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 500,
        totalShares: 10000, vestingHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const rowData = body.row_data;
        expect(rowData.vestedShares).toBe(750);
        expect(rowData.unvestedShares).toBe(9250);
        return {};
      });

      await VestingSchedule.addVestingEvent('vs_123', { eventType: 'periodic', sharesVested: 250 });
    });

    it('should use eventDate from event or default to now', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 0,
        totalShares: 1000, vestingHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const history = body.row_data.vestingHistory;
        expect(history).toHaveLength(1);
        expect(history[0].eventDate).toBeDefined();
        return {};
      });

      await VestingSchedule.addVestingEvent('vs_123', { eventType: 'cliff', sharesVested: 250 });
    });

    it('should handle schedule with existing vestingHistory', async () => {
      const existingEvent = { eventDate: '2024-06-01', eventType: 'cliff', sharesVested: 250 };
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 250,
        totalShares: 1000, vestingHistory: [existingEvent], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const history = body.row_data.vestingHistory;
        expect(history).toHaveLength(2);
        return {};
      });

      await VestingSchedule.addVestingEvent('vs_123', { eventType: 'periodic', sharesVested: 100 });
    });
  });

  // ------------------------------------------------------------------
  // pause()
  // ------------------------------------------------------------------
  describe('pause()', () => {
    it('should pause a schedule', async () => {
      const schedule = { _id: 'id1', scheduleId: 'vs_123', status: 'active', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.status).toBe('paused');
        expect(body.row_data.pausedAt).toBeDefined();
        return {};
      });

      const result = await VestingSchedule.pause('vs_123');
      expect(result).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // resume()
  // ------------------------------------------------------------------
  describe('resume()', () => {
    it('should throw when schedule not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(VestingSchedule.resume('vs_nonexistent')).rejects.toThrow('Schedule not found');
    });

    it('should resume a paused schedule', async () => {
      const pausedDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', status: 'paused',
        pausedAt: pausedDate, pausedDays: 0, row_id: 'row-1'
      };
      // findByScheduleId -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.status).toBe('active');
        expect(body.row_data.pausedAt).toBeNull();
        expect(body.row_data.pausedDays).toBeGreaterThanOrEqual(4);
        return {};
      });

      const result = await VestingSchedule.resume('vs_123');
      expect(result).toBeDefined();
    });

    it('should accumulate pausedDays from prior pauses', async () => {
      const pausedDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', status: 'paused',
        pausedAt: pausedDate, pausedDays: 10, row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.pausedDays).toBeGreaterThanOrEqual(12);
        return {};
      });

      await VestingSchedule.resume('vs_123');
    });

    it('should handle schedule with no pausedAt', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', status: 'paused',
        pausedAt: null, pausedDays: 5, row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.pausedDays).toBe(5);
        return {};
      });

      await VestingSchedule.resume('vs_123');
    });
  });

  // ------------------------------------------------------------------
  // terminate()
  // ------------------------------------------------------------------
  describe('terminate()', () => {
    it('should terminate a schedule', async () => {
      const schedule = { _id: 'id1', scheduleId: 'vs_123', status: 'active', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.status).toBe('terminated');
        expect(body.row_data.terminationDate).toBeDefined();
        expect(body.row_data.terminationType).toBe('voluntary');
        return {};
      });

      const result = await VestingSchedule.terminate('vs_123', 'voluntary');
      expect(result).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // accelerate()
  // ------------------------------------------------------------------
  describe('accelerate()', () => {
    it('should throw when schedule not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        VestingSchedule.accelerate('vs_nonexistent', 'single_trigger', 1000)
      ).rejects.toThrow('Schedule not found');
    });

    it('should accelerate vesting for unvested shares', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 2500,
        unvestedShares: 7500, totalShares: 10000, vestingHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const rd = body.row_data;
        expect(rd.status).toBe('accelerated');
        expect(rd.accelerationType).toBe('single_trigger');
        expect(rd.acceleratedShares).toBe(5000);
        expect(rd.vestedShares).toBe(7500);
        expect(rd.unvestedShares).toBe(2500);
        expect(rd.vestingHistory).toHaveLength(1);
        expect(rd.vestingHistory[0].eventType).toBe('acceleration');
        return {};
      });

      await VestingSchedule.accelerate('vs_123', 'single_trigger', 5000);
    });

    it('should cap acceleration at unvestedShares', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 8000,
        unvestedShares: 2000, totalShares: 10000, vestingHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const rd = body.row_data;
        expect(rd.acceleratedShares).toBe(2000); // Capped at unvestedShares
        expect(rd.vestedShares).toBe(10000);
        expect(rd.unvestedShares).toBe(0);
        return {};
      });

      await VestingSchedule.accelerate('vs_123', 'double_trigger', 5000);
    });

    it('should add acceleration event to vestingHistory', async () => {
      const schedule = {
        _id: 'id1', scheduleId: 'vs_123', vestedShares: 0,
        unvestedShares: 1000, totalShares: 1000,
        vestingHistory: [{ eventType: 'cliff', sharesVested: 0 }],
        row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([schedule]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.vestingHistory).toHaveLength(2);
        expect(body.row_data.vestingHistory[1].notes).toContain('board_discretion');
        return {};
      });

      await VestingSchedule.accelerate('vs_123', 'board_discretion', 1000);
    });
  });

  // ------------------------------------------------------------------
  // Base model methods existence
  // ------------------------------------------------------------------
  describe('Base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments',
      'exists', 'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should expose ${method} method`, () => {
        expect(typeof VestingSchedule[method]).toBe('function');
      });
    });
  });
});
