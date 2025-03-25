const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const ShareClass = require('../models/ShareClass');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB, clearDB } = require('./setup/testDB');

const PORT = 5007; // Ensure a unique port

describe('Enhanced ShareClass Routes', () => {
  let server;
  let testToken;
  let testShareClass;
  let testShareClass2;

  // Create a mock token for testing
  beforeAll(async () => {
    await connectDB();
    server = app.listen(PORT);
    // Create a test token (mimicking authentication)
    testToken = jwt.sign({ id: 'testuser123' }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    await server.close();
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
    
    // Create two test share classes for testing
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

  // Test JWT authentication middleware
  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(server).post('/api/v1/shareClasses');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should allow access with valid JWT token', async () => {
      const response = await request(server)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
    });
  });

  // Test API versioning
  describe('API Versioning', () => {
    it('should access share classes through versioned endpoint /api/v1/shareClasses', async () => {
      const response = await request(server)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  // Test filtering and searching
  describe('Filtering and Searching', () => {
    it('should filter share classes by name', async () => {
      const response = await request(server)
        .get('/api/v1/shareClasses?name=Class A')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Class A');
    });

    it('should filter share classes by minimum ownership percentage', async () => {
      const response = await request(server)
        .get('/api/v1/shareClasses?minOwnership=15')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].ownershipPercentage).toBeGreaterThanOrEqual(15);
    });

    it('should search share classes by keyword in description', async () => {
      const response = await request(server)
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
      const response = await request(server)
        .post('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Invalid Class' // Missing required fields
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate ownership percentage is between 0 and 100', async () => {
      const response = await request(server)
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

      const response = await request(server)
        .post('/api/v1/shareClasses/bulk')
        .set('Authorization', `Bearer ${testToken}`)
        .send(bulkData);
      expect(response.status).toBe(201);
      expect(response.body.length).toBe(2);
      
      // Verify bulk creation worked
      const getAllResponse = await request(server)
        .get('/api/v1/shareClasses')
        .set('Authorization', `Bearer ${testToken}`);
      expect(getAllResponse.body.length).toBe(4); // 2 original + 2 bulk created
    });
  });

  // Test analytics endpoint
  describe('Analytics', () => {
    it('should return share class analytics and statistics', async () => {
      const response = await request(server)
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
