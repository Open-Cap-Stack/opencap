/**
 * Enhanced Financial Report Routes Tests
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * TDD approach for enhanced financial report API endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const FinancialReport = require('../models/financialReport');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB, clearDB } = require('./setup/testDB');

const PORT = 5008; // Unique port for this test suite
let server;

// Utility function to generate valid JWT token for testing
const generateToken = (user = { id: 'user123', email: 'test@example.com' }) => {
  return jwt.sign(user, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
};

// Sample data 
const sampleFinancialReport = {
  companyId: 'company123',
  reportingPeriod: 'Q2 2023',
  reportDate: new Date('2023-06-30'),
  reportType: 'quarterly',
  revenue: {
    sales: 250000,
    services: 75000,
    other: 10000
  },
  expenses: {
    salaries: 120000,
    marketing: 30000,
    operations: 40000,
    other: 15000
  },
  notes: 'This financial report represents Q2 performance.'
};

// Setup before tests
beforeAll(async () => {
  // Connect to in-memory database
  await connectDB();
  
  // Start express server on a specific port
  const listen = () => new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server started on port ${PORT}`);
      resolve();
    });
  });
  
  await listen();
});

// Clean up after tests
afterAll(async () => {
  await disconnectDB();
  await new Promise((resolve) => server.close(resolve));
  console.log('Test server closed');
});

// Clean collections before each test
beforeEach(async () => {
  await clearDB();
});

describe('Financial Report API Endpoints', () => {
  describe('Authentication', () => {
    test('should require authentication for all routes', async () => {
      // Try accessing without token
      const res = await request(app).get('/api/v1/financial-reports');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
    
    test('should accept requests with valid JWT token', async () => {
      const token = generateToken();
      
      // Create a new financial report with token
      const res = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
    });
  });
  
  describe('CRUD Operations', () => {
    test('should create a new financial report', async () => {
      const token = generateToken();
      
      const res = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.reportingPeriod).toBe(sampleFinancialReport.reportingPeriod);
    });
    
    test('should get all financial reports', async () => {
      const token = generateToken();
      
      // Create a report first
      await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      // Get all reports
      const res = await request(app)
        .get('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
    
    test('should get a financial report by ID', async () => {
      const token = generateToken();
      
      // Create a report first
      const createRes = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      // Get report by ID
      const res = await request(app)
        .get(`/api/v1/financial-reports/${createRes.body._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(createRes.body._id);
    });
    
    test('should update a financial report', async () => {
      const token = generateToken();
      
      // Create a report first
      const createRes = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      // Update the report
      const updatedData = {
        reportingPeriod: 'Q2 2023 Updated',
        notes: 'Updated notes'
      };
      
      const res = await request(app)
        .put(`/api/v1/financial-reports/${createRes.body._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);
      
      expect(res.status).toBe(200);
      expect(res.body.reportingPeriod).toBe(updatedData.reportingPeriod);
      expect(res.body.notes).toBe(updatedData.notes);
    });
    
    test('should delete a financial report', async () => {
      const token = generateToken();
      
      // Create a report first
      const createRes = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      // Delete the report
      const res = await request(app)
        .delete(`/api/v1/financial-reports/${createRes.body._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      
      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/v1/financial-reports/${createRes.body._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getRes.status).toBe(404);
    });
  });
  
  describe('Validation', () => {
    test('should validate required fields', async () => {
      const token = generateToken();
      
      // Try to create with missing required fields
      const res = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing reportingPeriod and other required fields
          notes: 'Incomplete report'
        });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
  
  describe('Special Endpoints', () => {
    test('should search for financial reports', async () => {
      const token = generateToken();
      
      // Create multiple reports
      await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...sampleFinancialReport,
          reportingPeriod: 'Q3 2023',
          reportDate: new Date('2023-09-30')
        });
      
      // Search by reporting period
      const res = await request(app)
        .get('/api/v1/financial-reports/search?q=Q2')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].reportingPeriod).toBe('Q2 2023');
    });
    
    test('should get financial report analytics', async () => {
      const token = generateToken();
      
      // Create reports
      await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${token}`)
        .send(sampleFinancialReport);
      
      // Get analytics
      const res = await request(app)
        .get('/api/v1/financial-reports/analytics')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalReports');
      expect(res.body).toHaveProperty('averageRevenue');
      expect(res.body).toHaveProperty('averageExpenses');
    });
    
    test('should support bulk creation of financial reports', async () => {
      const token = generateToken();
      
      // Create array of financial reports
      const bulkReports = [
        sampleFinancialReport,
        {
          ...sampleFinancialReport,
          reportingPeriod: 'Q3 2023',
          reportDate: new Date('2023-09-30')
        }
      ];
      
      // Bulk create
      const res = await request(app)
        .post('/api/v1/financial-reports/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkReports);
      
      expect(res.status).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });
});
