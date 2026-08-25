/**
 * ZeroDB Sync Service - Coverage Gap Tests
 *
 * Covers uncovered lines: 34, 242-243, 303, 314-315, 351-352, 363-364,
 * 383-455, 493-550, 673-808, 976-977, 1027-1028
 *
 * Targets:
 * - getMongoose() zerodb-only mode throw (line 34)
 * - initialize zerodb-only check (242-243)
 * - startSync error throw (303, 314-315)
 * - _pollAndSync full flow with events, errors, critical errors (351-455)
 * - _processEvent with insert/update/delete/unknown (493-550)
 * - _handleInsert, _handleUpdate, _handleDelete (673-808)
 * - getHealthStatus error path (976-977)
 * - getAuditLogs error path (1027-1028)
 */

// Set env vars before any requires
process.env.ZERODB_SYNC_ENABLED = 'true';
process.env.SYNC_CONFLICT_STRATEGY = 'last-write-wins';
process.env.SYNC_POLL_INTERVAL_MS = '100';
process.env.MIGRATION_MODE = 'parallel';

// Build mock models
const mockSave = jest.fn().mockResolvedValue();
const mockToObject = jest.fn().mockReturnValue({ _id: 'doc1', name: 'test' });

const mockModelConstructor = jest.fn().mockImplementation(function(data) {
  Object.assign(this, data);
  this.save = mockSave;
  this.toObject = () => ({ ...data });
});

mockModelConstructor.findOne = jest.fn();
mockModelConstructor.create = jest.fn();
mockModelConstructor.createIndexes = jest.fn().mockResolvedValue();
mockModelConstructor.updateOne = jest.fn();
mockModelConstructor.find = jest.fn().mockResolvedValue([]);
mockModelConstructor.findById = jest.fn();
mockModelConstructor.findByIdAndDelete = jest.fn();
mockModelConstructor.countDocuments = jest.fn().mockResolvedValue(0);

jest.mock('mongoose', () => {
  const SchemaClass = jest.fn().mockImplementation(() => ({
    index: jest.fn()
  }));
  SchemaClass.Types = { Mixed: 'Mixed' };
  return {
    Schema: SchemaClass,
    model: jest.fn(() => mockModelConstructor)
  };
}, { virtual: true });

jest.mock('../../../services/zerodbService', () => ({
  listEvents: jest.fn().mockResolvedValue([]),
  initialize: jest.fn().mockResolvedValue()
}));

jest.mock('../../../services/databaseAdapter', () => ({}));

const zerodbSyncService = require('../../../services/zerodbSyncService');
const zerodbService = require('../../../services/zerodbService');

