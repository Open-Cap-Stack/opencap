/**
 * ScheduledTrigger Model Unit Tests
 * Issue #88: Build Automated Triggered Messages
 *
 * Tests the actual model file for creation, validation, scheduling,
 * status transitions, and trigger lifecycle management.
 */

// Mock the ZeroDB base model before importing the model
jest.mock('../../../models/base/ZeroDBModel', () => {
  let mockData = [];

  const mockBaseModel = {
    create: jest.fn(async (data) => {
      const doc = { _id: `id_${Date.now()}_${Math.random()}`, ...data };
      mockData.push(doc);
      return doc;
    }),
    find: jest.fn(async (query = {}) => {
      return mockData.filter(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }),
    findOne: jest.fn(async (query = {}) => {
      return mockData.find(doc => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      }) || null;
    }),
    findById: jest.fn(async (id) => {
      return mockData.find(doc => doc._id === id) || null;
    }),
    updateOne: jest.fn(async (query, update) => {
      const doc = mockData.find(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (doc) {
        if (update.$set) {
          Object.assign(doc, update.$set);
        } else {
          Object.assign(doc, update);
        }
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }),
    findOneAndUpdate: jest.fn(async () => null),
    findByIdAndUpdate: jest.fn(async () => null),
    updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
    deleteOne: jest.fn(async (query) => {
      const index = mockData.findIndex(d => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });
      if (index >= 0) {
        mockData.splice(index, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }),
    deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
    findOneAndDelete: jest.fn(async () => null),
    findByIdAndDelete: jest.fn(async () => null),
    countDocuments: jest.fn(async () => mockData.length),
    exists: jest.fn(async () => mockData.length > 0),
    distinct: jest.fn(async () => []),
    aggregate: jest.fn(async () => []),
    tableName: 'scheduled_triggers'
  };

  return {
    createModel: jest.fn(() => mockBaseModel),
    __mockData: mockData,
    __resetMockData: () => { mockData.length = 0; },
    __getMockBaseModel: () => mockBaseModel
  };
});

const ScheduledTrigger = require('../../../models/ScheduledTrigger');
const zeroDBModelMock = require('../../../models/base/ZeroDBModel');

describe('ScheduledTrigger Model', () => {
  beforeEach(() => {
    zeroDBModelMock.__resetMockData();
    jest.clearAllMocks();
  });

  const validData = {
    triggerId: 'trigger_001',
    triggerType: 'scheduled',
    scheduledAt: '2026-06-01T12:00:00Z',
    payload: { message: 'Hello', template: 'welcome' },
    recipientIds: ['user_1', 'user_2'],
    companyId: 'company_123'
  };

  describe('Constants', () => {
    it('should export trigger types', () => {
      expect(ScheduledTrigger.TRIGGER_TYPES).toEqual(
        ['scheduled', 'delayed', 'recurring']
      );
    });

    it('should export valid statuses', () => {
      expect(ScheduledTrigger.VALID_STATUSES).toEqual(
        ['pending', 'processing', 'completed', 'failed', 'cancelled']
      );
    });
  });

  describe('Schema', () => {
    it('should have a schema definition', () => {
      expect(ScheduledTrigger.schema).toBeDefined();
      expect(ScheduledTrigger.schema.scheduleId).toBeDefined();
      expect(ScheduledTrigger.schema.triggerId).toBeDefined();
      expect(ScheduledTrigger.schema.triggerType).toBeDefined();
      expect(ScheduledTrigger.schema.scheduledAt).toBeDefined();
    });

    it('should define the table name as scheduled_triggers', () => {
      expect(ScheduledTrigger.tableName).toBe('scheduled_triggers');
    });
  });

  describe('create()', () => {
    it('should create a trigger with valid data', async () => {
      const result = await ScheduledTrigger.create({ ...validData });
      expect(result).toBeDefined();
      expect(result.triggerId).toBe('trigger_001');
      expect(result.triggerType).toBe('scheduled');
      expect(result.companyId).toBe('company_123');
    });

    it('should auto-generate scheduleId if not provided', async () => {
      const result = await ScheduledTrigger.create({ ...validData });
      expect(result.scheduleId).toBeDefined();
      expect(result.scheduleId).toMatch(/^sched_/);
    });

    it('should use provided scheduleId if given', async () => {
      const result = await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_custom_123'
      });
      expect(result.scheduleId).toBe('sched_custom_123');
    });

    it('should default status to pending', async () => {
      const result = await ScheduledTrigger.create({ ...validData });
      expect(result.status).toBe('pending');
    });

    it('should throw error for invalid trigger type', async () => {
      await expect(
        ScheduledTrigger.create({ ...validData, triggerType: 'invalid_type' })
      ).rejects.toThrow('triggerType must be one of');
    });

    it('should accept all valid trigger types', async () => {
      for (const type of ScheduledTrigger.TRIGGER_TYPES) {
        zeroDBModelMock.__resetMockData();
        const result = await ScheduledTrigger.create({
          ...validData,
          triggerType: type
        });
        expect(result.triggerType).toBe(type);
      }
    });
  });

  describe('findByScheduleId()', () => {
    it('should find a trigger by scheduleId', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_find_me'
      });
      const found = await ScheduledTrigger.findByScheduleId('sched_find_me');
      expect(found).toBeDefined();
      expect(found.scheduleId).toBe('sched_find_me');
    });

    it('should return null for non-existent scheduleId', async () => {
      const found = await ScheduledTrigger.findByScheduleId('sched_nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findDue()', () => {
    it('should find triggers that are due', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduledAt: '2020-01-01T00:00:00Z'
      });
      await ScheduledTrigger.create({
        ...validData,
        scheduledAt: '2020-06-01T00:00:00Z'
      });

      const due = await ScheduledTrigger.findDue(new Date('2026-01-01'));
      expect(due).toHaveLength(2);
    });

    it('should not include future triggers', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduledAt: '2099-01-01T00:00:00Z'
      });

      const due = await ScheduledTrigger.findDue(new Date('2026-01-01'));
      expect(due).toHaveLength(0);
    });

    it('should sort by scheduledAt ascending', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_later',
        scheduledAt: '2020-12-01T00:00:00Z'
      });
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_earlier',
        scheduledAt: '2020-01-01T00:00:00Z'
      });

      const due = await ScheduledTrigger.findDue(new Date('2026-01-01'));
      expect(due[0].scheduleId).toBe('sched_earlier');
      expect(due[1].scheduleId).toBe('sched_later');
    });

    it('should respect the limit parameter', async () => {
      await ScheduledTrigger.create({ ...validData, scheduledAt: '2020-01-01T00:00:00Z' });
      await ScheduledTrigger.create({ ...validData, scheduledAt: '2020-02-01T00:00:00Z' });
      await ScheduledTrigger.create({ ...validData, scheduledAt: '2020-03-01T00:00:00Z' });

      const due = await ScheduledTrigger.findDue(new Date('2026-01-01'), 2);
      expect(due).toHaveLength(2);
    });

    it('should default asOf to now', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduledAt: '2020-01-01T00:00:00Z'
      });

      const due = await ScheduledTrigger.findDue();
      expect(due).toHaveLength(1);
    });
  });

  describe('findByTriggerId()', () => {
    it('should find triggers by triggerId', async () => {
      await ScheduledTrigger.create({ ...validData, triggerId: 'trig_A' });
      await ScheduledTrigger.create({ ...validData, triggerId: 'trig_A' });
      await ScheduledTrigger.create({ ...validData, triggerId: 'trig_B' });

      const results = await ScheduledTrigger.findByTriggerId('trig_A');
      expect(results).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      await ScheduledTrigger.create({ ...validData, triggerId: 'trig_C' });
      const results = await ScheduledTrigger.findByTriggerId('trig_C', { status: 'pending' });
      expect(results).toHaveLength(1);
    });
  });

  describe('findByCompany()', () => {
    it('should find triggers by companyId', async () => {
      await ScheduledTrigger.create({ ...validData, companyId: 'comp_X' });
      await ScheduledTrigger.create({ ...validData, companyId: 'comp_X' });

      const results = await ScheduledTrigger.findByCompany('comp_X');
      expect(results).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      await ScheduledTrigger.create({ ...validData, companyId: 'comp_Y' });
      const results = await ScheduledTrigger.findByCompany('comp_Y', { status: 'completed' });
      expect(results).toHaveLength(0);
    });
  });

  describe('markProcessing()', () => {
    it('should mark a pending trigger as processing', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_proc_test',
        status: 'pending'
      });

      const result = await ScheduledTrigger.markProcessing('sched_proc_test');
      expect(result).toBeDefined();

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalledWith(
        { scheduleId: 'sched_proc_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'processing'
          })
        })
      );
    });

    it('should return null for non-existent trigger', async () => {
      const result = await ScheduledTrigger.markProcessing('sched_nonexistent');
      expect(result).toBeNull();
    });

    it('should return null if trigger is not pending', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_not_pending',
        status: 'completed'
      });

      const result = await ScheduledTrigger.markProcessing('sched_not_pending');
      expect(result).toBeNull();
    });
  });

  describe('markCompleted()', () => {
    it('should mark a trigger as completed', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_complete_test'
      });

      await ScheduledTrigger.markCompleted('sched_complete_test', 'hist_001');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalledWith(
        { scheduleId: 'sched_complete_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            historyId: 'hist_001'
          })
        })
      );
    });

    it('should handle null historyId', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_complete_no_hist'
      });

      await ScheduledTrigger.markCompleted('sched_complete_no_hist');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      expect(updateCall[1].$set.historyId).toBeNull();
    });
  });

  describe('markFailed()', () => {
    it('should increment attempts and keep pending if under maxAttempts', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_fail_retry',
        attempts: 0,
        maxAttempts: 3
      });

      await ScheduledTrigger.markFailed('sched_fail_retry', 'Connection timeout');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      expect(updateCall[1].$set.attempts).toBe(1);
      expect(updateCall[1].$set.status).toBe('pending');
      expect(updateCall[1].$set.lastError).toBe('Connection timeout');
    });

    it('should set status to failed when attempts reach maxAttempts', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_fail_final',
        attempts: 2,
        maxAttempts: 3
      });

      await ScheduledTrigger.markFailed('sched_fail_final', 'Final failure');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      expect(updateCall[1].$set.attempts).toBe(3);
      expect(updateCall[1].$set.status).toBe('failed');
    });

    it('should throw error for non-existent trigger', async () => {
      await expect(
        ScheduledTrigger.markFailed('sched_nonexistent', 'Error')
      ).rejects.toThrow('Scheduled trigger not found');
    });

    it('should handle undefined attempts as 0', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_fail_undef',
        maxAttempts: 3
      });

      await ScheduledTrigger.markFailed('sched_fail_undef', 'First error');

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      const updateCall = baseModel.updateOne.mock.calls[0];
      expect(updateCall[1].$set.attempts).toBe(1);
    });
  });

  describe('cancel()', () => {
    it('should cancel a pending trigger', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_cancel_test',
        status: 'pending'
      });

      const result = await ScheduledTrigger.cancel('sched_cancel_test');
      expect(result).toBeDefined();

      const baseModel = zeroDBModelMock.__getMockBaseModel();
      expect(baseModel.updateOne).toHaveBeenCalledWith(
        { scheduleId: 'sched_cancel_test' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'cancelled'
          })
        })
      );
    });

    it('should return null for non-existent trigger', async () => {
      const result = await ScheduledTrigger.cancel('sched_nonexistent');
      expect(result).toBeNull();
    });

    it('should return null if trigger is not pending', async () => {
      await ScheduledTrigger.create({
        ...validData,
        scheduleId: 'sched_cancel_completed',
        status: 'completed'
      });

      const result = await ScheduledTrigger.cancel('sched_cancel_completed');
      expect(result).toBeNull();
    });
  });

  describe('Exposed base model methods', () => {
    it('should expose find method', () => {
      expect(typeof ScheduledTrigger.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof ScheduledTrigger.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof ScheduledTrigger.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof ScheduledTrigger.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof ScheduledTrigger.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof ScheduledTrigger.countDocuments).toBe('function');
    });
  });
});
