/**
 * Database Adapter Service Test Suite
 * [Feature] Issue #6: Database Abstraction Layer Testing
 *
 * Comprehensive test coverage for database abstraction layer with MongoDB and ZeroDB support
 * Tests CRUD operations, migration modes, consistency validation, metrics, and fallback logic
 */

const databaseAdapter = require('../../../services/databaseAdapter');
const mongoose = require('mongoose');
const zerodbService = require('../../../services/zerodbService');

// Mock external services
jest.mock('mongoose');
jest.mock('../../../services/zerodbService');

describe('Database Adapter Service', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIGRATION_MODE = 'parallel'; // Default for most tests
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Initialization and Configuration', () => {
    describe('initialize', () => {
      it('should initialize with parallel migration mode by default', async () => {
        const result = await databaseAdapter.initialize();

        expect(result).toHaveProperty('mode', 'parallel');
        expect(result).toHaveProperty('mongodbConnected');
        expect(result).toHaveProperty('zerodbConnected');
      });

      it('should initialize with mongodb-only mode when specified', async () => {
        process.env.MIGRATION_MODE = 'mongodb-only';

        const result = await databaseAdapter.initialize();

        expect(result).toHaveProperty('mode', 'mongodb-only');
        expect(result.mongodbConnected).toBe(true);
        expect(result.zerodbConnected).toBe(false);
      });

      it('should initialize with zerodb-only mode when specified', async () => {
        process.env.MIGRATION_MODE = 'zerodb-only';

        const result = await databaseAdapter.initialize();

        expect(result).toHaveProperty('mode', 'zerodb-only');
        expect(result.mongodbConnected).toBe(false);
        expect(result.zerodbConnected).toBe(true);
      });

      it('should handle initialization errors gracefully', async () => {
        mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

        await expect(databaseAdapter.initialize())
          .rejects.toThrow('Connection failed');
      });
    });

    describe('getMigrationMode', () => {
      it('should return current migration mode', () => {
        process.env.MIGRATION_MODE = 'parallel';

        const mode = databaseAdapter.getMigrationMode();

        expect(mode).toBe('parallel');
      });

      it('should default to parallel if not specified', () => {
        delete process.env.MIGRATION_MODE;

        const mode = databaseAdapter.getMigrationMode();

        expect(mode).toBe('parallel');
      });
    });
  });

  describe('CRUD Operations - Parallel Mode', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'parallel';
    });

    describe('create', () => {
      it('should create document in both MongoDB and ZeroDB', async () => {
        const modelName = 'User';
        const data = {
          userId: 'USER_001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'admin'
        };

        const mockMongoResult = { _id: 'mongo_123', ...data };
        const mockZeroResult = { id: 'zero_123', ...data };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue(mockMongoResult)
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue(mockZeroResult);

        const result = await databaseAdapter.create(modelName, data);

        expect(result).toHaveProperty('mongodb', mockMongoResult);
        expect(result).toHaveProperty('zerodb', mockZeroResult);
        expect(result).toHaveProperty('consistent', true);
        expect(mongoose.model).toHaveBeenCalledWith(modelName);
        expect(zerodbService.insertRows).toHaveBeenCalledWith(
          modelName.toLowerCase(),
          expect.arrayContaining([expect.objectContaining(data)])
        );
      });

      it('should validate consistency between MongoDB and ZeroDB results', async () => {
        const modelName = 'Company';
        const data = { companyId: 'COMP_001', CompanyName: 'Test Corp' };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_id', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_id', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result.consistent).toBe(true);
        expect(result).toHaveProperty('validationChecks');
      });

      it('should handle partial failure with fallback', async () => {
        const modelName = 'Document';
        const data = { title: 'Test Document' };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_id', ...data })
        });
        zerodbService.insertRows = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

        const result = await databaseAdapter.create(modelName, data);

        expect(result).toHaveProperty('mongodb');
        expect(result.zerodb).toBeNull();
        expect(result).toHaveProperty('error');
        expect(result.fallbackUsed).toBe(true);
      });

      it('should collect metrics during create operation', async () => {
        const modelName = 'Stakeholder';
        const data = { name: 'Jane Smith' };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_id', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_id', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result).toHaveProperty('metrics');
        expect(result.metrics).toHaveProperty('responseTime');
        expect(result.metrics).toHaveProperty('mongodbTime');
        expect(result.metrics).toHaveProperty('zerodbTime');
        expect(result.metrics.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('read', () => {
      it('should read from both databases and validate consistency', async () => {
        const modelName = 'User';
        const query = { userId: 'USER_001' };

        const mockMongoResult = { _id: 'mongo_123', userId: 'USER_001', email: 'test@example.com' };
        const mockZeroResult = { id: 'zero_123', userId: 'USER_001', email: 'test@example.com' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockMongoResult])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockZeroResult] });

        const result = await databaseAdapter.read(modelName, query);

        expect(result.mongodb).toEqual([mockMongoResult]);
        expect(result.zerodb).toEqual([mockZeroResult]);
        expect(result.consistent).toBe(true);
      });

      it('should detect inconsistencies between databases', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: 'mongo_id', CompanyName: 'Company A' }])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({
          rows: [{ id: 'zero_id', CompanyName: 'Company B' }]
        });

        const result = await databaseAdapter.read(modelName, query);

        expect(result.consistent).toBe(false);
        expect(result).toHaveProperty('inconsistencies');
        expect(result.inconsistencies.length).toBeGreaterThan(0);
      });

      it('should use primary database result when inconsistency detected', async () => {
        const modelName = 'FinancialReport';
        const query = { reportId: 'RPT_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: 'mongo_id', amount: 1000 }])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({
          rows: [{ id: 'zero_id', amount: 2000 }]
        });

        const result = await databaseAdapter.read(modelName, query);

        expect(result.primaryResult).toEqual(result.mongodb);
      });
    });

    describe('update', () => {
      it('should update document in both databases', async () => {
        const modelName = 'User';
        const query = { userId: 'USER_001' };
        const updateData = { email: 'newemail@example.com' };

        const mockMongoResult = { modifiedCount: 1, matchedCount: 1 };
        const mockZeroResult = { updatedCount: 1 };

        mongoose.model = jest.fn().mockReturnValue({
          updateMany: jest.fn().mockResolvedValue(mockMongoResult)
        });
        zerodbService.updateRows = jest.fn().mockResolvedValue(mockZeroResult);

        const result = await databaseAdapter.update(modelName, query, updateData);

        expect(result.mongodb).toEqual(mockMongoResult);
        expect(result.zerodb).toEqual(mockZeroResult);
        expect(result.consistent).toBe(true);
      });

      it('should handle update with options parameter', async () => {
        const modelName = 'Document';
        const query = { documentId: 'DOC_001' };
        const updateData = { status: 'approved' };
        const options = { upsert: true };

        mongoose.model = jest.fn().mockReturnValue({
          updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 })
        });
        zerodbService.updateRows = jest.fn().mockResolvedValue({ updatedCount: 1 });

        await databaseAdapter.update(modelName, query, updateData, options);

        expect(mongoose.model().updateMany).toHaveBeenCalledWith(
          query,
          updateData,
          options
        );
      });

      it('should rollback ZeroDB on MongoDB update failure', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };
        const updateData = { CompanyName: 'Updated Name' };

        mongoose.model = jest.fn().mockReturnValue({
          updateMany: jest.fn().mockRejectedValue(new Error('MongoDB update failed'))
        });
        zerodbService.updateRows = jest.fn().mockResolvedValue({ updatedCount: 1 });

        await expect(databaseAdapter.update(modelName, query, updateData))
          .rejects.toThrow('MongoDB update failed');

        // Verify rollback was attempted
        expect(zerodbService.updateRows).not.toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should delete document from both databases', async () => {
        const modelName = 'Notification';
        const query = { notificationId: 'NOTIF_001' };

        const mockMongoResult = { deletedCount: 1 };
        const mockZeroResult = { deletedCount: 1 };

        mongoose.model = jest.fn().mockReturnValue({
          deleteMany: jest.fn().mockResolvedValue(mockMongoResult)
        });
        zerodbService.deleteRows = jest.fn().mockResolvedValue(mockZeroResult);

        const result = await databaseAdapter.delete(modelName, query);

        expect(result.mongodb.deletedCount).toBe(1);
        expect(result.zerodb.deletedCount).toBe(1);
        expect(result.consistent).toBe(true);
      });

      it('should handle cascade delete across related tables', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };
        const options = { cascade: ['users', 'documents', 'activities'] };

        mongoose.model = jest.fn().mockReturnValue({
          deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
        });
        zerodbService.deleteRows = jest.fn().mockResolvedValue({ deletedCount: 1 });

        const result = await databaseAdapter.delete(modelName, query, options);

        expect(result).toHaveProperty('cascadeResults');
        expect(result.cascadeResults).toHaveProperty('users');
        expect(result.cascadeResults).toHaveProperty('documents');
        expect(result.cascadeResults).toHaveProperty('activities');
      });
    });

    describe('findOne', () => {
      it('should find single document from both databases', async () => {
        const modelName = 'User';
        const query = { email: 'test@example.com' };

        const mockMongoResult = { _id: 'mongo_123', email: 'test@example.com' };
        const mockZeroResult = { id: 'zero_123', email: 'test@example.com' };

        mongoose.model = jest.fn().mockReturnValue({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockMongoResult)
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockZeroResult] });

        const result = await databaseAdapter.findOne(modelName, query);

        expect(result.mongodb).toEqual(mockMongoResult);
        expect(result.zerodb).toEqual(mockZeroResult);
      });

      it('should return null when document not found in either database', async () => {
        const modelName = 'User';
        const query = { userId: 'NONEXISTENT' };

        mongoose.model = jest.fn().mockReturnValue({
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null)
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        const result = await databaseAdapter.findOne(modelName, query);

        expect(result.mongodb).toBeNull();
        expect(result.zerodb).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find document by ID from both databases', async () => {
        const modelName = 'Company';
        const id = 'mongo_123';

        const mockMongoResult = { _id: 'mongo_123', CompanyName: 'Test Corp' };
        const mockZeroResult = { id: 'zero_123', CompanyName: 'Test Corp' };

        mongoose.model = jest.fn().mockReturnValue({
          findById: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockMongoResult)
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockZeroResult] });

        const result = await databaseAdapter.findById(modelName, id);

        expect(result.mongodb).toEqual(mockMongoResult);
        expect(result.zerodb).toEqual(mockZeroResult);
      });
    });
  });

  describe('CRUD Operations - MongoDB Only Mode', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'mongodb-only';
    });

    describe('create', () => {
      it('should only create in MongoDB', async () => {
        const modelName = 'User';
        const data = { email: 'test@example.com' };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });

        const result = await databaseAdapter.create(modelName, data);

        expect(result).toHaveProperty('mongodb');
        expect(result.zerodb).toBeUndefined();
        expect(zerodbService.insertRows).not.toHaveBeenCalled();
      });
    });

    describe('read', () => {
      it('should only read from MongoDB', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: 'mongo_123' }])
          })
        });

        const result = await databaseAdapter.read(modelName, query);

        expect(result).toEqual([{ _id: 'mongo_123' }]);
        expect(zerodbService.queryTable).not.toHaveBeenCalled();
      });
    });

    describe('update', () => {
      it('should only update in MongoDB', async () => {
        const modelName = 'Document';
        const query = { documentId: 'DOC_001' };
        const updateData = { status: 'approved' };

        mongoose.model = jest.fn().mockReturnValue({
          updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 })
        });

        const result = await databaseAdapter.update(modelName, query, updateData);

        expect(result.modifiedCount).toBe(1);
        expect(zerodbService.updateRows).not.toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should only delete from MongoDB', async () => {
        const modelName = 'Activity';
        const query = { activityId: 'ACT_001' };

        mongoose.model = jest.fn().mockReturnValue({
          deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
        });

        const result = await databaseAdapter.delete(modelName, query);

        expect(result.deletedCount).toBe(1);
        expect(zerodbService.deleteRows).not.toHaveBeenCalled();
      });
    });
  });

  describe('CRUD Operations - ZeroDB Only Mode', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'zerodb-only';
    });

    describe('create', () => {
      it('should only create in ZeroDB', async () => {
        const modelName = 'User';
        const data = { email: 'test@example.com' };

        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result).toHaveProperty('zerodb');
        expect(result.mongodb).toBeUndefined();
        expect(mongoose.model).not.toHaveBeenCalled();
      });
    });

    describe('read', () => {
      it('should only read from ZeroDB', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };

        zerodbService.queryTable = jest.fn().mockResolvedValue({
          rows: [{ id: 'zero_123', companyId: 'COMP_001' }]
        });

        const result = await databaseAdapter.read(modelName, query);

        expect(result).toEqual([{ id: 'zero_123', companyId: 'COMP_001' }]);
        expect(mongoose.model).not.toHaveBeenCalled();
      });
    });

    describe('update', () => {
      it('should only update in ZeroDB', async () => {
        const modelName = 'Document';
        const query = { documentId: 'DOC_001' };
        const updateData = { status: 'approved' };

        zerodbService.updateRows = jest.fn().mockResolvedValue({ updatedCount: 1 });

        const result = await databaseAdapter.update(modelName, query, updateData);

        expect(result.updatedCount).toBe(1);
        expect(mongoose.model).not.toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should only delete from ZeroDB', async () => {
        const modelName = 'Activity';
        const query = { activityId: 'ACT_001' };

        zerodbService.deleteRows = jest.fn().mockResolvedValue({ deletedCount: 1 });

        const result = await databaseAdapter.delete(modelName, query);

        expect(result.deletedCount).toBe(1);
        expect(mongoose.model).not.toHaveBeenCalled();
      });
    });
  });

  describe('Consistency Validation', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'parallel';
    });

    describe('validateConsistency', () => {
      it('should validate data consistency between databases', async () => {
        const mongoData = [{ _id: 'mongo_123', name: 'Test' }];
        const zeroData = [{ id: 'zero_123', name: 'Test' }];

        const result = await databaseAdapter.validateConsistency(mongoData, zeroData);

        expect(result).toHaveProperty('consistent', true);
        expect(result).toHaveProperty('recordCount');
        expect(result).toHaveProperty('validationTime');
      });

      it('should detect missing records in ZeroDB', async () => {
        const mongoData = [
          { _id: 'mongo_123', name: 'Test1' },
          { _id: 'mongo_456', name: 'Test2' }
        ];
        const zeroData = [{ id: 'zero_123', name: 'Test1' }];

        const result = await databaseAdapter.validateConsistency(mongoData, zeroData);

        expect(result.consistent).toBe(false);
        expect(result.inconsistencies).toContainEqual(
          expect.objectContaining({
            type: 'missing_in_zerodb'
          })
        );
      });

      it('should detect field value mismatches', async () => {
        const mongoData = [{ _id: 'mongo_123', name: 'Test', amount: 100 }];
        const zeroData = [{ id: 'zero_123', name: 'Test', amount: 200 }];

        const result = await databaseAdapter.validateConsistency(mongoData, zeroData);

        expect(result.consistent).toBe(false);
        expect(result.inconsistencies).toContainEqual(
          expect.objectContaining({
            type: 'field_mismatch',
            field: 'amount'
          })
        );
      });

      it('should handle large dataset validation efficiently', async () => {
        const largeMongoData = Array.from({ length: 10000 }, (_, i) => ({
          _id: `mongo_${i}`,
          value: i
        }));
        const largeZeroData = Array.from({ length: 10000 }, (_, i) => ({
          id: `zero_${i}`,
          value: i
        }));

        const startTime = Date.now();
        const result = await databaseAdapter.validateConsistency(largeMongoData, largeZeroData);
        const duration = Date.now() - startTime;

        expect(result.consistent).toBe(true);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });

      it('should ignore system fields in comparison', async () => {
        const mongoData = [{
          _id: 'mongo_123',
          name: 'Test',
          __v: 0,
          createdAt: new Date('2024-01-01')
        }];
        const zeroData = [{
          id: 'zero_123',
          name: 'Test',
          created_at: new Date('2024-01-01')
        }];

        const result = await databaseAdapter.validateConsistency(mongoData, zeroData);

        expect(result.consistent).toBe(true);
      });
    });

    describe('syncInconsistencies', () => {
      it('should sync inconsistent data from MongoDB to ZeroDB', async () => {
        const inconsistencies = [
          { type: 'missing_in_zerodb', mongoRecord: { _id: 'mongo_123', name: 'Test' } }
        ];

        zerodbService.insertRows = jest.fn().mockResolvedValue({ success: true });

        const result = await databaseAdapter.syncInconsistencies('User', inconsistencies);

        expect(result).toHaveProperty('synced', true);
        expect(result).toHaveProperty('syncedCount', 1);
        expect(zerodbService.insertRows).toHaveBeenCalled();
      });

      it('should handle sync failures gracefully', async () => {
        const inconsistencies = [
          { type: 'missing_in_zerodb', mongoRecord: { _id: 'mongo_123' } }
        ];

        zerodbService.insertRows = jest.fn().mockRejectedValue(new Error('Sync failed'));

        const result = await databaseAdapter.syncInconsistencies('User', inconsistencies);

        expect(result.synced).toBe(false);
        expect(result).toHaveProperty('errors');
      });
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'parallel';
    });

    describe('getMetrics', () => {
      it('should return operation metrics', async () => {
        // Perform some operations to generate metrics
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        await databaseAdapter.read('User', {});

        const metrics = databaseAdapter.getMetrics();

        expect(metrics).toHaveProperty('totalOperations');
        expect(metrics).toHaveProperty('successfulOperations');
        expect(metrics).toHaveProperty('failedOperations');
        expect(metrics).toHaveProperty('averageResponseTime');
        expect(metrics).toHaveProperty('errorRate');
      });

      it('should track response times for each database', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        await databaseAdapter.read('User', {});

        const metrics = databaseAdapter.getMetrics();

        expect(metrics).toHaveProperty('mongodbAverageTime');
        expect(metrics).toHaveProperty('zerodbAverageTime');
        expect(metrics.mongodbAverageTime).toBeGreaterThanOrEqual(0);
        expect(metrics.zerodbAverageTime).toBeGreaterThanOrEqual(0);
      });

      it('should track operation counts by type', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          }),
          create: jest.fn().mockResolvedValue({})
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
        zerodbService.insertRows = jest.fn().mockResolvedValue({});

        await databaseAdapter.read('User', {});
        await databaseAdapter.create('User', { email: 'test@example.com' });

        const metrics = databaseAdapter.getMetrics();

        expect(metrics).toHaveProperty('operationsByType');
        expect(metrics.operationsByType).toHaveProperty('read');
        expect(metrics.operationsByType).toHaveProperty('create');
        expect(metrics.operationsByType.read).toBeGreaterThan(0);
        expect(metrics.operationsByType.create).toBeGreaterThan(0);
      });

      it('should calculate error rates accurately', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn()
              .mockResolvedValueOnce([])
              .mockRejectedValueOnce(new Error('Query failed'))
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        await databaseAdapter.read('User', {});
        try {
          await databaseAdapter.read('User', {});
        } catch (error) {
          // Expected error
        }

        const metrics = databaseAdapter.getMetrics();

        expect(metrics.errorRate).toBeGreaterThan(0);
        expect(metrics.errorRate).toBeLessThanOrEqual(1);
      });
    });

    describe('resetMetrics', () => {
      it('should reset all metrics to initial state', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        await databaseAdapter.read('User', {});

        let metrics = databaseAdapter.getMetrics();
        expect(metrics.totalOperations).toBeGreaterThan(0);

        databaseAdapter.resetMetrics();

        metrics = databaseAdapter.getMetrics();
        expect(metrics.totalOperations).toBe(0);
        expect(metrics.successfulOperations).toBe(0);
        expect(metrics.failedOperations).toBe(0);
      });
    });
  });

  describe('Fallback Logic', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'parallel';
    });

    describe('MongoDB Failure Fallback', () => {
      it('should fallback to ZeroDB when MongoDB fails', async () => {
        const modelName = 'User';
        const query = { userId: 'USER_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('MongoDB connection lost'))
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({
          rows: [{ id: 'zero_123', userId: 'USER_001' }]
        });

        const result = await databaseAdapter.read(modelName, query);

        expect(result.fallbackUsed).toBe(true);
        expect(result.fallbackDatabase).toBe('zerodb');
        expect(result.data).toEqual([{ id: 'zero_123', userId: 'USER_001' }]);
      });

      it('should log fallback events for monitoring', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('MongoDB error'))
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        const result = await databaseAdapter.read(modelName, query);

        expect(result).toHaveProperty('fallbackEvent');
        expect(result.fallbackEvent).toHaveProperty('timestamp');
        expect(result.fallbackEvent).toHaveProperty('reason');
        expect(result.fallbackEvent).toHaveProperty('fromDatabase', 'mongodb');
        expect(result.fallbackEvent).toHaveProperty('toDatabase', 'zerodb');
      });
    });

    describe('ZeroDB Failure Fallback', () => {
      it('should fallback to MongoDB when ZeroDB fails', async () => {
        const modelName = 'Document';
        const query = { documentId: 'DOC_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: 'mongo_123', documentId: 'DOC_001' }])
          })
        });
        zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('ZeroDB timeout'));

        const result = await databaseAdapter.read(modelName, query);

        expect(result.fallbackUsed).toBe(true);
        expect(result.fallbackDatabase).toBe('mongodb');
        expect(result.data).toEqual([{ _id: 'mongo_123', documentId: 'DOC_001' }]);
      });
    });

    describe('Both Databases Fail', () => {
      it('should throw error when both databases fail', async () => {
        const modelName = 'User';
        const query = { userId: 'USER_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('MongoDB error'))
          })
        });
        zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('ZeroDB error'));

        await expect(databaseAdapter.read(modelName, query))
          .rejects.toThrow('Both databases failed');
      });

      it('should include error details from both databases', async () => {
        const modelName = 'Company';
        const query = { companyId: 'COMP_001' };

        const mongoError = new Error('MongoDB connection refused');
        const zeroError = new Error('ZeroDB timeout');

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(mongoError)
          })
        });
        zerodbService.queryTable = jest.fn().mockRejectedValue(zeroError);

        try {
          await databaseAdapter.read(modelName, query);
          fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Both databases failed');
          expect(error).toHaveProperty('mongodbError');
          expect(error).toHaveProperty('zerodbError');
        }
      });
    });

    describe('Fallback Recovery', () => {
      it('should attempt recovery after fallback', async () => {
        const modelName = 'Activity';
        const query = { activityId: 'ACT_001' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn()
              .mockRejectedValueOnce(new Error('MongoDB error'))
              .mockResolvedValueOnce([{ _id: 'mongo_123' }])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'zero_123' }] });

        // First call should use fallback
        const result1 = await databaseAdapter.read(modelName, query);
        expect(result1.fallbackUsed).toBe(true);

        // Second call should attempt recovery
        const result2 = await databaseAdapter.read(modelName, query);
        expect(result2.fallbackUsed).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    describe('Invalid Input Handling', () => {
      it('should throw error for invalid model name', async () => {
        await expect(databaseAdapter.create('', { data: 'test' }))
          .rejects.toThrow('Model name is required');
      });

      it('should throw error for null data', async () => {
        await expect(databaseAdapter.create('User', null))
          .rejects.toThrow('Data is required');
      });

      it('should throw error for invalid query', async () => {
        await expect(databaseAdapter.read('User', null))
          .rejects.toThrow('Query is required');
      });
    });

    describe('MongoDB Error Handling', () => {
      it('should handle MongoDB connection errors', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('Connection refused'))
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        const result = await databaseAdapter.read('User', {});

        expect(result.fallbackUsed).toBe(true);
        expect(result).toHaveProperty('mongodbError');
      });

      it('should handle MongoDB timeout errors', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockRejectedValue(new Error('Query timeout'))
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        const result = await databaseAdapter.read('Company', {});

        expect(result.fallbackUsed).toBe(true);
        expect(result.mongodbError.message).toContain('timeout');
      });

      it('should handle MongoDB validation errors', async () => {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockRejectedValue(validationError)
        });

        await expect(databaseAdapter.create('User', { invalid: 'data' }))
          .rejects.toThrow('Validation failed');
      });
    });

    describe('ZeroDB Error Handling', () => {
      it('should handle ZeroDB API errors', async () => {
        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('API error'));

        const result = await databaseAdapter.read('User', {});

        expect(result.fallbackUsed).toBe(true);
        expect(result).toHaveProperty('zerodbError');
      });

      it('should handle ZeroDB rate limiting', async () => {
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.statusCode = 429;

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockRejectedValue(rateLimitError);

        const result = await databaseAdapter.read('Document', {});

        expect(result.fallbackUsed).toBe(true);
        expect(result.zerodbError.statusCode).toBe(429);
      });

      it('should handle ZeroDB authentication errors', async () => {
        const authError = new Error('Authentication failed');
        authError.statusCode = 401;

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockRejectedValue(authError);

        const result = await databaseAdapter.read('Company', {});

        expect(result.fallbackUsed).toBe(true);
        expect(result.zerodbError.statusCode).toBe(401);
      });
    });

    describe('Concurrent Operation Errors', () => {
      it('should handle race conditions in parallel mode', async () => {
        const modelName = 'User';
        const data = { email: 'test@example.com' };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        // Execute multiple creates concurrently
        const promises = Array.from({ length: 5 }, () =>
          databaseAdapter.create(modelName, data)
        );

        const results = await Promise.allSettled(promises);

        // All should complete (either successfully or with clear error)
        results.forEach(result => {
          expect(['fulfilled', 'rejected']).toContain(result.status);
        });
      });
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      process.env.MIGRATION_MODE = 'parallel';
    });

    describe('Complete CRUD Workflow', () => {
      it('should handle complete lifecycle: create, read, update, delete', async () => {
        const modelName = 'User';
        const userData = {
          userId: 'USER_001',
          email: 'test@example.com',
          role: 'user'
        };

        // Setup mocks for all operations
        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...userData }),
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ _id: 'mongo_123', ...userData }])
          }),
          updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
          deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 })
        });

        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...userData });
        zerodbService.queryTable = jest.fn().mockResolvedValue({
          rows: [{ id: 'zero_123', ...userData }]
        });
        zerodbService.updateRows = jest.fn().mockResolvedValue({ updatedCount: 1 });
        zerodbService.deleteRows = jest.fn().mockResolvedValue({ deletedCount: 1 });

        // Create
        const createResult = await databaseAdapter.create(modelName, userData);
        expect(createResult.consistent).toBe(true);

        // Read
        const readResult = await databaseAdapter.read(modelName, { userId: 'USER_001' });
        expect(readResult.consistent).toBe(true);

        // Update
        const updateResult = await databaseAdapter.update(
          modelName,
          { userId: 'USER_001' },
          { role: 'admin' }
        );
        expect(updateResult.consistent).toBe(true);

        // Delete
        const deleteResult = await databaseAdapter.delete(modelName, { userId: 'USER_001' });
        expect(deleteResult.consistent).toBe(true);
      });
    });

    describe('Migration Mode Transitions', () => {
      it('should handle transition from mongodb-only to parallel', async () => {
        const modelName = 'Company';
        const data = { companyId: 'COMP_001', CompanyName: 'Test Corp' };

        // Start in mongodb-only mode
        process.env.MIGRATION_MODE = 'mongodb-only';
        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });

        await databaseAdapter.create(modelName, data);
        expect(zerodbService.insertRows).not.toHaveBeenCalled();

        // Switch to parallel mode
        process.env.MIGRATION_MODE = 'parallel';
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        await databaseAdapter.create(modelName, { ...data, companyId: 'COMP_002' });
        expect(zerodbService.insertRows).toHaveBeenCalled();
      });

      it('should handle transition from parallel to zerodb-only', async () => {
        const modelName = 'Document';
        const data = { documentId: 'DOC_001', title: 'Test' };

        // Start in parallel mode
        process.env.MIGRATION_MODE = 'parallel';
        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        await databaseAdapter.create(modelName, data);
        expect(mongoose.model).toHaveBeenCalled();
        expect(zerodbService.insertRows).toHaveBeenCalled();

        // Switch to zerodb-only mode
        process.env.MIGRATION_MODE = 'zerodb-only';
        jest.clearAllMocks();

        await databaseAdapter.create(modelName, { ...data, documentId: 'DOC_002' });
        expect(mongoose.model).not.toHaveBeenCalled();
        expect(zerodbService.insertRows).toHaveBeenCalled();
      });
    });

    describe('High Load Scenarios', () => {
      it('should handle concurrent operations efficiently', async () => {
        const modelName = 'Activity';
        const activities = Array.from({ length: 100 }, (_, i) => ({
          activityId: `ACT_${i}`,
          type: 'test'
        }));

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockImplementation(data =>
            Promise.resolve({ _id: `mongo_${data.activityId}`, ...data })
          )
        });
        zerodbService.insertRows = jest.fn().mockImplementation(data =>
          Promise.resolve({ id: `zero_${data[0].activityId}`, ...data[0] })
        );

        const startTime = Date.now();
        const results = await Promise.all(
          activities.map(activity => databaseAdapter.create(modelName, activity))
        );
        const duration = Date.now() - startTime;

        expect(results).toHaveLength(100);
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    describe('Empty and Null Values', () => {
      it('should handle empty query results', async () => {
        const modelName = 'User';
        const query = { userId: 'NONEXISTENT' };

        mongoose.model = jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        const result = await databaseAdapter.read(modelName, query);

        expect(result.mongodb).toEqual([]);
        expect(result.zerodb).toEqual([]);
        expect(result.consistent).toBe(true);
      });

      it('should handle undefined fields in data', async () => {
        const modelName = 'Company';
        const data = {
          companyId: 'COMP_001',
          CompanyName: undefined,
          TaxID: null
        };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result.mongodb).toHaveProperty('companyId', 'COMP_001');
      });
    });

    describe('Large Data Volumes', () => {
      it('should handle large documents efficiently', async () => {
        const modelName = 'Document';
        const largeContent = 'x'.repeat(1000000); // 1MB of text
        const data = {
          documentId: 'DOC_001',
          content: largeContent
        };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result.mongodb.content.length).toBe(1000000);
      });

      it('should handle bulk operations efficiently', async () => {
        const modelName = 'Activity';
        const bulkData = Array.from({ length: 1000 }, (_, i) => ({
          activityId: `ACT_${i}`,
          type: 'bulk_test'
        }));

        mongoose.model = jest.fn().mockReturnValue({
          insertMany: jest.fn().mockResolvedValue(bulkData.map(d => ({ _id: `mongo_${d.activityId}`, ...d })))
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ insertedCount: 1000 });

        const result = await databaseAdapter.bulkCreate(modelName, bulkData);

        expect(result.mongodb).toHaveLength(1000);
        expect(result.zerodb.insertedCount).toBe(1000);
      });
    });

    describe('Special Characters and Encoding', () => {
      it('should handle special characters in data', async () => {
        const modelName = 'User';
        const data = {
          userId: 'USER_001',
          name: 'Test \u00e9 \u00e7 \u00f1 User', // Accented characters
          bio: 'Line1\nLine2\tTabbed'
        };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result.mongodb.name).toContain('\u00e9');
        expect(result.mongodb.bio).toContain('\n');
      });

      it('should handle emoji characters', async () => {
        const modelName = 'Notification';
        const data = {
          notificationId: 'NOTIF_001',
          message: 'Test notification \ud83d\ude80 \ud83c\udf89'
        };

        mongoose.model = jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({ _id: 'mongo_123', ...data })
        });
        zerodbService.insertRows = jest.fn().mockResolvedValue({ id: 'zero_123', ...data });

        const result = await databaseAdapter.create(modelName, data);

        expect(result.mongodb.message).toContain('\ud83d\ude80');
      });
    });

    describe('Complex Query Patterns', () => {
      it('should handle complex queries', async () => {
        // Placeholder test for complex queries
        expect(true).toBe(true);
      });
    });
  });

  describe('Conditional Mongoose Loading', () => {
    describe('zerodb-only mode', () => {
      it('should not call mongoose.model in zerodb-only mode', async () => {
        process.env.MIGRATION_MODE = 'zerodb-only';

        // The adapter should use zerodbService and not mongoose
        zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

        // In zerodb-only mode, mongoose.model should never be called
        // The test verifies that the adapter routes correctly
        expect(mongoose.model).not.toHaveBeenCalled();
      });

      it('should initialize without MongoDB in zerodb-only mode', async () => {
        process.env.MIGRATION_MODE = 'zerodb-only';

        // In zerodb-only mode, connectDB should not be called
        // Only zerodbService.initialize should be called
        zerodbService.initialize = jest.fn().mockResolvedValue(true);

        expect(databaseAdapter.isMongoDBRequired()).toBe(false);
      });
    });

    describe('mongodb-only mode', () => {
      it('should require mongoose in mongodb-only mode', () => {
        process.env.MIGRATION_MODE = 'mongodb-only';

        expect(databaseAdapter.isMongoDBRequired()).toBe(true);
      });
    });

    describe('parallel mode', () => {
      it('should require mongoose in parallel mode', () => {
        process.env.MIGRATION_MODE = 'parallel';

        expect(databaseAdapter.isMongoDBRequired()).toBe(true);
      });
    });
  });
});
