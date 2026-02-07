/**
 * PaymentMethod Model Tests
 * Feature: Issue #116 - Integrate Payment Processing
 *
 * Tests for the PaymentMethod ZeroDB model including schema structure,
 * field definitions, constants, and CRUD method existence.
 */

const PaymentMethod = require('../../../models/PaymentMethod');

describe('PaymentMethod Model', () => {
  describe('Schema Definition', () => {
    it('should have a schema defined', () => {
      expect(PaymentMethod.schema).toBeDefined();
      expect(typeof PaymentMethod.schema).toBe('object');
    });

    it('should export a model object', () => {
      expect(PaymentMethod).toBeDefined();
      expect(typeof PaymentMethod).toBe('object');
    });
  });

  describe('Required Fields', () => {
    it('should have methodId field as required and unique', () => {
      expect(PaymentMethod.schema.methodId).toBeDefined();
      expect(PaymentMethod.schema.methodId.required).toBe(true);
      expect(PaymentMethod.schema.methodId.unique).toBe(true);
    });

    it('should have customerId field as required', () => {
      expect(PaymentMethod.schema.customerId).toBeDefined();
      expect(PaymentMethod.schema.customerId.required).toBe(true);
    });

    it('should have type field as required', () => {
      expect(PaymentMethod.schema.type).toBeDefined();
      expect(PaymentMethod.schema.type.required).toBe(true);
    });

    it('should have last4 field as required', () => {
      expect(PaymentMethod.schema.last4).toBeDefined();
      expect(PaymentMethod.schema.last4.required).toBe(true);
    });
  });

  describe('Optional Fields', () => {
    it('should have brand field', () => {
      expect(PaymentMethod.schema.brand).toBeDefined();
    });

    it('should have expiryMonth field', () => {
      expect(PaymentMethod.schema.expiryMonth).toBeDefined();
      expect(PaymentMethod.schema.expiryMonth.type).toBe('number');
    });

    it('should have expiryYear field', () => {
      expect(PaymentMethod.schema.expiryYear).toBeDefined();
      expect(PaymentMethod.schema.expiryYear.type).toBe('number');
    });

    it('should have isDefault field', () => {
      expect(PaymentMethod.schema.isDefault).toBeDefined();
      expect(PaymentMethod.schema.isDefault.type).toBe('boolean');
    });

    it('should have status field', () => {
      expect(PaymentMethod.schema.status).toBeDefined();
    });

    it('should have billingDetails field as object', () => {
      expect(PaymentMethod.schema.billingDetails).toBeDefined();
      expect(PaymentMethod.schema.billingDetails.type).toBe('object');
    });

    it('should have stripePaymentMethodId field', () => {
      expect(PaymentMethod.schema.stripePaymentMethodId).toBeDefined();
    });

    it('should have metadata field', () => {
      expect(PaymentMethod.schema.metadata).toBeDefined();
      expect(PaymentMethod.schema.metadata.type).toBe('object');
    });
  });

  describe('Enum Validations', () => {
    it('should have valid type enum values', () => {
      const validTypes = ['card', 'bank_account'];
      expect(PaymentMethod.schema.type.enum).toEqual(validTypes);
    });

    it('should have valid status enum values', () => {
      const validStatuses = ['active', 'inactive', 'expired'];
      expect(PaymentMethod.schema.status.enum).toEqual(validStatuses);
    });

    it('should have valid card brand enum values', () => {
      expect(PaymentMethod.schema.brand.enum).toEqual(['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'unknown']);
    });
  });

  describe('Field Types', () => {
    it('should have last4 as string type', () => {
      expect(PaymentMethod.schema.last4.type).toBe('string');
    });

    it('should have expiryMonth as number type', () => {
      expect(PaymentMethod.schema.expiryMonth.type).toBe('number');
    });

    it('should have expiryYear as number type', () => {
      expect(PaymentMethod.schema.expiryYear.type).toBe('number');
    });

    it('should have isDefault as boolean type', () => {
      expect(PaymentMethod.schema.isDefault.type).toBe('boolean');
    });
  });

  describe('Default Values', () => {
    it('should have isDefault defaulting to false', () => {
      expect(PaymentMethod.schema.isDefault.default).toBe(false);
    });

    it('should have status defaulting to active', () => {
      expect(PaymentMethod.schema.status.default).toBe('active');
    });

    it('should have brand defaulting to unknown', () => {
      expect(PaymentMethod.schema.brand.default).toBe('unknown');
    });
  });

  describe('Constants', () => {
    it('should export METHOD_TYPES', () => {
      expect(PaymentMethod.METHOD_TYPES).toBeDefined();
      expect(PaymentMethod.METHOD_TYPES).toEqual(['card', 'bank_account']);
    });

    it('should export VALID_STATUSES', () => {
      expect(PaymentMethod.VALID_STATUSES).toBeDefined();
      expect(PaymentMethod.VALID_STATUSES).toEqual(['active', 'inactive', 'expired']);
    });

    it('should export CARD_BRANDS', () => {
      expect(PaymentMethod.CARD_BRANDS).toBeDefined();
      expect(PaymentMethod.CARD_BRANDS).toEqual(['visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'unionpay', 'unknown']);
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof PaymentMethod.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof PaymentMethod.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof PaymentMethod.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof PaymentMethod.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof PaymentMethod.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof PaymentMethod.deleteOne).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof PaymentMethod.countDocuments).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findByMethodId method', () => {
      expect(typeof PaymentMethod.findByMethodId).toBe('function');
    });

    it('should have findByCustomer method', () => {
      expect(typeof PaymentMethod.findByCustomer).toBe('function');
    });

    it('should have findByStripeId method', () => {
      expect(typeof PaymentMethod.findByStripeId).toBe('function');
    });

    it('should have getDefault method', () => {
      expect(typeof PaymentMethod.getDefault).toBe('function');
    });

    it('should have setDefault method', () => {
      expect(typeof PaymentMethod.setDefault).toBe('function');
    });

    it('should have deactivate method', () => {
      expect(typeof PaymentMethod.deactivate).toBe('function');
    });
  });

  describe('Business Logic', () => {
    it('isExpired should return false for non-card type', () => {
      expect(PaymentMethod.isExpired({ type: 'bank_account', expiryMonth: 1, expiryYear: 2020 })).toBe(false);
    });

    it('isExpired should return false when no expiry info', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: null, expiryYear: null })).toBe(false);
    });

    it('isExpired should return true for expired card', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: 1, expiryYear: 2020 })).toBe(true);
    });

    it('isExpired should return false for future card', () => {
      expect(PaymentMethod.isExpired({ type: 'card', expiryMonth: 12, expiryYear: 2099 })).toBe(false);
    });

    it('getMaskedDisplay should mask card number', () => {
      expect(PaymentMethod.getMaskedDisplay({ type: 'card', last4: '4242' })).toBe('**** **** **** 4242');
    });

    it('getMaskedDisplay should mask bank account', () => {
      expect(PaymentMethod.getMaskedDisplay({ type: 'bank_account', last4: '6789' })).toBe('****6789');
    });

    it('getDisplayLabel should format card label', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'card', brand: 'visa', last4: '4242' })).toBe('Visa ending in 4242');
    });

    it('getDisplayLabel should format bank account label', () => {
      expect(PaymentMethod.getDisplayLabel({ type: 'bank_account', last4: '6789' })).toBe('Bank account ending in 6789');
    });
  });

  describe('Timestamp Fields', () => {
    it('should have createdAt field', () => {
      expect(PaymentMethod.schema.createdAt).toBeDefined();
    });

    it('should have updatedAt field', () => {
      expect(PaymentMethod.schema.updatedAt).toBeDefined();
    });
  });
});
