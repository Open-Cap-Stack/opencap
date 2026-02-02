/**
 * Pre-Migration MongoDB Baseline Tests
 *
 * Documents current MongoDB functionality before removal
 * Establishes baseline metrics for comparison
 * Tests data integrity and query patterns
 *
 * CRITICAL: These tests must pass BEFORE any MongoDB code is removed
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const User = require('../../../models/User');
const Company = require('../../../models/Company');
const ShareClass = require('../../../models/ShareClass');
const Document = require('../../../models/Document');

describe('MongoDB Baseline Tests - Pre-Migration', () => {
  let mongoServer;
  let startTime;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for baseline testing');
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    startTime = Date.now();
    // Clear all collections
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  afterEach(() => {
    const duration = Date.now() - startTime;
    console.log(`Test completed in ${duration}ms`);
  });

  describe('MongoDB Connection', () => {
    it('should have active MongoDB connection', () => {
      expect(mongoose.connection.readyState).toBe(1);
      expect(mongoose.connection.name).toBeTruthy();
    });

    it('should list all registered models', () => {
      const modelNames = mongoose.modelNames();
      expect(modelNames.length).toBeGreaterThan(0);
      expect(modelNames).toContain('User');
      expect(modelNames).toContain('Company');
    });

    it('should verify database operations are functional', async () => {
      const testDoc = await User.create({
        email: 'baseline@test.com',
        password: 'hashedpassword123',
        name: 'Baseline User'
      });

      expect(testDoc._id).toBeDefined();
      expect(testDoc.email).toBe('baseline@test.com');

      const found = await User.findById(testDoc._id);
      expect(found).toBeTruthy();
      expect(found.email).toBe('baseline@test.com');
    });
  });

  describe('CRUD Operations - Baseline Performance', () => {
    describe('Create Operations', () => {
      it('should create single document with performance metrics', async () => {
        const start = Date.now();

        const user = await User.create({
          email: 'create-test@example.com',
          password: 'hashedpass',
          name: 'Create Test User'
        });

        const duration = Date.now() - start;

        expect(user._id).toBeDefined();
        expect(user.email).toBe('create-test@example.com');
        expect(duration).toBeLessThan(100); // Baseline: should be fast
      });

      it('should bulk create documents', async () => {
        const start = Date.now();

        const users = await User.insertMany([
          { email: 'bulk1@test.com', password: 'pass1', name: 'User 1' },
          { email: 'bulk2@test.com', password: 'pass2', name: 'User 2' },
          { email: 'bulk3@test.com', password: 'pass3', name: 'User 3' }
        ]);

        const duration = Date.now() - start;

        expect(users).toHaveLength(3);
        expect(duration).toBeLessThan(200);
      });

      it('should create nested documents', async () => {
        const company = await Company.create({
          name: 'Test Company',
          description: 'A test company',
          industry: 'Technology',
          foundedDate: new Date('2020-01-01'),
          metadata: {
            employees: 50,
            revenue: 1000000
          }
        });

        expect(company._id).toBeDefined();
        expect(company.metadata.employees).toBe(50);
      });
    });

    describe('Read Operations', () => {
      beforeEach(async () => {
        // Seed test data
        await User.insertMany([
          { email: 'user1@test.com', password: 'pass1', name: 'User One', role: 'admin' },
          { email: 'user2@test.com', password: 'pass2', name: 'User Two', role: 'user' },
          { email: 'user3@test.com', password: 'pass3', name: 'User Three', role: 'user' }
        ]);
      });

      it('should find all documents', async () => {
        const start = Date.now();
        const users = await User.find({});
        const duration = Date.now() - start;

        expect(users).toHaveLength(3);
        expect(duration).toBeLessThan(50);
      });

      it('should find documents with query filter', async () => {
        const start = Date.now();
        const admins = await User.find({ role: 'admin' });
        const duration = Date.now() - start;

        expect(admins).toHaveLength(1);
        expect(admins[0].email).toBe('user1@test.com');
        expect(duration).toBeLessThan(50);
      });

      it('should find single document', async () => {
        const user = await User.findOne({ email: 'user2@test.com' });

        expect(user).toBeTruthy();
        expect(user.name).toBe('User Two');
      });

      it('should find by ID', async () => {
        const user = await User.findOne({ email: 'user1@test.com' });
        const found = await User.findById(user._id);

        expect(found._id.toString()).toBe(user._id.toString());
        expect(found.email).toBe('user1@test.com');
      });

      it('should support query with limit and sort', async () => {
        const users = await User.find({})
          .limit(2)
          .sort({ email: 1 });

        expect(users).toHaveLength(2);
        expect(users[0].email).toBe('user1@test.com');
      });

      it('should support field projection', async () => {
        const users = await User.find({}, 'email name');

        expect(users[0].email).toBeDefined();
        expect(users[0].name).toBeDefined();
        expect(users[0].password).toBeUndefined();
      });
    });

    describe('Update Operations', () => {
      let testUser;

      beforeEach(async () => {
        testUser = await User.create({
          email: 'update-test@test.com',
          password: 'oldpass',
          name: 'Update Test User'
        });
      });

      it('should update single document', async () => {
        const start = Date.now();

        const updated = await User.findByIdAndUpdate(
          testUser._id,
          { name: 'Updated Name' },
          { new: true }
        );

        const duration = Date.now() - start;

        expect(updated.name).toBe('Updated Name');
        expect(updated.email).toBe('update-test@test.com');
        expect(duration).toBeLessThan(50);
      });

      it('should update multiple documents', async () => {
        await User.insertMany([
          { email: 'bulk1@test.com', password: 'pass', name: 'User 1', role: 'user' },
          { email: 'bulk2@test.com', password: 'pass', name: 'User 2', role: 'user' }
        ]);

        const result = await User.updateMany(
          { role: 'user' },
          { $set: { role: 'member' } }
        );

        expect(result.modifiedCount).toBeGreaterThan(0);

        const updated = await User.find({ role: 'member' });
        expect(updated.length).toBeGreaterThan(0);
      });

      it('should support $set operator', async () => {
        await User.findByIdAndUpdate(
          testUser._id,
          { $set: { 'metadata.lastLogin': new Date() } }
        );

        const updated = await User.findById(testUser._id);
        expect(updated.metadata).toBeDefined();
      });

      it('should support $inc operator', async () => {
        await User.findByIdAndUpdate(
          testUser._id,
          { $set: { loginCount: 0 } }
        );

        await User.findByIdAndUpdate(
          testUser._id,
          { $inc: { loginCount: 1 } }
        );

        const updated = await User.findById(testUser._id);
        expect(updated.loginCount).toBe(1);
      });
    });

    describe('Delete Operations', () => {
      beforeEach(async () => {
        await User.insertMany([
          { email: 'delete1@test.com', password: 'pass', name: 'Delete 1' },
          { email: 'delete2@test.com', password: 'pass', name: 'Delete 2' },
          { email: 'delete3@test.com', password: 'pass', name: 'Delete 3' }
        ]);
      });

      it('should delete single document by ID', async () => {
        const user = await User.findOne({ email: 'delete1@test.com' });

        const start = Date.now();
        const deleted = await User.findByIdAndDelete(user._id);
        const duration = Date.now() - start;

        expect(deleted._id.toString()).toBe(user._id.toString());
        expect(duration).toBeLessThan(50);

        const found = await User.findById(user._id);
        expect(found).toBeNull();
      });

      it('should delete multiple documents', async () => {
        const result = await User.deleteMany({ name: /^Delete/ });

        expect(result.deletedCount).toBe(3);

        const remaining = await User.find({});
        expect(remaining).toHaveLength(0);
      });

      it('should delete with query filter', async () => {
        const result = await User.deleteOne({ email: 'delete2@test.com' });

        expect(result.deletedCount).toBe(1);

        const remaining = await User.find({});
        expect(remaining).toHaveLength(2);
      });
    });
  });

  describe('Data Integrity Checks', () => {
    it('should maintain referential integrity for ObjectId references', async () => {
      const company = await Company.create({
        name: 'Ref Test Company',
        industry: 'Technology'
      });

      const user = await User.create({
        email: 'ref@test.com',
        password: 'pass',
        name: 'Ref User',
        company: company._id
      });

      expect(user.company.toString()).toBe(company._id.toString());

      const populated = await User.findById(user._id).populate('company');
      expect(populated.company.name).toBe('Ref Test Company');
    });

    it('should handle Date fields correctly', async () => {
      const company = await Company.create({
        name: 'Date Test',
        industry: 'Tech',
        foundedDate: new Date('2020-01-15')
      });

      expect(company.foundedDate).toBeInstanceOf(Date);
      expect(company.foundedDate.getFullYear()).toBe(2020);
    });

    it('should handle nested objects', async () => {
      const company = await Company.create({
        name: 'Nested Test',
        industry: 'Tech',
        metadata: {
          employees: 100,
          offices: ['NYC', 'SF']
        }
      });

      expect(company.metadata.employees).toBe(100);
      expect(company.metadata.offices).toEqual(['NYC', 'SF']);
    });

    it('should validate required fields', async () => {
      await expect(
        User.create({ password: 'pass', name: 'No Email' })
      ).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      await User.create({
        email: 'unique@test.com',
        password: 'pass',
        name: 'First'
      });

      await expect(
        User.create({
          email: 'unique@test.com',
          password: 'pass2',
          name: 'Second'
        })
      ).rejects.toThrow();
    });
  });

  describe('Query Pattern Analysis', () => {
    beforeEach(async () => {
      // Seed larger dataset for query testing
      const users = [];
      for (let i = 1; i <= 50; i++) {
        users.push({
          email: `user${i}@test.com`,
          password: 'pass',
          name: `User ${i}`,
          role: i % 3 === 0 ? 'admin' : 'user',
          createdAt: new Date(Date.now() - i * 86400000) // Stagger dates
        });
      }
      await User.insertMany(users);
    });

    it('should handle range queries', async () => {
      const cutoffDate = new Date(Date.now() - 10 * 86400000);

      const recent = await User.find({
        createdAt: { $gte: cutoffDate }
      });

      expect(recent.length).toBeGreaterThan(0);
      expect(recent.length).toBeLessThanOrEqual(10);
    });

    it('should handle OR queries', async () => {
      const users = await User.find({
        $or: [
          { role: 'admin' },
          { email: 'user1@test.com' }
        ]
      });

      expect(users.length).toBeGreaterThan(0);
    });

    it('should handle regex queries', async () => {
      const users = await User.find({
        email: /^user[1-5]@/
      });

      expect(users.length).toBe(5);
    });

    it('should handle pagination', async () => {
      const page1 = await User.find({})
        .limit(10)
        .skip(0)
        .sort({ createdAt: -1 });

      const page2 = await User.find({})
        .limit(10)
        .skip(10)
        .sort({ createdAt: -1 });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page1[0]._id.toString()).not.toBe(page2[0]._id.toString());
    });

    it('should count documents efficiently', async () => {
      const start = Date.now();
      const count = await User.countDocuments({ role: 'user' });
      const duration = Date.now() - start;

      expect(count).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });

    it('should aggregate data', async () => {
      const results = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('_id');
      expect(results[0]).toHaveProperty('count');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should measure bulk insert performance', async () => {
      const documents = [];
      for (let i = 0; i < 100; i++) {
        documents.push({
          email: `perf${i}@test.com`,
          password: 'pass',
          name: `Performance User ${i}`
        });
      }

      const start = Date.now();
      await User.insertMany(documents);
      const duration = Date.now() - start;

      console.log(`Bulk insert 100 documents: ${duration}ms`);
      expect(duration).toBeLessThan(500);
    });

    it('should measure query performance', async () => {
      await User.insertMany(
        Array.from({ length: 100 }, (_, i) => ({
          email: `query${i}@test.com`,
          password: 'pass',
          name: `Query User ${i}`,
          role: i % 2 === 0 ? 'admin' : 'user'
        }))
      );

      const start = Date.now();
      const users = await User.find({ role: 'admin' });
      const duration = Date.now() - start;

      console.log(`Query 50 documents: ${duration}ms`);
      expect(users.length).toBe(50);
      expect(duration).toBeLessThan(100);
    });

    it('should measure update performance', async () => {
      await User.insertMany(
        Array.from({ length: 50 }, (_, i) => ({
          email: `update${i}@test.com`,
          password: 'pass',
          name: `Update User ${i}`
        }))
      );

      const start = Date.now();
      await User.updateMany({}, { $set: { updated: true } });
      const duration = Date.now() - start;

      console.log(`Update 50 documents: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('MongoDB Features Used', () => {
    it('should document ObjectId usage', async () => {
      const user = await User.create({
        email: 'objectid@test.com',
        password: 'pass',
        name: 'ObjectId Test'
      });

      expect(user._id).toBeDefined();
      expect(mongoose.Types.ObjectId.isValid(user._id)).toBe(true);
    });

    it('should document array field operations', async () => {
      const company = await Company.create({
        name: 'Array Test',
        industry: 'Tech',
        tags: ['startup', 'tech']
      });

      await Company.findByIdAndUpdate(
        company._id,
        { $push: { tags: 'innovation' } }
      );

      const updated = await Company.findById(company._id);
      expect(updated.tags).toContain('innovation');
    });

    it('should document embedded document operations', async () => {
      const company = await Company.create({
        name: 'Embedded Test',
        industry: 'Tech',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA'
        }
      });

      expect(company.address.city).toBe('San Francisco');
    });
  });
});
