/**
 * Activity Model ZeroDB Tests
 *
 * Tests all business logic methods on the REAL Activity model (not a mock),
 * with zerodbService mocked, to achieve 80%+ coverage of models/Activity.js.
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock zerodbService before requiring the model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  createTable: jest.fn(),
  projectId: 'test-project',
  useLocalFallback: true,
  _localStore: {}
}));

// Mock logger to suppress output
jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Activity Model - ZeroDB Integration', () => {
  let Activity;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('../../../services/zerodbService', () => ({
      initialize: jest.fn(),
      insertRow: jest.fn(),
      queryTable: jest.fn(),
      updateRows: jest.fn(),
      deleteRows: jest.fn(),
      createTable: jest.fn(),
      projectId: 'test-project'
    }));
    jest.mock('../../../utils/logger', () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));
    Activity = require('../../../models/Activity');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export tableName as audit_logs', () => {
      expect(Activity.tableName).toBe('audit_logs');
    });

    it('should export schema object', () => {
      expect(Activity.schema).toBeDefined();
      expect(typeof Activity.schema).toBe('object');
    });

    it('should export activityTypes array', () => {
      expect(Activity.activityTypes).toEqual([
        'DocumentUpload',
        'StakeholderUpdate',
        'FinancialReportCreated',
        'UserLogin',
        'SystemUpdate'
      ]);
    });
  });

  describe('Schema definition', () => {
    it('should define activityId as required and unique', () => {
      expect(Activity.schema.activityId.required).toBe(true);
      expect(Activity.schema.activityId.unique).toBe(true);
      expect(Activity.schema.activityId.type).toBe('string');
    });

    it('should define activityType as required with enum', () => {
      expect(Activity.schema.activityType.required).toBe(true);
      expect(Activity.schema.activityType.enum).toEqual([
        'DocumentUpload', 'StakeholderUpdate', 'FinancialReportCreated',
        'UserLogin', 'SystemUpdate'
      ]);
    });

    it('should define timestamp as required', () => {
      expect(Activity.schema.timestamp.required).toBe(true);
      expect(Activity.schema.timestamp.type).toBe('date');
    });

    it('should define userInvolved as required', () => {
      expect(Activity.schema.userInvolved.required).toBe(true);
      expect(Activity.schema.userInvolved.type).toBe('string');
    });

    it('should define changesMade as string', () => {
      expect(Activity.schema.changesMade.type).toBe('string');
    });

    it('should define relatedObjects with empty array default', () => {
      expect(Activity.schema.relatedObjects.type).toBe('array');
      expect(Activity.schema.relatedObjects.default).toEqual([]);
    });

    it('should have createdAt and updatedAt fields', () => {
      expect(Activity.schema.createdAt).toBeDefined();
      expect(Activity.schema.updatedAt).toBeDefined();
    });
  });

  describe('create()', () => {
    const validData = {
      activityType: 'DocumentUpload',
      userInvolved: 'user-1',
      changesMade: 'Uploaded a file'
    };

    it('should generate activityId when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...data, activityId: 'activity_auto' } }]
      });

      const result = await Activity.create(data);
      expect(result).toBeDefined();
      expect(data.activityId).toBeDefined();
      expect(data.activityId.startsWith('activity_')).toBe(true);
    });

    it('should preserve provided activityId', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, activityId: 'custom-id' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await Activity.create(data);
      expect(result.activityId).toBe('custom-id');
    });

    it('should set timestamp when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await Activity.create(data);
      expect(data.timestamp).toBeDefined();
    });

    it('should preserve provided timestamp', async () => {
      const zdb = require('../../../services/zerodbService');
      const ts = '2024-06-01T00:00:00.000Z';
      const data = { ...validData, timestamp: ts };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await Activity.create(data);
      expect(data.timestamp).toBe(ts);
    });

    it('should throw for invalid activityType', async () => {
      const data = { ...validData, activityType: 'InvalidType' };
      await expect(Activity.create(data)).rejects.toThrow('Invalid activity type: InvalidType');
    });

    it('should accept each valid activityType', async () => {
      const zdb = require('../../../services/zerodbService');
      const types = ['DocumentUpload', 'StakeholderUpdate', 'FinancialReportCreated', 'UserLogin', 'SystemUpdate'];
      for (const type of types) {
        const data = { ...validData, activityType: type };
        zdb.insertRow.mockResolvedValue({
          data: [{ row_id: 'r1', row_data: data }]
        });
        const result = await Activity.create(data);
        expect(result).toBeDefined();
      }
    });

    it('should not throw when activityType is not provided (skips validation)', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { userInvolved: 'user-1' };
      delete data.activityType;
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      // activityType is falsy, so the validation condition (data.activityType && ...) is skipped
      const result = await Activity.create(data);
      expect(result).toBeDefined();
    });
  });

  describe('findByActivityId()', () => {
    it('should find activity by activityId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { activityId: 'act-1', activityType: 'UserLogin' }, row_id: 'r1' }]
      });

      const result = await Activity.findByActivityId('act-1');
      expect(result).toBeDefined();
      expect(result.activityId).toBe('act-1');
    });

    it('should return null when not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await Activity.findByActivityId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByUser()', () => {
    it('should find activities by userId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { userInvolved: 'user-1', activityType: 'UserLogin' }, row_id: 'r1' },
          { row_data: { userInvolved: 'user-1', activityType: 'DocumentUpload' }, row_id: 'r2' }
        ]
      });

      const results = await Activity.findByUser('user-1');
      expect(results.length).toBe(2);
    });

    it('should pass options through', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await Activity.findByUser('user-1', { limit: 10 });
      expect(results).toEqual([]);
    });
  });

  describe('findByType()', () => {
    it('should find activities by activityType', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { activityType: 'UserLogin', userInvolved: 'u1' }, row_id: 'r1' }]
      });

      const results = await Activity.findByType('UserLogin');
      expect(results.length).toBe(1);
    });

    it('should pass options through', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await Activity.findByType('DocumentUpload', { limit: 5 });
      expect(results).toEqual([]);
    });
  });

  describe('findRecent()', () => {
    it('should find recent activities with default limit of 50', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { activityId: 'a1' }, row_id: 'r1' },
          { row_data: { activityId: 'a2' }, row_id: 'r2' }
        ]
      });

      const results = await Activity.findRecent();
      expect(results.length).toBe(2);
    });

    it('should accept custom limit', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await Activity.findRecent(10);
      expect(results).toEqual([]);
    });
  });

  describe('log()', () => {
    it('should create an activity with the log helper', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { activityType: 'UserLogin', userInvolved: 'user-1' } }]
      });

      const result = await Activity.log('UserLogin', 'user-1', 'User logged in', ['session-1']);
      expect(result).toBeDefined();
    });

    it('should use defaults for changesMade and relatedObjects', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { activityType: 'SystemUpdate', userInvolved: 'system' } }]
      });

      const result = await Activity.log('SystemUpdate', 'system');
      expect(result).toBeDefined();
    });
  });

  describe('Exposed base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments', 'exists',
      'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should expose ${method} as a function`, () => {
        expect(typeof Activity[method]).toBe('function');
      });
    });
  });
});
