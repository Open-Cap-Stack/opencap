/**
 * @jest-environment node
 */

const RollbackService = require('../../scripts/rollback-to-mongodb');
const zerodbService = require('../../services/zerodbService');
const mongoose = require('mongoose');
const databaseAdapter = require('../../services/databaseAdapter');

jest.mock('../../services/zerodbService');
jest.mock('mongoose');
jest.mock('../../services/databaseAdapter');

describe('Rollback to MongoDB Service', () => {
  let rollbackService;
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    rollbackService = new RollbackService({
      validateBeforeRollback: true,
      backupBeforeRollback: true,
      dryRun: false
    });
  });

  describe('Rollback Decision Making', () => {
    it('should analyze system health before rollback', async () => {
      // GIVEN: System health metrics
      const healthMetrics = {
        zerodb: {
          errorRate: 0.25, // 25% error rate
          avgResponseTime: 5000,
          availability: 0.8
        },
        mongodb: {
          errorRate: 0.01,
          avgResponseTime: 50,
          availability: 0.99
        }
      };

      databaseAdapter.getMetrics.mockReturnValue(healthMetrics);

      // WHEN: Evaluating rollback necessity
      const decision = await rollbackService.evaluateRollbackNeed();

      // THEN: Should recommend rollback
      expect(decision.shouldRollback).toBe(true);
      expect(decision.reasons).toContain('high_error_rate');
      expect(decision.severity).toBe('critical');
    });

    it('should not recommend rollback when ZeroDB is healthy', async () => {
      // GIVEN: Healthy system metrics
      const healthMetrics = {
        zerodb: {
          errorRate: 0.001,
          avgResponseTime: 100,
          availability: 0.999
        },
        mongodb: {
          errorRate: 0.001,
          avgResponseTime: 50,
          availability: 0.999
        }
      };

      databaseAdapter.getMetrics.mockReturnValue(healthMetrics);

      // WHEN: Evaluating rollback necessity
      const decision = await rollbackService.evaluateRollbackNeed();

      // THEN: Should not recommend rollback
      expect(decision.shouldRollback).toBe(false);
      expect(decision.severity).toBe('none');
    });

    it('should consider data inconsistency in rollback decision', async () => {
      // GIVEN: Data inconsistency detected
      const consistencyReport = {
        consistent: false,
        discrepancies: [
          { type: 'DATA_MISMATCH', count: 50 },
          { type: 'MISSING_IN_ZERODB', count: 10 }
        ]
      };

      databaseAdapter.validateConsistency.mockResolvedValue(consistencyReport);

      // WHEN: Evaluating rollback with consistency check
      const decision = await rollbackService.evaluateRollbackNeed({
        checkConsistency: true,
        modelName: 'FinancialReport'
      });

      // THEN: Should recommend rollback
      expect(decision.shouldRollback).toBe(true);
      expect(decision.reasons).toContain('data_inconsistency');
    });

    it('should use decision tree for complex rollback scenarios', () => {
      // GIVEN: Multiple failure conditions
      const conditions = {
        errorRate: 0.30,
        dataLoss: true,
        apiAvailability: 0.5,
        responseTime: 10000,
        userImpact: 'high'
      };

      // WHEN: Processing through decision tree
      const decision = rollbackService.processDecisionTree(conditions);

      // THEN: Should provide clear recommendation
      expect(decision.action).toBe('immediate_rollback');
      expect(decision.priority).toBe('p0');
      expect(decision.communicationPlan).toBeDefined();
    });
  });

  describe('Pre-Rollback Validation', () => {
    it('should validate MongoDB availability before rollback', async () => {
      // GIVEN: MongoDB connection
      mongoose.connection = {
        readyState: 1, // Connected
        db: { admin: () => ({ ping: jest.fn().mockResolvedValue({}) }) }
      };

      // WHEN: Validating MongoDB
      const result = await rollbackService.validateMongoDBReadiness();

      // THEN: MongoDB should be ready
      expect(result.ready).toBe(true);
      expect(result.connectionState).toBe('connected');
    });

    it('should fail validation if MongoDB is unavailable', async () => {
      // GIVEN: MongoDB disconnected
      mongoose.connection = {
        readyState: 0 // Disconnected
      };

      // WHEN: Validating MongoDB
      const result = await rollbackService.validateMongoDBReadiness();

      // THEN: Should fail validation
      expect(result.ready).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should verify MongoDB has sufficient storage', async () => {
      // GIVEN: MongoDB with storage info
      const mockDbStats = {
        dataSize: 1000000000, // 1GB
        storageSize: 2000000000, // 2GB
        freeStorage: 10000000000 // 10GB free
      };

      mongoose.connection = {
        readyState: 1,
        db: {
          stats: jest.fn().mockResolvedValue(mockDbStats)
        }
      };

      // WHEN: Checking storage
      const result = await rollbackService.validateMongoDBReadiness();

      // THEN: Should have sufficient storage
      expect(result.ready).toBe(true);
      expect(result.sufficientStorage).toBe(true);
    });

    it('should create backup before rollback', async () => {
      // GIVEN: ZeroDB data to backup
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue([{ _id: '1' }]);

      // WHEN: Preparing for rollback
      const result = await rollbackService.createPreRollbackBackup(mockToken);

      // THEN: Backup should be created
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.backupLocation).toBeDefined();
    });
  });

  describe('Rollback Execution', () => {
    it('should migrate data from ZeroDB to MongoDB', async () => {
      // GIVEN: Data in ZeroDB
      const mockZeroDBData = [
        { _id: '1', ReportID: 'R001', Type: 'Annual' },
        { _id: '2', ReportID: 'R002', Type: 'Quarterly' }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      const mockModel = {
        insertMany: jest.fn().mockResolvedValue(mockZeroDBData),
        countDocuments: jest.fn().mockResolvedValue(2)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback
      const result = await rollbackService.performRollback(mockToken);

      // THEN: Data should be migrated
      expect(result.success).toBe(true);
      expect(result.recordsMigrated).toBe(2);
      expect(mockModel.insertMany).toHaveBeenCalledWith(mockZeroDBData);
    });

    it('should handle duplicate data during rollback', async () => {
      // GIVEN: Data already exists in MongoDB
      const mockZeroDBData = [{ _id: '1', ReportID: 'R001' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      const mockModel = {
        findOne: jest.fn().mockResolvedValue({ _id: '1', ReportID: 'R001' }), // Already exists
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        countDocuments: jest.fn().mockResolvedValue(1)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback
      const result = await rollbackService.performRollback(mockToken, {
        handleDuplicates: 'update'
      });

      // THEN: Should update existing records
      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(1);
      expect(mockModel.updateOne).toHaveBeenCalled();
    });

    it('should process large datasets in batches', async () => {
      // GIVEN: Large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        _id: `${i}`,
        ReportID: `R${i}`
      }));

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(largeDataset);

      const mockModel = {
        insertMany: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(10000)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback with batching
      const result = await rollbackService.performRollback(mockToken, {
        batchSize: 1000
      });

      // THEN: Should process in batches
      expect(result.success).toBe(true);
      expect(result.batchesProcessed).toBe(10);
      expect(mockModel.insertMany).toHaveBeenCalledTimes(10);
    });

    it('should update application config to use MongoDB', async () => {
      // GIVEN: Successful data migration
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([]);

      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback
      const result = await rollbackService.performRollback(mockToken, {
        updateConfig: true
      });

      // THEN: Should update config
      expect(result.success).toBe(true);
      expect(result.configUpdated).toBe(true);
      expect(result.newMigrationMode).toBe('mongodb-only');
    });

    it('should execute dry-run without making changes', async () => {
      // GIVEN: Dry-run mode
      rollbackService.config.dryRun = true;

      const mockZeroDBData = [{ _id: '1', ReportID: 'R001' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      mongoose.connection = { readyState: 1 };

      // WHEN: Performing dry-run rollback
      const result = await rollbackService.performRollback(mockToken);

      // THEN: Should simulate without changes
      expect(result.dryRun).toBe(true);
      expect(result.wouldMigrate).toBe(1);
      expect(mongoose.model).not.toHaveBeenCalled();
    });
  });

  describe('Post-Rollback Validation', () => {
    it('should verify data integrity after rollback', async () => {
      // GIVEN: Completed rollback
      const mockData = [
        { _id: '1', ReportID: 'R001' },
        { _id: '2', ReportID: 'R002' }
      ];

      zerodbService.queryTable.mockResolvedValue(mockData);

      const mockModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockData)
          })
        }),
        countDocuments: jest.fn().mockResolvedValue(2)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Validating rollback
      const result = await rollbackService.validateRollback('financial_reports');

      // THEN: Should confirm data integrity
      expect(result.valid).toBe(true);
      expect(result.recordCountMatch).toBe(true);
      expect(result.dataMatch).toBe(true);
    });

    it('should detect data loss during rollback', async () => {
      // GIVEN: Data mismatch after rollback
      zerodbService.queryTable.mockResolvedValue([
        { _id: '1' },
        { _id: '2' }
      ]);

      const mockModel = {
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: '1' }]) // Missing record
          })
        }),
        countDocuments: jest.fn().mockResolvedValue(1)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Validating rollback
      const result = await rollbackService.validateRollback('financial_reports');

      // THEN: Should detect data loss
      expect(result.valid).toBe(false);
      expect(result.dataLoss).toBe(true);
      expect(result.missingRecords).toBe(1);
    });

    it('should measure system performance after rollback', async () => {
      // GIVEN: Rollback completed
      mongoose.connection = { readyState: 1 };
      const mockModel = {
        findOne: jest.fn().mockResolvedValue({ _id: '1' })
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);

      // WHEN: Measuring performance
      const result = await rollbackService.measurePostRollbackPerformance();

      // THEN: Should provide performance metrics
      expect(result.responseTime).toBeDefined();
      expect(result.errorRate).toBeDefined();
      expect(result.throughput).toBeDefined();
    });
  });

  describe('Rollback Failure Scenarios', () => {
    it('should handle MongoDB write failures', async () => {
      // GIVEN: MongoDB write error
      const mockZeroDBData = [{ _id: '1', ReportID: 'R001' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      const mockModel = {
        insertMany: jest.fn().mockRejectedValue(new Error('Write concern error'))
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback
      const result = await rollbackService.performRollback(mockToken);

      // THEN: Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Write concern error');
    });

    it('should rollback partial migration on failure', async () => {
      // GIVEN: Migration fails midway
      const mockZeroDBData = [
        { _id: '1', ReportID: 'R001' },
        { _id: '2', ReportID: 'R002' }
      ];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      const mockModel = {
        insertMany: jest
          .fn()
          .mockResolvedValueOnce([mockZeroDBData[0]]) // First batch succeeds
          .mockRejectedValueOnce(new Error('Insert failed')), // Second batch fails
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback with auto-rollback
      const result = await rollbackService.performRollback(mockToken, {
        rollbackOnFailure: true,
        batchSize: 1
      });

      // THEN: Should rollback partial changes
      expect(result.success).toBe(false);
      expect(result.partiallyMigrated).toBe(true);
      expect(result.rolledBack).toBe(true);
      expect(mockModel.deleteMany).toHaveBeenCalled();
    });

    it('should handle network partition during rollback', async () => {
      // GIVEN: Network failure
      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockRejectedValue(new Error('ECONNRESET'));

      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback
      const result = await rollbackService.performRollback(mockToken);

      // THEN: Should handle network error
      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNRESET');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Communication and Documentation', () => {
    it('should generate rollback report', async () => {
      // GIVEN: Completed rollback
      const rollbackResult = {
        success: true,
        startTime: new Date('2026-02-02T10:00:00Z'),
        endTime: new Date('2026-02-02T10:30:00Z'),
        recordsMigrated: 1000,
        tablesProcessed: 3
      };

      // WHEN: Generating report
      const report = rollbackService.generateRollbackReport(rollbackResult);

      // THEN: Should contain comprehensive information
      expect(report.summary).toBeDefined();
      expect(report.duration).toBe(1800000); // 30 minutes in ms
      expect(report.tablesProcessed).toBe(3);
      expect(report.recordsMigrated).toBe(1000);
      expect(report.recommendations).toBeDefined();
    });

    it('should provide communication templates', () => {
      // GIVEN: Rollback event
      const rollbackInfo = {
        reason: 'high_error_rate',
        severity: 'critical',
        impact: 'Service temporarily degraded'
      };

      // WHEN: Generating communication
      const communication = rollbackService.generateCommunicationPlan(rollbackInfo);

      // THEN: Should provide templates
      expect(communication.internalNotification).toBeDefined();
      expect(communication.userNotification).toBeDefined();
      expect(communication.statusPageUpdate).toBeDefined();
    });

    it('should document rollback steps for audit', async () => {
      // GIVEN: Rollback execution
      const mockZeroDBData = [{ _id: '1' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      const mockModel = {
        insertMany: jest.fn().mockResolvedValue(mockZeroDBData),
        countDocuments: jest.fn().mockResolvedValue(1)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback with audit trail
      const result = await rollbackService.performRollback(mockToken, {
        enableAuditTrail: true
      });

      // THEN: Should create audit trail
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(0);
      expect(result.auditTrail[0].action).toBeDefined();
      expect(result.auditTrail[0].timestamp).toBeDefined();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should monitor rollback progress', async () => {
      // GIVEN: Large rollback operation
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        _id: `${i}`,
        ReportID: `R${i}`
      }));

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(largeDataset);

      const mockModel = {
        insertMany: jest.fn().mockResolvedValue([]),
        countDocuments: jest.fn().mockResolvedValue(5000)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      const progressCallback = jest.fn();

      // WHEN: Performing rollback with progress tracking
      const result = await rollbackService.performRollback(mockToken, {
        batchSize: 1000,
        onProgress: progressCallback
      });

      // THEN: Should report progress
      expect(result.success).toBe(true);
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
    });

    it('should measure rollback performance metrics', async () => {
      // GIVEN: Rollback operation
      const mockZeroDBData = [{ _id: '1' }];

      zerodbService.initialize.mockResolvedValue({ projectId: 'test-project' });
      zerodbService.listTables.mockResolvedValue([
        { table_name: 'financial_reports' }
      ]);
      zerodbService.queryTable.mockResolvedValue(mockZeroDBData);

      const mockModel = {
        insertMany: jest.fn().mockResolvedValue(mockZeroDBData),
        countDocuments: jest.fn().mockResolvedValue(1)
      };
      mongoose.model = jest.fn().mockReturnValue(mockModel);
      mongoose.connection = { readyState: 1 };

      // WHEN: Performing rollback
      const result = await rollbackService.performRollback(mockToken);

      // THEN: Should include performance metrics
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalDuration).toBeDefined();
      expect(result.metrics.recordsPerSecond).toBeDefined();
    });
  });
});
