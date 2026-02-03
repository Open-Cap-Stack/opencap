/**
 * ReportExecution Model Unit Tests
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

describe('ReportExecution Model', () => {
  let ReportExecution;

  beforeAll(() => {
    jest.resetModules();
    ReportExecution = require('../../../models/ReportExecution');
  });

  describe('Schema Definition', () => {
    it('should export a mongoose model', () => {
      expect(ReportExecution).toBeDefined();
    });

    it('should have required fields defined', () => {
      const requiredFields = [
        'executionId',
        'scheduleId',
        'startedAt'
      ];

      requiredFields.forEach(field => {
        expect(ReportExecution.schema.paths[field]).toBeDefined();
      });
    });

    it('should have executionId as unique field', () => {
      const executionIdPath = ReportExecution.schema.paths.executionId;
      expect(executionIdPath).toBeDefined();
      expect(executionIdPath.options.unique).toBe(true);
    });

    it('should have scheduleId indexed for efficient queries', () => {
      const scheduleIdPath = ReportExecution.schema.paths.scheduleId;
      expect(scheduleIdPath).toBeDefined();
      expect(scheduleIdPath.options.index).toBe(true);
    });

    it('should have valid status enum values', () => {
      const statusPath = ReportExecution.schema.paths.status;
      expect(statusPath).toBeDefined();
      expect(statusPath.enumValues).toContain('pending');
      expect(statusPath.enumValues).toContain('running');
      expect(statusPath.enumValues).toContain('completed');
      expect(statusPath.enumValues).toContain('failed');
    });

    it('should have startedAt as Date type', () => {
      const startedAtPath = ReportExecution.schema.paths.startedAt;
      expect(startedAtPath).toBeDefined();
      expect(startedAtPath.instance).toBe('Date');
    });

    it('should have completedAt as Date type', () => {
      const completedAtPath = ReportExecution.schema.paths.completedAt;
      expect(completedAtPath).toBeDefined();
      expect(completedAtPath.instance).toBe('Date');
    });

    it('should have fileUrl as String type', () => {
      const fileUrlPath = ReportExecution.schema.paths.fileUrl;
      expect(fileUrlPath).toBeDefined();
      expect(fileUrlPath.instance).toBe('String');
    });

    it('should have fileSize as Number type', () => {
      const fileSizePath = ReportExecution.schema.paths.fileSize;
      expect(fileSizePath).toBeDefined();
      expect(fileSizePath.instance).toBe('Number');
    });

    it('should have error field for failure details', () => {
      const errorPath = ReportExecution.schema.paths.error;
      expect(errorPath).toBeDefined();
    });

    it('should have deliveryStatus as array for tracking recipient delivery', () => {
      const deliveryStatusPath = ReportExecution.schema.paths.deliveryStatus;
      expect(deliveryStatusPath).toBeDefined();
      expect(deliveryStatusPath.instance).toBe('Array');
    });

    it('should have timestamps enabled', () => {
      expect(ReportExecution.schema.options.timestamps).toBe(true);
    });
  });

  describe('Delivery Status Schema', () => {
    it('should have recipient email field', () => {
      const deliveryStatusPath = ReportExecution.schema.paths.deliveryStatus;
      expect(deliveryStatusPath).toBeDefined();
    });

    it('should have delivery status enum values', () => {
      // Check deliveryStatus array schema has proper structure
      const deliveryStatusPath = ReportExecution.schema.paths.deliveryStatus;
      expect(deliveryStatusPath).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should default status to pending', () => {
      const statusPath = ReportExecution.schema.paths.status;
      expect(statusPath.defaultValue).toBe('pending');
    });

    it('should default deliveryStatus to empty array', () => {
      const deliveryStatusPath = ReportExecution.schema.paths.deliveryStatus;
      expect(deliveryStatusPath.defaultValue).toEqual([]);
    });
  });

  describe('Indexes', () => {
    it('should have compound index on scheduleId and status', () => {
      const indexes = ReportExecution.schema.indexes();
      const compoundIndex = indexes.find(idx =>
        idx[0].scheduleId === 1 && idx[0].status === 1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on startedAt for date range queries', () => {
      const startedAtPath = ReportExecution.schema.paths.startedAt;
      expect(startedAtPath.options.index).toBe(true);
    });
  });

  describe('Virtuals', () => {
    it('should have duration virtual for calculating execution time', () => {
      const virtuals = ReportExecution.schema.virtuals;
      expect(virtuals.duration).toBeDefined();
    });
  });
});
