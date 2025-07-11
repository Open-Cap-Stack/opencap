const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../../tests/setup/app');
const Stakeholder = require('../../models/Stakeholder');
const User = require('../../models/User');
const Company = require('../../models/Company');
const { createTestUser, createTestCompany } = require('../../tests/utils/testHelpers');

describe('Stakeholder Controller - Real Database Integration', () => {
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
    // Clean database
    await User.deleteMany({});
    await Company.deleteMany({});
    await Stakeholder.deleteMany({});
    
    // Create real test data
    testUser = await createTestUser();
    testCompany = await createTestCompany();
    
    // Generate real auth token
    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/v1/stakeholders - Real API Calls', () => {
    it('should return all stakeholders from database', async () => {
      // Create real stakeholders in database
      const stakeholder1 = await Stakeholder.create({
        stakeholderId: `holder-${Date.now()}-1`,
        name: 'John Doe',
        role: 'employee',
        projectId: testCompany._id.toString()
      });

      const stakeholder2 = await Stakeholder.create({
        stakeholderId: `holder-${Date.now()}-2`,
        name: 'Jane Smith',
        role: 'investor',
        projectId: testCompany._id.toString()
      });

      // Make real API call
      const response = await request(app)
        .get('/api/v1/stakeholders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('role');
      expect(response.body[0]).toHaveProperty('stakeholderId');
      expect(response.body[0]).toHaveProperty('projectId');
      
      // Verify database contains the stakeholders
      const dbStakeholders = await Stakeholder.find();
      expect(dbStakeholders).toHaveLength(2);
    });

    it('should filter stakeholders by type from database', async () => {
      // Create mixed stakeholder types in database
      await Stakeholder.create([
        {
          stakeholderId: `holder-${Date.now()}-emp1`,
          name: 'Employee 1',
          role: 'employee',
          projectId: testCompany._id.toString()
        },
        {
          stakeholderId: `holder-${Date.now()}-emp2`,
          name: 'Employee 2',
          role: 'employee',
          projectId: testCompany._id.toString()
        },
        {
          stakeholderId: `holder-${Date.now()}-inv1`,
          name: 'Investor 1',
          role: 'investor',
          projectId: testCompany._id.toString()
        }
      ]);

      // Real API call with filter
      const response = await request(app)
        .get('/api/v1/stakeholders?role=employee')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every(s => s.role === 'employee')).toBe(true);
      
      // Verify database query worked correctly
      const dbEmployees = await Stakeholder.find({ role: 'employee' });
      expect(dbEmployees).toHaveLength(2);
    });

    it('should support pagination with real database queries', async () => {
      // Create multiple stakeholders in database
      const stakeholders = [];
      for (let i = 0; i < 15; i++) {
        stakeholders.push({
          stakeholderId: `holder-${Date.now()}-${i}`,
          name: `Stakeholder ${i}`,
          role: 'employee',
          projectId: testCompany._id.toString()
        });
      }
      await Stakeholder.create(stakeholders);

      // Real API call with pagination
      const response = await request(app)
        .get('/api/v1/stakeholders?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(5);
      
      // Verify total count in database
      const totalCount = await Stakeholder.countDocuments();
      expect(totalCount).toBe(15);
    });
  });

  describe('POST /api/v1/stakeholders - Real Database Operations', () => {
    it('should create stakeholder in database', async () => {
      const stakeholderData = {
        name: 'New Stakeholder',
        email: 'new@example.com',
        type: 'employee',
        companyId: testCompany._id,
        shareCount: 2000,
        shareClass: 'Common',
        vestingSchedule: {
          startDate: new Date(),
          cliffMonths: 12,
          vestingMonths: 48
        },
        status: 'active'
      };

      // Real API call
      const response = await request(app)
        .post('/api/v1/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(stakeholderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(stakeholderData.name);
      expect(response.body.email).toBe(stakeholderData.email);
      expect(response.body.shareCount).toBe(stakeholderData.shareCount);
      
      // Verify stakeholder was actually created in database
      const dbStakeholder = await Stakeholder.findById(response.body._id);
      expect(dbStakeholder).toBeTruthy();
      expect(dbStakeholder.name).toBe(stakeholderData.name);
      expect(dbStakeholder.email).toBe(stakeholderData.email);
    });

    it('should return 400 for invalid data with real validation', async () => {
      const invalidData = {
        name: 'Test Stakeholder',
        // Missing required fields
        email: 'invalid-email', // Invalid email format
        shareCount: -100 // Invalid negative value
      };

      // Real API call
      const response = await request(app)
        .post('/api/v1/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      
      // Verify no stakeholder was created in database
      const dbStakeholders = await Stakeholder.find();
      expect(dbStakeholders).toHaveLength(0);
    });

    it('should handle database constraint violations', async () => {
      const stakeholderData = {
        name: 'Duplicate Email Test',
        email: 'duplicate@example.com',
        type: 'employee',
        companyId: testCompany._id,
        shareCount: 1000,
        status: 'active'
      };

      // Create first stakeholder in database
      await Stakeholder.create(stakeholderData);

      // Try to create duplicate via API
      const response = await request(app)
        .post('/api/v1/stakeholders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(stakeholderData);

      expect(response.status).toBe(409);
      
      // Verify only one stakeholder exists in database
      const dbStakeholders = await Stakeholder.find({ email: 'duplicate@example.com' });
      expect(dbStakeholders).toHaveLength(1);
    });
  });

  describe('GET /api/v1/stakeholders/:id - Real Database Lookups', () => {
    it('should return stakeholder by ID from database', async () => {
      // Create stakeholder in database
      const stakeholder = await Stakeholder.create({
        name: 'Test Stakeholder',
        email: 'test@example.com',
        type: 'employee',
        companyId: testCompany._id,
        shareCount: 1000,
        status: 'active'
      });

      // Real API call
      const response = await request(app)
        .get(`/api/v1/stakeholders/${stakeholder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(stakeholder._id.toString());
      expect(response.body.name).toBe(stakeholder.name);
      expect(response.body.email).toBe(stakeholder.email);
      
      // Verify database lookup worked
      const dbStakeholder = await Stakeholder.findById(stakeholder._id);
      expect(dbStakeholder).toBeTruthy();
    });

    it('should return 404 for non-existent stakeholder', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .get(`/api/v1/stakeholders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      
      // Verify no stakeholder exists with that ID
      const dbStakeholder = await Stakeholder.findById(fakeId);
      expect(dbStakeholder).toBeNull();
    });
  });

  describe('PUT /api/v1/stakeholders/:id - Real Database Updates', () => {
    it('should update stakeholder in database', async () => {
      // Create stakeholder in database
      const stakeholder = await Stakeholder.create({
        name: 'Original Name',
        email: 'original@example.com',
        type: 'employee',
        companyId: testCompany._id,
        shareCount: 1000,
        status: 'active'
      });

      const updateData = {
        name: 'Updated Name',
        shareCount: 2000,
        status: 'inactive'
      };

      // Real API call
      const response = await request(app)
        .put(`/api/v1/stakeholders/${stakeholder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.shareCount).toBe(updateData.shareCount);
      expect(response.body.status).toBe(updateData.status);
      
      // Verify database was actually updated
      const dbStakeholder = await Stakeholder.findById(stakeholder._id);
      expect(dbStakeholder.name).toBe(updateData.name);
      expect(dbStakeholder.shareCount).toBe(updateData.shareCount);
      expect(dbStakeholder.status).toBe(updateData.status);
    });

    it('should validate update data against database constraints', async () => {
      // Create stakeholder in database
      const stakeholder = await Stakeholder.create({
        name: 'Test Stakeholder',
        email: 'test@example.com',
        type: 'employee',
        companyId: testCompany._id,
        shareCount: 1000,
        status: 'active'
      });

      const invalidUpdateData = {
        shareCount: -500, // Invalid negative value
        email: 'invalid-email' // Invalid email format
      };

      // Real API call
      const response = await request(app)
        .put(`/api/v1/stakeholders/${stakeholder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
      
      // Verify database was not updated
      const dbStakeholder = await Stakeholder.findById(stakeholder._id);
      expect(dbStakeholder.shareCount).toBe(1000); // Original value
      expect(dbStakeholder.email).toBe('test@example.com'); // Original value
    });
  });

  describe('DELETE /api/v1/stakeholders/:id - Real Database Deletions', () => {
    it('should delete stakeholder from database', async () => {
      // Create stakeholder in database
      const stakeholder = await Stakeholder.create({
        name: 'To Be Deleted',
        email: 'delete@example.com',
        type: 'employee',
        companyId: testCompany._id,
        shareCount: 1000,
        status: 'active'
      });

      // Real API call
      const response = await request(app)
        .delete(`/api/v1/stakeholders/${stakeholder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify stakeholder was actually deleted from database
      const dbStakeholder = await Stakeholder.findById(stakeholder._id);
      expect(dbStakeholder).toBeNull();
      
      // Verify database count
      const totalCount = await Stakeholder.countDocuments();
      expect(totalCount).toBe(0);
    });

    it('should return 404 for non-existent stakeholder deletion', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Real API call
      const response = await request(app)
        .delete(`/api/v1/stakeholders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      
      // Verify no changes in database
      const totalCount = await Stakeholder.countDocuments();
      expect(totalCount).toBe(0);
    });
  });

  describe('GET /api/v1/stakeholders/analytics - Real Database Aggregations', () => {
    it('should return analytics from real database aggregations', async () => {
      // Create stakeholders with different types and share counts
      await Stakeholder.create([
        {
          name: 'Employee 1',
          email: 'emp1@example.com',
          type: 'employee',
          companyId: testCompany._id,
          shareCount: 1000,
          status: 'active'
        },
        {
          name: 'Employee 2',
          email: 'emp2@example.com',
          type: 'employee',
          companyId: testCompany._id,
          shareCount: 1500,
          status: 'active'
        },
        {
          name: 'Investor 1',
          email: 'inv1@example.com',
          type: 'investor',
          companyId: testCompany._id,
          shareCount: 5000,
          status: 'active'
        },
        {
          name: 'Advisor 1',
          email: 'adv1@example.com',
          type: 'advisor',
          companyId: testCompany._id,
          shareCount: 500,
          status: 'inactive'
        }
      ]);

      // Real API call
      const response = await request(app)
        .get('/api/v1/stakeholders/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalStakeholders');
      expect(response.body).toHaveProperty('totalShares');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byStatus');
      
      // Verify calculations match database
      expect(response.body.totalStakeholders).toBe(4);
      expect(response.body.totalShares).toBe(8000);
      expect(response.body.byType.employee).toBe(2);
      expect(response.body.byType.investor).toBe(1);
      expect(response.body.byType.advisor).toBe(1);
      expect(response.body.byStatus.active).toBe(3);
      expect(response.body.byStatus.inactive).toBe(1);
      
      // Verify with direct database queries
      const totalStakeholders = await Stakeholder.countDocuments();
      const totalShares = await Stakeholder.aggregate([
        { $group: { _id: null, total: { $sum: '$shareCount' } } }
      ]);
      
      expect(totalStakeholders).toBe(4);
      expect(totalShares[0].total).toBe(8000);
    });
  });
});