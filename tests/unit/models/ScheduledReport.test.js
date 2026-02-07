/**
 * ScheduledReport Model Unit Tests
 * Issue #112: Create Report Scheduling System
 *
 * Tests for ZeroDB-based ScheduledReport model
 */
process.env.SKIP_DB_SETUP = 'true';

const ScheduledReport = require('../../../models/ScheduledReport');

describe('ScheduledReport Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(ScheduledReport.tableName).toBe('scheduled_reports');
    });

    it('should export a defined model', () => {
      expect(ScheduledReport).toBeDefined();
      expect(ScheduledReport.schema).toBeDefined();
    });

    it('should have required fields defined', () => {
      const requiredFields = [
        'scheduleId',
        'companyId',
        'reportType',
        'name',
        'schedule'
      ];

      requiredFields.forEach(field => {
        expect(ScheduledReport.schema[field]).toBeDefined();
        expect(ScheduledReport.schema[field].required).toBe(true);
      });
    });

    it('should have scheduleId as unique field', () => {
      expect(ScheduledReport.schema.scheduleId.unique).toBe(true);
    });

    it('should have valid reportType enum values', () => {
      const enumValues = ScheduledReport.schema.reportType.enum;
      expect(enumValues).toContain('cap_table');
      expect(enumValues).toContain('financial_summary');
      expect(enumValues).toContain('investor_report');
      expect(enumValues).toContain('vesting_summary');
      expect(enumValues).toContain('equity_plan');
      expect(enumValues).toContain('transaction_history');
      expect(enumValues).toContain('compliance');
      expect(enumValues).toContain('custom');
    });

    it('should have valid format enum values', () => {
      const enumValues = ScheduledReport.schema.format.enum;
      expect(enumValues).toContain('pdf');
      expect(enumValues).toContain('excel');
      expect(enumValues).toContain('csv');
    });

    it('should have valid status enum values', () => {
      const enumValues = ScheduledReport.schema.status.enum;
      expect(enumValues).toContain('active');
      expect(enumValues).toContain('paused');
      expect(enumValues).toContain('failed');
      expect(enumValues).toContain('completed');
    });

    it('should have recipients as array type', () => {
      expect(ScheduledReport.schema.recipients).toBeDefined();
      expect(ScheduledReport.schema.recipients.type).toBe('array');
    });

    it('should have schedule field as string type', () => {
      expect(ScheduledReport.schema.schedule).toBeDefined();
      expect(ScheduledReport.schema.schedule.type).toBe('string');
    });

    it('should have nextRunAt as date type', () => {
      expect(ScheduledReport.schema.nextRunAt).toBeDefined();
      expect(ScheduledReport.schema.nextRunAt.type).toBe('date');
    });

    it('should have lastRunAt as date type', () => {
      expect(ScheduledReport.schema.lastRunAt).toBeDefined();
      expect(ScheduledReport.schema.lastRunAt.type).toBe('date');
    });

    it('should have parameters as object type', () => {
      expect(ScheduledReport.schema.parameters).toBeDefined();
      expect(ScheduledReport.schema.parameters.type).toBe('object');
    });

    it('should have description field as optional', () => {
      expect(ScheduledReport.schema.description).toBeDefined();
      expect(ScheduledReport.schema.description.required).toBeFalsy();
    });

    it('should have timestamp fields', () => {
      expect(ScheduledReport.schema.createdAt).toBeDefined();
      expect(ScheduledReport.schema.updatedAt).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should default status to active', () => {
      expect(ScheduledReport.schema.status.default).toBe('active');
    });

    it('should default format to pdf', () => {
      expect(ScheduledReport.schema.format.default).toBe('pdf');
    });

    it('should default timezone to UTC', () => {
      expect(ScheduledReport.schema.timezone.default).toBe('UTC');
    });

    it('should default recipients to empty array', () => {
      expect(ScheduledReport.schema.recipients.default).toEqual([]);
    });
  });

  describe('Constants', () => {
    it('should export REPORT_TYPES constant', () => {
      expect(ScheduledReport.REPORT_TYPES).toBeDefined();
      expect(ScheduledReport.REPORT_TYPES).toContain('cap_table');
      expect(ScheduledReport.REPORT_TYPES).toContain('custom');
    });

    it('should export REPORT_FORMATS constant', () => {
      expect(ScheduledReport.REPORT_FORMATS).toBeDefined();
      expect(ScheduledReport.REPORT_FORMATS).toContain('pdf');
      expect(ScheduledReport.REPORT_FORMATS).toContain('excel');
      expect(ScheduledReport.REPORT_FORMATS).toContain('csv');
    });

    it('should export VALID_STATUSES constant', () => {
      expect(ScheduledReport.VALID_STATUSES).toBeDefined();
      expect(ScheduledReport.VALID_STATUSES).toContain('active');
      expect(ScheduledReport.VALID_STATUSES).toContain('paused');
    });
  });

  describe('Business Logic Methods', () => {
    describe('isDue', () => {
      it('should return true when report is due', () => {
        const report = {
          status: 'active',
          nextRunAt: new Date(Date.now() - 60000).toISOString() // 1 minute ago
        };
        expect(ScheduledReport.isDue(report)).toBe(true);
      });

      it('should return false when report is not due yet', () => {
        const report = {
          status: 'active',
          nextRunAt: new Date(Date.now() + 60000).toISOString() // 1 minute from now
        };
        expect(ScheduledReport.isDue(report)).toBe(false);
      });

      it('should return false when report is paused', () => {
        const report = {
          status: 'paused',
          nextRunAt: new Date(Date.now() - 60000).toISOString()
        };
        expect(ScheduledReport.isDue(report)).toBe(false);
      });

      it('should return false when no nextRunAt', () => {
        const report = {
          status: 'active',
          nextRunAt: null
        };
        expect(ScheduledReport.isDue(report)).toBe(false);
      });
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof ScheduledReport.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof ScheduledReport.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof ScheduledReport.findOne).toBe('function');
    });

    it('should have findByScheduleId method', () => {
      expect(typeof ScheduledReport.findByScheduleId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof ScheduledReport.findByCompany).toBe('function');
    });

    it('should have findDue method', () => {
      expect(typeof ScheduledReport.findDue).toBe('function');
    });

    it('should have updateLastRun method', () => {
      expect(typeof ScheduledReport.updateLastRun).toBe('function');
    });

    it('should have recordFailure method', () => {
      expect(typeof ScheduledReport.recordFailure).toBe('function');
    });

    it('should have pause method', () => {
      expect(typeof ScheduledReport.pause).toBe('function');
    });

    it('should have resume method', () => {
      expect(typeof ScheduledReport.resume).toBe('function');
    });

    it('should have addRecipient method', () => {
      expect(typeof ScheduledReport.addRecipient).toBe('function');
    });

    it('should have removeRecipient method', () => {
      expect(typeof ScheduledReport.removeRecipient).toBe('function');
    });
  });
});
