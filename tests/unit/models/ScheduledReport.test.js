/**
 * ScheduledReport Model Unit Tests
 * Issue #112: Create Report Scheduling System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// Mock mongoose before requiring the model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn().mockReturnValue(function(data) {
      return { ...data, save: jest.fn().mockResolvedValue(data) };
    }),
    Schema: actualMongoose.Schema
  };
});

describe('ScheduledReport Model', () => {
  let ScheduledReport;

  beforeAll(() => {
    jest.resetModules();
    ScheduledReport = require('../../../models/ScheduledReport');
  });

  describe('Schema Definition', () => {
    it('should export a mongoose model', () => {
      expect(ScheduledReport).toBeDefined();
    });

    it('should have required fields defined', () => {
      // The model should have these required fields
      const requiredFields = [
        'scheduleId',
        'companyId',
        'reportType',
        'name',
        'schedule'
      ];

      requiredFields.forEach(field => {
        expect(ScheduledReport.schema.paths[field]).toBeDefined();
      });
    });

    it('should have scheduleId as unique field', () => {
      const scheduleIdPath = ScheduledReport.schema.paths.scheduleId;
      expect(scheduleIdPath).toBeDefined();
      expect(scheduleIdPath.options.unique).toBe(true);
    });

    it('should have valid reportType enum values', () => {
      const reportTypePath = ScheduledReport.schema.paths.reportType;
      expect(reportTypePath).toBeDefined();
      expect(reportTypePath.enumValues).toContain('cap_table');
      expect(reportTypePath.enumValues).toContain('financial_summary');
      expect(reportTypePath.enumValues).toContain('investor_report');
      expect(reportTypePath.enumValues).toContain('vesting_summary');
      expect(reportTypePath.enumValues).toContain('equity_plan');
      expect(reportTypePath.enumValues).toContain('transaction_history');
      expect(reportTypePath.enumValues).toContain('compliance');
      expect(reportTypePath.enumValues).toContain('custom');
    });

    it('should have valid format enum values', () => {
      const formatPath = ScheduledReport.schema.paths.format;
      expect(formatPath).toBeDefined();
      expect(formatPath.enumValues).toContain('pdf');
      expect(formatPath.enumValues).toContain('excel');
      expect(formatPath.enumValues).toContain('csv');
    });

    it('should have valid status enum values', () => {
      const statusPath = ScheduledReport.schema.paths.status;
      expect(statusPath).toBeDefined();
      expect(statusPath.enumValues).toContain('active');
      expect(statusPath.enumValues).toContain('paused');
      expect(statusPath.enumValues).toContain('failed');
      expect(statusPath.enumValues).toContain('completed');
    });

    it('should have recipients as an array of strings', () => {
      const recipientsPath = ScheduledReport.schema.paths.recipients;
      expect(recipientsPath).toBeDefined();
      expect(recipientsPath.instance).toBe('Array');
    });

    it('should have schedule field for cron expression', () => {
      const schedulePath = ScheduledReport.schema.paths.schedule;
      expect(schedulePath).toBeDefined();
      expect(schedulePath.instance).toBe('String');
    });

    it('should have nextRunAt as Date type', () => {
      const nextRunAtPath = ScheduledReport.schema.paths.nextRunAt;
      expect(nextRunAtPath).toBeDefined();
      expect(nextRunAtPath.instance).toBe('Date');
    });

    it('should have lastRunAt as Date type', () => {
      const lastRunAtPath = ScheduledReport.schema.paths.lastRunAt;
      expect(lastRunAtPath).toBeDefined();
      expect(lastRunAtPath.instance).toBe('Date');
    });

    it('should have timezone field with default value', () => {
      const timezonePath = ScheduledReport.schema.paths.timezone;
      expect(timezonePath).toBeDefined();
      expect(timezonePath.defaultValue).toBe('UTC');
    });

    it('should have parameters as Mixed type for flexibility', () => {
      const parametersPath = ScheduledReport.schema.paths.parameters;
      expect(parametersPath).toBeDefined();
    });

    it('should have description field as optional', () => {
      const descriptionPath = ScheduledReport.schema.paths.description;
      expect(descriptionPath).toBeDefined();
      expect(descriptionPath.isRequired).toBeFalsy();
    });

    it('should have companyId indexed for efficient queries', () => {
      const companyIdPath = ScheduledReport.schema.paths.companyId;
      expect(companyIdPath).toBeDefined();
      expect(companyIdPath.options.index).toBe(true);
    });

    it('should have status indexed for efficient queries', () => {
      const statusPath = ScheduledReport.schema.paths.status;
      expect(statusPath).toBeDefined();
      expect(statusPath.options.index).toBe(true);
    });

    it('should have timestamps enabled', () => {
      expect(ScheduledReport.schema.options.timestamps).toBe(true);
    });
  });

  describe('Default Values', () => {
    it('should default status to active', () => {
      const statusPath = ScheduledReport.schema.paths.status;
      expect(statusPath.defaultValue).toBe('active');
    });

    it('should default format to pdf', () => {
      const formatPath = ScheduledReport.schema.paths.format;
      expect(formatPath.defaultValue).toBe('pdf');
    });

    it('should default timezone to UTC', () => {
      const timezonePath = ScheduledReport.schema.paths.timezone;
      expect(timezonePath.defaultValue).toBe('UTC');
    });

    it('should default recipients to empty array', () => {
      const recipientsPath = ScheduledReport.schema.paths.recipients;
      expect(recipientsPath.defaultValue).toEqual([]);
    });
  });

  describe('Indexes', () => {
    it('should have compound index on companyId and status', () => {
      const indexes = ScheduledReport.schema.indexes();
      const compoundIndex = indexes.find(idx =>
        idx[0].companyId === 1 && idx[0].status === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on nextRunAt for scheduling queries', () => {
      const nextRunAtPath = ScheduledReport.schema.paths.nextRunAt;
      expect(nextRunAtPath.options.index).toBe(true);
    });
  });
});
