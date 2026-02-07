/**
 * Database Adapter Service Test Suite
 * [Feature] Issue #6: Database Abstraction Layer Testing
 *
 * Tests for the ZeroDB-only database adapter.
 * Covers CRUD operations, metrics, aggregation, initialization, and error handling.
 */

const zerodbService = require('../../../services/zerodbService');

// Mock zerodbService
jest.mock('../../../services/zerodbService');

// We need a fresh instance for each test, so we re-require after clearing cache
let databaseAdapter;

describe('Database Adapter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Get a fresh instance for each test
    jest.isolateModules(() => {
      databaseAdapter = require('../../../services/databaseAdapter');
    });
  });

  describe('Initialization and Configuration', () => {
    describe('getMigrationMode', () => {
      it('should always return zerodb-only', () => {
        const mode = databaseAdapter.getMigrationMode();
        expect(mode).toBe('zerodb-only');
      });
    });

    describe('isMongoDBRequired', () => {
      it('should always return false', () => {
        expect(databaseAdapter.isMongoDBRequired()).toBe(false);
      });
    });

    describe('initialize', () => {
      it('should initialize with a ZeroDB token', async () => {
        zerodbService.initialize.mockResolvedValue(true);

        await databaseAdapter.initialize('test-token');

        expect(zerodbService.initialize).toHaveBeenCalledWith('test-token');
      });

      it('should throw error when no token is provided', async () => {
        await expect(databaseAdapter.initialize())
          .rejects.toThrow('ZeroDB token required');
      });

      it('should throw error when token is null', async () => {
        await expect(databaseAdapter.initialize(null))
          .rejects.toThrow('ZeroDB token required');
      });

      it('should throw error when token is empty string', async () => {
        await expect(databaseAdapter.initialize(''))
          .rejects.toThrow('ZeroDB token required');
      });

      it('should propagate initialization errors from zerodbService', async () => {
        zerodbService.initialize.mockRejectedValue(new Error('Connection failed'));

        await expect(databaseAdapter.initialize('test-token'))
          .rejects.toThrow('Connection failed');
      });

      it('should set initialized flag on success', async () => {
        zerodbService.initialize.mockResolvedValue(true);
        await databaseAdapter.initialize('test-token');

        // After initialization, operations should not throw initialization error
        zerodbService.insertRow.mockResolvedValue({ _id: '123' });
        await expect(databaseAdapter.create('User', { name: 'Test' })).resolves.toBeDefined();
      });
    });
  });

  describe('Uninitialized State', () => {
    it('should throw error on create when not initialized', async () => {
      await expect(databaseAdapter.create('User', { name: 'Test' }))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on find when not initialized', async () => {
      await expect(databaseAdapter.find('User', {}))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on findOne when not initialized', async () => {
      await expect(databaseAdapter.findOne('User', {}))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on findById when not initialized', async () => {
      await expect(databaseAdapter.findById('User', '123'))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on update when not initialized', async () => {
      await expect(databaseAdapter.update('User', {}, {}))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on findByIdAndUpdate when not initialized', async () => {
      await expect(databaseAdapter.findByIdAndUpdate('User', '123', {}))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on delete when not initialized', async () => {
      await expect(databaseAdapter.delete('User', {}))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on findByIdAndDelete when not initialized', async () => {
      await expect(databaseAdapter.findByIdAndDelete('User', '123'))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on count when not initialized', async () => {
      await expect(databaseAdapter.count('User', {}))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });

    it('should throw error on aggregate when not initialized', async () => {
      await expect(databaseAdapter.aggregate('User', []))
        .rejects.toThrow('DatabaseAdapter not initialized');
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    describe('create', () => {
      it('should create a document via zerodbService.insertRow', async () => {
        const data = { userId: 'USER_001', firstName: 'John', email: 'john@example.com' };
        const mockResult = { _id: 'zero_123', ...data };

        zerodbService.insertRow.mockResolvedValue(mockResult);

        const result = await databaseAdapter.create('User', data);

        expect(zerodbService.insertRow).toHaveBeenCalledWith('users', data);
        expect(result).toEqual(mockResult);
      });

      it('should convert model name to table name', async () => {
        zerodbService.insertRow.mockResolvedValue({ _id: '123' });

        await databaseAdapter.create('ShareClass', { name: 'Common' });

        expect(zerodbService.insertRow).toHaveBeenCalledWith('share_class', { name: 'Common' });
      });

      it('should use mapped table names for known models', async () => {
        zerodbService.insertRow.mockResolvedValue({ _id: '123' });

        await databaseAdapter.create('SPVAsset', { name: 'Asset1' });

        expect(zerodbService.insertRow).toHaveBeenCalledWith('spv_assets', { name: 'Asset1' });
      });

      it('should propagate create errors', async () => {
        zerodbService.insertRow.mockRejectedValue(new Error('Insert failed'));

        await expect(databaseAdapter.create('User', { name: 'Test' }))
          .rejects.toThrow('Insert failed');
      });

      it('should record success metrics on successful create', async () => {
        zerodbService.insertRow.mockResolvedValue({ _id: '123' });

        await databaseAdapter.create('User', { name: 'Test' });

        const metrics = databaseAdapter.getMetrics();
        expect(metrics.zerodb.successCount).toBeGreaterThan(0);
      });

      it('should record error metrics on failed create', async () => {
        zerodbService.insertRow.mockRejectedValue(new Error('Failed'));

        try {
          await databaseAdapter.create('User', { name: 'Test' });
        } catch (error) {
          // Expected
        }

        const metrics = databaseAdapter.getMetrics();
        expect(metrics.zerodb.errorCount).toBeGreaterThan(0);
      });
    });

    describe('find', () => {
      it('should find documents via zerodbService.queryTable', async () => {
        const mockResults = [
          { _id: '1', email: 'user1@example.com' },
          { _id: '2', email: 'user2@example.com' }
        ];

        zerodbService.queryTable.mockResolvedValue(mockResults);

        const result = await databaseAdapter.find('User', { role: 'admin' });

        expect(zerodbService.queryTable).toHaveBeenCalledWith('users', {
          filter: { role: 'admin' },
          limit: undefined,
          sort: undefined,
          skip: undefined,
          projection: undefined
        });
        expect(result).toEqual(mockResults);
      });

      it('should pass options (limit, sort, skip, projection) to queryTable', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        await databaseAdapter.find('Company', { status: 'active' }, {
          limit: 10,
          sort: { name: 1 },
          skip: 5,
          projection: { name: 1, status: 1 }
        });

        expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', {
          filter: { status: 'active' },
          limit: 10,
          sort: { name: 1 },
          skip: 5,
          projection: { name: 1, status: 1 }
        });
      });

      it('should return empty array on table not found error', async () => {
        const error = new Error('Table not found');
        error.message = 'Table not found';
        zerodbService.queryTable.mockRejectedValue(error);

        const result = await databaseAdapter.find('NonExistentModel', {});

        expect(result).toEqual([]);
      });

      it('should propagate non-not-found errors', async () => {
        zerodbService.queryTable.mockRejectedValue(new Error('Connection lost'));

        await expect(databaseAdapter.find('User', {}))
          .rejects.toThrow('Connection lost');
      });

      it('should use default empty query and options', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        const result = await databaseAdapter.find('User');

        expect(result).toEqual([]);
        expect(zerodbService.queryTable).toHaveBeenCalledWith('users', expect.objectContaining({
          filter: {}
        }));
      });
    });

    describe('findOne', () => {
      it('should return first matching document', async () => {
        const mockDoc = { _id: '123', email: 'test@example.com' };
        zerodbService.queryTable.mockResolvedValue([mockDoc]);

        const result = await databaseAdapter.findOne('User', { email: 'test@example.com' });

        expect(result).toEqual(mockDoc);
        expect(zerodbService.queryTable).toHaveBeenCalledWith('users', expect.objectContaining({
          filter: { email: 'test@example.com' },
          limit: 1
        }));
      });

      it('should return null when no document found', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        const result = await databaseAdapter.findOne('User', { userId: 'NONEXISTENT' });

        expect(result).toBeNull();
      });

      it('should return null when queryTable returns null', async () => {
        zerodbService.queryTable.mockResolvedValue(null);

        const result = await databaseAdapter.findOne('User', { userId: 'NONEXISTENT' });

        expect(result).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find document by ID', async () => {
        const mockDoc = { _id: 'doc_123', CompanyName: 'Test Corp' };
        zerodbService.queryTable.mockResolvedValue([mockDoc]);

        const result = await databaseAdapter.findById('Company', 'doc_123');

        expect(result).toEqual(mockDoc);
        expect(zerodbService.queryTable).toHaveBeenCalledWith('companies', expect.objectContaining({
          filter: { _id: 'doc_123' },
          limit: 1
        }));
      });

      it('should return null when ID is not found', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        const result = await databaseAdapter.findById('Company', 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('update', () => {
      it('should update documents via zerodbService.updateRows', async () => {
        const mockResult = { updatedCount: 1 };
        zerodbService.updateRows.mockResolvedValue(mockResult);

        const result = await databaseAdapter.update(
          'User',
          { userId: 'USER_001' },
          { email: 'newemail@example.com' }
        );

        expect(zerodbService.updateRows).toHaveBeenCalledWith('users', {
          filter: { userId: 'USER_001' },
          update: { email: 'newemail@example.com' }
        });
        expect(result).toEqual(mockResult);
      });

      it('should propagate update errors', async () => {
        zerodbService.updateRows.mockRejectedValue(new Error('Update failed'));

        await expect(databaseAdapter.update('User', { userId: 'USER_001' }, { name: 'New' }))
          .rejects.toThrow('Update failed');
      });
    });

    describe('findByIdAndUpdate', () => {
      it('should update a document by ID', async () => {
        const mockResult = { _id: '123', name: 'Updated' };
        zerodbService.updateRows.mockResolvedValue(mockResult);

        const result = await databaseAdapter.findByIdAndUpdate('User', '123', { name: 'Updated' });

        expect(zerodbService.updateRows).toHaveBeenCalledWith('users', {
          filter: { _id: '123' },
          update: { name: 'Updated' }
        });
        expect(result).toEqual(mockResult);
      });
    });

    describe('delete', () => {
      it('should delete documents via zerodbService.deleteRows', async () => {
        const mockResult = { deletedCount: 1 };
        zerodbService.deleteRows.mockResolvedValue(mockResult);

        const result = await databaseAdapter.delete('Notification', { notificationId: 'NOTIF_001' });

        expect(zerodbService.deleteRows).toHaveBeenCalledWith('compliance_events', {
          filter: { notificationId: 'NOTIF_001' }
        });
        expect(result).toEqual(mockResult);
      });

      it('should propagate delete errors', async () => {
        zerodbService.deleteRows.mockRejectedValue(new Error('Delete failed'));

        await expect(databaseAdapter.delete('User', { userId: 'USER_001' }))
          .rejects.toThrow('Delete failed');
      });
    });

    describe('findByIdAndDelete', () => {
      it('should delete a document by ID', async () => {
        const mockResult = { _id: '123', deletedCount: 1 };
        zerodbService.deleteRows.mockResolvedValue(mockResult);

        const result = await databaseAdapter.findByIdAndDelete('User', '123');

        expect(zerodbService.deleteRows).toHaveBeenCalledWith('users', {
          filter: { _id: '123' }
        });
        expect(result).toEqual(mockResult);
      });
    });

    describe('count', () => {
      it('should count documents matching query', async () => {
        zerodbService.queryTable.mockResolvedValue(5);

        const result = await databaseAdapter.count('User', { role: 'admin' });

        expect(result).toBe(5);
        expect(zerodbService.queryTable).toHaveBeenCalledWith('users', {
          filter: { role: 'admin' },
          countOnly: true
        });
      });

      it('should handle count result as object with count property', async () => {
        zerodbService.queryTable.mockResolvedValue({ count: 10 });

        const result = await databaseAdapter.count('User', { role: 'admin' });

        expect(result).toBe(10);
      });

      it('should handle count result as array with length', async () => {
        zerodbService.queryTable.mockResolvedValue([1, 2, 3]);

        const result = await databaseAdapter.count('User', { role: 'admin' });

        expect(result).toBe(3);
      });

      it('should return 0 for table not found', async () => {
        const error = new Error('Table not found');
        zerodbService.queryTable.mockRejectedValue(error);

        const result = await databaseAdapter.count('NonExistent', {});

        expect(result).toBe(0);
      });

      it('should use default empty query', async () => {
        zerodbService.queryTable.mockResolvedValue(0);

        const result = await databaseAdapter.count('User');

        expect(result).toBe(0);
      });
    });
  });

  describe('Aggregation', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should handle $match stage by querying ZeroDB', async () => {
      const mockData = [
        { _id: '1', status: 'active', amount: 100 },
        { _id: '2', status: 'active', amount: 200 }
      ];
      zerodbService.queryTable.mockResolvedValue(mockData);

      const pipeline = [
        { $match: { status: 'active' } }
      ];

      const result = await databaseAdapter.aggregate('User', pipeline);

      expect(result).toEqual(mockData);
    });

    it('should handle $match followed by $group with $sum', async () => {
      const mockData = [
        { _id: '1', status: 'active', amount: 100 },
        { _id: '2', status: 'active', amount: 200 },
        { _id: '3', status: 'inactive', amount: 50 }
      ];
      zerodbService.queryTable.mockResolvedValue(mockData);

      const pipeline = [
        { $match: {} },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' }
          }
        }
      ];

      const result = await databaseAdapter.aggregate('FinancialReport', pipeline);

      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({ _id: 'active', totalAmount: 300 }),
        expect.objectContaining({ _id: 'inactive', totalAmount: 50 })
      ]));
    });

    it('should handle $group with $avg operator', async () => {
      const mockData = [
        { _id: '1', category: 'A', value: 10 },
        { _id: '2', category: 'A', value: 20 },
        { _id: '3', category: 'B', value: 30 }
      ];
      zerodbService.queryTable.mockResolvedValue(mockData);

      const pipeline = [
        { $match: {} },
        {
          $group: {
            _id: '$category',
            avgValue: { $avg: '$value' }
          }
        }
      ];

      const result = await databaseAdapter.aggregate('Transaction', pipeline);

      const groupA = result.find(r => r._id === 'A');
      expect(groupA.avgValue).toBe(15);
    });

    it('should handle $group with $max operator', async () => {
      const mockData = [
        { _id: '1', category: 'A', value: 10 },
        { _id: '2', category: 'A', value: 20 }
      ];
      zerodbService.queryTable.mockResolvedValue(mockData);

      const pipeline = [
        { $match: {} },
        { $group: { _id: '$category', maxValue: { $max: '$value' } } }
      ];

      const result = await databaseAdapter.aggregate('Transaction', pipeline);

      expect(result[0].maxValue).toBe(20);
    });

    it('should handle $group with $min operator', async () => {
      const mockData = [
        { _id: '1', category: 'A', value: 10 },
        { _id: '2', category: 'A', value: 20 }
      ];
      zerodbService.queryTable.mockResolvedValue(mockData);

      const pipeline = [
        { $match: {} },
        { $group: { _id: '$category', minValue: { $min: '$value' } } }
      ];

      const result = await databaseAdapter.aggregate('Transaction', pipeline);

      expect(result[0].minValue).toBe(10);
    });

    it('should handle $group with null _id (group all)', async () => {
      const mockData = [
        { _id: '1', amount: 100 },
        { _id: '2', amount: 200 }
      ];
      zerodbService.queryTable.mockResolvedValue(mockData);

      const pipeline = [
        { $match: {} },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ];

      const result = await databaseAdapter.aggregate('Transaction', pipeline);

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBeNull();
      expect(result[0].total).toBe(300);
    });

    it('should propagate aggregate errors', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Aggregation failed'));

      const pipeline = [{ $match: { status: 'active' } }];

      await expect(databaseAdapter.aggregate('User', pipeline))
        .rejects.toThrow('Aggregation failed');
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    describe('getMetrics', () => {
      it('should return zerodb metrics', () => {
        const metrics = databaseAdapter.getMetrics();

        expect(metrics).toHaveProperty('zerodb');
        expect(metrics.zerodb).toHaveProperty('averageResponseTime');
        expect(metrics.zerodb).toHaveProperty('errorCount');
        expect(metrics.zerodb).toHaveProperty('successCount');
        expect(metrics.zerodb).toHaveProperty('errorRate');
      });

      it('should track successful operations', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        await databaseAdapter.find('User', {});
        await databaseAdapter.find('Company', {});

        const metrics = databaseAdapter.getMetrics();

        expect(metrics.zerodb.successCount).toBe(2);
        expect(metrics.zerodb.errorCount).toBe(0);
      });

      it('should track failed operations', async () => {
        zerodbService.queryTable.mockRejectedValue(new Error('Query failed'));

        try { await databaseAdapter.find('User', {}); } catch (e) {}
        try { await databaseAdapter.find('Company', {}); } catch (e) {}

        const metrics = databaseAdapter.getMetrics();

        expect(metrics.zerodb.errorCount).toBe(2);
      });

      it('should calculate error rate', async () => {
        zerodbService.queryTable
          .mockResolvedValueOnce([])
          .mockRejectedValueOnce(new Error('Failed'));

        await databaseAdapter.find('User', {});
        try { await databaseAdapter.find('Company', {}); } catch (e) {}

        const metrics = databaseAdapter.getMetrics();

        // 1 error / (1 error + 1 success) = 50%
        expect(metrics.zerodb.errorRate).toBe(50);
      });

      it('should calculate average response time', async () => {
        zerodbService.queryTable.mockResolvedValue([]);

        await databaseAdapter.find('User', {});

        const metrics = databaseAdapter.getMetrics();

        expect(metrics.zerodb.averageResponseTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('resetMetrics', () => {
      it('should reset all metrics to initial state', async () => {
        zerodbService.queryTable.mockResolvedValue([]);
        await databaseAdapter.find('User', {});

        let metrics = databaseAdapter.getMetrics();
        expect(metrics.zerodb.successCount).toBeGreaterThan(0);

        databaseAdapter.resetMetrics();

        metrics = databaseAdapter.getMetrics();
        expect(metrics.zerodb.successCount).toBe(0);
        expect(metrics.zerodb.errorCount).toBe(0);
        expect(metrics.zerodb.averageResponseTime).toBe(0);
        expect(metrics.zerodb.errorRate).toBe(0);
      });
    });
  });

  describe('Model to Table Name Mapping', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
      zerodbService.insertRow.mockResolvedValue({ _id: '123' });
    });

    it('should map User to users', async () => {
      await databaseAdapter.create('User', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('users', {});
    });

    it('should map Document to documents', async () => {
      await databaseAdapter.create('Document', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('documents', {});
    });

    it('should map Company to companies', async () => {
      await databaseAdapter.create('Company', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('companies', {});
    });

    it('should map SPV to spvs', async () => {
      await databaseAdapter.create('SPV', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('spvs', {});
    });

    it('should map SPVAsset to spv_assets', async () => {
      await databaseAdapter.create('SPVAsset', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('spv_assets', {});
    });

    it('should map AuditLog to audit_logs', async () => {
      await databaseAdapter.create('AuditLog', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('audit_logs', {});
    });

    it('should map FinancialReport to financial_reports', async () => {
      await databaseAdapter.create('FinancialReport', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('financial_reports', {});
    });

    it('should convert unmapped CamelCase model names to snake_case', async () => {
      await databaseAdapter.create('ShareClass', {});
      expect(zerodbService.insertRow).toHaveBeenCalledWith('share_class', {});
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should handle concurrent create operations', async () => {
      zerodbService.insertRow.mockImplementation(async (table, data) => {
        return { _id: `id_${Date.now()}_${Math.random()}`, ...data };
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        databaseAdapter.create('User', { email: `user${i}@example.com` })
      );

      const results = await Promise.allSettled(promises);

      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle concurrent read operations', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      const promises = Array.from({ length: 10 }, () =>
        databaseAdapter.find('User', { status: 'active' })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual([]);
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should handle empty query results', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      const result = await databaseAdapter.find('User', { userId: 'NONEXISTENT' });

      expect(result).toEqual([]);
    });

    it('should handle special characters in data', async () => {
      const data = {
        userId: 'USER_001',
        name: 'Test \u00e9 \u00e7 \u00f1 User',
        bio: 'Line1\nLine2\tTabbed'
      };

      zerodbService.insertRow.mockResolvedValue({ _id: '123', ...data });

      const result = await databaseAdapter.create('User', data);

      expect(result.name).toContain('\u00e9');
      expect(result.bio).toContain('\n');
    });

    it('should handle undefined and null fields in data', async () => {
      const data = {
        companyId: 'COMP_001',
        CompanyName: undefined,
        TaxID: null
      };

      zerodbService.insertRow.mockResolvedValue({ _id: '123', ...data });

      const result = await databaseAdapter.create('Company', data);

      expect(result).toHaveProperty('companyId', 'COMP_001');
    });

    it('should handle large documents', async () => {
      const largeContent = 'x'.repeat(1000000);
      const data = { documentId: 'DOC_001', content: largeContent };

      zerodbService.insertRow.mockResolvedValue({ _id: '123', ...data });

      const result = await databaseAdapter.create('Document', data);

      expect(result.content.length).toBe(1000000);
    });
  });

  describe('Complete CRUD Workflow', () => {
    beforeEach(async () => {
      zerodbService.initialize.mockResolvedValue(true);
      await databaseAdapter.initialize('test-token');
    });

    it('should handle complete lifecycle: create, find, update, delete', async () => {
      const userData = { userId: 'USER_001', email: 'test@example.com', role: 'user' };

      // Create
      zerodbService.insertRow.mockResolvedValue({ _id: 'doc_123', ...userData });
      const created = await databaseAdapter.create('User', userData);
      expect(created._id).toBe('doc_123');

      // Find
      zerodbService.queryTable.mockResolvedValue([{ _id: 'doc_123', ...userData }]);
      const found = await databaseAdapter.find('User', { userId: 'USER_001' });
      expect(found).toHaveLength(1);

      // Update
      zerodbService.updateRows.mockResolvedValue({ updatedCount: 1 });
      const updated = await databaseAdapter.update('User', { userId: 'USER_001' }, { role: 'admin' });
      expect(updated.updatedCount).toBe(1);

      // Delete
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });
      const deleted = await databaseAdapter.delete('User', { userId: 'USER_001' });
      expect(deleted.deletedCount).toBe(1);
    });
  });
});
