/**
 * CustomReport Model Tests
 * Issue #197: Build Custom Report Builder Engine
 *
 * Tests for the CustomReport ZeroDB model including schema structure,
 * field definitions, constants, and CRUD method existence.
 */

const CustomReport = require('../../../models/CustomReport');

describe('CustomReport Model Tests', () => {
  describe('Schema Structure', () => {
    it('should have a schema defined', () => {
      expect(CustomReport.schema).toBeDefined();
      expect(typeof CustomReport.schema).toBe('object');
    });

    it('should have reportId field marked as required and unique', () => {
      expect(CustomReport.schema.reportId).toBeDefined();
      expect(CustomReport.schema.reportId.required).toBe(true);
      expect(CustomReport.schema.reportId.unique).toBe(true);
      expect(CustomReport.schema.reportId.type).toBe('string');
    });

    it('should have name field marked as required', () => {
      expect(CustomReport.schema.name).toBeDefined();
      expect(CustomReport.schema.name.required).toBe(true);
      expect(CustomReport.schema.name.type).toBe('string');
    });

    it('should have description field with default empty string', () => {
      expect(CustomReport.schema.description).toBeDefined();
      expect(CustomReport.schema.description.type).toBe('string');
      expect(CustomReport.schema.description.default).toBe('');
    });

    it('should have companyId field marked as required', () => {
      expect(CustomReport.schema.companyId).toBeDefined();
      expect(CustomReport.schema.companyId.required).toBe(true);
    });

    it('should have createdBy field marked as required', () => {
      expect(CustomReport.schema.createdBy).toBeDefined();
      expect(CustomReport.schema.createdBy.required).toBe(true);
    });

    it('should have dataSources field as required array', () => {
      expect(CustomReport.schema.dataSources).toBeDefined();
      expect(CustomReport.schema.dataSources.type).toBe('array');
      expect(CustomReport.schema.dataSources.required).toBe(true);
    });

    it('should have fields as required array', () => {
      expect(CustomReport.schema.fields).toBeDefined();
      expect(CustomReport.schema.fields.type).toBe('array');
      expect(CustomReport.schema.fields.required).toBe(true);
    });

    it('should have filters field as object', () => {
      expect(CustomReport.schema.filters).toBeDefined();
      expect(CustomReport.schema.filters.type).toBe('object');
    });

    it('should have groupBy field as array with default', () => {
      expect(CustomReport.schema.groupBy).toBeDefined();
      expect(CustomReport.schema.groupBy.type).toBe('array');
      expect(CustomReport.schema.groupBy.default).toEqual([]);
    });

    it('should have aggregations field as array with default', () => {
      expect(CustomReport.schema.aggregations).toBeDefined();
      expect(CustomReport.schema.aggregations.type).toBe('array');
      expect(CustomReport.schema.aggregations.default).toEqual([]);
    });

    it('should have limit field with default 100', () => {
      expect(CustomReport.schema.limit).toBeDefined();
      expect(CustomReport.schema.limit.type).toBe('number');
      expect(CustomReport.schema.limit.default).toBe(100);
    });

    it('should have isPublic field with default false', () => {
      expect(CustomReport.schema.isPublic).toBeDefined();
      expect(CustomReport.schema.isPublic.type).toBe('boolean');
      expect(CustomReport.schema.isPublic.default).toBe(false);
    });

    it('should have sharedWith field as array with default', () => {
      expect(CustomReport.schema.sharedWith).toBeDefined();
      expect(CustomReport.schema.sharedWith.type).toBe('array');
      expect(CustomReport.schema.sharedWith.default).toEqual([]);
    });

    it('should have status field with enum and default draft', () => {
      expect(CustomReport.schema.status).toBeDefined();
      expect(CustomReport.schema.status.type).toBe('string');
      expect(CustomReport.schema.status.enum).toEqual(['active', 'archived', 'draft']);
      expect(CustomReport.schema.status.default).toBe('draft');
    });

    it('should have executionCount field with default 0', () => {
      expect(CustomReport.schema.executionCount).toBeDefined();
      expect(CustomReport.schema.executionCount.type).toBe('number');
      expect(CustomReport.schema.executionCount.default).toBe(0);
    });

    it('should have schedule field as object', () => {
      expect(CustomReport.schema.schedule).toBeDefined();
      expect(CustomReport.schema.schedule.type).toBe('object');
    });

    it('should have metadata field as object', () => {
      expect(CustomReport.schema.metadata).toBeDefined();
      expect(CustomReport.schema.metadata.type).toBe('object');
    });

    it('should have timestamp fields', () => {
      expect(CustomReport.schema.createdAt).toBeDefined();
      expect(CustomReport.schema.updatedAt).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(CustomReport.VALID_STATUSES).toBeDefined();
      expect(CustomReport.VALID_STATUSES).toEqual(['active', 'archived', 'draft']);
    });

    it('should export VALID_FREQUENCIES', () => {
      expect(CustomReport.VALID_FREQUENCIES).toBeDefined();
      expect(CustomReport.VALID_FREQUENCIES).toEqual(['daily', 'weekly', 'monthly']);
    });

    it('should export VALID_SORT_ORDERS', () => {
      expect(CustomReport.VALID_SORT_ORDERS).toBeDefined();
      expect(CustomReport.VALID_SORT_ORDERS).toEqual(['ASC', 'DESC']);
    });

    it('should export VALID_AGGREGATIONS', () => {
      expect(CustomReport.VALID_AGGREGATIONS).toBeDefined();
      expect(CustomReport.VALID_AGGREGATIONS).toEqual(['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT']);
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof CustomReport.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof CustomReport.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof CustomReport.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof CustomReport.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof CustomReport.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof CustomReport.deleteOne).toBe('function');
    });

    it('should have deleteMany method', () => {
      expect(typeof CustomReport.deleteMany).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof CustomReport.countDocuments).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findByReportId method', () => {
      expect(typeof CustomReport.findByReportId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof CustomReport.findByCompany).toBe('function');
    });

    it('should have findByCreator method', () => {
      expect(typeof CustomReport.findByCreator).toBe('function');
    });

    it('should have hasBeenExecuted method', () => {
      expect(typeof CustomReport.hasBeenExecuted).toBe('function');
    });

    it('should have isScheduled method', () => {
      expect(typeof CustomReport.isScheduled).toBe('function');
    });

    it('should have recordExecution method', () => {
      expect(typeof CustomReport.recordExecution).toBe('function');
    });
  });

  describe('Business Logic', () => {
    it('hasBeenExecuted should return false when executionCount is 0', () => {
      expect(CustomReport.hasBeenExecuted({ executionCount: 0 })).toBe(false);
    });

    it('hasBeenExecuted should return true when executionCount > 0', () => {
      expect(CustomReport.hasBeenExecuted({ executionCount: 5 })).toBe(true);
    });

    it('isScheduled should return false when schedule is not enabled', () => {
      expect(CustomReport.isScheduled({ schedule: { enabled: false } })).toBe(false);
    });

    it('isScheduled should return true when schedule is enabled', () => {
      expect(CustomReport.isScheduled({ schedule: { enabled: true } })).toBe(true);
    });

    it('isScheduled should return falsy when report is null', () => {
      expect(CustomReport.isScheduled(null)).toBeFalsy();
    });
  });
});
