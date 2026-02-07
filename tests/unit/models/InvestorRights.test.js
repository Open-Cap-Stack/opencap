/**
 * InvestorRights Model Tests
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * Tests for ZeroDB-based InvestorRights model
 */
process.env.SKIP_DB_SETUP = 'true';

const InvestorRights = require('../../../models/InvestorRights');

describe('InvestorRights Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(InvestorRights.tableName).toBe('investor_rights');
    });

    it('should have required fields', () => {
      expect(InvestorRights).not.toBeNull();
      const schema = InvestorRights.schema;
      expect(schema.rightId).toBeDefined();
      expect(schema.investorId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.rightType).toBeDefined();
      expect(schema.status).toBeDefined();
    });

    it('should mark required fields as required', () => {
      const schema = InvestorRights.schema;
      expect(schema.rightId.required).toBe(true);
      expect(schema.investorId.required).toBe(true);
      expect(schema.companyId.required).toBe(true);
      expect(schema.rightType.required).toBe(true);
    });

    it('should validate rightType enum values', () => {
      const enumValues = InvestorRights.schema.rightType.enum;
      expect(enumValues).toContain('PRO_RATA');
      expect(enumValues).toContain('INFORMATION_RIGHTS');
      expect(enumValues).toContain('BOARD_SEAT');
      expect(enumValues).toContain('OBSERVER_SEAT');
      expect(enumValues).toContain('ANTI_DILUTION');
      expect(enumValues).toContain('VETO_RIGHTS');
      expect(enumValues).toContain('DRAG_ALONG');
      expect(enumValues).toContain('TAG_ALONG');
      expect(enumValues).toContain('PREEMPTIVE');
      expect(enumValues).toContain('FIRST_REFUSAL');
      expect(enumValues).toContain('CO_SALE');
      expect(enumValues).toContain('REDEMPTION');
      expect(enumValues).toContain('REGISTRATION');
    });

    it('should validate status enum values', () => {
      const enumValues = InvestorRights.schema.status.enum;
      expect(enumValues).toContain('ACTIVE');
      expect(enumValues).toContain('EXPIRED');
      expect(enumValues).toContain('EXERCISED');
      expect(enumValues).toContain('WAIVED');
      expect(enumValues).toContain('PENDING');
      expect(enumValues).toContain('SUSPENDED');
    });

    it('should default status to ACTIVE', () => {
      expect(InvestorRights.schema.status.default).toBe('ACTIVE');
    });

    it('should have shareClass reference field', () => {
      expect(InvestorRights.schema.shareClassId).toBeDefined();
    });

    it('should have expiration date field', () => {
      expect(InvestorRights.schema.expirationDate).toBeDefined();
      expect(InvestorRights.schema.expirationDate.type).toBe('date');
    });

    it('should have terms object for right-specific details', () => {
      expect(InvestorRights.schema.terms).toBeDefined();
      expect(InvestorRights.schema.terms.type).toBe('object');
    });

    it('should have exerciseHistory array for tracking exercises', () => {
      expect(InvestorRights.schema.exerciseHistory).toBeDefined();
      expect(InvestorRights.schema.exerciseHistory.type).toBe('array');
    });

    it('should have auditLog array for historical changes', () => {
      expect(InvestorRights.schema.auditLog).toBeDefined();
      expect(InvestorRights.schema.auditLog.type).toBe('array');
    });

    it('should have timestamp fields', () => {
      expect(InvestorRights.schema.createdAt).toBeDefined();
      expect(InvestorRights.schema.updatedAt).toBeDefined();
    });
  });

  describe('isExpired', () => {
    it('should return true for expired right', () => {
      const right = {
        expirationDate: new Date(Date.now() - 86400000).toISOString() // Yesterday
      };
      expect(InvestorRights.isExpired(right)).toBe(true);
    });

    it('should return false for non-expired right', () => {
      const right = {
        expirationDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      };
      expect(InvestorRights.isExpired(right)).toBe(false);
    });

    it('should return false when no expiration date', () => {
      const right = {};
      expect(InvestorRights.isExpired(right)).toBe(false);
    });
  });

  describe('canExercise', () => {
    it('should return true for active, non-expired right', () => {
      const right = {
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      };
      expect(InvestorRights.canExercise(right)).toBe(true);
    });

    it('should return false for expired right', () => {
      const right = {
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() - 86400000).toISOString() // Yesterday
      };
      expect(InvestorRights.canExercise(right)).toBe(false);
    });

    it('should return false for non-active right', () => {
      const right = {
        status: 'WAIVED',
        expirationDate: new Date(Date.now() + 86400000).toISOString()
      };
      expect(InvestorRights.canExercise(right)).toBe(false);
    });

    it('should return false if effective date has not passed', () => {
      const right = {
        status: 'ACTIVE',
        effectiveDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        expirationDate: new Date(Date.now() + 2 * 86400000).toISOString()
      };
      expect(InvestorRights.canExercise(right)).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should export RIGHT_TYPES constant', () => {
      expect(InvestorRights.RIGHT_TYPES).toBeDefined();
      expect(InvestorRights.RIGHT_TYPES).toContain('PRO_RATA');
      expect(InvestorRights.RIGHT_TYPES).toContain('BOARD_SEAT');
    });

    it('should export VALID_STATUSES constant', () => {
      expect(InvestorRights.VALID_STATUSES).toBeDefined();
      expect(InvestorRights.VALID_STATUSES).toContain('ACTIVE');
      expect(InvestorRights.VALID_STATUSES).toContain('EXPIRED');
    });

    it('should export SOURCE_DOCUMENT_TYPES constant', () => {
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toBeDefined();
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('INVESTOR_RIGHTS_AGREEMENT');
    });

    it('should export AUDIT_ACTIONS constant', () => {
      expect(InvestorRights.AUDIT_ACTIONS).toBeDefined();
      expect(InvestorRights.AUDIT_ACTIONS).toContain('CREATED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('EXERCISED');
    });
  });

  describe('Static Methods', () => {
    it('should have findByInvestor method', () => {
      expect(typeof InvestorRights.findByInvestor).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof InvestorRights.findByCompany).toBe('function');
    });

    it('should have findByShareClass method', () => {
      expect(typeof InvestorRights.findByShareClass).toBe('function');
    });

    it('should have findExpiring method', () => {
      expect(typeof InvestorRights.findExpiring).toBe('function');
    });

    it('should have checkConflicts method', () => {
      expect(typeof InvestorRights.checkConflicts).toBe('function');
    });

    it('should have addAuditEntry method', () => {
      expect(typeof InvestorRights.addAuditEntry).toBe('function');
    });

    it('should have recordExercise method', () => {
      expect(typeof InvestorRights.recordExercise).toBe('function');
    });

    it('should have waive method', () => {
      expect(typeof InvestorRights.waive).toBe('function');
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof InvestorRights.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof InvestorRights.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof InvestorRights.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof InvestorRights.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof InvestorRights.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof InvestorRights.deleteOne).toBe('function');
    });
  });
});
