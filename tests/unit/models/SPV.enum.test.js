/**
 * SPV Model Enum Validation Tests
 *
 * Tests for Issue #125: Fix Data Model Enum Mismatches with Frontend
 * Validates that SPV status enum includes: 'active', 'draft', 'pending', 'closed', 'liquidated' (lowercase)
 *
 * Tests for the SPV ZeroDB model schema and enum definitions.
 */

const SPV = require('../../../models/SPV');

describe('SPV Model Status Enum Validation', () => {
  describe('Schema Structure', () => {
    it('should have a schema defined', () => {
      expect(SPV.schema).toBeDefined();
      expect(typeof SPV.schema).toBe('object');
    });

    it('should have Status field defined in schema', () => {
      expect(SPV.schema.Status).toBeDefined();
      expect(SPV.schema.Status.type).toBe('string');
      expect(SPV.schema.Status.required).toBe(true);
    });

    it('should have SPVID field as required and unique', () => {
      expect(SPV.schema.SPVID).toBeDefined();
      expect(SPV.schema.SPVID.required).toBe(true);
      expect(SPV.schema.SPVID.unique).toBe(true);
    });

    it('should have Name field as required', () => {
      expect(SPV.schema.Name).toBeDefined();
      expect(SPV.schema.Name.required).toBe(true);
    });

    it('should have Purpose field as required', () => {
      expect(SPV.schema.Purpose).toBeDefined();
      expect(SPV.schema.Purpose.required).toBe(true);
    });

    it('should have CreationDate field as required', () => {
      expect(SPV.schema.CreationDate).toBeDefined();
      expect(SPV.schema.CreationDate.required).toBe(true);
    });

    it('should have ParentCompanyID field as required', () => {
      expect(SPV.schema.ParentCompanyID).toBeDefined();
      expect(SPV.schema.ParentCompanyID.required).toBe(true);
    });

    it('should have ComplianceStatus field with enum', () => {
      expect(SPV.schema.ComplianceStatus).toBeDefined();
      expect(SPV.schema.ComplianceStatus.required).toBe(true);
      expect(SPV.schema.ComplianceStatus.enum).toEqual(['Compliant', 'NonCompliant', 'PendingReview']);
    });
  });

  describe('Status Enum Values (Issue #580 lifecycle)', () => {
    const expectedStatuses = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];

    it('should have status enum with all lifecycle values', () => {
      const enumValues = SPV.schema.Status.enum;
      expect(enumValues).toBeDefined();
      expect(Array.isArray(enumValues)).toBe(true);

      expectedStatuses.forEach(status => {
        expect(enumValues).toContain(status);
      });
    });

    it('should use lowercase/snake_case values for all statuses', () => {
      const enumValues = SPV.schema.Status.enum;
      enumValues.forEach(status => {
        expect(status).toBe(status.toLowerCase());
      });
    });

    it('should include draft status for SPVs in draft state', () => {
      expect(SPV.schema.Status.enum).toContain('draft');
    });

    it('should include in_review status for SPVs under review', () => {
      expect(SPV.schema.Status.enum).toContain('in_review');
    });

    it('should include raising status for actively fundraising SPVs', () => {
      expect(SPV.schema.Status.enum).toContain('raising');
    });

    it('should include canceled status for terminated SPVs', () => {
      expect(SPV.schema.Status.enum).toContain('canceled');
    });

    it('should have exactly 6 status values', () => {
      expect(SPV.schema.Status.enum.length).toBe(6);
    });
  });

  describe('Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(SPV.VALID_STATUSES).toBeDefined();
      expect(SPV.VALID_STATUSES).toEqual(['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled']);
    });

    it('should export VALID_COMPLIANCE_STATUSES', () => {
      expect(SPV.VALID_COMPLIANCE_STATUSES).toBeDefined();
      expect(SPV.VALID_COMPLIANCE_STATUSES).toEqual(['Compliant', 'NonCompliant', 'PendingReview']);
    });
  });

  describe('Validators', () => {
    it('should have validators object', () => {
      expect(SPV.validators).toBeDefined();
    });

    it('should validate valid status values', () => {
      expect(SPV.validators.isValidStatus('draft')).toBe(true);
      expect(SPV.validators.isValidStatus('in_review')).toBe(true);
      expect(SPV.validators.isValidStatus('raising')).toBe(true);
      expect(SPV.validators.isValidStatus('closing')).toBe(true);
      expect(SPV.validators.isValidStatus('wired')).toBe(true);
      expect(SPV.validators.isValidStatus('canceled')).toBe(true);
    });

    it('should reject uppercase status values', () => {
      expect(SPV.validators.isValidStatus('Draft')).toBe(false);
    });

    it('should reject legacy status values (they must be normalized first)', () => {
      expect(SPV.validators.isValidStatus('active')).toBe(false);
      expect(SPV.validators.isValidStatus('pending')).toBe(false);
      expect(SPV.validators.isValidStatus('closed')).toBe(false);
    });

    it('should validate valid compliance statuses', () => {
      expect(SPV.validators.isValidComplianceStatus('Compliant')).toBe(true);
      expect(SPV.validators.isValidComplianceStatus('NonCompliant')).toBe(true);
      expect(SPV.validators.isValidComplianceStatus('PendingReview')).toBe(true);
    });

    it('should reject invalid compliance statuses', () => {
      expect(SPV.validators.isValidComplianceStatus('invalid')).toBe(false);
      expect(SPV.validators.isValidComplianceStatus('compliant')).toBe(false);
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof SPV.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof SPV.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof SPV.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof SPV.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof SPV.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof SPV.deleteOne).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof SPV.countDocuments).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findBySPVID method', () => {
      expect(typeof SPV.findBySPVID).toBe('function');
    });

    it('should have findByParentCompany method', () => {
      expect(typeof SPV.findByParentCompany).toBe('function');
    });

    it('should have findByStatus method', () => {
      expect(typeof SPV.findByStatus).toBe('function');
    });

    it('should have findByComplianceStatus method', () => {
      expect(typeof SPV.findByComplianceStatus).toBe('function');
    });

    it('should have findActive method', () => {
      expect(typeof SPV.findActive).toBe('function');
    });

    it('should have updateStatus method', () => {
      expect(typeof SPV.updateStatus).toBe('function');
    });

    it('should have updateComplianceStatus method', () => {
      expect(typeof SPV.updateComplianceStatus).toBe('function');
    });

    it('should have getValidStatuses method', () => {
      expect(typeof SPV.getValidStatuses).toBe('function');
      expect(SPV.getValidStatuses()).toEqual(['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled']);
    });

    it('should have getValidComplianceStatuses method', () => {
      expect(typeof SPV.getValidComplianceStatuses).toBe('function');
      expect(SPV.getValidComplianceStatuses()).toEqual(['Compliant', 'NonCompliant', 'PendingReview']);
    });
  });
});
