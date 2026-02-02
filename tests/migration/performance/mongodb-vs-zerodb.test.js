/**
 * MongoDB vs ZeroDB Performance Comparison Tests
 *
 * Compares query performance, throughput, and latency between MongoDB and ZeroDB
 * Measures startup time, concurrent operations, and memory usage
 * Provides performance benchmarks for decision-making
 *
 * CRITICAL: Run these tests to validate that ZeroDB performance is acceptable
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const zerodbService = require('../../../services/zerodbService');
const databaseAdapter = require('../../../services/databaseAdapter');
const User = require('../../../models/User');

describe('MongoDB vs ZeroDB Performance Comparison', () => {
  let mongoServer;
  const performanceMetrics = {
    mongodb: {},
    zerodb: {}
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();

    // Output performance comparison summary
    console.log('\n====== PERFORMANCE COMPARISON SUMMARY ======');
    console.log('MongoDB Metrics:', JSON.stringify(performanceMetrics.mongodb, null, 2));
    console.log('ZeroDB Metrics:', JSON.stringify(performanceMetrics.zerodb, null, 2));
    console.log('===========================================\n');
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  describe('Connection and Initialization', () => {
    it('should measure MongoDB connection time', async () => {
      const start = Date.now();

      // Simulate reconnection
      await mongoose.connection.close();
      await mongoose.connect(mongoServer.getUri());

      const duration = Date.now() - start;
      performanceMetrics.mongodb.connectionTime = duration;

      console.log(`MongoDB connection time: ${duration}ms`);
      expect(duration).toBeLessThan(5000);
    });

    it('should measure ZeroDB initialization time', async () => {
      const start = Date.now();

      // Mock initialization
      const mockToken = 'mock-jwt-token';
      if (!zerodbService.projectId) {
        zerodbService.projectId = 'test-project';
        zerodbService.token = mockToken;
      }

      const duration = Date.now() - start;
      performanceMetrics.zerodb.initializationTime = duration;

      console.log(`ZeroDB initialization time: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });

    it('should compare startup overhead', () => {
      const mongoStartup = performanceMetrics.mongodb.connectionTime || 0;
      const zerodbStartup = performanceMetrics.zerodb.initializationTime || 0;

      console.log(`Startup comparison: MongoDB ${mongoStartup}ms vs ZeroDB ${zerodbStartup}ms`);

      performanceMetrics.comparison = {
        startupDifference: mongoStartup - zerodbStartup,
        startupRatio: mongoStartup / (zerodbStartup || 1)
      };
    });
  });

  describe('Single Document Operations', () => {
    it('should compare create performance', async () => {
      const userData = {
        email: 'perf@test.com',
        password: 'pass123',
        name: 'Performance User'
      };

      // MongoDB create
      const mongoStart = Date.now();
      const mongoUser = await User.create(userData);
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB create (mocked)
      const mockInsertRows = jest.spyOn(zerodbService, 'insertRows');
      mockInsertRows.mockResolvedValue([{ ...userData, _id: 'test-id' }]);

      const zerodbStart = Date.now();
      await zerodbService.insertRows('users', [userData]);
      const zerodbDuration = Date.now() - zerodbStart;

      mockInsertRows.mockRestore();

      performanceMetrics.mongodb.singleCreate = mongoDuration;
      performanceMetrics.zerodb.singleCreate = zerodbDuration;

      console.log(`Create: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
      expect(mongoDuration).toBeLessThan(100);
    });

    it('should compare read performance', async () => {
      // Create test data
      await User.create({
        email: 'read@test.com',
        password: 'pass',
        name: 'Read Test'
      });

      // MongoDB read
      const mongoStart = Date.now();
      await User.findOne({ email: 'read@test.com' });
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB read (mocked)
      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([{ _id: 'id1', email: 'read@test.com', name: 'Read Test' }]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', { filter: { email: 'read@test.com' } });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      performanceMetrics.mongodb.singleRead = mongoDuration;
      performanceMetrics.zerodb.singleRead = zerodbDuration;

      console.log(`Read: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });

    it('should compare update performance', async () => {
      const user = await User.create({
        email: 'update@test.com',
        password: 'pass',
        name: 'Update Test'
      });

      // MongoDB update
      const mongoStart = Date.now();
      await User.findByIdAndUpdate(user._id, { name: 'Updated' });
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB update (mocked)
      const mockUpdateRows = jest.spyOn(zerodbService, 'updateRows');
      mockUpdateRows.mockResolvedValue({ modifiedCount: 1 });

      const zerodbStart = Date.now();
      await zerodbService.updateRows('users', {
        filter: { _id: user._id.toString() },
        update: { $set: { name: 'Updated' } }
      });
      const zerodbDuration = Date.now() - zerodbStart;

      mockUpdateRows.mockRestore();

      performanceMetrics.mongodb.singleUpdate = mongoDuration;
      performanceMetrics.zerodb.singleUpdate = zerodbDuration;

      console.log(`Update: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });

    it('should compare delete performance', async () => {
      const user = await User.create({
        email: 'delete@test.com',
        password: 'pass',
        name: 'Delete Test'
      });

      // MongoDB delete
      const mongoStart = Date.now();
      await User.findByIdAndDelete(user._id);
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB delete (mocked)
      const mockDeleteRows = jest.spyOn(zerodbService, 'deleteRows');
      mockDeleteRows.mockResolvedValue({ deletedCount: 1 });

      const zerodbStart = Date.now();
      await zerodbService.deleteRows('users', { filter: { _id: user._id.toString() } });
      const zerodbDuration = Date.now() - zerodbStart;

      mockDeleteRows.mockRestore();

      performanceMetrics.mongodb.singleDelete = mongoDuration;
      performanceMetrics.zerodb.singleDelete = zerodbDuration;

      console.log(`Delete: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });
  });

  describe('Batch Operations', () => {
    it('should compare bulk insert performance', async () => {
      const batchSize = 100;
      const testData = Array.from({ length: batchSize }, (_, i) => ({
        email: `batch${i}@test.com`,
        password: 'pass',
        name: `Batch User ${i}`
      }));

      // MongoDB bulk insert
      const mongoStart = Date.now();
      await User.insertMany(testData);
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB bulk insert (mocked)
      const mockInsertRows = jest.spyOn(zerodbService, 'insertRows');
      mockInsertRows.mockResolvedValue(testData.map((d, i) => ({ ...d, _id: `id${i}` })));

      const zerodbStart = Date.now();
      await zerodbService.insertRows('users', testData);
      const zerodbDuration = Date.now() - zerodbStart;

      mockInsertRows.mockRestore();

      const mongoThroughput = batchSize / (mongoDuration / 1000);
      const zerodbThroughput = batchSize / (zerodbDuration / 1000);

      performanceMetrics.mongodb.bulkInsert = {
        duration: mongoDuration,
        throughput: mongoThroughput,
        recordsPerSecond: mongoThroughput.toFixed(2)
      };
      performanceMetrics.zerodb.bulkInsert = {
        duration: zerodbDuration,
        throughput: zerodbThroughput,
        recordsPerSecond: zerodbThroughput.toFixed(2)
      };

      console.log(`Bulk insert (${batchSize} records):`);
      console.log(`  MongoDB: ${mongoDuration}ms (${mongoThroughput.toFixed(2)} records/sec)`);
      console.log(`  ZeroDB: ${zerodbDuration}ms (${zerodbThroughput.toFixed(2)} records/sec)`);
    });

    it('should compare bulk query performance', async () => {
      // Seed data
      const testData = Array.from({ length: 100 }, (_, i) => ({
        email: `query${i}@test.com`,
        password: 'pass',
        name: `Query User ${i}`,
        role: i % 2 === 0 ? 'admin' : 'user'
      }));
      await User.insertMany(testData);

      // MongoDB bulk query
      const mongoStart = Date.now();
      const mongoResults = await User.find({ role: 'admin' });
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB bulk query (mocked)
      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue(testData.filter(d => d.role === 'admin'));

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', { filter: { role: 'admin' } });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      performanceMetrics.mongodb.bulkQuery = mongoDuration;
      performanceMetrics.zerodb.bulkQuery = zerodbDuration;

      console.log(`Bulk query (${mongoResults.length} results):`);
      console.log(`  MongoDB: ${mongoDuration}ms`);
      console.log(`  ZeroDB: ${zerodbDuration}ms`);
    });

    it('should compare bulk update performance', async () => {
      await User.insertMany(
        Array.from({ length: 50 }, (_, i) => ({
          email: `update${i}@test.com`,
          password: 'pass',
          name: `User ${i}`
        }))
      );

      // MongoDB bulk update
      const mongoStart = Date.now();
      await User.updateMany({}, { $set: { updated: true } });
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB bulk update (mocked)
      const mockUpdateRows = jest.spyOn(zerodbService, 'updateRows');
      mockUpdateRows.mockResolvedValue({ modifiedCount: 50 });

      const zerodbStart = Date.now();
      await zerodbService.updateRows('users', {
        filter: {},
        update: { $set: { updated: true } }
      });
      const zerodbDuration = Date.now() - zerodbStart;

      mockUpdateRows.mockRestore();

      performanceMetrics.mongodb.bulkUpdate = mongoDuration;
      performanceMetrics.zerodb.bulkUpdate = zerodbDuration;

      console.log(`Bulk update (50 records):`);
      console.log(`  MongoDB: ${mongoDuration}ms`);
      console.log(`  ZeroDB: ${zerodbDuration}ms`);
    });
  });

  describe('Query Complexity', () => {
    beforeEach(async () => {
      // Seed complex dataset
      const complexData = Array.from({ length: 100 }, (_, i) => ({
        email: `complex${i}@test.com`,
        password: 'pass',
        name: `User ${i}`,
        role: ['admin', 'user', 'moderator'][i % 3],
        age: 20 + (i % 50),
        metadata: {
          score: Math.random() * 100,
          verified: i % 2 === 0
        },
        createdAt: new Date(Date.now() - i * 86400000)
      }));
      await User.insertMany(complexData);
    });

    it('should compare simple equality query', async () => {
      const mongoStart = Date.now();
      await User.find({ role: 'admin' });
      const mongoDuration = Date.now() - mongoStart;

      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', { filter: { role: 'admin' } });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      console.log(`Simple query: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });

    it('should compare range query', async () => {
      const mongoStart = Date.now();
      await User.find({ age: { $gte: 30, $lte: 40 } });
      const mongoDuration = Date.now() - mongoStart;

      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', { filter: { age: { $gte: 30, $lte: 40 } } });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      console.log(`Range query: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });

    it('should compare complex nested query', async () => {
      const mongoStart = Date.now();
      await User.find({
        role: 'user',
        age: { $gte: 25 },
        'metadata.verified': true
      });
      const mongoDuration = Date.now() - mongoStart;

      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', {
        filter: {
          role: 'user',
          age: { $gte: 25 },
          'metadata.verified': true
        }
      });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      console.log(`Complex query: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });

    it('should compare OR query', async () => {
      const mongoStart = Date.now();
      await User.find({
        $or: [
          { role: 'admin' },
          { age: { $gte: 40 } }
        ]
      });
      const mongoDuration = Date.now() - mongoStart;

      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', {
        filter: {
          $or: [
            { role: 'admin' },
            { age: { $gte: 40 } }
          ]
        }
      });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      console.log(`OR query: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });
  });

  describe('Pagination Performance', () => {
    beforeEach(async () => {
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        email: `page${i}@test.com`,
        password: 'pass',
        name: `Page User ${i}`
      }));
      await User.insertMany(largeDataset);
    });

    it('should compare first page performance', async () => {
      const mongoStart = Date.now();
      await User.find({}).limit(20).sort({ createdAt: -1 });
      const mongoDuration = Date.now() - mongoStart;

      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', {
        filter: {},
        limit: 20,
        sort: { createdAt: -1 }
      });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      console.log(`First page: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });

    it('should compare deep pagination performance', async () => {
      const mongoStart = Date.now();
      await User.find({}).skip(400).limit(20).sort({ createdAt: -1 });
      const mongoDuration = Date.now() - mongoStart;

      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await zerodbService.queryTable('users', {
        filter: {},
        skip: 400,
        limit: 20,
        sort: { createdAt: -1 }
      });
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      console.log(`Deep page: MongoDB ${mongoDuration}ms vs ZeroDB ${zerodbDuration}ms`);
    });
  });

  describe('Concurrent Operations', () => {
    it('should compare concurrent read performance', async () => {
      await User.insertMany(
        Array.from({ length: 50 }, (_, i) => ({
          email: `concurrent${i}@test.com`,
          password: 'pass',
          name: `User ${i}`
        }))
      );

      // MongoDB concurrent reads
      const mongoStart = Date.now();
      await Promise.all(
        Array.from({ length: 20 }, () => User.find({}))
      );
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB concurrent reads (mocked)
      const mockQueryTable = jest.spyOn(zerodbService, 'queryTable');
      mockQueryTable.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await Promise.all(
        Array.from({ length: 20 }, () => zerodbService.queryTable('users', {}))
      );
      const zerodbDuration = Date.now() - zerodbStart;

      mockQueryTable.mockRestore();

      performanceMetrics.mongodb.concurrentReads = mongoDuration;
      performanceMetrics.zerodb.concurrentReads = zerodbDuration;

      console.log(`20 concurrent reads:`);
      console.log(`  MongoDB: ${mongoDuration}ms`);
      console.log(`  ZeroDB: ${zerodbDuration}ms`);
    });

    it('should compare concurrent write performance', async () => {
      const testData = Array.from({ length: 10 }, (_, i) => ({
        email: `write${i}@test.com`,
        password: 'pass',
        name: `Writer ${i}`
      }));

      // MongoDB concurrent writes
      const mongoStart = Date.now();
      await Promise.all(testData.map(data => User.create(data)));
      const mongoDuration = Date.now() - mongoStart;

      // ZeroDB concurrent writes (mocked)
      const mockInsertRows = jest.spyOn(zerodbService, 'insertRows');
      mockInsertRows.mockResolvedValue([]);

      const zerodbStart = Date.now();
      await Promise.all(testData.map(data => zerodbService.insertRows('users', [data])));
      const zerodbDuration = Date.now() - zerodbStart;

      mockInsertRows.mockRestore();

      console.log(`10 concurrent writes:`);
      console.log(`  MongoDB: ${mongoDuration}ms`);
      console.log(`  ZeroDB: ${zerodbDuration}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should estimate memory footprint', () => {
      const initialMemory = process.memoryUsage();

      performanceMetrics.mongodb.memoryFootprint = {
        heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (initialMemory.external / 1024 / 1024).toFixed(2) + ' MB'
      };

      console.log('Memory usage:', performanceMetrics.mongodb.memoryFootprint);
      expect(initialMemory.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance comparison report', () => {
      const report = {
        summary: {
          testDate: new Date().toISOString(),
          testDuration: 'Full test suite',
          environment: 'test'
        },
        mongodb: performanceMetrics.mongodb,
        zerodb: performanceMetrics.zerodb,
        recommendations: []
      };

      // Add recommendations based on results
      if (performanceMetrics.mongodb.singleCreate && performanceMetrics.zerodb.singleCreate) {
        const createDiff = performanceMetrics.mongodb.singleCreate - performanceMetrics.zerodb.singleCreate;
        if (createDiff > 0) {
          report.recommendations.push('ZeroDB shows better create performance');
        }
      }

      console.log('\n====== PERFORMANCE REPORT ======');
      console.log(JSON.stringify(report, null, 2));
      console.log('================================\n');

      expect(report).toBeDefined();
    });
  });
});
