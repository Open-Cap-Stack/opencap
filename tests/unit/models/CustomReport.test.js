/**
 * CustomReport Model Tests
 * Issue #197: Build Custom Report Builder Engine
 */

const mongoose = require('mongoose');
const CustomReport = require('../../../models/CustomReport');

describe('CustomReport Model Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await CustomReport.deleteMany({});
  });

  describe('Given a valid custom report configuration', () => {
    it('should create a custom report successfully', async () => {
      const reportData = {
        reportId: 'test-report-001',
        name: 'Stakeholder Report',
        description: 'Report of all stakeholders',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name', 'email', 'type'],
        status: 'active'
      };

      const report = new CustomReport(reportData);
      const savedReport = await report.save();

      expect(savedReport._id).toBeDefined();
      expect(savedReport.reportId).toBe(reportData.reportId);
      expect(savedReport.name).toBe(reportData.name);
      expect(savedReport.dataSources).toEqual(reportData.dataSources);
      expect(savedReport.fields).toEqual(reportData.fields);
    });

    it('should set default values correctly', async () => {
      const reportData = {
        reportId: 'test-report-002',
        name: 'Basic Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['transactions'],
        fields: ['id', 'amount']
      };

      const report = new CustomReport(reportData);
      const savedReport = await report.save();

      expect(savedReport.status).toBe('draft');
      expect(savedReport.isPublic).toBe(false);
      expect(savedReport.executionCount).toBe(0);
      expect(savedReport.limit).toBe(100);
      expect(savedReport.sharedWith).toEqual([]);
    });

    it('should create report with aggregations', async () => {
      const reportData = {
        reportId: 'test-report-003',
        name: 'Aggregated Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['transactions'],
        fields: ['stakeholder_id'],
        aggregations: [
          {
            field: 'amount',
            function: 'SUM',
            alias: 'total_amount'
          },
          {
            field: 'amount',
            function: 'AVG',
            alias: 'avg_amount'
          }
        ],
        groupBy: ['stakeholder_id']
      };

      const report = new CustomReport(reportData);
      const savedReport = await report.save();

      expect(savedReport.aggregations).toHaveLength(2);
      expect(savedReport.aggregations[0].function).toBe('SUM');
      expect(savedReport.aggregations[0].alias).toBe('total_amount');
      expect(savedReport.groupBy).toEqual(['stakeholder_id']);
    });
  });

  describe('Given invalid custom report data', () => {
    it('should fail when reportId is missing', async () => {
      const reportData = {
        name: 'Invalid Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name']
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });

    it('should fail when name is missing', async () => {
      const reportData = {
        reportId: 'test-report-004',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name']
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });

    it('should fail when dataSources array is empty', async () => {
      const reportData = {
        reportId: 'test-report-005',
        name: 'Invalid Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: [],
        fields: ['name']
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });

    it('should fail when fields array is empty', async () => {
      const reportData = {
        reportId: 'test-report-006',
        name: 'Invalid Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: []
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });

    it('should fail with invalid aggregation function', async () => {
      const reportData = {
        reportId: 'test-report-007',
        name: 'Invalid Aggregation',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['transactions'],
        fields: ['amount'],
        aggregations: [
          {
            field: 'amount',
            function: 'INVALID_FUNCTION'
          }
        ]
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });

    it('should fail with invalid status', async () => {
      const reportData = {
        reportId: 'test-report-008',
        name: 'Invalid Status',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name'],
        status: 'invalid_status'
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });

    it('should fail when limit exceeds maximum', async () => {
      const reportData = {
        reportId: 'test-report-009',
        name: 'Excessive Limit',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name'],
        limit: 20000
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow();
    });
  });

  describe('Given scheduled reports', () => {
    it('should fail when schedule is enabled without frequency', async () => {
      const reportData = {
        reportId: 'test-report-010',
        name: 'Scheduled Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name'],
        schedule: {
          enabled: true,
          recipients: ['user@example.com']
        }
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow('Frequency is required');
    });

    it('should fail when schedule is enabled without recipients', async () => {
      const reportData = {
        reportId: 'test-report-011',
        name: 'Scheduled Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name'],
        schedule: {
          enabled: true,
          frequency: 'daily',
          recipients: []
        }
      };

      const report = new CustomReport(reportData);

      await expect(report.save()).rejects.toThrow('At least one recipient is required');
    });

    it('should create scheduled report with valid configuration', async () => {
      const reportData = {
        reportId: 'test-report-012',
        name: 'Scheduled Report',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name'],
        schedule: {
          enabled: true,
          frequency: 'daily',
          recipients: ['user@example.com']
        }
      };

      const report = new CustomReport(reportData);
      const savedReport = await report.save();

      expect(savedReport.schedule.enabled).toBe(true);
      expect(savedReport.schedule.frequency).toBe('daily');
      expect(savedReport.schedule.recipients).toEqual(['user@example.com']);
    });
  });

  describe('Given virtual fields', () => {
    it('should calculate hasBeenExecuted virtual correctly', async () => {
      const report = new CustomReport({
        reportId: 'test-report-013',
        name: 'Virtual Test',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name'],
        executionCount: 0
      });

      await report.save();
      expect(report.hasBeenExecuted).toBe(false);

      report.executionCount = 5;
      await report.save();
      expect(report.hasBeenExecuted).toBe(true);
    });

    it('should calculate isScheduled virtual correctly', async () => {
      const report = new CustomReport({
        reportId: 'test-report-014',
        name: 'Virtual Test',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name']
      });

      await report.save();
      expect(report.isScheduled).toBe(false);

      report.schedule = {
        enabled: true,
        frequency: 'weekly',
        recipients: ['user@example.com']
      };
      await report.save();
      expect(report.isScheduled).toBe(true);
    });
  });

  describe('Given aggregation alias generation', () => {
    it('should auto-generate alias if not provided', async () => {
      const reportData = {
        reportId: 'test-report-015',
        name: 'Alias Test',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['transactions'],
        fields: ['amount'],
        aggregations: [
          {
            field: 'amount',
            function: 'SUM'
          }
        ]
      };

      const report = new CustomReport(reportData);
      const savedReport = await report.save();

      expect(savedReport.aggregations[0].alias).toBe('sum_amount');
    });
  });

  describe('Given unique constraints', () => {
    it('should fail when creating report with duplicate reportId', async () => {
      const reportData = {
        reportId: 'test-report-016',
        name: 'Unique Test',
        companyId: 'company-001',
        createdBy: 'user-001',
        dataSources: ['stakeholders'],
        fields: ['name']
      };

      const report1 = new CustomReport(reportData);
      await report1.save();

      const report2 = new CustomReport(reportData);
      await expect(report2.save()).rejects.toThrow();
    });
  });
});
