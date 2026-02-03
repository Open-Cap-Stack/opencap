/**
 * InvestorRights Model Tests
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * TDD: Writing tests FIRST before implementation
 * Tests for the InvestorRights model schema and validation
 */

const mongoose = require('mongoose');

// Mock InvestorRights model - will be implemented after tests
let InvestorRights;

describe('InvestorRights Model', () => {
  beforeAll(async () => {
    // Dynamic import to handle the model not existing yet
    try {
      InvestorRights = require('../../../models/InvestorRights');
    } catch (error) {
      // Model doesn't exist yet - this is expected in TDD
      InvestorRights = null;
    }
  });

  describe('Schema Validation', () => {
    it('should have required fields', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.path('rightId')).toBeDefined();
      expect(schema.path('investorId')).toBeDefined();
      expect(schema.path('companyId')).toBeDefined();
      expect(schema.path('rightType')).toBeDefined();
      expect(schema.path('status')).toBeDefined();
    });

    it('should validate rightType enum values', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      const rightTypePath = schema.path('rightType');
      expect(rightTypePath.enumValues).toContain('PRO_RATA');
      expect(rightTypePath.enumValues).toContain('INFORMATION_RIGHTS');
      expect(rightTypePath.enumValues).toContain('BOARD_SEAT');
      expect(rightTypePath.enumValues).toContain('OBSERVER_SEAT');
      expect(rightTypePath.enumValues).toContain('ANTI_DILUTION');
      expect(rightTypePath.enumValues).toContain('VETO_RIGHTS');
      expect(rightTypePath.enumValues).toContain('DRAG_ALONG');
      expect(rightTypePath.enumValues).toContain('TAG_ALONG');
      expect(rightTypePath.enumValues).toContain('PREEMPTIVE');
      expect(rightTypePath.enumValues).toContain('FIRST_REFUSAL');
      expect(rightTypePath.enumValues).toContain('CO_SALE');
      expect(rightTypePath.enumValues).toContain('REDEMPTION');
      expect(rightTypePath.enumValues).toContain('REGISTRATION');
    });

    it('should validate status enum values', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      const statusPath = schema.path('status');
      expect(statusPath.enumValues).toContain('ACTIVE');
      expect(statusPath.enumValues).toContain('EXPIRED');
      expect(statusPath.enumValues).toContain('EXERCISED');
      expect(statusPath.enumValues).toContain('WAIVED');
      expect(statusPath.enumValues).toContain('PENDING');
      expect(statusPath.enumValues).toContain('SUSPENDED');
    });

    it('should have shareClass reference field', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.path('shareClassId')).toBeDefined();
    });

    it('should have expiration date field', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.path('expirationDate')).toBeDefined();
    });

    it('should have terms object for right-specific details', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.path('terms')).toBeDefined();
    });

    it('should have exerciseHistory array for tracking exercises', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.path('exerciseHistory')).toBeDefined();
    });

    it('should have auditLog array for historical changes', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.path('auditLog')).toBeDefined();
    });

    it('should have timestamps enabled', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.options.timestamps).toBe(true);
    });
  });

  describe('Validation Rules', () => {
    it('should require rightId', async () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE'
      });

      const validationError = right.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.rightId).toBeDefined();
    });

    it('should require investorId', async () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE'
      });

      const validationError = right.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.investorId).toBeDefined();
    });

    it('should require companyId', async () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE'
      });

      const validationError = right.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.companyId).toBeDefined();
    });

    it('should require rightType', async () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        status: 'ACTIVE'
      });

      const validationError = right.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.rightType).toBeDefined();
    });

    it('should default status to ACTIVE', () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA'
      });

      expect(right.status).toBe('ACTIVE');
    });

    it('should reject invalid rightType', async () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'INVALID_TYPE',
        status: 'ACTIVE'
      });

      const validationError = right.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.rightType).toBeDefined();
    });

    it('should reject invalid status', async () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'INVALID_STATUS'
      });

      const validationError = right.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    it('should have isExpired method', () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() - 86400000) // Yesterday
      });

      expect(typeof right.isExpired).toBe('function');
      expect(right.isExpired()).toBe(true);
    });

    it('should have canExercise method', () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() + 86400000) // Tomorrow
      });

      expect(typeof right.canExercise).toBe('function');
      expect(right.canExercise()).toBe(true);
    });

    it('should have addAuditEntry method', () => {
      expect(InvestorRights).not.toBeNull();
      const right = new InvestorRights({
        rightId: 'RIGHT-001',
        investorId: 'INV-001',
        companyId: 'COMP-001',
        rightType: 'PRO_RATA',
        status: 'ACTIVE'
      });

      expect(typeof right.addAuditEntry).toBe('function');
    });
  });

  describe('Static Methods', () => {
    it('should have findByInvestor static method', () => {
      expect(InvestorRights).not.toBeNull();
      expect(typeof InvestorRights.findByInvestor).toBe('function');
    });

    it('should have findByCompany static method', () => {
      expect(InvestorRights).not.toBeNull();
      expect(typeof InvestorRights.findByCompany).toBe('function');
    });

    it('should have findByShareClass static method', () => {
      expect(InvestorRights).not.toBeNull();
      expect(typeof InvestorRights.findByShareClass).toBe('function');
    });

    it('should have findExpiring static method', () => {
      expect(InvestorRights).not.toBeNull();
      expect(typeof InvestorRights.findExpiring).toBe('function');
    });

    it('should have checkConflicts static method', () => {
      expect(InvestorRights).not.toBeNull();
      expect(typeof InvestorRights.checkConflicts).toBe('function');
    });
  });

  describe('Indexes', () => {
    it('should have compound index on investorId and companyId', () => {
      expect(InvestorRights).not.toBeNull();
      const indexes = InvestorRights.schema.indexes();
      const compoundIndex = indexes.find(idx =>
        idx[0].investorId && idx[0].companyId
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on expirationDate for expiration queries', () => {
      expect(InvestorRights).not.toBeNull();
      const indexes = InvestorRights.schema.indexes();
      const expirationIndex = indexes.find(idx => idx[0].expirationDate);
      expect(expirationIndex).toBeDefined();
    });
  });
});
