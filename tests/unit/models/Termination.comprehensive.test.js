/**
 * Termination Model - Comprehensive Unit Tests
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
const Termination = require('../../../models/Termination');

describe('Termination Model - Comprehensive', () => {
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

  const validTerminationData = {
    employeeId: 'emp_001',
    companyId: 'comp_001',
    terminationDate: '2024-06-01T00:00:00.000Z',
    terminationType: 'voluntary',
    totalGrantedShares: 10000,
    vestedSharesAtTermination: 2500,
    exerciseWindowDays: 90
  };

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validTerminationData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  describe('Constants', () => {
    it('should export TERMINATION_TYPES', () => {
      expect(Termination.TERMINATION_TYPES).toEqual([
        'voluntary', 'involuntary', 'for_cause', 'layoff', 'retirement', 'death', 'disability'
      ]);
    });

    it('should export VALID_STATUSES', () => {
      expect(Termination.VALID_STATUSES).toEqual([
        'pending', 'processing', 'exercise_window_open', 'exercise_window_expired', 'completed', 'cancelled'
      ]);
    });

    it('should export VESTING_TYPES', () => {
      expect(Termination.VESTING_TYPES).toEqual(['monthly', 'quarterly', 'annual', 'immediate', 'custom']);
    });

    it('should export REPURCHASE_METHODS', () => {
      expect(Termination.REPURCHASE_METHODS).toEqual([
        'lower_of_exercise_or_fmv', 'fmv_only', 'exercise_price_only', 'custom'
      ]);
    });

    it('should export NOTIFICATION_CHANNELS', () => {
      expect(Termination.NOTIFICATION_CHANNELS).toEqual(['email', 'sms', 'in_app']);
    });

    it('should have tableName set to terminations', () => {
      expect(Termination.tableName).toBe('terminations');
    });
  });

  // ------------------------------------------------------------------
  // create()
  // ------------------------------------------------------------------
  describe('create()', () => {
    it('should create a termination with valid data', async () => {
      const result = await Termination.create({ ...validTerminationData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate terminationId if not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.terminationId).toMatch(/^TERM-\d{4}-\d{4}$/);
        return makeInsertResponse(doc);
      });
      await Termination.create({ ...validTerminationData });
    });

    it('should use provided terminationId', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.terminationId).toBe('TERM-CUSTOM');
        return makeInsertResponse(doc);
      });
      await Termination.create({ ...validTerminationData, terminationId: 'TERM-CUSTOM' });
    });

    it('should throw for invalid terminationType', async () => {
      await expect(
        Termination.create({ ...validTerminationData, terminationType: 'invalid_type' })
      ).rejects.toThrow('terminationType must be one of');
    });

    it('should default status to pending', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('pending');
        return makeInsertResponse(doc);
      });
      await Termination.create({ ...validTerminationData });
    });

    it('should respect provided status', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('processing');
        return makeInsertResponse(doc);
      });
      await Termination.create({ ...validTerminationData, status: 'processing' });
    });

    it('should calculate exerciseWindowEndDate from terminationDate and exerciseWindowDays', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.exerciseWindowEndDate).toBeDefined();
        const endDate = new Date(doc.exerciseWindowEndDate);
        const termDate = new Date(doc.terminationDate);
        const daysDiff = Math.round((endDate - termDate) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBe(90);
        return makeInsertResponse(doc);
      });
      await Termination.create({ ...validTerminationData });
    });

    it('should not override provided exerciseWindowEndDate', async () => {
      const customEnd = '2024-12-31T00:00:00.000Z';
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.exerciseWindowEndDate).toBe(customEnd);
        return makeInsertResponse(doc);
      });
      await Termination.create({ ...validTerminationData, exerciseWindowEndDate: customEnd });
    });

    it('should accept each valid termination type', async () => {
      for (const type of Termination.TERMINATION_TYPES) {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ ...validTerminationData, terminationType: type }));
        const result = await Termination.create({ ...validTerminationData, terminationType: type });
        expect(result).toBeDefined();
      }
    });
  });

  // ------------------------------------------------------------------
  // findByTerminationId()
  // ------------------------------------------------------------------
  describe('findByTerminationId()', () => {
    it('should find termination by terminationId', async () => {
      const term = { _id: 'id1', terminationId: 'TERM-2024-0001' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([term]));
      const result = await Termination.findByTerminationId('TERM-2024-0001');
      expect(result).toBeDefined();
      expect(result.terminationId).toBe('TERM-2024-0001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await Termination.findByTerminationId('TERM-NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // findByEmployee()
  // ------------------------------------------------------------------
  describe('findByEmployee()', () => {
    it('should find terminations by employeeId', async () => {
      const terms = [
        { _id: 'id1', employeeId: 'emp_001', terminationDate: '2024-06-01' },
        { _id: 'id2', employeeId: 'emp_001', terminationDate: '2024-01-01' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findByEmployee('emp_001');
      expect(result).toHaveLength(2);
    });

    it('should sort results by terminationDate descending', async () => {
      const terms = [
        { _id: 'id1', employeeId: 'emp_001', terminationDate: '2024-01-01' },
        { _id: 'id2', employeeId: 'emp_001', terminationDate: '2024-06-01' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findByEmployee('emp_001');
      expect(result[0].terminationDate).toBe('2024-06-01');
      expect(result[1].terminationDate).toBe('2024-01-01');
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await Termination.findByEmployee('emp_001', { status: 'completed' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter).toEqual({ employeeId: 'emp_001', status: 'completed' });
    });
  });

  // ------------------------------------------------------------------
  // findByCompany()
  // ------------------------------------------------------------------
  describe('findByCompany()', () => {
    it('should find terminations by companyId', async () => {
      const terms = [{ _id: 'id1', companyId: 'comp_001', terminationDate: '2024-06-01' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findByCompany('comp_001');
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await Termination.findByCompany('comp_001', { status: 'pending' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.status).toBe('pending');
    });

    it('should filter by terminationType when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await Termination.findByCompany('comp_001', { terminationType: 'voluntary' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.terminationType).toBe('voluntary');
    });

    it('should sort results by terminationDate descending', async () => {
      const terms = [
        { _id: 'id1', companyId: 'comp_001', terminationDate: '2024-01-01' },
        { _id: 'id2', companyId: 'comp_001', terminationDate: '2024-06-01' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findByCompany('comp_001');
      expect(result[0].terminationDate).toBe('2024-06-01');
    });
  });

  // ------------------------------------------------------------------
  // findExpiringWindows()
  // ------------------------------------------------------------------
  describe('findExpiringWindows()', () => {
    it('should find terminations with exercise windows expiring soon', async () => {
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const terms = [{
        _id: 'id1', companyId: 'comp_001', status: 'exercise_window_open',
        exerciseWindowEndDate: futureDate
      }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findExpiringWindows('comp_001', 7);
      expect(result).toHaveLength(1);
    });

    it('should exclude already expired windows', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const terms = [{
        _id: 'id1', companyId: 'comp_001', status: 'exercise_window_open',
        exerciseWindowEndDate: pastDate
      }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findExpiringWindows('comp_001', 7);
      expect(result).toHaveLength(0);
    });

    it('should exclude windows far in the future', async () => {
      const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const terms = [{
        _id: 'id1', companyId: 'comp_001', status: 'exercise_window_open',
        exerciseWindowEndDate: farFuture
      }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findExpiringWindows('comp_001', 7);
      expect(result).toHaveLength(0);
    });

    it('should use default daysUntilExpiry of 7', async () => {
      const within7Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const terms = [{
        _id: 'id1', companyId: 'comp_001', status: 'exercise_window_open',
        exerciseWindowEndDate: within7Days
      }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(terms));
      const result = await Termination.findExpiringWindows('comp_001');
      expect(result).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------------
  // getDaysUntilExerciseExpiry()
  // ------------------------------------------------------------------
  describe('getDaysUntilExerciseExpiry()', () => {
    it('should return null when no exerciseWindowEndDate', () => {
      expect(Termination.getDaysUntilExerciseExpiry({ exerciseWindowEndDate: null })).toBeNull();
    });

    it('should return 0 when window is already expired', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(Termination.getDaysUntilExerciseExpiry({ exerciseWindowEndDate: pastDate })).toBe(0);
    });

    it('should return positive days for future expiry', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const days = Termination.getDaysUntilExerciseExpiry({ exerciseWindowEndDate: futureDate });
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(31);
    });
  });

  // ------------------------------------------------------------------
  // isExerciseWindowExpired()
  // ------------------------------------------------------------------
  describe('isExerciseWindowExpired()', () => {
    it('should return false when no exerciseWindowEndDate', () => {
      expect(Termination.isExerciseWindowExpired({ exerciseWindowEndDate: null })).toBe(false);
    });

    it('should return true when window is expired', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(Termination.isExerciseWindowExpired({ exerciseWindowEndDate: pastDate })).toBe(true);
    });

    it('should return false when window is still open', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(Termination.isExerciseWindowExpired({ exerciseWindowEndDate: futureDate })).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // getSharesAvailableToExercise()
  // ------------------------------------------------------------------
  describe('getSharesAvailableToExercise()', () => {
    it('should calculate available shares', () => {
      const term = { vestedSharesAtTermination: 1000, sharesExercised: 300 };
      expect(Termination.getSharesAvailableToExercise(term)).toBe(700);
    });

    it('should return 0 when all shares are exercised', () => {
      const term = { vestedSharesAtTermination: 1000, sharesExercised: 1000 };
      expect(Termination.getSharesAvailableToExercise(term)).toBe(0);
    });

    it('should return 0 when sharesExercised exceeds vested', () => {
      const term = { vestedSharesAtTermination: 500, sharesExercised: 600 };
      expect(Termination.getSharesAvailableToExercise(term)).toBe(0);
    });

    it('should return all vested when none exercised', () => {
      const term = { vestedSharesAtTermination: 2500, sharesExercised: 0 };
      expect(Termination.getSharesAvailableToExercise(term)).toBe(2500);
    });
  });

  // ------------------------------------------------------------------
  // getTotalExerciseCost()
  // ------------------------------------------------------------------
  describe('getTotalExerciseCost()', () => {
    it('should sum totalCost from exerciseHistory', () => {
      const term = {
        exerciseHistory: [
          { totalCost: 100 },
          { totalCost: 200 },
          { totalCost: 300 }
        ]
      };
      expect(Termination.getTotalExerciseCost(term)).toBe(600);
    });

    it('should return 0 for empty exerciseHistory', () => {
      expect(Termination.getTotalExerciseCost({ exerciseHistory: [] })).toBe(0);
    });

    it('should return 0 when exerciseHistory is null', () => {
      expect(Termination.getTotalExerciseCost({ exerciseHistory: null })).toBe(0);
    });

    it('should return 0 when exerciseHistory is undefined', () => {
      expect(Termination.getTotalExerciseCost({})).toBe(0);
    });

    it('should handle items missing totalCost', () => {
      const term = {
        exerciseHistory: [{ totalCost: 100 }, { shares: 50 }]
      };
      expect(Termination.getTotalExerciseCost(term)).toBe(100);
    });
  });

  // ------------------------------------------------------------------
  // canExercise()
  // ------------------------------------------------------------------
  describe('canExercise()', () => {
    it('should return false when exercise window is expired', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const term = {
        exerciseWindowEndDate: pastDate,
        vestedSharesAtTermination: 1000,
        sharesExercised: 0
      };
      expect(Termination.canExercise(term, 100)).toBe(false);
    });

    it('should return false when trying to exercise more than available', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const term = {
        exerciseWindowEndDate: futureDate,
        vestedSharesAtTermination: 1000,
        sharesExercised: 900
      };
      expect(Termination.canExercise(term, 200)).toBe(false);
    });

    it('should return true when exercise is valid', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const term = {
        exerciseWindowEndDate: futureDate,
        vestedSharesAtTermination: 1000,
        sharesExercised: 0
      };
      expect(Termination.canExercise(term, 500)).toBe(true);
    });

    it('should return true when exercising exact available shares', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const term = {
        exerciseWindowEndDate: futureDate,
        vestedSharesAtTermination: 1000,
        sharesExercised: 500
      };
      expect(Termination.canExercise(term, 500)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // recordExercise()
  // ------------------------------------------------------------------
  describe('recordExercise()', () => {
    it('should throw when termination not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        Termination.recordExercise('TERM-NONEXISTENT', { shares: 100 })
      ).rejects.toThrow('Termination not found');
    });

    it('should record an exercise event', async () => {
      const term = {
        _id: 'id1', terminationId: 'TERM-001', sharesExercised: 0,
        exerciseHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const rd = body.row_data;
        expect(rd.sharesExercised).toBe(100);
        expect(rd.exerciseHistory).toHaveLength(1);
        expect(rd.exerciseHistory[0].shares).toBe(100);
        return {};
      });

      await Termination.recordExercise('TERM-001', {
        shares: 100,
        exercisePrice: 1.5,
        fmvAtExercise: 5.0,
        totalCost: 150,
        taxWithholding: 50
      });
    });

    it('should accumulate sharesExercised across multiple exercises', async () => {
      const term = {
        _id: 'id1', terminationId: 'TERM-001', sharesExercised: 200,
        exerciseHistory: [{ shares: 200, totalCost: 300 }], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.sharesExercised).toBe(300);
        expect(body.row_data.exerciseHistory).toHaveLength(2);
        return {};
      });

      await Termination.recordExercise('TERM-001', {
        shares: 100,
        exercisePrice: 2.0,
        totalCost: 200
      });
    });

    it('should use provided date or default', async () => {
      const term = {
        _id: 'id1', terminationId: 'TERM-001', sharesExercised: 0,
        exerciseHistory: [], row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.exerciseHistory[0].date).toBeDefined();
        return {};
      });

      await Termination.recordExercise('TERM-001', { shares: 50 });
    });
  });

  // ------------------------------------------------------------------
  // extendExerciseWindow()
  // ------------------------------------------------------------------
  describe('extendExerciseWindow()', () => {
    it('should throw when termination not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        Termination.extendExerciseWindow('TERM-NONEXISTENT', 30, 'admin_001', 'Hardship')
      ).rejects.toThrow('Termination not found');
    });

    it('should extend the exercise window', async () => {
      const term = {
        _id: 'id1', terminationId: 'TERM-001',
        exerciseWindowEndDate: '2024-09-01T00:00:00.000Z',
        row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        const rd = body.row_data;
        expect(rd.exerciseWindowExtended).toBe(true);
        expect(rd.extensionReason).toBe('Hardship');
        expect(rd.extensionApprovedBy).toBe('admin_001');
        expect(rd.extensionApprovedDate).toBeDefined();
        const newEnd = new Date(rd.exerciseWindowEndDate);
        const originalEnd = new Date('2024-09-01T00:00:00.000Z');
        const daysDiff = Math.round((newEnd - originalEnd) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBe(30);
        return {};
      });

      await Termination.extendExerciseWindow('TERM-001', 30, 'admin_001', 'Hardship');
    });
  });

  // ------------------------------------------------------------------
  // updateStatus()
  // ------------------------------------------------------------------
  describe('updateStatus()', () => {
    it('should update status', async () => {
      const term = { _id: 'id1', terminationId: 'TERM-001', status: 'pending', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.status).toBe('processing');
        return {};
      });

      await Termination.updateStatus('TERM-001', 'processing');
    });

    it('should set processedBy/processedAt when status is processing', async () => {
      const term = { _id: 'id1', terminationId: 'TERM-001', status: 'pending', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.processedBy).toBe('admin_001');
        expect(body.row_data.processedAt).toBeDefined();
        return {};
      });

      await Termination.updateStatus('TERM-001', 'processing', { processedBy: 'admin_001' });
    });

    it('should set notes when provided', async () => {
      const term = { _id: 'id1', terminationId: 'TERM-001', status: 'pending', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.notes).toBe('Status change note');
        return {};
      });

      await Termination.updateStatus('TERM-001', 'completed', { notes: 'Status change note' });
    });

    it('should not set processedBy for non-processing statuses', async () => {
      const term = { _id: 'id1', terminationId: 'TERM-001', status: 'pending', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([term]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.processedBy).toBeUndefined();
        return {};
      });

      await Termination.updateStatus('TERM-001', 'completed', { processedBy: 'admin_001' });
    });
  });

  // ------------------------------------------------------------------
  // Base model methods
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
        expect(typeof Termination[method]).toBe('function');
      });
    });
  });
});
