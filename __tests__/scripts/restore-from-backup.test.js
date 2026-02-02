/**
 * @jest-environment node
 */

const RestoreService = require('../../scripts/restore-from-backup');
const zerodbService = require('../../services/zerodbService');
const fs = require('fs').promises;

jest.mock('../../services/zerodbService');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('ZeroDB Restore Service', () => {
  let restoreService;
  const mockToken = 'mock-jwt-token';
  const mockBackupDir = '/tmp/zerodb-backups';

  beforeEach(() => {
    jest.clearAllMocks();
    restoreService = new RestoreService({
      backupDir: mockBackupDir,
      verifyBeforeRestore: true,
      createTablesIfMissing: true
    });
  });

  describe('Full Restore', () => {
    it('should restore all tables from backup', async () => {
      // GIVEN: Valid backup with data
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        timestamp: new Date().toISOString(),
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 2,
            fileName: 'financial_reports.json',
            checksum: 'abc123'
          }
        ]
      };

      const mockTableData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Quarterly' }
      ];

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify(mockTableData));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([]);
      zerodbService.createTable.mockResolvedValue({ success: true });
      zerodbService.insertRows.mockResolvedValue({ inserted: 2 });

      // WHEN: Restoring from backup
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: All data should be restored
      expect(result.success).toBe(true);
      expect(result.tablesRestored).toEqual(['financial_reports']);
      expect(result.totalRecordsRestored).toBe(2);
      expect(zerodbService.insertRows).toHaveBeenCalledWith('financial_reports', mockTableData);
    });

    it('should create missing tables before restore', async () => {
      // GIVEN: Backup with table that doesn't exist
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'new_table',
            recordCount: 1,
            fileName: 'new_table.json',
            schema: { type: 'object', properties: { id: { type: 'string' } } }
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify([{ id: '1' }]));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([]);
      zerodbService.createTable.mockResolvedValue({ success: true });
      zerodbService.insertRows.mockResolvedValue({ inserted: 1 });

      // WHEN: Restoring from backup
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: Table should be created
      expect(result.success).toBe(true);
      expect(result.tablesCreated).toContain('new_table');
      expect(zerodbService.createTable).toHaveBeenCalledWith('new_table', expect.any(Object));
    });

    it('should verify backup integrity before restore', async () => {
      // GIVEN: Backup with integrity check enabled
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json',
            checksum: 'abc123'
          }
        ],
        checksum: 'manifest-checksum'
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify([{ _id: '1' }]));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 1 });

      // WHEN: Restoring from backup
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: Should verify before restore
      expect(result.verified).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should decrypt encrypted backups during restore', async () => {
      // GIVEN: Encrypted backup
      const backupId = 'backup-encrypted-20260202';
      const mockManifest = {
        backupId,
        encrypted: true,
        encryptionAlgorithm: 'aes-256-gcm',
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json.enc',
            encrypted: true
          }
        ]
      };

      const encryptedData = Buffer.from('encrypted-data').toString('base64');

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(encryptedData);
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 1 });

      restoreService.config.encryptionKey = 'test-encryption-key-32-characters';

      // WHEN: Restoring from backup
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: Should decrypt and restore
      expect(result.success).toBe(true);
      expect(result.decrypted).toBe(true);
    });

    it('should handle restore failures gracefully', async () => {
      // GIVEN: Invalid backup ID
      const backupId = 'non-existent-backup';

      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // WHEN: Attempting to restore
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: Should return failure result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('no such file');
    });
  });

  describe('Selective Restore', () => {
    it('should restore only specified tables', async () => {
      // GIVEN: Backup with multiple tables
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json'
          },
          {
            tableName: 'documents',
            recordCount: 1,
            fileName: 'documents.json'
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify([{ _id: '1' }]));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' },
        { table_name: 'documents' }
      ]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 1 });

      // WHEN: Restoring only financial_reports
      const result = await restoreService.restoreFromBackup(backupId, mockToken, {
        tables: ['financial_reports']
      });

      // THEN: Only specified table should be restored
      expect(result.success).toBe(true);
      expect(result.tablesRestored).toEqual(['financial_reports']);
      expect(result.tablesSkipped).toContain('documents');
      expect(zerodbService.insertRows).toHaveBeenCalledTimes(1);
    });

    it('should restore to specific point in time', async () => {
      // GIVEN: Multiple backups at different times
      const targetDate = new Date('2026-02-01T10:00:00Z');
      const backups = [
        'backup-20260131-120000', // Before target
        'backup-20260201-080000', // Before target, closest
        'backup-20260201-140000' // After target
      ];

      fs.readdir.mockResolvedValue(backups);
      fs.stat.mockImplementation((filepath) => {
        if (filepath.includes('20260131')) {
          return Promise.resolve({ mtime: new Date('2026-01-31T12:00:00Z') });
        }
        if (filepath.includes('080000')) {
          return Promise.resolve({ mtime: new Date('2026-02-01T08:00:00Z') });
        }
        return Promise.resolve({ mtime: new Date('2026-02-01T14:00:00Z') });
      });

      const mockManifest = {
        backupId: 'backup-20260201-080000',
        timestamp: '2026-02-01T08:00:00Z',
        tables: []
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });

      // WHEN: Restoring to point in time
      const result = await restoreService.restoreToPointInTime(targetDate, mockToken);

      // THEN: Should restore closest backup before target
      expect(result.success).toBe(true);
      expect(result.backupId).toBe('backup-20260201-080000');
      expect(new Date(result.backupTimestamp)).toBeLessThan(targetDate);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate restored data matches backup', async () => {
      // GIVEN: Successful restore
      const backupId = 'backup-20260202-120000';
      const mockData = [
        { _id: '1', ReportID: 'R001' },
        { _id: '2', ReportID: 'R002' }
      ];

      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 2,
            fileName: 'financial_reports.json',
            checksum: 'abc123'
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify(mockData));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 2 });
      zerodbService.queryTable.mockResolvedValue(mockData);

      // WHEN: Restoring and validating
      const result = await restoreService.restoreFromBackup(backupId, mockToken, {
        validateAfterRestore: true
      });

      // THEN: Validation should pass
      expect(result.success).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.validationResults.financial_reports.recordCountMatch).toBe(true);
      expect(result.validationResults.financial_reports.checksumMatch).toBe(true);
    });

    it('should detect data corruption during restore', async () => {
      // GIVEN: Corrupted backup data
      const backupId = 'backup-corrupted-20260202';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 2,
            fileName: 'financial_reports.json',
            checksum: 'expected-checksum'
          }
        ]
      };

      const corruptedData = [{ _id: '1' }]; // Missing one record

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify(corruptedData));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);

      // WHEN: Restoring with validation
      const result = await restoreService.restoreFromBackup(backupId, mockToken, {
        validateBeforeRestore: true
      });

      // THEN: Should detect corruption and fail
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
      expect(result.corruptionDetected).toBe(true);
    });

    it('should perform checksum validation on each table', async () => {
      // GIVEN: Backup with checksums
      const backupId = 'backup-20260202-120000';
      const mockData = [{ _id: '1' }];
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json',
            checksum: 'table-checksum'
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify(mockData));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 1 });

      // WHEN: Restoring
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: Should validate checksums
      expect(result.checksumValidation).toBeDefined();
      expect(result.checksumValidation.financial_reports).toBeDefined();
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should rollback partial restore on failure', async () => {
      // GIVEN: Restore that fails midway
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json'
          },
          {
            tableName: 'documents',
            recordCount: 1,
            fileName: 'documents.json'
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify([{ _id: '1' }]))
        .mockRejectedValueOnce(new Error('Read error')); // Second table fails
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' },
        { table_name: 'documents' }
      ]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 1 });
      zerodbService.deleteRows.mockResolvedValue({ deleted: 1 });

      // WHEN: Restoring with rollback enabled
      const result = await restoreService.restoreFromBackup(backupId, mockToken, {
        rollbackOnFailure: true
      });

      // THEN: Should rollback successful operations
      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(zerodbService.deleteRows).toHaveBeenCalled();
    });

    it('should handle ZeroDB API failures during restore', async () => {
      // GIVEN: ZeroDB insert fails
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json'
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify([{ _id: '1' }]));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows.mockRejectedValue(new Error('API rate limit exceeded'));

      // WHEN: Restoring
      const result = await restoreService.restoreFromBackup(backupId, mockToken);

      // THEN: Should handle API error
      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit');
    });

    it('should retry failed operations with exponential backoff', async () => {
      // GIVEN: Transient failure that succeeds on retry
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 1,
            fileName: 'financial_reports.json'
          }
        ]
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify([{ _id: '1' }]));
      fs.stat.mockResolvedValue({ size: 1024 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ inserted: 1 });

      // WHEN: Restoring with retry enabled
      const result = await restoreService.restoreFromBackup(backupId, mockToken, {
        retryOnFailure: true,
        maxRetries: 3
      });

      // THEN: Should succeed after retry
      expect(result.success).toBe(true);
      expect(result.retriedOperations).toBeGreaterThan(0);
      expect(zerodbService.insertRows).toHaveBeenCalledTimes(2);
    });
  });

  describe('Progress Tracking', () => {
    it('should report progress during restore', async () => {
      // GIVEN: Large backup with progress tracking
      const backupId = 'backup-20260202-120000';
      const mockManifest = {
        backupId,
        tables: [
          {
            tableName: 'financial_reports',
            recordCount: 100,
            fileName: 'financial_reports.json'
          }
        ]
      };

      const mockData = Array.from({ length: 100 }, (_, i) => ({ _id: `${i}` }));

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockManifest))
        .mockResolvedValueOnce(JSON.stringify(mockData));
      fs.stat.mockResolvedValue({ size: 10240 });

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.insertRows.mockResolvedValue({ inserted: 100 });

      const progressCallback = jest.fn();

      // WHEN: Restoring with progress tracking
      const result = await restoreService.restoreFromBackup(backupId, mockToken, {
        onProgress: progressCallback
      });

      // THEN: Progress should be reported
      expect(result.success).toBe(true);
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
