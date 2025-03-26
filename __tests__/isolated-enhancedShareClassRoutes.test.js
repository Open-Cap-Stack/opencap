/**
 * Isolated Enhanced ShareClass Routes Tests
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * Focused tests for ShareClass API with isolated test environment
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import components needed for testing
const ShareClass = require('../models/ShareClass');
const authMiddleware = require('../middleware/authMiddleware');
const v1ShareClassRoutes = require('../routes/v1/shareClassRoutes');

// Test variables
let mongod;
let app;
let testToken;
let testShareClass;
let testShareClass2;

// Create a test express app and set up routes
const setupApp = () => {
  const app = express();
  app.use(express.json());
  
  // Set up versioned routes with authentication
  app.use('/api/v1/shareClasses', v1ShareClassRoutes); 
  
  // Add error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  });
  
  return app;
};

// Connect to in-memory MongoDB
const connectToTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  console.log('✅ Connected to test database');
};

// Disconnect and clean up
const disconnectTestDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  console.log('✅ Disconnected from test database');
};

describe('Isolated Enhanced ShareClass Routes', () => {
  
  beforeAll(async () => {
    await connectToTestDB();
    app = setupApp();
    
    // Create a test token
    testToken = jwt.sign(
      { id: 'testuser123', email: 'test@example.com' }, 
      process.env.JWT_SECRET || 'testsecret', 
      { expiresIn: '1h' }
    );
  });
  
  afterAll(async () => {
    await disconnectTestDB();
  });
  
  beforeEach(async () => {
    // Clear the collection before each test
    await ShareClass.deleteMany({});
    
    // Create test data
    testShareClass = new ShareClass({
      shareClassId: 'class-a-001',
      name: 'Class A',
      description: 'Common shares with voting rights',
      amountRaised: 1000000,
      ownershipPercentage: 10,
      dilutedShares: 1000,
      authorizedShares: 10000
    });
    
    testShareClass2 = new ShareClass({
      shareClassId: 'class-b-002',
      name: 'Class B',
      description: 'Preferred shares with liquidation preference',
      amountRaised: 2000000,
      ownershipPercentage: 20,
      dilutedShares: 2000,
      authorizedShares: 20000
    });
    
    await testShareClass.save();
    await testShareClass2.save();
  });
  
  // Test authentication
  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app).post('/api/v1/shareClasses');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
    
    it('should allow access with valid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
    });
  });
  
  // Test API functionality
  describe('Basic Operations', () => {
    it('should retrieve all share classes', async () => {
      const response = await request(app)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
    
    it('should retrieve a share class by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/shareClasses/${testShareClass._id}`)
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Class A');
    });
    
    it('should create a new share class', async () => {
      const newShareClass = {
        shareClassId: 'class-c-003',
        name: 'Class C',
        description: 'New test class',
        amountRaised: 500000,
        ownershipPercentage: 5,
        dilutedShares: 500,
        authorizedShares: 5000
      };
      
      const response = await request(app)
        .post('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`)
        .send(newShareClass);
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Class C');
      
      // Verify it was created
      const getResponse = await request(app)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(getResponse.body.length).toBe(3);
    });
  });
  
  // Test filtering and searching
  describe('Filtering and Searching', () => {
    it('should filter share classes by name', async () => {
      const response = await request(app)
        .get('/api/v1/shareClasses?name=Class A')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Class A');
    });
    
    it('should filter share classes by minimum ownership percentage', async () => {
      const response = await request(app)
        .get('/api/v1/shareClasses?minOwnership=15')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].ownershipPercentage).toBeGreaterThanOrEqual(15);
    });
    
    it('should search share classes by keyword in description', async () => {
      const response = await request(app)
        .get('/api/v1/shareClasses/search?q=voting')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].description).toContain('voting');
    });
  });
  
  // Test validation
  describe('Validation', () => {
    it('should validate required fields when creating a share class', async () => {
      const response = await request(app)
        .post('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Invalid Class' // Missing required fields
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
    
    it('should validate ownership percentage is between 0 and 100', async () => {
      const response = await request(app)
        .post('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          shareClassId: 'invalid-class',
          name: 'Invalid Class',
          description: 'Invalid ownership',
          amountRaised: 1000,
          ownershipPercentage: 101, // Invalid value
          dilutedShares: 100,
          authorizedShares: 1000
        });
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Ownership percentage must be between 0 and 100');
    });
  });
  
  // Test bulk operations
  describe('Bulk Operations', () => {
    it('should support bulk creation of share classes', async () => {
      const bulkData = [
        {
          shareClassId: 'bulk-1',
          name: 'Bulk Class 1',
          description: 'Bulk created class 1',
          amountRaised: 5000000,
          ownershipPercentage: 5,
          dilutedShares: 5000,
          authorizedShares: 50000
        },
        {
          shareClassId: 'bulk-2',
          name: 'Bulk Class 2',
          description: 'Bulk created class 2',
          amountRaised: 6000000,
          ownershipPercentage: 6,
          dilutedShares: 6000,
          authorizedShares: 60000
        }
      ];
      
      const response = await request(app)
        .post('/api/v1/shareClasses/bulk')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bulkData);
      expect(response.status).toBe(201);
      expect(response.body.length).toBe(2);
      
      // Verify bulk creation worked
      const getAllResponse = await request(app)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(getAllResponse.body.length).toBe(4); // 2 original + 2 bulk created
    });
  });
  
  // Test analytics
  describe('Analytics', () => {
    it('should return share class analytics and statistics', async () => {
      const response = await request(app)
        .get('/api/v1/shareClasses/analytics')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalShareClasses');
      expect(response.body).toHaveProperty('totalAmountRaised');
      expect(response.body).toHaveProperty('averageOwnershipPercentage');
      expect(response.body.totalShareClasses).toBe(2);
    });
  });
});
