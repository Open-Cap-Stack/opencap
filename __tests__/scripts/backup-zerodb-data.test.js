/**
 * @jest-environment node
 */

const BackupService = require('../../scripts/backup-zerodb-data');
const zerodbService = require('../../services/zerodbService');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

jest.mock('../../services/zerodbService');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('ZeroDB Backup Service', () => {
  let backupService;
  const mockToken = 'mock-jwt-token';
  const mockBackupDir = '/tmp/zerodb-backups';

  beforeEach(() => {
    jest.clearAllMocks();
    backupService = new BackupService({
      backupDir: mockBackupDir,
      retentionDays: 7,
      enableEncryption: true,
      encryptionKey: 'test-encryption-key-32-characters'
    });
  });

  describe('Backup Creation', () => {
    it('should create a full backup of all ZeroDB tables', async () => {
      // GIVEN: ZeroDB tables with data
      const mockTables = [
        { table_name: 'financial_reports' },
        { table_name: 'documents' },
        { table_name: 'spvs' }
      ];

      const mockFinancialData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Quarterly' }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue(mockTables);
      zerodbService.queryTable.mockResolvedValue(mockFinancialData);
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Backup should be created successfully
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.tablesBackedUp).toEqual(['financial_reports', 'documents', 'spvs']);
      expect(result.totalRecords).toBeGreaterThan(0);
      expect(zerodbService.initialize).toHaveBeenCalledWith(mockToken);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should include metadata in backup manifest', async () => {
      // GIVEN: Active ZeroDB connection
      const mockTables = [{ table_name: 'financial_reports' }];
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue(mockTables);
      zerodbService.queryTable.mockResolvedValue([{ _id: '1' }]);
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Manifest should contain metadata
      expect(result.manifest).toBeDefined();
      expect(result.manifest.timestamp).toBeDefined();
      expect(result.manifest.version).toBeDefined();
      expect(result.manifest.tables).toBeDefined();
      expect(result.manifest.checksum).toBeDefined();
    });

    it('should encrypt backup data when encryption is enabled', async () => {
      // GIVEN: Encryption is enabled
      backupService.config.enableEncryption = true;
      const mockTables = [{ table_name: 'financial_reports' }];
      const mockData = [{ _id: '1', sensitive: 'data' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue(mockTables);
      zerodbService.queryTable.mockResolvedValue(mockData);
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Data should be encrypted
      expect(result.encrypted).toBe(true);
      expect(result.encryptionAlgorithm).toBe('aes-256-gcm');
      // Verify writeFile was called with encrypted data
      const writeFileCalls = fs.writeFile.mock.calls;
      expect(writeFileCalls.length).toBeGreaterThan(0);
    });

    it('should handle backup failure gracefully', async () => {
      // GIVEN: ZeroDB connection fails
      zerodbService.initialize.mockRejectedValue(new Error('Connection failed'));

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Should return failure result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Connection failed');
    });

    it('should validate backup integrity with checksums', async () => {
      // GIVEN: Successful backup
      const mockTables = [{ table_name: 'financial_reports' }];
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue(mockTables);
      zerodbService.queryTable.mockResolvedValue([{ _id: '1' }]);
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Checksums should be generated
      expect(result.manifest.checksum).toBeDefined();
      expect(result.manifest.tables[0].checksum).toBeDefined();
      expect(result.manifest.tables[0].recordCount).toBeDefined();
    });
  });

  describe('Backup Verification', () => {
    it('should verify backup integrity after creation', async () => {
      // GIVEN: A completed backup
      const backupId = 'backup-20260202-120000';
      const mockBackupData = {
        manifest: {
          backupId,
          timestamp: new Date().toISOString(),
          tables: [
            {
              tableName: 'financial_reports',
              recordCount: 10,
              checksum: 'abc123'
            }
          ],
          checksum: 'def456'
        }
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockBackupData.manifest));
      fs.stat.mockResolvedValue({ size: 1024 });

      // WHEN: Verifying the backup
      const result = await backupService.verifyBackup(backupId);

      // THEN: Verification should pass
      expect(result.valid).toBe(true);
      expect(result.backupId).toBe(backupId);
      expect(result.tablesVerified).toBe(1);
    });

    it('should detect corrupted backup files', async () => {
      // GIVEN: A backup with corrupted data
      const backupId = 'backup-20260202-120000';
      const mockBackupData = {
        manifest: {
          backupId,
          tables: [{ tableName: 'financial_reports', checksum: 'wrong' }],
          checksum: 'corrupted'
        }
      };

      fs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockBackupData.manifest))
        .mockResolvedValueOnce('different data than expected');
      fs.stat.mockResolvedValue({ size: 1024 });

      // WHEN: Verifying the backup
      const result = await backupService.verifyBackup(backupId);

      // THEN: Should detect corruption
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should verify encryption integrity', async () => {
      // GIVEN: An encrypted backup
      const backupId = 'backup-encrypted-20260202';
      const mockManifest = {
        backupId,
        encrypted: true,
        encryptionAlgorithm: 'aes-256-gcm',
        tables: []
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      fs.stat.mockResolvedValue({ size: 1024 });

      // WHEN: Verifying the backup
      const result = await backupService.verifyBackup(backupId);

      // THEN: Should verify encryption metadata
      expect(result.encrypted).toBe(true);
      expect(result.encryptionVerified).toBe(true);
    });
  });

  describe('Retention Policy', () => {
    it('should delete backups older than retention period', async () => {
      // GIVEN: Multiple backups with different ages
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days old
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days old

      const mockBackups = [
        `backup-${oldDate.toISOString().split('T')[0].replace(/-/g, '')}-120000`,
        `backup-${recentDate.toISOString().split('T')[0].replace(/-/g, '')}-120000`
      ];

      fs.readdir.mockResolvedValue(mockBackups);
      fs.stat.mockImplementation((filepath) => {
        if (filepath.includes(mockBackups[0])) {
          return Promise.resolve({ mtime: oldDate });
        }
        return Promise.resolve({ mtime: recentDate });
      });
      fs.unlink.mockResolvedValue();

      // WHEN: Applying retention policy
      const result = await backupService.applyRetentionPolicy();

      // THEN: Old backup should be deleted
      expect(result.deleted).toEqual([mockBackups[0]]);
      expect(result.retained).toEqual([mockBackups[1]]);
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });

    it('should keep minimum number of backups regardless of age', async () => {
      // GIVEN: Only 2 backups, both old
      backupService.config.minimumBackups = 2;
      const oldDate1 = new Date();
      oldDate1.setDate(oldDate1.getDate() - 10);
      const oldDate2 = new Date();
      oldDate2.setDate(oldDate2.getDate() - 8);

      const mockBackups = [
        `backup-${oldDate1.toISOString().split('T')[0].replace(/-/g, '')}-120000`,
        `backup-${oldDate2.toISOString().split('T')[0].replace(/-/g, '')}-120000`
      ];

      fs.readdir.mockResolvedValue(mockBackups);
      fs.stat.mockImplementation((filepath) => {
        if (filepath.includes(mockBackups[0])) {
          return Promise.resolve({ mtime: oldDate1 });
        }
        return Promise.resolve({ mtime: oldDate2 });
      });

      // WHEN: Applying retention policy
      const result = await backupService.applyRetentionPolicy();

      // THEN: All backups should be retained
      expect(result.deleted).toEqual([]);
      expect(result.retained.length).toBe(2);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('Automated Backup Scheduling', () => {
    it('should schedule daily backups', () => {
      // GIVEN: Backup service with daily schedule
      const scheduleConfig = {
        enabled: true,
        frequency: 'daily',
        time: '02:00'
      };

      // WHEN: Setting up schedule
      const result = backupService.setupSchedule(scheduleConfig);

      // THEN: Schedule should be created
      expect(result.scheduled).toBe(true);
      expect(result.frequency).toBe('daily');
      expect(result.nextRun).toBeDefined();
    });

    it('should handle concurrent backup attempts', async () => {
      // GIVEN: Backup already in progress
      const mockTables = [{ table_name: 'financial_reports' }];
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue(mockTables);
      zerodbService.queryTable.mockResolvedValue([{ _id: '1' }]);
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // Start first backup
      const backup1Promise = backupService.createBackup(mockToken);

      // WHEN: Starting second backup while first is running
      const backup2Promise = backupService.createBackup(mockToken);

      const [result1, result2] = await Promise.all([backup1Promise, backup2Promise]);

      // THEN: One should succeed, one should be prevented
      const successes = [result1, result2].filter((r) => r.success);
      const prevented = [result1, result2].filter((r) => !r.success && r.reason === 'backup_in_progress');

      expect(successes.length).toBe(1);
      expect(prevented.length).toBe(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle disk space issues', async () => {
      // GIVEN: Insufficient disk space
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.queryTable.mockResolvedValue([{ _id: '1' }]);
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockRejectedValue(new Error('ENOSPC: no space left on device'));

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Should fail with appropriate error
      expect(result.success).toBe(false);
      expect(result.error).toContain('no space left');
    });

    it('should handle network interruptions gracefully', async () => {
      // GIVEN: Network fails during backup
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([{ table_name: 'financial_reports' }]);
      zerodbService.queryTable.mockRejectedValue(new Error('ECONNRESET'));

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Should fail and log error
      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNRESET');
    });

    it('should handle partial backup failures', async () => {
      // GIVEN: One table fails to backup
      const mockTables = [
        { table_name: 'financial_reports' },
        { table_name: 'documents' }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue(mockTables);
      zerodbService.queryTable
        .mockResolvedValueOnce([{ _id: '1' }]) // First table succeeds
        .mockRejectedValueOnce(new Error('Table read error')); // Second table fails
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      // WHEN: Creating a backup
      const result = await backupService.createBackup(mockToken);

      // THEN: Should complete with partial success
      expect(result.partialSuccess).toBe(true);
      expect(result.successfulTables).toContain('financial_reports');
      expect(result.failedTables).toContain('documents');
    });
  });
});
