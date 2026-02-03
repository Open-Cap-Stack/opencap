/**
 * SecurityIssuance Model Test Suite
 * Issue #76: Implement Security Issuances Register
 *
 * Tests for the SecurityIssuance data model including:
 * - Field validation
 * - Exemption tracking
 * - Filing deadline management
 * - Blue-sky law compliance
 */

describe('SecurityIssuance Model', () => {
  let SecurityIssuance;
  let securityIssuanceSchema;

  beforeAll(() => {
    // Import model
    SecurityIssuance = require('../../../models/SecurityIssuance');
    securityIssuanceSchema = SecurityIssuance.schema;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have required issuanceId field', () => {
      const pathObj = securityIssuanceSchema.path('issuanceId');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
    });

    it('should have required companyId field', () => {
      const pathObj = securityIssuanceSchema.path('companyId');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
    });

    it('should have required securityType field with valid enum values', () => {
      const pathObj = securityIssuanceSchema.path('securityType');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
      expect(pathObj.enumValues).toContain('common_stock');
      expect(pathObj.enumValues).toContain('preferred_stock');
      expect(pathObj.enumValues).toContain('convertible_note');
      expect(pathObj.enumValues).toContain('safe');
      expect(pathObj.enumValues).toContain('warrant');
      expect(pathObj.enumValues).toContain('option');
    });

    it('should have required shareClassId field', () => {
      const pathObj = securityIssuanceSchema.path('shareClassId');
      expect(pathObj).toBeDefined();
    });

    it('should have required stakeholderId field', () => {
      const pathObj = securityIssuanceSchema.path('stakeholderId');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
    });

    it('should have required numberOfShares field', () => {
      const pathObj = securityIssuanceSchema.path('numberOfShares');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
    });

    it('should have required pricePerShare field', () => {
      const pathObj = securityIssuanceSchema.path('pricePerShare');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
    });

    it('should have required issuanceDate field', () => {
      const pathObj = securityIssuanceSchema.path('issuanceDate');
      expect(pathObj).toBeDefined();
      expect(pathObj.isRequired).toBeTruthy();
    });

    it('should have status field with valid enum values', () => {
      const pathObj = securityIssuanceSchema.path('status');
      expect(pathObj).toBeDefined();
      expect(pathObj.enumValues).toContain('pending');
      expect(pathObj.enumValues).toContain('issued');
      expect(pathObj.enumValues).toContain('cancelled');
      expect(pathObj.enumValues).toContain('transferred');
    });
  });

  describe('Exemption Tracking Fields', () => {
    it('should have exemptionType field with valid enum values', () => {
      const pathObj = securityIssuanceSchema.path('exemptionType');
      expect(pathObj).toBeDefined();
      expect(pathObj.enumValues).toContain('rule_701');
      expect(pathObj.enumValues).toContain('regulation_d_506b');
      expect(pathObj.enumValues).toContain('regulation_d_506c');
      expect(pathObj.enumValues).toContain('regulation_a');
      expect(pathObj.enumValues).toContain('regulation_cf');
      expect(pathObj.enumValues).toContain('section_4a2');
      expect(pathObj.enumValues).toContain('other');
    });

    it('should have exemptionDetails nested object', () => {
      const pathObj = securityIssuanceSchema.path('exemptionDetails');
      expect(pathObj).toBeDefined();
    });

    it('should have rule701Qualified boolean field', () => {
      const pathObj = securityIssuanceSchema.path('exemptionDetails.rule701Qualified');
      expect(pathObj).toBeDefined();
    });

    it('should have regulationDFormFiled boolean field', () => {
      const pathObj = securityIssuanceSchema.path('exemptionDetails.regulationDFormFiled');
      expect(pathObj).toBeDefined();
    });

    it('should have accreditedInvestorVerified boolean field', () => {
      const pathObj = securityIssuanceSchema.path('exemptionDetails.accreditedInvestorVerified');
      expect(pathObj).toBeDefined();
    });
  });

  describe('State Filing Fields (Blue-Sky Compliance)', () => {
    it('should have stateFilings array field', () => {
      const pathObj = securityIssuanceSchema.path('stateFilings');
      expect(pathObj).toBeDefined();
      expect(pathObj.instance).toBe('Array');
    });

    it('should have stateFilings with stateCode field', () => {
      const stateFilingSchema = securityIssuanceSchema.path('stateFilings').schema;
      expect(stateFilingSchema.path('stateCode')).toBeDefined();
    });

    it('should have stateFilings with filingStatus field', () => {
      const stateFilingSchema = securityIssuanceSchema.path('stateFilings').schema;
      expect(stateFilingSchema.path('filingStatus')).toBeDefined();
    });

    it('should have stateFilings with filingDeadline field', () => {
      const stateFilingSchema = securityIssuanceSchema.path('stateFilings').schema;
      expect(stateFilingSchema.path('filingDeadline')).toBeDefined();
    });

    it('should have stateFilings with exemptionClaimed field', () => {
      const stateFilingSchema = securityIssuanceSchema.path('stateFilings').schema;
      expect(stateFilingSchema.path('exemptionClaimed')).toBeDefined();
    });
  });

  describe('Filing Deadline Management', () => {
    it('should have federalFilingDeadline field', () => {
      const pathObj = securityIssuanceSchema.path('federalFilingDeadline');
      expect(pathObj).toBeDefined();
    });

    it('should have federalFilingStatus field', () => {
      const pathObj = securityIssuanceSchema.path('federalFilingStatus');
      expect(pathObj).toBeDefined();
      expect(pathObj.enumValues).toContain('not_required');
      expect(pathObj.enumValues).toContain('pending');
      expect(pathObj.enumValues).toContain('filed');
      expect(pathObj.enumValues).toContain('overdue');
    });

    it('should have formDFilingDate field', () => {
      const pathObj = securityIssuanceSchema.path('formDFilingDate');
      expect(pathObj).toBeDefined();
    });

    it('should have formDAmendmentRequired boolean field', () => {
      const pathObj = securityIssuanceSchema.path('formDAmendmentRequired');
      expect(pathObj).toBeDefined();
    });
  });

  describe('Compliance Fields', () => {
    it('should have complianceStatus field with valid enum values', () => {
      const pathObj = securityIssuanceSchema.path('complianceStatus');
      expect(pathObj).toBeDefined();
      expect(pathObj.enumValues).toContain('compliant');
      expect(pathObj.enumValues).toContain('pending_review');
      expect(pathObj.enumValues).toContain('non_compliant');
      expect(pathObj.enumValues).toContain('remediation_required');
    });

    it('should have complianceNotes field', () => {
      const pathObj = securityIssuanceSchema.path('complianceNotes');
      expect(pathObj).toBeDefined();
    });

    it('should have lastComplianceReview field', () => {
      const pathObj = securityIssuanceSchema.path('lastComplianceReview');
      expect(pathObj).toBeDefined();
    });

    it('should have reviewedBy field', () => {
      const pathObj = securityIssuanceSchema.path('reviewedBy');
      expect(pathObj).toBeDefined();
    });
  });

  describe('Financial Fields', () => {
    it('should have totalConsideration field', () => {
      const pathObj = securityIssuanceSchema.path('totalConsideration');
      expect(pathObj).toBeDefined();
    });

    it('should have vestingScheduleId field', () => {
      const pathObj = securityIssuanceSchema.path('vestingScheduleId');
      expect(pathObj).toBeDefined();
    });

    it('should have certificateNumber field', () => {
      const pathObj = securityIssuanceSchema.path('certificateNumber');
      expect(pathObj).toBeDefined();
    });

    it('should have boardApprovalDate field', () => {
      const pathObj = securityIssuanceSchema.path('boardApprovalDate');
      expect(pathObj).toBeDefined();
    });

    it('should have boardResolutionId field', () => {
      const pathObj = securityIssuanceSchema.path('boardResolutionId');
      expect(pathObj).toBeDefined();
    });
  });

  describe('Timestamps and Metadata', () => {
    it('should have timestamps enabled', () => {
      expect(securityIssuanceSchema.options.timestamps).toBeTruthy();
    });

    it('should have createdBy field', () => {
      const pathObj = securityIssuanceSchema.path('createdBy');
      expect(pathObj).toBeDefined();
    });

    it('should have updatedBy field', () => {
      const pathObj = securityIssuanceSchema.path('updatedBy');
      expect(pathObj).toBeDefined();
    });
  });

  describe('Virtual Fields', () => {
    it('should have totalValue virtual field', () => {
      expect(securityIssuanceSchema.virtuals.totalValue).toBeDefined();
    });

    it('should calculate totalValue correctly', () => {
      const doc = {
        numberOfShares: 1000,
        pricePerShare: 10.50
      };
      const getter = securityIssuanceSchema.virtuals.totalValue.getters[0];
      const result = getter.call(doc);
      expect(result).toBe(10500);
    });

    it('should have isOverdue virtual field', () => {
      expect(securityIssuanceSchema.virtuals.isOverdue).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    it('should have needsStateFiling method', () => {
      expect(securityIssuanceSchema.methods.needsStateFiling).toBeDefined();
    });

    it('should have getUpcomingDeadlines method', () => {
      expect(securityIssuanceSchema.methods.getUpcomingDeadlines).toBeDefined();
    });

    it('should have updateComplianceStatus method', () => {
      expect(securityIssuanceSchema.methods.updateComplianceStatus).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    it('should have findByCompany static method', () => {
      expect(securityIssuanceSchema.statics.findByCompany).toBeDefined();
    });

    it('should have findOverdueFilings static method', () => {
      expect(securityIssuanceSchema.statics.findOverdueFilings).toBeDefined();
    });

    it('should have findByExemptionType static method', () => {
      expect(securityIssuanceSchema.statics.findByExemptionType).toBeDefined();
    });

    it('should have getComplianceSummary static method', () => {
      expect(securityIssuanceSchema.statics.getComplianceSummary).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have index on companyId', () => {
      const indexes = securityIssuanceSchema.indexes();
      const companyIndex = indexes.find(idx => idx[0].companyId);
      expect(companyIndex).toBeDefined();
    });

    it('should have unique index on issuanceId', () => {
      const indexes = securityIssuanceSchema.indexes();
      const issuanceIndex = indexes.find(idx => idx[0].issuanceId);
      expect(issuanceIndex).toBeDefined();
      expect(issuanceIndex[1].unique).toBe(true);
    });

    it('should have index on stakeholderId', () => {
      const indexes = securityIssuanceSchema.indexes();
      const stakeholderIndex = indexes.find(idx => idx[0].stakeholderId);
      expect(stakeholderIndex).toBeDefined();
    });

    it('should have compound index on companyId and issuanceDate', () => {
      const indexes = securityIssuanceSchema.indexes();
      const compoundIndex = indexes.find(idx =>
        idx[0].companyId && idx[0].issuanceDate
      );
      expect(compoundIndex).toBeDefined();
    });
  });
});
