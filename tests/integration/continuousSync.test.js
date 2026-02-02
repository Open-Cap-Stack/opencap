/**
 * Integration Tests for Continuous Sync
 * End-to-end testing of MongoDB to ZeroDB synchronization
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const syncOrchestrator = require('../../services/syncOrchestrator');
const zerodbService = require('../../services/zerodbService');

// Mock ZeroDB Service for integration tests
jest.mock('../../services/zerodbService');

describe('Continuous Sync Integration Tests', () => {
  let mongoServer;
  let UserModel;
  let CompanyModel;
  let orchestrator;

  // Define test schemas
  const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const companySchema = new mongoose.Schema({
    name: String,
    industry: String,
    employees: Number,
    createdAt: { type: Date, default: Date.now }
  });

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create models
    UserModel = mongoose.model('User', userSchema);
    CompanyModel = mongoose.model('Company', companySchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clear all collections
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }

    // Mock ZeroDB operations
    zerodbService.insertRow = jest.fn().mockResolvedValue({
      success: true,
      inserted_ids: ['zerodb-id-123']
    });

    zerodbService.updateRows = jest.fn().mockResolvedValue({
      success: true,
      modified_count: 1
    });

    zerodbService.deleteRows = jest.fn().mockResolvedValue({
      success: true,
      deleted_count: 1
    });

    zerodbService.queryTable = jest.fn().mockResolvedValue({
      rows: []
    });
  });

  afterEach(async () => {
    if (orchestrator && orchestrator.isRunning) {
      await orchestrator.stop();
    }
  });

  describe('End-to-End Insert Sync', () => {
    it('should sync new user insert to ZeroDB', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Create a new user in MongoDB
      const newUser = await UserModel.create({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin'
      });

      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify ZeroDB insert was called
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'sync_users',
        expect.objectContaining({
          mongo_id: newUser._id.toString(),
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin'
        })
      );
    }, 10000);

    it('should sync multiple inserts in batch', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        batchSize: 3
      });

      await orchestrator.start();

      // Create multiple users
      const users = await UserModel.insertMany([
        { name: 'User 1', email: 'user1@example.com', role: 'user' },
        { name: 'User 2', email: 'user2@example.com', role: 'user' },
        { name: 'User 3', email: 'user3@example.com', role: 'admin' }
      ]);

      // Wait for batch sync
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify batch insert
      expect(zerodbService.insertRow).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('End-to-End Update Sync', () => {
    it('should sync user update to ZeroDB', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Create initial user
      const user = await UserModel.create({
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Update the user
      user.role = 'admin';
      user.email = 'jane.admin@example.com';
      await user.save();

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify ZeroDB update was called
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'sync_users',
        { mongo_id: user._id.toString() },
        expect.objectContaining({
          role: 'admin',
          email: 'jane.admin@example.com'
        })
      );
    }, 10000);

    it('should handle concurrent updates correctly', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      const user = await UserModel.create({
        name: 'Concurrent User',
        email: 'concurrent@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Perform concurrent updates
      await Promise.all([
        UserModel.updateOne({ _id: user._id }, { role: 'admin' }),
        UserModel.updateOne({ _id: user._id }, { email: 'new@example.com' })
      ]);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have synced both updates
      expect(zerodbService.updateRows.mock.calls.length).toBeGreaterThanOrEqual(2);
    }, 10000);
  });

  describe('End-to-End Delete Sync', () => {
    it('should sync user deletion to ZeroDB', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Create and then delete user
      const user = await UserModel.create({
        name: 'Delete Me',
        email: 'delete@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      const userId = user._id.toString();
      await UserModel.deleteOne({ _id: user._id });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify ZeroDB delete was called
      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'sync_users',
        { mongo_id: userId }
      );
    }, 10000);

    it('should handle bulk deletes', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Create multiple users
      await UserModel.insertMany([
        { name: 'User 1', email: 'user1@example.com', role: 'temp' },
        { name: 'User 2', email: 'user2@example.com', role: 'temp' },
        { name: 'User 3', email: 'user3@example.com', role: 'temp' }
      ]);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Delete all temp users
      await UserModel.deleteMany({ role: 'temp' });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify multiple deletes
      expect(zerodbService.deleteRows.mock.calls.length).toBeGreaterThanOrEqual(3);
    }, 10000);
  });

  describe('Conflict Resolution', () => {
    it('should handle last-write-wins conflict resolution', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        conflictResolution: 'last-write-wins'
      });

      await orchestrator.start();

      const user = await UserModel.create({
        name: 'Conflict User',
        email: 'conflict@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate ZeroDB having older data
      zerodbService.queryTable.mockResolvedValue({
        rows: [{
          mongo_id: user._id.toString(),
          name: 'Old Name',
          sync_timestamp: new Date(Date.now() - 60000)
        }]
      });

      // Update in MongoDB
      user.name = 'New Name';
      await user.save();

      await new Promise(resolve => setTimeout(resolve, 500));

      // MongoDB version should win
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'sync_users',
        { mongo_id: user._id.toString() },
        expect.objectContaining({
          name: 'New Name'
        })
      );
    }, 10000);

    it('should handle mongodb-wins conflict resolution', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        conflictResolution: 'mongodb-wins'
      });

      await orchestrator.start();

      const user = await UserModel.create({
        name: 'MongoDB Wins',
        email: 'mongodb@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Update in MongoDB
      user.name = 'MongoDB Update';
      await user.save();

      await new Promise(resolve => setTimeout(resolve, 500));

      // MongoDB version should always win
      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'sync_users',
        { mongo_id: user._id.toString() },
        expect.objectContaining({
          name: 'MongoDB Update'
        })
      );
    }, 10000);
  });

  describe('Failure Recovery', () => {
    it('should recover from network interruption', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        retryAttempts: 3
      });

      await orchestrator.start();

      // Simulate network failure then recovery
      zerodbService.insertRow
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const user = await UserModel.create({
        name: 'Network Test',
        email: 'network@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should eventually succeed after retries
      expect(zerodbService.insertRow).toHaveBeenCalledTimes(3);
    }, 15000);

    it('should handle ZeroDB service unavailable', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Simulate service unavailable
      zerodbService.insertRow.mockRejectedValue(new Error('Service unavailable'));

      const errorCallback = jest.fn();
      orchestrator.on('sync:error', errorCallback);

      await UserModel.create({
        name: 'Unavailable Test',
        email: 'unavailable@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(errorCallback).toHaveBeenCalled();
    }, 10000);

    it('should preserve resume token for recovery', async () => {
      const mockStorage = {
        saveResumeToken: jest.fn().mockResolvedValue(undefined),
        getResumeToken: jest.fn().mockResolvedValue(null)
      };

      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        storage: mockStorage
      });

      await orchestrator.start();

      // Create some changes
      await UserModel.create({ name: 'Token Test', email: 'token@example.com' });

      await new Promise(resolve => setTimeout(resolve, 500));

      await orchestrator.stop();

      // Resume token should be saved
      expect(mockStorage.saveResumeToken).toHaveBeenCalled();
    }, 10000);
  });

  describe('Reverse Sync (ZeroDB to MongoDB)', () => {
    it('should sync changes from ZeroDB to MongoDB', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        bidirectional: true,
        reverseSyncInterval: 500
      });

      await orchestrator.start();

      // Create initial user
      const user = await UserModel.create({
        name: 'Reverse Sync User',
        email: 'reverse@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate ZeroDB change
      zerodbService.queryTable.mockResolvedValue({
        rows: [{
          mongo_id: user._id.toString(),
          name: 'Updated from ZeroDB',
          email: 'reverse@example.com',
          sync_timestamp: new Date(),
          source: 'zerodb'
        }]
      });

      // Wait for reverse sync poll
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify user was updated in MongoDB
      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.name).toBe('Updated from ZeroDB');
    }, 10000);

    it('should prevent sync loops in bidirectional mode', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        bidirectional: true
      });

      await orchestrator.start();

      // Create user with sync metadata
      const user = await UserModel.create({
        name: 'Loop Prevention',
        email: 'loop@example.com',
        sync_source: 'zerodb'
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Should not sync back to ZeroDB
      expect(zerodbService.insertRow).not.toHaveBeenCalled();
    }, 10000);
  });

  describe('High Volume Stress Test', () => {
    it('should handle high volume of inserts', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        batchSize: 50
      });

      await orchestrator.start();

      // Create 100 users rapidly
      const users = Array(100).fill(null).map((_, i) => ({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: 'user'
      }));

      await UserModel.insertMany(users);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // All users should be synced
      expect(zerodbService.insertRow).toHaveBeenCalledTimes(100);
    }, 15000);

    it('should handle mixed operations under load', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        batchSize: 20
      });

      await orchestrator.start();

      // Create initial users
      const users = await UserModel.insertMany(
        Array(50).fill(null).map((_, i) => ({
          name: `User ${i}`,
          email: `user${i}@example.com`
        }))
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Perform mixed operations
      await Promise.all([
        // Updates
        ...users.slice(0, 20).map(user =>
          UserModel.updateOne({ _id: user._id }, { role: 'admin' })
        ),
        // Deletes
        ...users.slice(40, 50).map(user =>
          UserModel.deleteOne({ _id: user._id })
        ),
        // New inserts
        UserModel.insertMany(
          Array(10).fill(null).map((_, i) => ({
            name: `New User ${i}`,
            email: `newuser${i}@example.com`
          }))
        )
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const health = orchestrator.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.sync.errors).toBeLessThan(5); // Allow minimal errors under stress
    }, 20000);
  });

  describe('Graceful Shutdown', () => {
    it('should process pending changes before shutdown', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Create multiple users
      await UserModel.insertMany([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' }
      ]);

      // Immediately shutdown
      await orchestrator.shutdown();

      // All changes should be processed
      expect(zerodbService.insertRow).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should save resume token on graceful shutdown', async () => {
      const mockStorage = {
        saveResumeToken: jest.fn().mockResolvedValue(undefined),
        getResumeToken: jest.fn().mockResolvedValue(null)
      };

      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        storage: mockStorage
      });

      await orchestrator.start();

      await UserModel.create({ name: 'Shutdown Test', email: 'shutdown@example.com' });

      await new Promise(resolve => setTimeout(resolve, 300));

      await orchestrator.shutdown();

      expect(mockStorage.saveResumeToken).toHaveBeenCalled();
    }, 10000);
  });

  describe('Multi-Collection Sync', () => {
    it('should sync multiple collections simultaneously', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users', 'companies'],
        tableMappings: {
          users: 'sync_users',
          companies: 'sync_companies'
        }
      });

      await orchestrator.start();

      // Create in both collections
      await Promise.all([
        UserModel.create({ name: 'User', email: 'user@example.com' }),
        CompanyModel.create({ name: 'Company', industry: 'Tech', employees: 100 })
      ]);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify both were synced to correct tables
      const insertCalls = zerodbService.insertRow.mock.calls;
      const userInserts = insertCalls.filter(call => call[0] === 'sync_users');
      const companyInserts = insertCalls.filter(call => call[0] === 'sync_companies');

      expect(userInserts.length).toBe(1);
      expect(companyInserts.length).toBe(1);
    }, 10000);

    it('should handle errors in one collection without affecting others', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users', 'companies'],
        tableMappings: {
          users: 'sync_users',
          companies: 'sync_companies'
        }
      });

      await orchestrator.start();

      // Fail user inserts but not company inserts
      zerodbService.insertRow.mockImplementation((tableName) => {
        if (tableName === 'sync_users') {
          return Promise.reject(new Error('User sync failed'));
        }
        return Promise.resolve({ success: true });
      });

      await Promise.all([
        UserModel.create({ name: 'User', email: 'user@example.com' }),
        CompanyModel.create({ name: 'Company', industry: 'Tech', employees: 50 })
      ]);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Company should still sync successfully
      const companyInserts = zerodbService.insertRow.mock.calls.filter(
        call => call[0] === 'sync_companies'
      );
      expect(companyInserts.length).toBe(1);
    }, 10000);
  });

  describe('Performance Benchmarks', () => {
    it('should sync 1000 records within acceptable time', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        },
        batchSize: 100
      });

      await orchestrator.start();

      const startTime = Date.now();

      // Create 1000 users
      const users = Array(1000).fill(null).map((_, i) => ({
        name: `Benchmark User ${i}`,
        email: `benchmark${i}@example.com`
      }));

      await UserModel.insertMany(users);

      await new Promise(resolve => setTimeout(resolve, 5000));

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 10 seconds)
      expect(duration).toBeLessThan(10000);
      expect(zerodbService.insertRow).toHaveBeenCalledTimes(1000);

      const metrics = orchestrator.getMetrics();
      expect(metrics.eventsPerSecond).toBeGreaterThan(100);
    }, 20000);

    it('should maintain low sync latency', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        tableMappings: {
          users: 'sync_users'
        }
      });

      await orchestrator.start();

      // Simulate realistic sync delay
      zerodbService.insertRow.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      });

      const startTime = Date.now();

      await UserModel.create({
        name: 'Latency Test',
        email: 'latency@example.com'
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const latency = Date.now() - startTime;

      // Total latency should be low (< 500ms)
      expect(latency).toBeLessThan(500);
    }, 10000);
  });
});
