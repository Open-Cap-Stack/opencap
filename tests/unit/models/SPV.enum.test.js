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

  describe('Status Enum Values', () => {
    const expectedStatuses = ['active', 'draft', 'pending', 'closed', 'liquidated'];

    it('should have status enum with all required values', () => {
      const enumValues = SPV.schema.Status.enum;
      expect(enumValues).toBeDefined();
      expect(Array.isArray(enumValues)).toBe(true);

      expectedStatuses.forEach(status => {
        expect(enumValues).toContain(status);
      });
    });

    it('should use lowercase values for all statuses', () => {
      const enumValues = SPV.schema.Status.enum;
      enumValues.forEach(status => {
        expect(status).toBe(status.toLowerCase());
      });
    });

    it('should include draft status for SPVs in draft state', () => {
      expect(SPV.schema.Status.enum).toContain('draft');
    });

    it('should include liquidated status for liquidated SPVs', () => {
      expect(SPV.schema.Status.enum).toContain('liquidated');
    });

    it('should have lowercase active instead of Active', () => {
      expect(SPV.schema.Status.enum).toContain('active');
      expect(SPV.schema.Status.enum).not.toContain('Active');
    });

    it('should have lowercase pending instead of Pending', () => {
      expect(SPV.schema.Status.enum).toContain('pending');
      expect(SPV.schema.Status.enum).not.toContain('Pending');
    });

    it('should have lowercase closed instead of Closed', () => {
      expect(SPV.schema.Status.enum).toContain('closed');
      expect(SPV.schema.Status.enum).not.toContain('Closed');
    });

    it('should have exactly 5 status values', () => {
      expect(SPV.schema.Status.enum.length).toBe(5);
    });
  });

  describe('Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(SPV.VALID_STATUSES).toBeDefined();
      expect(SPV.VALID_STATUSES).toEqual(['active', 'draft', 'pending', 'closed', 'liquidated']);
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
      expect(SPV.validators.isValidStatus('active')).toBe(true);
      expect(SPV.validators.isValidStatus('draft')).toBe(true);
      expect(SPV.validators.isValidStatus('pending')).toBe(true);
      expect(SPV.validators.isValidStatus('closed')).toBe(true);
      expect(SPV.validators.isValidStatus('liquidated')).toBe(true);
    });

    it('should reject uppercase Active status', () => {
      expect(SPV.validators.isValidStatus('Active')).toBe(false);
    });

    it('should reject invalid status values', () => {
      expect(SPV.validators.isValidStatus('archived')).toBe(false);
      expect(SPV.validators.isValidStatus('invalid')).toBe(false);
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
      expect(SPV.getValidStatuses()).toEqual(['active', 'draft', 'pending', 'closed', 'liquidated']);
    });

    it('should have getValidComplianceStatuses method', () => {
      expect(typeof SPV.getValidComplianceStatuses).toBe('function');
      expect(SPV.getValidComplianceStatuses()).toEqual(['Compliant', 'NonCompliant', 'PendingReview']);
    });
  });
});
