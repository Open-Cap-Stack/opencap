/**
 * Integration Tests for Financial Report Routes
 * 
 * [Feature] OCAE-205: Implement financial reporting endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const FinancialReport = require('../../models/financialReport');
const User = require('../../models/User');
const { generateToken } = require('../../utils/auth');

describe('Financial Report Routes Integration (OCAE-205)', () => {
  let authToken;
  let testUser;
  let testReportId;
  
  // Setup before all tests
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect('mongodb://127.0.0.1:27017/test-financial-reports', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Create a test user
    testUser = await User.create({
      email: 'test-financial-reports@example.com',
      password: 'Password123!',
      name: 'Test User',
      role: 'admin'
    });
    
    // Generate auth token
    authToken = generateToken(testUser);
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
    await FinancialReport.deleteMany({});
    await User.deleteMany({ email: 'test-financial-reports@example.com' });
    
    // Close database connection
    await mongoose.connection.close();
  });
  
  // Clear reports between tests
  afterEach(async () => {
    // Clean up financial reports but keep the user
    await FinancialReport.deleteMany({});
  });
  
  describe('POST /api/v1/financial-reports', () => {
    it('should create a new financial report with authentication', async () => {
      const reportData = {
        companyId: 'integration-test-company',
        reportingPeriod: '2023-Q4',
        reportType: 'quarterly',
        revenue: {
          sales: 1000,
          services: 500
        },
        expenses: {
          salaries: 800,
          operations: 200
        }
      };
      
      const response = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(201);
      
      // Verify response
      expect(response.body).toHaveProperty('_id');
      expect(response.body.companyId).toBe(reportData.companyId);
      expect(response.body.reportType).toBe(reportData.reportType);
      expect(response.body.totalRevenue).toBe(1500);
      expect(response.body.totalExpenses).toBe(1000);
      expect(response.body.netIncome).toBe(500);
      
      // Save ID for later tests
      testReportId = response.body._id;
    });
    
    it('should return 400 when required fields are missing', async () => {
      const invalidReport = {
        // Missing required fields
        revenue: { sales: 1000 }
      };
      
      const response = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidReport)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 401 without authentication', async () => {
      const reportData = {
        companyId: 'integration-test-company',
        reportingPeriod: '2023-Q4',
        reportType: 'quarterly'
      };
      
      await request(app)
        .post('/api/v1/financial-reports')
        .send(reportData)
        .expect(401);
    });
  });
  
  describe('GET /api/v1/financial-reports', () => {
    // Setup test data
    beforeEach(async () => {
      // Create test reports
      await FinancialReport.create([
        {
          companyId: 'integration-test-company',
          reportingPeriod: '2023-Q1',
          reportType: 'quarterly',
          reportDate: new Date('2023-01-01'),
          userId: testUser._id,
          revenue: { sales: 1000 },
          expenses: { salaries: 800 }
        },
        {
          companyId: 'integration-test-company',
          reportingPeriod: '2023-Q2',
          reportType: 'quarterly',
          reportDate: new Date('2023-04-01'),
          userId: testUser._id,
          revenue: { sales: 1200 },
          expenses: { salaries: 900 }
        },
        {
          companyId: 'other-company',
          reportingPeriod: '2023-Q1',
          reportType: 'quarterly',
          reportDate: new Date('2023-01-15'),
          userId: testUser._id,
          revenue: { sales: 800 },
          expenses: { salaries: 600 }
        }
      ]);
    });
    
    it('should get paginated financial reports', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body.reports.length).toBe(3);
    });
    
    it('should filter reports by companyId', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports?companyId=other-company')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.reports.length).toBe(1);
      expect(response.body.reports[0].companyId).toBe('other-company');
    });
    
    it('should filter reports by date range', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports?startDate=2023-03-01&endDate=2023-05-01')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.reports.length).toBe(1);
      expect(response.body.reports[0].reportingPeriod).toBe('2023-Q2');
    });
    
    it('should paginate results correctly', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.reports.length).toBe(2);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.totalPages).toBe(2);
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/financial-reports')
        .expect(401);
    });
  });
  
  describe('GET /api/v1/financial-reports/:id', () => {
    let reportId;
    
    // Create a report for testing
    beforeEach(async () => {
      const report = await FinancialReport.create({
        companyId: 'integration-test-company',
        reportingPeriod: '2023-Q3',
        reportType: 'quarterly',
        userId: testUser._id,
        revenue: { sales: 1500 },
        expenses: { salaries: 1000 }
      });
      
      reportId = report._id;
    });
    
    it('should get a specific financial report by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body._id).toBe(reportId.toString());
      expect(response.body.companyId).toBe('integration-test-company');
      expect(response.body.reportingPeriod).toBe('2023-Q3');
    });
    
    it('should return 404 for non-existent report', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/v1/financial-reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v1/financial-reports/${reportId}`)
        .expect(401);
    });
  });
  
  describe('PUT /api/v1/financial-reports/:id', () => {
    let reportId;
    
    // Create a report for testing
    beforeEach(async () => {
      const report = await FinancialReport.create({
        companyId: 'integration-test-company',
        reportingPeriod: '2023-Q3',
        reportType: 'quarterly',
        userId: testUser._id,
        revenue: { sales: 1500 },
        expenses: { salaries: 1000 }
      });
      
      reportId = report._id;
    });
    
    it('should update a financial report', async () => {
      const updateData = {
        revenue: { 
          sales: 2000,
          services: 500 
        },
        expenses: {
          salaries: 1200,
          marketing: 300
        }
      };
      
      const response = await request(app)
        .put(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body._id).toBe(reportId.toString());
      expect(response.body.revenue.sales).toBe(2000);
      expect(response.body.revenue.services).toBe(500);
      expect(response.body.expenses.salaries).toBe(1200);
      expect(response.body.expenses.marketing).toBe(300);
      expect(response.body.totalRevenue).toBe(2500);
      expect(response.body.totalExpenses).toBe(1500);
      expect(response.body.netIncome).toBe(1000);
    });
    
    it('should return 404 for non-existent report', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/v1/financial-reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ revenue: { sales: 2000 } })
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        reportType: 'invalid-type' // Not in the enum
      };
      
      const response = await request(app)
        .put(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body).toHaveProperty('errors');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/v1/financial-reports/${reportId}`)
        .send({ revenue: { sales: 2000 } })
        .expect(401);
    });
  });
  
  describe('DELETE /api/v1/financial-reports/:id', () => {
    let reportId;
    
    // Create a report for testing
    beforeEach(async () => {
      const report = await FinancialReport.create({
        companyId: 'integration-test-company',
        reportingPeriod: '2023-Q3',
        reportType: 'quarterly',
        userId: testUser._id,
        revenue: { sales: 1500 },
        expenses: { salaries: 1000 }
      });
      
      reportId = report._id;
    });
    
    it('should delete a financial report', async () => {
      const response = await request(app)
        .delete(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');
      
      // Verify report is deleted
      const deletedReport = await FinancialReport.findById(reportId);
      expect(deletedReport).toBeNull();
    });
    
    it('should return 404 for non-existent report', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/v1/financial-reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .delete(`/api/v1/financial-reports/${reportId}`)
        .expect(401);
    });
  });
  
  describe('GET /api/v1/financial-reports/search', () => {
    // Create reports for testing search
    beforeEach(async () => {
      await FinancialReport.create([
        {
          companyId: 'search-test-company',
          reportingPeriod: '2023-Q1',
          reportType: 'quarterly',
          userId: testUser._id,
          notes: 'Contains special keyword: oceancap'
        },
        {
          companyId: 'another-company',
          reportingPeriod: '2023-Annual',
          reportType: 'annual',
          userId: testUser._id,
          notes: 'Annual report for compliance'
        }
      ]);
    });
    
    it('should search reports by keyword', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports/search?keyword=oceancap')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('results');
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].notes).toContain('oceancap');
    });
    
    it('should return empty results for non-matching keyword', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports/search?keyword=nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('results');
      expect(response.body.results.length).toBe(0);
    });
    
    it('should return 400 if no keyword is provided', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('keyword is required');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/financial-reports/search?keyword=test')
        .expect(401);
    });
  });
  
  describe('GET /api/v1/financial-reports/analytics', () => {
    // Create reports for testing analytics
    beforeEach(async () => {
      await FinancialReport.create([
        {
          companyId: 'analytics-company-1',
          reportingPeriod: '2023-Q1',
          reportType: 'quarterly',
          userId: testUser._id,
          revenue: { sales: 1000, services: 500 },
          expenses: { salaries: 800, operations: 200 }
        },
        {
          companyId: 'analytics-company-1',
          reportingPeriod: '2023-Q2',
          reportType: 'quarterly',
          userId: testUser._id,
          revenue: { sales: 1200, services: 600 },
          expenses: { salaries: 900, operations: 300 }
        },
        {
          companyId: 'analytics-company-2',
          reportingPeriod: '2023-Annual',
          reportType: 'annual',
          userId: testUser._id,
          revenue: { sales: 5000, services: 2000 },
          expenses: { salaries: 4000, operations: 1000 }
        }
      ]);
    });
    
    it('should retrieve analytics data', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveProperty('byReportType');
      expect(response.body.analytics).toHaveProperty('byCompany');
      expect(response.body.analytics).toHaveProperty('timeSeries');
    });
    
    it('should filter analytics by companyId', async () => {
      const response = await request(app)
        .get('/api/v1/financial-reports/analytics?companyId=analytics-company-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('analytics');
      
      // Should only include data for the specified company
      if (response.body.analytics.byCompany) {
        const companies = Object.keys(response.body.analytics.byCompany);
        expect(companies).toContain('analytics-company-1');
        expect(companies).not.toContain('analytics-company-2');
      }
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/financial-reports/analytics')
        .expect(401);
    });
  });
  
  describe('POST /api/v1/financial-reports/bulk', () => {
    it('should create multiple reports in bulk', async () => {
      const bulkData = {
        reports: [
          {
            companyId: 'bulk-test-company',
            reportingPeriod: '2023-Q1',
            reportType: 'quarterly',
            revenue: { sales: 1000 },
            expenses: { salaries: 800 }
          },
          {
            companyId: 'bulk-test-company',
            reportingPeriod: '2023-Q2',
            reportType: 'quarterly',
            revenue: { sales: 1200 },
            expenses: { salaries: 900 }
          }
        ]
      };
      
      const response = await request(app)
        .post('/api/v1/financial-reports/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(201);
      
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('reports');
      expect(response.body.count).toBe(2);
      expect(response.body.reports.length).toBe(2);
    });
    
    it('should return 400 if reports array is missing', async () => {
      const response = await request(app)
        .post('/api/v1/financial-reports/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('reports array is required');
    });
    
    it('should return 400 if reports array is empty', async () => {
      const response = await request(app)
        .post('/api/v1/financial-reports/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reports: [] })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('reports array is empty');
    });
    
    it('should return 400 for invalid report data', async () => {
      const invalidData = {
        reports: [
          {
            // Missing required fields
            revenue: { sales: 1000 }
          }
        ]
      };
      
      const response = await request(app)
        .post('/api/v1/financial-reports/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/financial-reports/bulk')
        .send({ reports: [] })
        .expect(401);
    });
  });
});
