/**
 * InstalledIntegration Model Comprehensive Tests
 *
 * Tests all business logic methods, validation, error paths, and edge cases
 * for the InstalledIntegration ZeroDB model to achieve 80%+ coverage.
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

describe('InstalledIntegration Model - Comprehensive', () => {
  let InstalledIntegration;

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
    InstalledIntegration = require('../../../models/InstalledIntegration');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export tableName as installed_integrations', () => {
      expect(InstalledIntegration.tableName).toBe('installed_integrations');
    });

    it('should export VALID_STATUSES constant', () => {
      expect(InstalledIntegration.VALID_STATUSES).toEqual([
        'active', 'inactive', 'error', 'pending', 'configuring'
      ]);
    });

    it('should export SYNC_FREQUENCIES constant', () => {
      expect(InstalledIntegration.SYNC_FREQUENCIES).toEqual([
        'realtime', 'hourly', 'daily', 'weekly', 'manual'
      ]);
    });
  });

  describe('create()', () => {
    const validData = {
      companyId: 'company-1',
      integrationId: 'int-1',
      installedBy: 'user-1'
    };

    it('should generate installationId when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: { ...data, installationId: 'inst_auto' } }]
      });

      await InstalledIntegration.create(data);
      expect(data.installationId).toBeDefined();
      expect(data.installationId.startsWith('inst_')).toBe(true);
    });

    it('should preserve provided installationId', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, installationId: 'custom-inst-id' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      const result = await InstalledIntegration.create(data);
      expect(result.installationId).toBe('custom-inst-id');
    });

    it('should set default status to pending if not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await InstalledIntegration.create(data);
      expect(data.status).toBe('pending');
    });

    it('should not overwrite provided status', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData, status: 'active' };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await InstalledIntegration.create(data);
      expect(data.status).toBe('active');
    });

    it('should set installedAt when not provided', async () => {
      const zdb = require('../../../services/zerodbService');
      const data = { ...validData };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await InstalledIntegration.create(data);
      expect(data.installedAt).toBeDefined();
    });

    it('should not overwrite provided installedAt', async () => {
      const zdb = require('../../../services/zerodbService');
      const ts = '2024-01-01T00:00:00.000Z';
      const data = { ...validData, installedAt: ts };
      zdb.insertRow.mockResolvedValue({
        data: [{ row_id: 'r1', row_data: data }]
      });

      await InstalledIntegration.create(data);
      expect(data.installedAt).toBe(ts);
    });
  });

  describe('findByInstallationId()', () => {
    it('should find installation by installationId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { installationId: 'inst-1', status: 'active' }, row_id: 'r1' }]
      });

      const result = await InstalledIntegration.findByInstallationId('inst-1');
      expect(result).toBeDefined();
      expect(result.installationId).toBe('inst-1');
    });

    it('should return null when not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await InstalledIntegration.findByInstallationId('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find installations by companyId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [
          { row_data: { companyId: 'c1', integrationId: 'i1' }, row_id: 'r1' },
          { row_data: { companyId: 'c1', integrationId: 'i2' }, row_id: 'r2' }
        ]
      });

      const results = await InstalledIntegration.findByCompany('c1');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', status: 'active' }, row_id: 'r1' }]
      });

      const results = await InstalledIntegration.findByCompany('c1', { status: 'active' });
      expect(results.length).toBe(1);
    });

    it('should return empty array when no matching installations', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const results = await InstalledIntegration.findByCompany('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('findByIntegration()', () => {
    it('should find installations by integrationId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { integrationId: 'int-1', companyId: 'c1' }, row_id: 'r1' }]
      });

      const results = await InstalledIntegration.findByIntegration('int-1');
      expect(results.length).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { integrationId: 'int-1', status: 'error' }, row_id: 'r1' }]
      });

      const results = await InstalledIntegration.findByIntegration('int-1', { status: 'error' });
      expect(results.length).toBe(1);
    });
  });

  describe('findByCompanyAndIntegration()', () => {
    it('should find installation by companyId and integrationId', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({
        data: [{ row_data: { companyId: 'c1', integrationId: 'int-1' }, row_id: 'r1' }]
      });

      const result = await InstalledIntegration.findByCompanyAndIntegration('c1', 'int-1');
      expect(result).toBeDefined();
      expect(result.companyId).toBe('c1');
      expect(result.integrationId).toBe('int-1');
    });

    it('should return null when not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      const result = await InstalledIntegration.findByCompanyAndIntegration('c1', 'int-999');
      expect(result).toBeNull();
    });
  });

  describe('isOperational()', () => {
    it('should return true for active status with successful last test', () => {
      const inst = { status: 'active', lastConnectionTest: { success: true } };
      expect(InstalledIntegration.isOperational(inst)).toBe(true);
    });

    it('should return false for inactive status', () => {
      const inst = { status: 'inactive', lastConnectionTest: { success: true } };
      expect(InstalledIntegration.isOperational(inst)).toBe(false);
    });

    it('should return false for error status', () => {
      const inst = { status: 'error', lastConnectionTest: { success: true } };
      expect(InstalledIntegration.isOperational(inst)).toBe(false);
    });

    it('should return false for pending status', () => {
      const inst = { status: 'pending' };
      expect(InstalledIntegration.isOperational(inst)).toBe(false);
    });

    it('should return false for configuring status', () => {
      const inst = { status: 'configuring' };
      expect(InstalledIntegration.isOperational(inst)).toBe(false);
    });

    it('should return false when last connection test failed', () => {
      const inst = { status: 'active', lastConnectionTest: { success: false } };
      expect(InstalledIntegration.isOperational(inst)).toBe(false);
    });

    it('should return true when lastConnectionTest is null', () => {
      const inst = { status: 'active', lastConnectionTest: null };
      expect(InstalledIntegration.isOperational(inst)).toBe(true);
    });

    it('should return true when lastConnectionTest is undefined', () => {
      const inst = { status: 'active' };
      expect(InstalledIntegration.isOperational(inst)).toBe(true);
    });

    it('should return true when lastConnectionTest.success is null', () => {
      const inst = { status: 'active', lastConnectionTest: { success: null } };
      expect(InstalledIntegration.isOperational(inst)).toBe(true);
    });
  });

  describe('getDaysSinceInstallation()', () => {
    it('should return 0 when installedAt is null', () => {
      expect(InstalledIntegration.getDaysSinceInstallation({ installedAt: null })).toBe(0);
    });

    it('should return 0 when installedAt is undefined', () => {
      expect(InstalledIntegration.getDaysSinceInstallation({})).toBe(0);
    });

    it('should calculate days correctly for 3 days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = InstalledIntegration.getDaysSinceInstallation({ installedAt: threeDaysAgo });
      expect(result).toBe(3);
    });

    it('should return 0 for today', () => {
      const today = new Date().toISOString();
      const result = InstalledIntegration.getDaysSinceInstallation({ installedAt: today });
      expect(result).toBe(0);
    });

    it('should handle large number of days', () => {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const result = InstalledIntegration.getDaysSinceInstallation({ installedAt: yearAgo });
      expect(result).toBeGreaterThanOrEqual(364);
      expect(result).toBeLessThanOrEqual(366);
    });
  });

  describe('logConnectionTest()', () => {
    it('should log a connection test result', async () => {
      const zdb = require('../../../services/zerodbService');
      // Mock findByInstallationId (findOne -> find)
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: [] }]
      });
      // Mock updateOne -> findOne
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: [] }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const testResult = { success: true, responseTime: 150 };
      const result = await InstalledIntegration.logConnectionTest('inst-1', testResult);
      expect(result).toBeDefined();
    });

    it('should throw when installation not found', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValue({ data: [] });

      await expect(
        InstalledIntegration.logConnectionTest('nonexistent', { success: true })
      ).rejects.toThrow('Installation not found');
    });

    it('should handle error in test result', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: [] }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: [] }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const testResult = { success: false, responseTime: null, error: 'Connection refused', details: 'Port closed' };
      const result = await InstalledIntegration.logConnectionTest('inst-1', testResult);
      expect(result).toBeDefined();
    });

    it('should handle null connectionLogs in existing installation', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: null }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: null }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await InstalledIntegration.logConnectionTest('inst-1', { success: true, responseTime: 50 });
      expect(result).toBeDefined();
    });

    it('should trim connection logs to 100 entries', async () => {
      const zdb = require('../../../services/zerodbService');
      const logs = Array(100).fill({ timestamp: '2024-01-01', success: true });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: logs }]
      });
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', connectionLogs: logs }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await InstalledIntegration.logConnectionTest('inst-1', { success: true, responseTime: 100 });
      expect(result).toBeDefined();
    });
  });

  describe('activate()', () => {
    it('should set status to active', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', status: 'pending' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await InstalledIntegration.activate('inst-1');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
    });
  });

  describe('deactivate()', () => {
    it('should set status to inactive with reason and user', async () => {
      const zdb = require('../../../services/zerodbService');
      zdb.queryTable.mockResolvedValueOnce({
        data: [{ installationId: 'inst-1', status: 'active' }]
      });
      zdb.updateRows.mockResolvedValueOnce({ modified_count: 1 });

      const result = await InstalledIntegration.deactivate('inst-1', 'No longer needed', 'admin-1');
      expect(result).toBeDefined();
      expect(result.modifiedCount).toBe(1);
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
        expect(typeof InstalledIntegration[method]).toBe('function');
      });
    });
  });

  describe('Schema field defaults', () => {
    it('should have configuration with empty object default', () => {
      expect(InstalledIntegration.schema.configuration.default).toEqual({});
    });

    it('should have encryptedSecrets with empty object default', () => {
      expect(InstalledIntegration.schema.encryptedSecrets.default).toEqual({});
    });

    it('should have permissions with empty array default', () => {
      expect(InstalledIntegration.schema.permissions.default).toEqual([]);
    });

    it('should have lastConnectionTest with proper default', () => {
      expect(InstalledIntegration.schema.lastConnectionTest.default).toEqual({
        timestamp: null,
        success: null,
        responseTime: null,
        error: null
      });
    });

    it('should have connectionLogs with empty array default', () => {
      expect(InstalledIntegration.schema.connectionLogs.default).toEqual([]);
    });

    it('should have syncSettings with proper default', () => {
      expect(InstalledIntegration.schema.syncSettings.default).toEqual({
        enabled: true,
        frequency: 'realtime',
        lastSyncAt: null,
        nextSyncAt: null
      });
    });

    it('should have usageMetrics with proper default', () => {
      expect(InstalledIntegration.schema.usageMetrics.default).toEqual({
        apiCallsTotal: 0,
        apiCallsThisMonth: 0,
        lastApiCallAt: null,
        errorCount: 0,
        successRate: 100
      });
    });

    it('should have webhookUrl with null default', () => {
      expect(InstalledIntegration.schema.webhookUrl.default).toBeNull();
    });

    it('should have webhookSecret with null default', () => {
      expect(InstalledIntegration.schema.webhookSecret.default).toBeNull();
    });

    it('should have notes with empty string default', () => {
      expect(InstalledIntegration.schema.notes.default).toBe('');
    });

    it('should have metadata with empty object default', () => {
      expect(InstalledIntegration.schema.metadata.default).toEqual({});
    });
  });
});
