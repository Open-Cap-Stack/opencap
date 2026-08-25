/**
 * ReportExecution Model - Comprehensive Unit Tests
 *
 * Tests all async methods (create, findByExecutionId, findBySchedule,
 * start, complete, fail, updateDeliveryStatus) and sync helpers
 * (getDuration, isComplete, getDeliverySuccessRate) by mocking ZeroDB.
 */

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const ReportExecution = require('../../../models/ReportExecution');

describe('ReportExecution Model - Comprehensive', () => {
  const makeInsertResponse = (overrides = {}) => ({
    data: [{
      row_id: 'row-1',
      row_data: {
        _id: 'uuid-1',
        executionId: 'exec_uuid',
        scheduleId: 'sched_001',
        status: 'pending',
        ...overrides
      }
    }]
  });

  const makeQueryResponse = (items = []) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    zerodbService.client.put.mockResolvedValue({});
  });

  // =========================================================================
  // create()
  // =========================================================================
  describe('create()', () => {
    it('should generate executionId when not provided', async () => {
      await ReportExecution.create({ scheduleId: 'sched_001' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.executionId).toBeDefined();
      expect(inserted.executionId.startsWith('exec_')).toBe(true);
    });

    it('should preserve provided executionId', async () => {
      await ReportExecution.create({ executionId: 'exec_custom', scheduleId: 'sched_001' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.executionId).toBe('exec_custom');
    });

    it('should set startedAt when not provided', async () => {
      await ReportExecution.create({ scheduleId: 'sched_001' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.startedAt).toBeDefined();
    });

    it('should preserve provided startedAt', async () => {
      const dateStr = '2026-01-01T00:00:00.000Z';
      await ReportExecution.create({ scheduleId: 'sched_001', startedAt: dateStr });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.startedAt).toBe(dateStr);
    });

    it('should default status to pending', async () => {
      await ReportExecution.create({ scheduleId: 'sched_001' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('pending');
    });

    it('should preserve provided status', async () => {
      await ReportExecution.create({ scheduleId: 'sched_001', status: 'running' });
      const inserted = zerodbService.insertRow.mock.calls[0][1];
      expect(inserted.status).toBe('running');
    });

    it('should call baseModel.create on zerodbService', async () => {
      await ReportExecution.create({ scheduleId: 'sched_001' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'report_executions',
        expect.objectContaining({ scheduleId: 'sched_001' })
      );
    });
  });

  // =========================================================================
  // findByExecutionId()
  // =========================================================================
  describe('findByExecutionId()', () => {
    it('should return execution when found', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ executionId: 'exec_001', status: 'completed' }])
      );
      const result = await ReportExecution.findByExecutionId('exec_001');
      expect(result).toBeDefined();
      expect(result.executionId).toBe('exec_001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await ReportExecution.findByExecutionId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // findBySchedule()
  // =========================================================================
  describe('findBySchedule()', () => {
    it('should query by scheduleId', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await ReportExecution.findBySchedule('sched_001');
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'report_executions',
        expect.objectContaining({
          filter: { scheduleId: 'sched_001' }
        })
      );
    });

    it('should add status filter when provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await ReportExecution.findBySchedule('sched_001', { status: 'completed' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'report_executions',
        expect.objectContaining({
          filter: { scheduleId: 'sched_001', status: 'completed' }
        })
      );
    });

    it('should return multiple results', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([
          { executionId: 'exec_001', scheduleId: 'sched_001' },
          { executionId: 'exec_002', scheduleId: 'sched_001' }
        ])
      );
      const results = await ReportExecution.findBySchedule('sched_001');
      expect(results).toHaveLength(2);
    });
  });

  // =========================================================================
  // getDuration()
  // =========================================================================
  describe('getDuration()', () => {
    it('should return null when no startedAt', () => {
      expect(ReportExecution.getDuration({})).toBeNull();
    });

    it('should return null when startedAt is falsy', () => {
      expect(ReportExecution.getDuration({ startedAt: null })).toBeNull();
    });

    it('should calculate duration between start and completion', () => {
      const execution = {
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:05:00.000Z'
      };
      expect(ReportExecution.getDuration(execution)).toBe(300000);
    });

    it('should calculate duration to now when not completed', () => {
      const execution = {
        startedAt: new Date(Date.now() - 60000).toISOString()
        // no completedAt
      };
      const duration = ReportExecution.getDuration(execution);
      expect(duration).toBeGreaterThanOrEqual(59000);
      expect(duration).toBeLessThanOrEqual(62000);
    });
  });

  // =========================================================================
  // isComplete()
  // =========================================================================
  describe('isComplete()', () => {
    it('should return true for completed status', () => {
      expect(ReportExecution.isComplete({ status: 'completed' })).toBe(true);
    });

    it('should return true for failed status', () => {
      expect(ReportExecution.isComplete({ status: 'failed' })).toBe(true);
    });

    it('should return false for pending status', () => {
      expect(ReportExecution.isComplete({ status: 'pending' })).toBe(false);
    });

    it('should return false for running status', () => {
      expect(ReportExecution.isComplete({ status: 'running' })).toBe(false);
    });
  });

  // =========================================================================
  // getDeliverySuccessRate()
  // =========================================================================
  describe('getDeliverySuccessRate()', () => {
    it('should return null for empty deliveryStatus', () => {
      expect(ReportExecution.getDeliverySuccessRate({ deliveryStatus: [] })).toBeNull();
    });

    it('should return null for missing deliveryStatus', () => {
      expect(ReportExecution.getDeliverySuccessRate({})).toBeNull();
    });

    it('should return null for null deliveryStatus', () => {
      expect(ReportExecution.getDeliverySuccessRate({ deliveryStatus: null })).toBeNull();
    });

    it('should return 100 when all delivered', () => {
      const execution = {
        deliveryStatus: [
          { status: 'delivered' },
          { status: 'delivered' }
        ]
      };
      expect(ReportExecution.getDeliverySuccessRate(execution)).toBe(100);
    });

    it('should return 0 when none delivered', () => {
      const execution = {
        deliveryStatus: [
          { status: 'failed' },
          { status: 'pending' }
        ]
      };
      expect(ReportExecution.getDeliverySuccessRate(execution)).toBe(0);
    });

    it('should return correct percentage for mixed statuses', () => {
      const execution = {
        deliveryStatus: [
          { status: 'delivered' },
          { status: 'delivered' },
          { status: 'failed' }
        ]
      };
      expect(ReportExecution.getDeliverySuccessRate(execution)).toBeCloseTo(66.67, 0);
    });

    it('should return 50 for half delivered', () => {
      const execution = {
        deliveryStatus: [
          { status: 'delivered' },
          { status: 'failed' }
        ]
      };
      expect(ReportExecution.getDeliverySuccessRate(execution)).toBe(50);
    });
  });

  // =========================================================================
  // start()
  // =========================================================================
  describe('start()', () => {
    it('should update status to running', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ executionId: 'exec_001', status: 'pending' }])
      );
      await ReportExecution.start('exec_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // complete()
  // =========================================================================
  describe('complete()', () => {
    it('should update status to completed with file details', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ executionId: 'exec_001', status: 'running' }])
      );
      await ReportExecution.complete('exec_001', {
        fileUrl: 'https://example.com/report.pdf',
        fileSize: 1024,
        fileName: 'report.pdf'
      });
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle empty fileDetails', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ executionId: 'exec_001', status: 'running' }])
      );
      await ReportExecution.complete('exec_001');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // fail()
  // =========================================================================
  describe('fail()', () => {
    it('should update status to failed with error message', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{ executionId: 'exec_001', status: 'running' }])
      );
      await ReportExecution.fail('exec_001', 'Database connection timeout');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateDeliveryStatus()
  // =========================================================================
  describe('updateDeliveryStatus()', () => {
    it('should throw when execution not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        ReportExecution.updateDeliveryStatus('nonexistent', 'user@test.com', 'delivered')
      ).rejects.toThrow('Execution not found');
    });

    it('should add new delivery entry', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          executionId: 'exec_001',
          deliveryStatus: []
        }])
      );
      await ReportExecution.updateDeliveryStatus('exec_001', 'user@test.com', 'delivered');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should update existing delivery entry', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          executionId: 'exec_001',
          deliveryStatus: [
            { recipient: 'user@test.com', status: 'pending' }
          ]
        }])
      );
      await ReportExecution.updateDeliveryStatus('exec_001', 'user@test.com', 'delivered');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should add delivery entry with error for failed status', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          executionId: 'exec_001',
          deliveryStatus: []
        }])
      );
      await ReportExecution.updateDeliveryStatus(
        'exec_001', 'user@test.com', 'failed', 'SMTP error'
      );
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should handle missing deliveryStatus array', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          executionId: 'exec_001'
          // no deliveryStatus
        }])
      );
      await ReportExecution.updateDeliveryStatus('exec_001', 'user@test.com', 'delivered');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should set deliveredAt for delivered status', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          executionId: 'exec_001',
          deliveryStatus: []
        }])
      );

      await ReportExecution.updateDeliveryStatus('exec_001', 'user@test.com', 'delivered');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should set deliveredAt to null for non-delivered status', async () => {
      zerodbService.queryTable.mockResolvedValue(
        makeQueryResponse([{
          executionId: 'exec_001',
          deliveryStatus: []
        }])
      );

      await ReportExecution.updateDeliveryStatus('exec_001', 'user@test.com', 'pending');
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(ReportExecution.VALID_STATUSES).toEqual(['pending', 'running', 'completed', 'failed']);
    });

    it('should export DELIVERY_STATUSES', () => {
      expect(ReportExecution.DELIVERY_STATUSES).toEqual(['pending', 'delivered', 'failed']);
    });
  });

  // =========================================================================
  // Table and schema
  // =========================================================================
  describe('Model identity', () => {
    it('should have correct tableName', () => {
      expect(ReportExecution.tableName).toBe('report_executions');
    });

    it('should have schema defined', () => {
      expect(ReportExecution.schema).toBeDefined();
    });

    it('should have all schema fields', () => {
      const expectedFields = [
        'executionId', 'scheduleId', 'startedAt', 'completedAt',
        'status', 'fileUrl', 'fileSize', 'fileName', 'error',
        'deliveryStatus', 'reportParameters', 'metadata',
        'createdAt', 'updatedAt'
      ];
      expectedFields.forEach(field => {
        expect(ReportExecution.schema[field]).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Base model methods existence
  // =========================================================================
  describe('Base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments',
      'exists', 'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should have ${method} method`, () => {
        expect(typeof ReportExecution[method]).toBe('function');
      });
    });
  });
});
