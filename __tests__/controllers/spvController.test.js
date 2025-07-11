const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../../tests/setup/app');
const SPV = require('../../models/SPV');
const User = require('../../models/User');
const Company = require('../../models/Company');
const { createTestUser, createTestCompany } = require('../../tests/utils/testHelpers');

describe('SPV Controller - Real Database Integration', () => {
  let mongoServer;
  let testUser;
  let testCompany;
  let authToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean database completely
    await User.deleteMany({});
    await Company.deleteMany({});
    await SPV.deleteMany({});
    
    // Create real test data
    testUser = await createTestUser();
    testCompany = await createTestCompany();
    
    // Generate real auth token
    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/v1/spvs - Real API Calls', () => {
    it('should return all SPVs from database', async () => {
      // Create real SPVs in database
      const spv1 = await SPV.create({
        name: 'Test SPV 1',
        description: 'First test SPV for real database testing',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000,
        totalInvested: 500000,
        managementFee: 2.0,
        carriedInterest: 20.0
      });

      const spv2 = await SPV.create({
        name: 'Test SPV 2',
        description: 'Second test SPV for real database testing',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'real-estate',
        status: 'active',
        totalCommitment: 2000000,
        totalInvested: 1500000,
        managementFee: 1.5,
        carriedInterest: 15.0
      });

      // Make real API call
      const response = await request(app)
        .get('/api/v1/spvs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('totalCommitment');
      
      // Verify database contains the SPVs
      const dbSpvs = await SPV.find();
      expect(dbSpvs).toHaveLength(2);
      expect(dbSpvs[0].name).toBe('Test SPV 1');
      expect(dbSpvs[1].name).toBe('Test SPV 2');
    });

    it('should filter SPVs by status from database', async () => {
      // Create SPVs with different statuses
      await SPV.create([
        {
          name: 'Active SPV 1',
          description: 'Active SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'active',
          totalCommitment: 1000000
        },
        {
          name: 'Active SPV 2',
          description: 'Another active SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'active',
          totalCommitment: 1500000
        },
        {
          name: 'Inactive SPV',
          description: 'Inactive SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'inactive',
          totalCommitment: 500000
        }
      ]);

      // Real API call with status filter
      const response = await request(app)
        .get('/api/v1/spvs?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every(spv => spv.status === 'active')).toBe(true);
      
      // Verify database query worked correctly
      const dbActiveSpvs = await SPV.find({ status: 'active' });
      expect(dbActiveSpvs).toHaveLength(2);
    });

    it('should filter SPVs by type from database', async () => {
      // Create SPVs with different types
      await SPV.create([
        {
          name: 'Investment SPV',
          description: 'Investment focused SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'active',
          totalCommitment: 1000000
        },
        {
          name: 'Real Estate SPV',
          description: 'Real estate focused SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'real-estate',
          status: 'active',
          totalCommitment: 2000000
        }
      ]);

      // Real API call with type filter
      const response = await request(app)
        .get('/api/v1/spvs?type=investment')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].type).toBe('investment');
      
      // Verify database query
      const dbInvestmentSpvs = await SPV.find({ type: 'investment' });
      expect(dbInvestmentSpvs).toHaveLength(1);
    });

    it('should support pagination with real database queries', async () => {
      // Create multiple SPVs in database
      const spvs = [];
      for (let i = 0; i < 12; i++) {
        spvs.push({
          name: `SPV ${i}`,
          description: `Description for SPV ${i}`,
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'active',
          totalCommitment: 100000 * (i + 1)
        });
      }
      await SPV.create(spvs);

      // Real API call with pagination
      const response = await request(app)
        .get('/api/v1/spvs?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(5);
      
      // Verify total count in database
      const totalCount = await SPV.countDocuments();
      expect(totalCount).toBe(12);
    });
  });

  describe('POST /api/v1/spvs - Real Database Operations', () => {
    it('should create SPV in database', async () => {
      const spvData = {
        name: 'New Test SPV',
        description: 'A new SPV for testing database operations',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 5000000,
        totalInvested: 0,
        managementFee: 2.5,
        carriedInterest: 20.0,
        investmentStrategy: 'Growth focused technology investments',
        targetSector: 'Technology',
        minimumInvestment: 50000,
        maximumInvestment: 500000
      };

      // Real API call
      const response = await request(app)
        .post('/api/v1/spvs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(spvData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(spvData.name);
      expect(response.body.description).toBe(spvData.description);
      expect(response.body.totalCommitment).toBe(spvData.totalCommitment);
      expect(response.body.managementFee).toBe(spvData.managementFee);
      
      // Verify SPV was actually created in database
      const dbSpv = await SPV.findById(response.body._id);
      expect(dbSpv).toBeTruthy();
      expect(dbSpv.name).toBe(spvData.name);
      expect(dbSpv.totalCommitment).toBe(spvData.totalCommitment);
      expect(dbSpv.investmentStrategy).toBe(spvData.investmentStrategy);
    });

    it('should return 400 for invalid data with real validation', async () => {
      const invalidData = {
        name: 'Test SPV',
        // Missing required fields
        companyId: 'invalid-object-id',
        totalCommitment: -100000, // Invalid negative value
        managementFee: 150 // Invalid percentage > 100
      };

      // Real API call
      const response = await request(app)
        .post('/api/v1/spvs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      
      // Verify no SPV was created in database
      const dbSpvs = await SPV.find();
      expect(dbSpvs).toHaveLength(0);
    });

    it('should handle database constraint violations', async () => {
      const spvData = {
        name: 'Duplicate Name SPV',
        description: 'SPV with duplicate name',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000
      };

      // Create first SPV in database
      await SPV.create(spvData);

      // Try to create duplicate via API
      const response = await request(app)
        .post('/api/v1/spvs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(spvData);

      expect(response.status).toBe(409);
      
      // Verify only one SPV exists in database
      const dbSpvs = await SPV.find({ name: 'Duplicate Name SPV' });
      expect(dbSpvs).toHaveLength(1);
    });
  });

  describe('GET /api/v1/spvs/:id - Real Database Lookups', () => {
    it('should return SPV by ID from database', async () => {
      // Create SPV in database
      const spv = await SPV.create({
        name: 'Test SPV Lookup',
        description: 'SPV for ID lookup testing',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000,
        totalInvested: 600000,
        managementFee: 2.0,
        carriedInterest: 20.0
      });

      // Real API call
      const response = await request(app)
        .get(`/api/v1/spvs/${spv._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(spv._id.toString());
      expect(response.body.name).toBe(spv.name);
      expect(response.body.description).toBe(spv.description);
      expect(response.body.totalCommitment).toBe(spv.totalCommitment);
      expect(response.body.totalInvested).toBe(spv.totalInvested);
      
      // Verify database lookup worked
      const dbSpv = await SPV.findById(spv._id);
      expect(dbSpv).toBeTruthy();
      expect(dbSpv.name).toBe(spv.name);
    });

    it('should return 404 for non-existent SPV', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .get(`/api/v1/spvs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      
      // Verify no SPV exists with that ID
      const dbSpv = await SPV.findById(fakeId);
      expect(dbSpv).toBeNull();
    });

    it('should return 400 for invalid ID format', async () => {
      // Real API call with invalid ID
      const response = await request(app)
        .get('/api/v1/spvs/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v1/spvs/:id - Real Database Updates', () => {
    it('should update SPV in database', async () => {
      // Create SPV in database
      const spv = await SPV.create({
        name: 'Original SPV Name',
        description: 'Original description',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000,
        totalInvested: 300000,
        managementFee: 2.0,
        carriedInterest: 20.0
      });

      const updateData = {
        name: 'Updated SPV Name',
        description: 'Updated description with more details',
        totalCommitment: 1500000,
        totalInvested: 750000,
        managementFee: 2.5,
        carriedInterest: 25.0,
        status: 'closed'
      };

      // Real API call
      const response = await request(app)
        .put(`/api/v1/spvs/${spv._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.totalCommitment).toBe(updateData.totalCommitment);
      expect(response.body.totalInvested).toBe(updateData.totalInvested);
      expect(response.body.managementFee).toBe(updateData.managementFee);
      expect(response.body.status).toBe(updateData.status);
      
      // Verify database was actually updated
      const dbSpv = await SPV.findById(spv._id);
      expect(dbSpv.name).toBe(updateData.name);
      expect(dbSpv.description).toBe(updateData.description);
      expect(dbSpv.totalCommitment).toBe(updateData.totalCommitment);
      expect(dbSpv.totalInvested).toBe(updateData.totalInvested);
      expect(dbSpv.managementFee).toBe(updateData.managementFee);
      expect(dbSpv.status).toBe(updateData.status);
    });

    it('should validate update data against database constraints', async () => {
      // Create SPV in database
      const spv = await SPV.create({
        name: 'Test SPV Update',
        description: 'SPV for update testing',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000,
        managementFee: 2.0
      });

      const invalidUpdateData = {
        totalCommitment: -500000, // Invalid negative value
        managementFee: 150, // Invalid percentage > 100
        carriedInterest: -10 // Invalid negative percentage
      };

      // Real API call
      const response = await request(app)
        .put(`/api/v1/spvs/${spv._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
      
      // Verify database was not updated
      const dbSpv = await SPV.findById(spv._id);
      expect(dbSpv.totalCommitment).toBe(1000000); // Original value
      expect(dbSpv.managementFee).toBe(2.0); // Original value
    });

    it('should return 404 for non-existent SPV update', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .put(`/api/v1/spvs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated SPV' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/spvs/:id - Real Database Deletions', () => {
    it('should delete SPV from database', async () => {
      // Create SPV in database
      const spv = await SPV.create({
        name: 'SPV To Delete',
        description: 'This SPV will be deleted',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000
      });

      // Real API call
      const response = await request(app)
        .delete(`/api/v1/spvs/${spv._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify SPV was actually deleted from database
      const dbSpv = await SPV.findById(spv._id);
      expect(dbSpv).toBeNull();
      
      // Verify database count
      const totalCount = await SPV.countDocuments();
      expect(totalCount).toBe(0);
    });

    it('should return 404 for non-existent SPV deletion', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .delete(`/api/v1/spvs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      
      // Verify no changes in database
      const totalCount = await SPV.countDocuments();
      expect(totalCount).toBe(0);
    });
  });

  describe('GET /api/v1/spvs/analytics - Real Database Aggregations', () => {
    it('should return analytics from real database aggregations', async () => {
      // Create SPVs with different types, statuses, and financial data
      await SPV.create([
        {
          name: 'Investment SPV 1',
          description: 'Tech investment SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'active',
          totalCommitment: 2000000,
          totalInvested: 1500000,
          managementFee: 2.0,
          carriedInterest: 20.0
        },
        {
          name: 'Investment SPV 2',
          description: 'Healthcare investment SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'active',
          totalCommitment: 3000000,
          totalInvested: 2000000,
          managementFee: 2.5,
          carriedInterest: 25.0
        },
        {
          name: 'Real Estate SPV',
          description: 'Commercial real estate SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'real-estate',
          status: 'active',
          totalCommitment: 5000000,
          totalInvested: 4000000,
          managementFee: 1.5,
          carriedInterest: 15.0
        },
        {
          name: 'Closed SPV',
          description: 'Closed investment SPV',
          companyId: testCompany._id,
          managerId: testUser._id,
          type: 'investment',
          status: 'closed',
          totalCommitment: 1000000,
          totalInvested: 1000000,
          managementFee: 2.0,
          carriedInterest: 20.0
        }
      ]);

      // Real API call
      const response = await request(app)
        .get('/api/v1/spvs/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSpvs');
      expect(response.body).toHaveProperty('totalCommitment');
      expect(response.body).toHaveProperty('totalInvested');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byStatus');
      expect(response.body).toHaveProperty('averageManagementFee');
      expect(response.body).toHaveProperty('averageCarriedInterest');
      
      // Verify calculations match database
      expect(response.body.totalSpvs).toBe(4);
      expect(response.body.totalCommitment).toBe(11000000);
      expect(response.body.totalInvested).toBe(8500000);
      expect(response.body.byType.investment).toBe(3);
      expect(response.body.byType['real-estate']).toBe(1);
      expect(response.body.byStatus.active).toBe(3);
      expect(response.body.byStatus.closed).toBe(1);
      
      // Verify with direct database queries
      const totalSpvs = await SPV.countDocuments();
      const aggregationResult = await SPV.aggregate([
        {
          $group: {
            _id: null,
            totalCommitment: { $sum: '$totalCommitment' },
            totalInvested: { $sum: '$totalInvested' },
            avgManagementFee: { $avg: '$managementFee' },
            avgCarriedInterest: { $avg: '$carriedInterest' }
          }
        }
      ]);
      
      expect(totalSpvs).toBe(4);
      expect(aggregationResult[0].totalCommitment).toBe(11000000);
      expect(aggregationResult[0].totalInvested).toBe(8500000);
      expect(Math.round(aggregationResult[0].avgManagementFee * 100) / 100).toBe(2.0);
      expect(Math.round(aggregationResult[0].avgCarriedInterest * 100) / 100).toBe(20.0);
    });
  });

  describe('POST /api/v1/spvs/:id/investors - Real Database Relationship Operations', () => {
    it('should add investor to SPV in database', async () => {
      // Create SPV in database
      const spv = await SPV.create({
        name: 'SPV with Investors',
        description: 'SPV for investor testing',
        companyId: testCompany._id,
        managerId: testUser._id,
        type: 'investment',
        status: 'active',
        totalCommitment: 1000000,
        investors: []
      });

      const investorData = {
        name: 'John Investor',
        email: 'john.investor@example.com',
        investmentAmount: 100000,
        investmentDate: new Date(),
        type: 'individual'
      };

      // Real API call
      const response = await request(app)
        .post(`/api/v1/spvs/${spv._id}/investors`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(investorData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('investors');
      expect(response.body.investors).toHaveLength(1);
      expect(response.body.investors[0].name).toBe(investorData.name);
      expect(response.body.investors[0].investmentAmount).toBe(investorData.investmentAmount);
      
      // Verify database was updated
      const dbSpv = await SPV.findById(spv._id);
      expect(dbSpv.investors).toHaveLength(1);
      expect(dbSpv.investors[0].name).toBe(investorData.name);
      expect(dbSpv.investors[0].investmentAmount).toBe(investorData.investmentAmount);
    });
  });
});