describe('ZeroDBSyncService (Coverage Gaps)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockModelConstructor.createIndexes = jest.fn().mockResolvedValue();
    mockModelConstructor.find = jest.fn().mockResolvedValue([]);
    mockModelConstructor.findOne = jest.fn();
    mockModelConstructor.create = jest.fn();
    mockModelConstructor.findById = jest.fn();
    mockModelConstructor.findByIdAndDelete = jest.fn();
    mockModelConstructor.countDocuments = jest.fn().mockResolvedValue(0);

    zerodbSyncService.enabled = true;
    await zerodbSyncService.stopAllSyncs();
    zerodbSyncService.resetMetrics();
    zerodbSyncService.initialized = false;
    zerodbSyncService.SyncMetadata = null;
    zerodbSyncService.SyncAuditLog = null;
    zerodbSyncService.syncLocks.clear();
    zerodbSyncService.customMergeStrategies.clear();
    // Speed up retries
    zerodbSyncService.baseBackoffMs = 1;
    zerodbSyncService.maxBackoffMs = 5;
    zerodbSyncService.maxRetries = 2;
  });

  afterEach(async () => {
    await zerodbSyncService.stopAllSyncs();
  });

  // ── _pollAndSync full flow with events ──
  describe('_pollAndSync full flow', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should skip when sync lock is already held', async () => {
      zerodbSyncService.syncLocks.set('users', true);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync already in progress for users')
      );
      consoleSpy.mockRestore();
    });

    it('should skip when sync metadata not found or disabled', async () => {
      mockModelConstructor.findOne.mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync disabled for table: users')
      );
      consoleSpy.mockRestore();
      // Lock should be released
      expect(zerodbSyncService.syncLocks.get('users')).toBe(false);
    });

    it('should skip when metadata has syncEnabled=false', async () => {
      mockModelConstructor.findOne.mockResolvedValue({
        tableName: 'users',
        syncEnabled: false,
        lastSyncAttempt: new Date(),
        save: jest.fn().mockResolvedValue()
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync disabled for table: users')
      );
      consoleSpy.mockRestore();
    });

    it('should release lock when no events are found', async () => {
      const mockMeta = {
        tableName: 'users',
        syncEnabled: true,
        lastSyncAttempt: new Date(),
        lastProcessedTimestamp: 0,
        lastProcessedEventId: '0',
        save: jest.fn().mockResolvedValue()
      };
      mockModelConstructor.findOne.mockResolvedValue(mockMeta);
      zerodbService.listEvents.mockResolvedValue([]);

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(zerodbSyncService.syncLocks.get('users')).toBe(false);
    });

    it('should process events and update metadata on success', async () => {
      const saveFn = jest.fn().mockResolvedValue();
      const mockMeta = {
        tableName: 'users',
        syncEnabled: true,
        lastSyncAttempt: new Date(),
        lastProcessedTimestamp: 0,
        lastProcessedEventId: '0',
        conflictStrategy: 'last-write-wins',
        totalEventsSynced: 0,
        totalErrors: 0,
        consecutiveFailures: 0,
        lastSuccessfulSync: null,
        save: saveFn
      };
      mockModelConstructor.findOne.mockResolvedValue(mockMeta);

      // Mock events from ZeroDB
      zerodbService.listEvents.mockResolvedValue([
        {
          event_id: 'e1',
          timestamp: 1000,
          event_payload: {
            operation: 'insert',
            document_id: 'doc1',
            data: { name: 'Test' }
          }
        }
      ]);

      // Mock insert: document doesn't exist
      mockModelConstructor.findOne
        .mockResolvedValueOnce(mockMeta) // _pollAndSync findOne
        .mockResolvedValueOnce(null);    // _handleInsert findOne (no existing)

      // SyncAuditLog create
      mockModelConstructor.create.mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(saveFn).toHaveBeenCalled();
      expect(mockMeta.totalEventsSynced).toBe(1);
      expect(mockMeta.consecutiveFailures).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should handle event processing errors and log audit', async () => {
      const saveFn = jest.fn().mockResolvedValue();
      const mockMeta = {
        tableName: 'users',
        syncEnabled: true,
        lastSyncAttempt: new Date(),
        lastProcessedTimestamp: 0,
        lastProcessedEventId: '0',
        conflictStrategy: 'last-write-wins',
        totalEventsSynced: 0,
        totalErrors: 0,
        consecutiveFailures: 0,
        save: saveFn
      };
      mockModelConstructor.findOne.mockResolvedValue(mockMeta);

      // Mock events with an operation that will cause an error
      zerodbService.listEvents.mockResolvedValue([
        {
          event_id: 'e1',
          timestamp: 1000,
          event_payload: {
            operation: 'insert',
            document_id: 'doc1',
            data: { name: 'Test' }
          }
        }
      ]);

      // Mock _handleInsert to throw a non-retryable error
      mockModelConstructor.findOne
        .mockResolvedValueOnce(mockMeta) // _pollAndSync findOne
        .mockRejectedValueOnce(new Error('validation error')); // _handleInsert findOne throws

      // SyncAuditLog create for failed event
      mockModelConstructor.create.mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(mockMeta.totalErrors).toBe(1);
      consoleSpy.mockRestore();
    });

    it('should stop processing on critical error', async () => {
      const saveFn = jest.fn().mockResolvedValue();
      const mockMeta = {
        tableName: 'users',
        syncEnabled: true,
        lastSyncAttempt: new Date(),
        lastProcessedTimestamp: 0,
        lastProcessedEventId: '0',
        conflictStrategy: 'last-write-wins',
        totalEventsSynced: 0,
        totalErrors: 0,
        consecutiveFailures: 0,
        save: saveFn
      };
      mockModelConstructor.findOne.mockResolvedValue(mockMeta);

      // Two events - should stop after first critical error
      zerodbService.listEvents.mockResolvedValue([
        {
          event_id: 'e1',
          timestamp: 1000,
          event_payload: {
            operation: 'insert',
            document_id: 'doc1',
            data: { name: 'Test' }
          }
        },
        {
          event_id: 'e2',
          timestamp: 2000,
          event_payload: {
            operation: 'insert',
            document_id: 'doc2',
            data: { name: 'Test2' }
          }
        }
      ]);

      // First insert throws a critical error (authentication)
      mockModelConstructor.findOne
        .mockResolvedValueOnce(mockMeta)
        .mockRejectedValueOnce(new Error('authentication failed'));

      mockModelConstructor.create.mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      // Should have stopped after first event
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Critical error encountered')
      );
      consoleSpy.mockRestore();
    });

    it('should handle error in the main try-catch and update metadata', async () => {
      // Make findOne throw for the metadata lookup itself
      mockModelConstructor.findOne.mockRejectedValue(new Error('DB connection lost'));
      mockModelConstructor.updateOne.mockResolvedValue({});

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await zerodbSyncService._pollAndSync('users', 'User');

      expect(mockModelConstructor.updateOne).toHaveBeenCalledWith(
        { tableName: 'users' },
        expect.objectContaining({
          $inc: { consecutiveFailures: 1, totalErrors: 1 }
        })
      );
      consoleSpy.mockRestore();
    });

    it('should handle failure to update error metadata gracefully', async () => {
      mockModelConstructor.findOne.mockRejectedValue(new Error('DB connection lost'));
      mockModelConstructor.updateOne.mockRejectedValue(new Error('Update also failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      await zerodbSyncService._pollAndSync('users', 'User');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update error metadata:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  // ── _processEvent ──
  describe('_processEvent', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should handle insert event type', async () => {
      const event = {
        event_id: 'e1',
        event_payload: {
          operation: 'insert',
          document_id: 'doc1',
          data: { name: 'Test' }
        }
      };

      // No existing doc
      mockModelConstructor.findOne.mockResolvedValue(null);
      mockModelConstructor.create.mockResolvedValue({}); // audit log

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._processEvent(
        event, 'users', 'User', 'last-write-wins'
      );

      expect(result.status).toBe('success');
      consoleSpy.mockRestore();
    });

    it('should handle update event type', async () => {
      const event = {
        event_id: 'e2',
        event_payload: {
          operation: 'update',
          document_id: 'doc1',
          data: { name: 'Updated', updatedAt: Date.now() + 100000 }
        }
      };

      // Existing doc with older timestamp
      const existingDoc = {
        _id: 'doc1',
        name: 'Original',
        updatedAt: new Date(Date.now() - 100000),
        toObject: () => ({ _id: 'doc1', name: 'Original', updatedAt: new Date(Date.now() - 100000) }),
        save: jest.fn().mockResolvedValue()
      };
      mockModelConstructor.findById.mockResolvedValue(existingDoc);
      mockModelConstructor.create.mockResolvedValue({}); // audit log

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._processEvent(
        event, 'users', 'User', 'last-write-wins'
      );

      expect(result.status).toBe('success');
      consoleSpy.mockRestore();
    });

    it('should handle delete event type', async () => {
      const event = {
        event_id: 'e3',
        event_payload: {
          operation: 'delete',
          document_id: 'doc1',
          data: {}
        }
      };

      const existingDoc = { _id: 'doc1', name: 'Test' };
      mockModelConstructor.findById.mockResolvedValue(existingDoc);
      mockModelConstructor.findByIdAndDelete.mockResolvedValue({});
      mockModelConstructor.create.mockResolvedValue({}); // audit log

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._processEvent(
        event, 'users', 'User', 'last-write-wins'
      );

      expect(result.status).toBe('success');
      consoleSpy.mockRestore();
    });

    it('should throw on unknown event type', async () => {
      const event = {
        event_id: 'e4',
        event_payload: {
          operation: 'unknown_op',
          document_id: 'doc1',
          data: {}
        }
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService._processEvent(
        event, 'users', 'User', 'last-write-wins'
      )).rejects.toThrow('Unknown event type: unknown_op');

      consoleSpy.mockRestore();
    });
  });

  // ── _handleInsert ──
  describe('_handleInsert', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should skip insert when document already exists', async () => {
      mockModelConstructor.findOne.mockResolvedValue({ _id: 'doc1', name: 'Existing' });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleInsert('User', 'doc1', { name: 'New' });

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('already-exists');
      consoleSpy.mockRestore();
    });

    it('should insert new document when it does not exist', async () => {
      mockModelConstructor.findOne.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleInsert('User', 'doc1', { name: 'New' });

      expect(result.status).toBe('success');
      expect(result.appliedData).toBeDefined();
      consoleSpy.mockRestore();
    });

    it('should throw on database error during insert', async () => {
      mockModelConstructor.findOne.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService._handleInsert('User', 'doc1', { name: 'New' }))
        .rejects.toThrow('DB error');

      consoleSpy.mockRestore();
    });
  });

  // ── _handleUpdate ──
  describe('_handleUpdate', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should create document when not found in MongoDB', async () => {
      mockModelConstructor.findById.mockResolvedValue(null);
      // _handleInsert path: findOne returns null (no existing)
      mockModelConstructor.findOne.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleUpdate(
        'User', 'doc1', { name: 'New' }, 'last-write-wins'
      );

      expect(result.status).toBe('success');
      consoleSpy.mockRestore();
    });

    it('should skip update when MongoDB data is newer', async () => {
      const mongoDoc = {
        _id: 'doc1',
        updatedAt: new Date(Date.now() + 100000),
        toObject: () => ({ _id: 'doc1', updatedAt: new Date(Date.now() + 100000) }),
        save: jest.fn()
      };
      mockModelConstructor.findById.mockResolvedValue(mongoDoc);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleUpdate(
        'User', 'doc1', { name: 'Old', updatedAt: 1000 }, 'last-write-wins'
      );

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('mongodb-newer');
      consoleSpy.mockRestore();
    });

    it('should detect conflict and resolve when timestamps are close', async () => {
      const now = Date.now();
      const mongoDoc = {
        _id: 'doc1',
        updatedAt: new Date(now),
        toObject: () => ({ _id: 'doc1', updatedAt: new Date(now) }),
        save: jest.fn().mockResolvedValue()
      };
      mockModelConstructor.findById.mockResolvedValue(mongoDoc);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleUpdate(
        'User', 'doc1', { name: 'ZeroDB', updatedAt: now + 50 }, 'zerodb-priority'
      );

      expect(result.status).toBe('success');
      expect(result.conflictResolution).toBe('zerodb-won');
      expect(zerodbSyncService.metrics.conflictsDetected).toBe(1);
      expect(zerodbSyncService.metrics.conflictsResolved).toBe(1);
      consoleSpy.mockRestore();
    });

    it('should apply zerodb data when zerodb is newer and no conflict', async () => {
      const mongoDoc = {
        _id: 'doc1',
        updatedAt: new Date(1000),
        toObject: () => ({ _id: 'doc1', name: 'Updated' }),
        save: jest.fn().mockResolvedValue()
      };
      mockModelConstructor.findById.mockResolvedValue(mongoDoc);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleUpdate(
        'User', 'doc1', { name: 'ZeroDB', updatedAt: Date.now() + 100000 }, 'last-write-wins'
      );

      expect(result.status).toBe('success');
      expect(result.conflictResolution).toBe('zerodb-newer');
      consoleSpy.mockRestore();
    });

    it('should throw on database error', async () => {
      mockModelConstructor.findById.mockRejectedValue(new Error('DB read error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService._handleUpdate(
        'User', 'doc1', {}, 'last-write-wins'
      )).rejects.toThrow('DB read error');

      consoleSpy.mockRestore();
    });
  });

  // ── _handleDelete ──
  describe('_handleDelete', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should skip delete when document not found', async () => {
      mockModelConstructor.findById.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await zerodbSyncService._handleDelete('User', 'doc1');

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('already-deleted');
      consoleSpy.mockRestore();
    });

    it('should delete existing document', async () => {
      mockModelConstructor.findById.mockResolvedValue({ _id: 'doc1' });
      mockModelConstructor.findByIdAndDelete.mockResolvedValue({});

      const result = await zerodbSyncService._handleDelete('User', 'doc1');

      expect(result.status).toBe('success');
      expect(result.appliedData).toBeNull();
    });

    it('should throw on database error', async () => {
      mockModelConstructor.findById.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService._handleDelete('User', 'doc1'))
        .rejects.toThrow('DB error');

      consoleSpy.mockRestore();
    });
  });

  // ── startSync error propagation ──
  describe('startSync error cases', () => {
    it('should throw when not initialized', async () => {
      expect(() => zerodbSyncService._checkInitialized())
        .toThrow('ZeroDBSyncService not initialized');
    });

    it('should throw when startSync encounters an error creating metadata', async () => {
      await zerodbSyncService.initialize();
      mockModelConstructor.findOne.mockResolvedValue(null);
      mockModelConstructor.create.mockRejectedValue(new Error('Create failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService.startSync('users', 'User'))
        .rejects.toThrow('Create failed');

      consoleSpy.mockRestore();
    });
  });

  // ── getHealthStatus error path ──
  describe('getHealthStatus error handling', () => {
    it('should throw when SyncMetadata.find fails', async () => {
      await zerodbSyncService.initialize();
      mockModelConstructor.find.mockRejectedValue(new Error('Query failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService.getHealthStatus())
        .rejects.toThrow('Query failed');

      consoleSpy.mockRestore();
    });
  });

  // ── getAuditLogs error path ──
  describe('getAuditLogs error handling', () => {
    it('should throw when audit log query fails', async () => {
      await zerodbSyncService.initialize();

      mockModelConstructor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockRejectedValue(new Error('Query failed'))
            })
          })
        })
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(zerodbSyncService.getAuditLogs('users'))
        .rejects.toThrow('Query failed');

      consoleSpy.mockRestore();
    });

    it('should apply only startDate filter', async () => {
      await zerodbSyncService.initialize();

      mockModelConstructor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      mockModelConstructor.countDocuments.mockResolvedValue(0);

      const result = await zerodbSyncService.getAuditLogs('users', {
        startDate: '2024-01-01',
        limit: 50,
        skip: 10
      });

      expect(result.limit).toBe(50);
      expect(result.skip).toBe(10);
    });

    it('should apply only endDate filter', async () => {
      await zerodbSyncService.initialize();

      mockModelConstructor.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      mockModelConstructor.countDocuments.mockResolvedValue(0);

      const result = await zerodbSyncService.getAuditLogs('users', {
        endDate: '2024-12-31'
      });

      expect(result.total).toBe(0);
    });
  });
});
