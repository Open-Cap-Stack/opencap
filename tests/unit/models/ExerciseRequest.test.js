/**
 * ExerciseRequest Model Tests
 * Feature: Issue #79 - Build Exercise Management System
 * Tests creation, validation, lifecycle methods, queries, and summary.
 */

// Mock zerodbService before any require
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');

describe('ExerciseRequest Model', () => {
  let ExerciseRequest;

  beforeAll(() => {
    ExerciseRequest = require('../../../models/ExerciseRequest');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.queryTable.mockReset();
    zerodbService.insertRow.mockReset();
    zerodbService.client.put.mockReset();
    zerodbService.client.put.mockResolvedValue({});
    zerodbService.queryTable.mockResolvedValue({ data: [] });
  });

  // Helpers
  const mockInsert = (returnData = {}) => {
    const data = { _id: 'mock-id', ...returnData };
    zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'row_1', row_data: data }] });
    return data;
  };

  const mockFind = (docs = []) => {
    zerodbService.queryTable.mockResolvedValue({
      data: docs.map((d, i) => ({ row_id: `row_${i}`, row_data: d }))
    });
  };

  const mockFindOne = (doc) => {
    if (doc) {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    } else {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
    }
  };


  const buildRequestData = (overrides = {}) => ({
    companyId: 'company_123',
    stakeholderId: 'stake_456',
    equityGrantId: 'grant_789',
    optionType: 'ISO',
    requestedBy: 'user_001',
    exerciseDetails: {
      sharesRequested: 500,
      exercisePrice: 1.00,
      currentFMV: 5.00
    },
    ...overrides
  });

  // -------------------------------------------------------------------
  // Exported Constants
  // -------------------------------------------------------------------
  describe('Exported Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(ExerciseRequest.VALID_STATUSES).toEqual(
        ['pending', 'approved', 'rejected', 'processed', 'completed', 'cancelled']
      );
    });

    it('should export OPTION_TYPES', () => {
      expect(ExerciseRequest.OPTION_TYPES).toEqual(['ISO', 'NSO', 'RSA', 'RSU']);
    });

    it('should export PAYMENT_METHODS', () => {
      expect(ExerciseRequest.PAYMENT_METHODS).toEqual(
        ['cash', 'check', 'wire', 'cashless', 'stock_swap']
      );
    });

    it('should export WITHHOLDING_METHODS', () => {
      expect(ExerciseRequest.WITHHOLDING_METHODS).toEqual(
        ['cash', 'sell_to_cover', 'same_day_sale']
      );
    });

    it('should export FILING_STATUSES', () => {
      expect(ExerciseRequest.FILING_STATUSES).toEqual(
        ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household']
      );
    });

    it('should export WINDOW_TYPES', () => {
      expect(ExerciseRequest.WINDOW_TYPES).toEqual(
        ['open', 'blackout', 'limited', 'termination']
      );
    });

    it('should have correct table name', () => {
      expect(ExerciseRequest.tableName).toBe('exercise_requests');
    });
  });

  // -------------------------------------------------------------------
  // Schema Definition
  // -------------------------------------------------------------------
  describe('Schema Definition', () => {
    it('should have required fields', () => {
      ['exerciseRequestId', 'companyId', 'stakeholderId', 'equityGrantId', 'optionType', 'requestedBy'].forEach(f => {
        expect(ExerciseRequest.schema[f]).toBeDefined();
        expect(ExerciseRequest.schema[f].required).toBe(true);
      });
    });

    it('should define exerciseRequestId as unique', () => {
      expect(ExerciseRequest.schema.exerciseRequestId.unique).toBe(true);
    });

    it('should have optionType enum with ISO, NSO, RSA, RSU', () => {
      expect(ExerciseRequest.schema.optionType.enum).toEqual(['ISO', 'NSO', 'RSA', 'RSU']);
    });

    it('should define nested object schemas', () => {
      ['exerciseDetails', 'exerciseWindow', 'payment', 'employeeProfile',
       'taxWithholding', 'certificateData'].forEach(field => {
        expect(ExerciseRequest.schema[field]).toBeDefined();
        expect(ExerciseRequest.schema[field].type).toBe('object');
      });
    });

    it('should define form3921 tracking fields', () => {
      expect(ExerciseRequest.schema.form3921Id).toBeDefined();
      expect(ExerciseRequest.schema.form3921Generated.type).toBe('boolean');
      expect(ExerciseRequest.schema.form3921Generated.default).toBe(false);
      expect(ExerciseRequest.schema.form3921GeneratedAt.type).toBe('date');
    });

    it('should have timestamp fields', () => {
      expect(ExerciseRequest.schema.createdAt).toBeDefined();
      expect(ExerciseRequest.schema.updatedAt).toBeDefined();
    });

    it('should track partial exercise in exerciseDetails defaults', () => {
      expect(ExerciseRequest.schema.exerciseDetails.default.isPartialExercise).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('should create a request with auto-generated exerciseRequestId', async () => {
      const data = buildRequestData();
      mockInsert({ ...data, exerciseRequestId: 'exr_auto' });

      await ExerciseRequest.create(data);

      expect(zerodbService.insertRow).toHaveBeenCalledTimes(1);
      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.exerciseRequestId).toMatch(/^exr_/);
    });

    it('should keep caller-provided exerciseRequestId', async () => {
      const data = buildRequestData({ exerciseRequestId: 'exr_custom' });
      mockInsert({ ...data });

      await ExerciseRequest.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.exerciseRequestId).toBe('exr_custom');
    });

    it('should default status to pending', async () => {
      const data = buildRequestData();
      mockInsert({ ...data });

      await ExerciseRequest.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.status).toBe('pending');
    });

    it('should set requestedAt automatically', async () => {
      const data = buildRequestData();
      mockInsert({ ...data });

      await ExerciseRequest.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.requestedAt).toBeDefined();
    });

    it('should throw for invalid optionType', async () => {
      const data = buildRequestData({ optionType: 'INVALID' });

      await expect(ExerciseRequest.create(data))
        .rejects.toThrow('optionType must be one of: ISO, NSO, RSA, RSU');
    });

    it('should accept all valid option types', async () => {
      for (const optionType of ['ISO', 'NSO', 'RSA', 'RSU']) {
        jest.clearAllMocks();
        const data = buildRequestData({ optionType });
        mockInsert({ ...data });

        await ExerciseRequest.create(data);

        expect(zerodbService.insertRow).toHaveBeenCalledTimes(1);
      }
    });
  });

  // -------------------------------------------------------------------
  // findByExerciseRequestId
  // -------------------------------------------------------------------
  describe('findByExerciseRequestId', () => {
    it('should query by exerciseRequestId', async () => {
      const doc = { exerciseRequestId: 'exr_1', companyId: 'c1' };
      mockFindOne(doc);

      const result = await ExerciseRequest.findByExerciseRequestId('exr_1');

      expect(result).toBeDefined();
      expect(result.exerciseRequestId).toBe('exr_1');
    });

    it('should return null when not found', async () => {
      mockFindOne(null);

      const result = await ExerciseRequest.findByExerciseRequestId('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // findByCompany
  // -------------------------------------------------------------------
  describe('findByCompany', () => {
    it('should query by companyId', async () => {
      mockFind([{ companyId: 'c1' }, { companyId: 'c1' }]);

      const result = await ExerciseRequest.findByCompany('c1');

      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      mockFind([]);

      await ExerciseRequest.findByCompany('c1', 'pending');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.companyId).toBe('c1');
      expect(callArg.filter.status).toBe('pending');
    });
  });

  // -------------------------------------------------------------------
  // findByStakeholder
  // -------------------------------------------------------------------
  describe('findByStakeholder', () => {
    it('should query by stakeholderId', async () => {
      mockFind([{ stakeholderId: 's1' }]);

      const result = await ExerciseRequest.findByStakeholder('s1');

      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      mockFind([]);

      await ExerciseRequest.findByStakeholder('s1', 'completed');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.status).toBe('completed');
    });
  });

  // -------------------------------------------------------------------
  // findPendingByGrant
  // -------------------------------------------------------------------
  describe('findPendingByGrant', () => {
    it('should return only pending and approved requests', async () => {
      const requests = [
        { equityGrantId: 'g1', status: 'pending' },
        { equityGrantId: 'g1', status: 'approved' },
        { equityGrantId: 'g1', status: 'completed' },
        { equityGrantId: 'g1', status: 'rejected' }
      ];
      mockFind(requests);

      const result = await ExerciseRequest.findPendingByGrant('g1');

      expect(result).toHaveLength(2);
      expect(result.every(r => ['pending', 'approved'].includes(r.status))).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // findByEquityGrant
  // -------------------------------------------------------------------
  describe('findByEquityGrant', () => {
    it('should query by equityGrantId', async () => {
      mockFind([{ equityGrantId: 'g1' }]);

      const result = await ExerciseRequest.findByEquityGrant('g1');

      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      mockFind([]);

      await ExerciseRequest.findByEquityGrant('g1', 'processed');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.status).toBe('processed');
    });
  });

  // -------------------------------------------------------------------
  // getNetShares
  // -------------------------------------------------------------------
  describe('getNetShares', () => {
    it('should return sharesRequested minus sharesToWithhold', () => {
      const request = {
        exerciseDetails: { sharesRequested: 1000 },
        taxWithholding: { sharesToWithhold: 250 }
      };

      expect(ExerciseRequest.getNetShares(request)).toBe(750);
    });

    it('should return null when exerciseDetails is missing', () => {
      expect(ExerciseRequest.getNetShares({})).toBeNull();
    });

    it('should return null when taxWithholding is missing', () => {
      const request = { exerciseDetails: { sharesRequested: 1000 } };
      expect(ExerciseRequest.getNetShares(request)).toBeNull();
    });

    it('should handle zero withholding', () => {
      const request = {
        exerciseDetails: { sharesRequested: 500 },
        taxWithholding: { sharesToWithhold: 0 }
      };

      expect(ExerciseRequest.getNetShares(request)).toBe(500);
    });
  });

  // -------------------------------------------------------------------
  // Status check methods
  // -------------------------------------------------------------------
  describe('Status Check Methods', () => {
    describe('canBeApproved', () => {
      it('should return true for pending status', () => {
        expect(ExerciseRequest.canBeApproved({ status: 'pending' })).toBe(true);
      });

      it('should return false for non-pending status', () => {
        expect(ExerciseRequest.canBeApproved({ status: 'approved' })).toBe(false);
        expect(ExerciseRequest.canBeApproved({ status: 'rejected' })).toBe(false);
      });
    });

    describe('canBeRejected', () => {
      it('should return true for pending status', () => {
        expect(ExerciseRequest.canBeRejected({ status: 'pending' })).toBe(true);
      });

      it('should return false for non-pending status', () => {
        expect(ExerciseRequest.canBeRejected({ status: 'completed' })).toBe(false);
      });
    });

    describe('canBeProcessed', () => {
      it('should return true for approved status', () => {
        expect(ExerciseRequest.canBeProcessed({ status: 'approved' })).toBe(true);
      });

      it('should return false for non-approved status', () => {
        expect(ExerciseRequest.canBeProcessed({ status: 'pending' })).toBe(false);
      });
    });

    describe('canBeCompleted', () => {
      it('should return true for processed status', () => {
        expect(ExerciseRequest.canBeCompleted({ status: 'processed' })).toBe(true);
      });

      it('should return false for non-processed status', () => {
        expect(ExerciseRequest.canBeCompleted({ status: 'approved' })).toBe(false);
      });
    });

    describe('canBeCancelled', () => {
      it('should return true for pending status', () => {
        expect(ExerciseRequest.canBeCancelled({ status: 'pending' })).toBe(true);
      });

      it('should return true for approved status', () => {
        expect(ExerciseRequest.canBeCancelled({ status: 'approved' })).toBe(true);
      });

      it('should return false for processed status', () => {
        expect(ExerciseRequest.canBeCancelled({ status: 'processed' })).toBe(false);
      });

      it('should return false for completed status', () => {
        expect(ExerciseRequest.canBeCancelled({ status: 'completed' })).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------------
  // Lifecycle methods (approve, reject, process, complete, cancel)
  // -------------------------------------------------------------------
  describe('Lifecycle Methods', () => {
    const mockForUpdate = (doc) => {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    };

    describe('approve', () => {
      it('should update status to approved', async () => {
        const doc = { _id: 'd1', exerciseRequestId: 'exr_1', status: 'pending', row_id: 'row_1' };
        mockForUpdate(doc);

        await ExerciseRequest.approve('exr_1', 'admin_1', 'Looks good');

        expect(zerodbService.client.put).toHaveBeenCalled();
      });
    });

    describe('reject', () => {
      it('should update status to rejected', async () => {
        const doc = { _id: 'd1', exerciseRequestId: 'exr_1', status: 'pending', row_id: 'row_1' };
        mockForUpdate(doc);

        await ExerciseRequest.reject('exr_1', 'admin_1', 'Insufficient vested shares');

        expect(zerodbService.client.put).toHaveBeenCalled();
      });
    });

    describe('process', () => {
      it('should update status to processed', async () => {
        const doc = { _id: 'd1', exerciseRequestId: 'exr_1', status: 'approved', row_id: 'row_1' };
        mockForUpdate(doc);

        await ExerciseRequest.process('exr_1', 'ops_1', 'Payment received');

        expect(zerodbService.client.put).toHaveBeenCalled();
      });
    });

    describe('complete', () => {
      it('should update status to completed', async () => {
        const doc = { _id: 'd1', exerciseRequestId: 'exr_1', status: 'processed', row_id: 'row_1' };
        mockForUpdate(doc);

        await ExerciseRequest.complete('exr_1', 'ops_1', 'Shares issued');

        expect(zerodbService.client.put).toHaveBeenCalled();
      });
    });

    describe('cancel', () => {
      it('should update status to cancelled', async () => {
        const doc = { _id: 'd1', exerciseRequestId: 'exr_1', status: 'pending', row_id: 'row_1' };
        mockForUpdate(doc);

        await ExerciseRequest.cancel('exr_1', 'user_1', 'Changed my mind');

        expect(zerodbService.client.put).toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------
  // getExerciseSummaryByGrant
  // -------------------------------------------------------------------
  describe('getExerciseSummaryByGrant', () => {
    it('should aggregate completed and pending shares', async () => {
      const requests = [
        { equityGrantId: 'g1', status: 'completed', exerciseDetails: { sharesRequested: 100 } },
        { equityGrantId: 'g1', status: 'completed', exerciseDetails: { sharesRequested: 200 } },
        { equityGrantId: 'g1', status: 'pending', exerciseDetails: { sharesRequested: 50 } },
        { equityGrantId: 'g1', status: 'approved', exerciseDetails: { sharesRequested: 75 } },
        { equityGrantId: 'g1', status: 'processed', exerciseDetails: { sharesRequested: 25 } },
        { equityGrantId: 'g1', status: 'rejected', exerciseDetails: { sharesRequested: 500 } },
        { equityGrantId: 'g1', status: 'cancelled', exerciseDetails: { sharesRequested: 300 } }
      ];
      mockFind(requests);

      const summary = await ExerciseRequest.getExerciseSummaryByGrant('g1');

      expect(summary.equityGrantId).toBe('g1');
      expect(summary.totalExercisedShares).toBe(300); // 100 + 200
      expect(summary.totalPendingShares).toBe(150); // 50 + 75 + 25
      expect(summary.completedCount).toBe(2);
      expect(summary.pendingCount).toBe(3);
      expect(summary.totalCount).toBe(7);
    });

    it('should handle empty results', async () => {
      mockFind([]);

      const summary = await ExerciseRequest.getExerciseSummaryByGrant('g_empty');

      expect(summary.totalExercisedShares).toBe(0);
      expect(summary.totalPendingShares).toBe(0);
      expect(summary.completedCount).toBe(0);
      expect(summary.pendingCount).toBe(0);
      expect(summary.totalCount).toBe(0);
    });

    it('should handle requests with missing exerciseDetails', async () => {
      const requests = [
        { equityGrantId: 'g1', status: 'completed' },
        { equityGrantId: 'g1', status: 'pending' }
      ];
      mockFind(requests);

      const summary = await ExerciseRequest.getExerciseSummaryByGrant('g1');

      expect(summary.totalExercisedShares).toBe(0);
      expect(summary.totalPendingShares).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // getISOExercisesForTaxYear
  // -------------------------------------------------------------------
  describe('getISOExercisesForTaxYear', () => {
    it('should return completed ISO exercises for the given tax year', async () => {
      const requests = [
        { companyId: 'c1', optionType: 'ISO', status: 'completed', completedAt: '2025-06-15T00:00:00Z' },
        { companyId: 'c1', optionType: 'ISO', status: 'completed', completedAt: '2025-11-20T00:00:00Z' },
        { companyId: 'c1', optionType: 'ISO', status: 'completed', completedAt: '2024-12-31T00:00:00Z' }
      ];
      mockFind(requests);

      const result = await ExerciseRequest.getISOExercisesForTaxYear('c1', 2025);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no matching exercises', async () => {
      mockFind([]);

      const result = await ExerciseRequest.getISOExercisesForTaxYear('c1', 2025);

      expect(result).toHaveLength(0);
    });

    it('should filter out exercises without completedAt', async () => {
      const requests = [
        { companyId: 'c1', optionType: 'ISO', status: 'completed', completedAt: null },
        { companyId: 'c1', optionType: 'ISO', status: 'completed' }
      ];
      mockFind(requests);

      const result = await ExerciseRequest.getISOExercisesForTaxYear('c1', 2025);

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // CRUD method existence
  // -------------------------------------------------------------------
  describe('CRUD Methods', () => {
    it('should have all base model methods', () => {
      const methods = [
        'create', 'find', 'findOne', 'findById',
        'updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate',
        'deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete',
        'countDocuments', 'exists', 'distinct', 'aggregate'
      ];

      methods.forEach(method => {
        expect(typeof ExerciseRequest[method]).toBe('function');
      });
    });
  });
});
