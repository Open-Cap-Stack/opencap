/**
 * PaymentMethod Model Tests
 * Feature: Issue #116 - Integrate Payment Processing
 * TDD Red Phase: Tests written before implementation
 */

const mongoose = require('mongoose');

// Mock mongoose
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(function(definition, options) {
    this.definition = definition;
    this.options = options;
    this.methods = {};
    this.statics = {};
    this.pre = jest.fn();
    this.post = jest.fn();
    this.index = jest.fn();
  });

  mockSchema.Types = {
    Mixed: 'Mixed',
    ObjectId: 'ObjectId'
  };

  return {
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      modelName: 'PaymentMethod'
    }),
    Types: {
      ObjectId: jest.fn()
    }
  };
});

describe('PaymentMethod Model', () => {
  let PaymentMethod;

  beforeAll(() => {
    PaymentMethod = require('../../../models/PaymentMethod');
  });

  describe('Schema Definition', () => {
    it('should export a mongoose model', () => {
      expect(PaymentMethod).toBeDefined();
    });

    it('should be called with correct model name', () => {
      expect(mongoose.model).toHaveBeenCalledWith('PaymentMethod', expect.any(Object));
    });
  });

  describe('Required Fields', () => {
    it('should have methodId field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.methodId).toBeDefined();
      expect(definition.methodId.required).toBe(true);
    });

    it('should have customerId field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.customerId).toBeDefined();
      expect(definition.customerId.required).toBe(true);
    });

    it('should have type field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.type).toBeDefined();
      expect(definition.type.required).toBe(true);
    });

    it('should have last4 field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.last4).toBeDefined();
      expect(definition.last4.required).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should have brand field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.brand).toBeDefined();
    });

    it('should have expiryMonth field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.expiryMonth).toBeDefined();
    });

    it('should have expiryYear field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.expiryYear).toBeDefined();
    });

    it('should have isDefault field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.isDefault).toBeDefined();
    });

    it('should have status field', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.status).toBeDefined();
    });
  });

  describe('Enum Validations', () => {
    it('should have valid type enum values', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      const validTypes = ['card', 'bank_account'];
      expect(definition.type.enum).toEqual(validTypes);
    });

    it('should have valid status enum values', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      const validStatuses = ['active', 'inactive', 'expired'];
      expect(definition.status.enum).toEqual(validStatuses);
    });
  });

  describe('Field Types', () => {
    it('should have last4 as String type', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.last4.type).toBe(String);
    });

    it('should have expiryMonth as Number type', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.expiryMonth.type).toBe(Number);
    });

    it('should have expiryYear as Number type', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.expiryYear.type).toBe(Number);
    });

    it('should have isDefault as Boolean type', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.isDefault.type).toBe(Boolean);
    });
  });

  describe('Default Values', () => {
    it('should have isDefault defaulting to false', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.isDefault.default).toBe(false);
    });

    it('should have status defaulting to active', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const definition = schemaCall[0];
      expect(definition.status.default).toBe('active');
    });
  });

  describe('Schema Options', () => {
    it('should have timestamps enabled', () => {
      const schemaCall = mongoose.Schema.mock.calls[0];
      const options = schemaCall[1];
      expect(options.timestamps).toBe(true);
    });
  });
});
