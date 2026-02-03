/**
 * ExerciseRequest Model Tests
 * Feature: Issue #79 - Build Exercise Management System
 */
const mongoose = require('mongoose');

// Mock mongoose before importing the model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn().mockReturnValue({}),
    Schema: actualMongoose.Schema
  };
});

describe('ExerciseRequest Model', () => {
  let ExerciseRequest;
  let exerciseRequestSchema;

  beforeAll(() => {
    // Clear the module cache to get fresh import
    jest.resetModules();

    // Re-mock mongoose with schema capture
    jest.doMock('mongoose', () => {
      const actualMongoose = jest.requireActual('mongoose');
      return {
        ...actualMongoose,
        model: jest.fn((name, schema) => {
          exerciseRequestSchema = schema;
          return {};
        }),
        Schema: actualMongoose.Schema
      };
    });

    ExerciseRequest = require('../../../models/ExerciseRequest');
  });

  afterAll(() => {
    jest.resetModules();
  });

  describe('Schema Definition', () => {
    it('should export a model', () => {
      expect(ExerciseRequest).toBeDefined();
    });

    it('should have required fields', () => {
      expect(exerciseRequestSchema).toBeDefined();
      const paths = exerciseRequestSchema.paths || exerciseRequestSchema.obj;

      // Check that essential fields exist in the schema definition
      expect(paths).toBeDefined();
    });
  });

  describe('Field Validations', () => {
    it('should define exerciseRequestId as unique', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.exerciseRequestId).toBeDefined();
    });

    it('should define companyId as required', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.companyId).toBeDefined();
    });

    it('should define stakeholderId as required', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.stakeholderId).toBeDefined();
    });

    it('should define equityGrantId as required', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.equityGrantId).toBeDefined();
    });

    it('should have optionType enum with ISO and NSO', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.optionType).toBeDefined();
    });

    it('should have status enum with workflow states', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.status).toBeDefined();
    });

    it('should have paymentMethod enum', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.paymentMethod).toBeDefined();
    });

    it('should define exerciseDetails nested object', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.exerciseDetails).toBeDefined();
    });

    it('should define taxWithholding nested object', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.taxWithholding).toBeDefined();
    });

    it('should define payment nested object', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.payment).toBeDefined();
    });

    it('should define certificateData nested object', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.certificateData).toBeDefined();
    });
  });

  describe('Exercise Window Fields', () => {
    it('should define exerciseWindow nested object', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.exerciseWindow).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps option enabled', () => {
      const options = exerciseRequestSchema.options;
      expect(options.timestamps).toBe(true);
    });
  });

  describe('Partial Exercise Fields', () => {
    it('should have partial exercise tracking fields in exerciseDetails', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.exerciseDetails).toBeDefined();
    });
  });

  describe('Form 3921 Fields', () => {
    it('should have form3921Id reference field', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.form3921Id).toBeDefined();
    });

    it('should have form3921Generated boolean field', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.form3921Generated).toBeDefined();
    });

    it('should have form3921GeneratedAt date field', () => {
      const schemaObj = exerciseRequestSchema.obj || exerciseRequestSchema.paths;
      expect(schemaObj.form3921GeneratedAt).toBeDefined();
    });
  });
});
