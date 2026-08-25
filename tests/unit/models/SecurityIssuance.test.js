/**
 * SecurityIssuance Model Unit Tests
 * Comprehensive tests including business logic, compliance, and filing management
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService before importing model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const SecurityIssuance = require('../../../models/SecurityIssuance');
const zerodbService = require('../../../services/zerodbService');

describe('SecurityIssuance Model', () => {
  let store = [];
  let idCounter = 0;

  const validData = {
    companyId: 'comp_001',
    securityType: 'common_stock',
    stakeholderId: 'sh_001',
    stakeholderName: 'Jane Doe',
    numberOfShares: 10000,
    pricePerShare: 1.50,
    issuanceDate: '2026-01-15T00:00:00.000Z',
    exemptionType: 'rule_701',
    createdBy: 'admin_001'
  };

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.updateRows.mockImplementation(() => {
      return Promise.resolve({ modified_count: 1 });
    });

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc =>
        !Object.entries(filter).every(([key, value]) => doc[key] === value)
      );
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });
  });

  // ---- Schema Definition ----

  describe('Schema Definition', () => {
    const schema = SecurityIssuance.schema;

    it('should have required issuanceId field marked as unique', () => {
      expect(schema.issuanceId.required).toBe(true);
      expect(schema.issuanceId.unique).toBe(true);
    });

    it('should have required companyId field', () => {
      expect(schema.companyId.required).toBe(true);
    });

    it('should have required securityType with enum', () => {
      expect(schema.securityType.required).toBe(true);
      expect(schema.securityType.enum).toEqual(SecurityIssuance.SECURITY_TYPES);
    });

    it('should have required stakeholderId', () => {
      expect(schema.stakeholderId.required).toBe(true);
    });

    it('should have required numberOfShares', () => {
      expect(schema.numberOfShares.required).toBe(true);
    });

    it('should have required pricePerShare', () => {
      expect(schema.pricePerShare.required).toBe(true);
    });

    it('should have required issuanceDate', () => {
      expect(schema.issuanceDate.required).toBe(true);
    });

    it('should default status to pending', () => {
      expect(schema.status.default).toBe('pending');
    });

    it('should default complianceStatus to pending_review', () => {
      expect(schema.complianceStatus.default).toBe('pending_review');
    });

    it('should default federalFilingStatus to not_required', () => {
      expect(schema.federalFilingStatus.default).toBe('not_required');
    });

    it('should have stateFilings defaulting to empty array', () => {
      expect(schema.stateFilings.default).toEqual([]);
    });

    it('should have exemptionDetails default values', () => {
      const defaults = schema.exemptionDetails.default;
      expect(defaults.rule701Qualified).toBe(false);
      expect(defaults.regulationDFormFiled).toBe(false);
      expect(defaults.accreditedInvestorVerified).toBe(false);
      expect(defaults.legendedCertificate).toBe(false);
    });

    it('should have vesting fields', () => {
      expect(schema.vestingScheduleId).toBeDefined();
      expect(schema.vestingStartDate).toBeDefined();
      expect(schema.vestingCliffDate).toBeDefined();
      expect(schema.fullyVestedDate).toBeDefined();
    });

    it('should have certificate fields', () => {
      expect(schema.certificateNumber).toBeDefined();
      expect(schema.certificateIssued).toBeDefined();
      expect(schema.certificateIssuedDate).toBeDefined();
    });

    it('should have board approval fields', () => {
      expect(schema.boardApprovalDate).toBeDefined();
      expect(schema.boardResolutionId).toBeDefined();
    });

    it('should have Form D amendment fields', () => {
      expect(schema.formDAmendmentRequired).toBeDefined();
      expect(schema.formDAmendmentDeadline).toBeDefined();
      expect(schema.formDConfirmationNumber).toBeDefined();
    });

    it('should have compliance review fields', () => {
      expect(schema.lastComplianceReview).toBeDefined();
      expect(schema.nextComplianceReview).toBeDefined();
      expect(schema.reviewedBy).toBeDefined();
      expect(schema.complianceIssues).toBeDefined();
    });

    it('should have audit and metadata fields', () => {
      expect(schema.createdBy).toBeDefined();
      expect(schema.updatedBy).toBeDefined();
      expect(schema.notes).toBeDefined();
      expect(schema.attachments).toBeDefined();
    });
  });

  // ---- Constants ----

  describe('Exported Constants', () => {
    it('should export SECURITY_TYPES', () => {
      expect(SecurityIssuance.SECURITY_TYPES).toContain('common_stock');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('preferred_stock');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('convertible_note');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('safe');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('warrant');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('option');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('restricted_stock');
      expect(SecurityIssuance.SECURITY_TYPES).toContain('rsu');
    });

    it('should export EXEMPTION_TYPES', () => {
      expect(SecurityIssuance.EXEMPTION_TYPES).toContain('rule_701');
      expect(SecurityIssuance.EXEMPTION_TYPES).toContain('regulation_d_506b');
      expect(SecurityIssuance.EXEMPTION_TYPES).toContain('regulation_d_506c');
      expect(SecurityIssuance.EXEMPTION_TYPES).toContain('section_4a2');
      expect(SecurityIssuance.EXEMPTION_TYPES).toContain('other');
    });

    it('should export ISSUANCE_STATUSES', () => {
      expect(SecurityIssuance.ISSUANCE_STATUSES).toContain('pending');
      expect(SecurityIssuance.ISSUANCE_STATUSES).toContain('issued');
      expect(SecurityIssuance.ISSUANCE_STATUSES).toContain('cancelled');
      expect(SecurityIssuance.ISSUANCE_STATUSES).toContain('transferred');
      expect(SecurityIssuance.ISSUANCE_STATUSES).toContain('exercised');
      expect(SecurityIssuance.ISSUANCE_STATUSES).toContain('converted');
    });

    it('should export COMPLIANCE_STATUSES', () => {
      expect(SecurityIssuance.COMPLIANCE_STATUSES).toContain('compliant');
      expect(SecurityIssuance.COMPLIANCE_STATUSES).toContain('pending_review');
      expect(SecurityIssuance.COMPLIANCE_STATUSES).toContain('non_compliant');
      expect(SecurityIssuance.COMPLIANCE_STATUSES).toContain('remediation_required');
    });

    it('should export FILING_STATUSES', () => {
      expect(SecurityIssuance.FILING_STATUSES).toContain('not_required');
      expect(SecurityIssuance.FILING_STATUSES).toContain('pending');
      expect(SecurityIssuance.FILING_STATUSES).toContain('filed');
      expect(SecurityIssuance.FILING_STATUSES).toContain('overdue');
      expect(SecurityIssuance.FILING_STATUSES).toContain('exempt');
    });

    it('should export US_STATE_CODES', () => {
      expect(SecurityIssuance.US_STATE_CODES).toContain('CA');
      expect(SecurityIssuance.US_STATE_CODES).toContain('NY');
      expect(SecurityIssuance.US_STATE_CODES).toContain('DE');
      expect(SecurityIssuance.US_STATE_CODES).toContain('TX');
      expect(SecurityIssuance.US_STATE_CODES).toContain('DC');
      expect(SecurityIssuance.US_STATE_CODES.length).toBe(51);
    });

    it('should export ACCREDITED_VERIFICATION_METHODS', () => {
      expect(SecurityIssuance.ACCREDITED_VERIFICATION_METHODS).toContain('self_certification');
      expect(SecurityIssuance.ACCREDITED_VERIFICATION_METHODS).toContain('third_party_verification');
    });

    it('should export RULE_701_RECIPIENT_TYPES', () => {
      expect(SecurityIssuance.RULE_701_RECIPIENT_TYPES).toContain('employee');
      expect(SecurityIssuance.RULE_701_RECIPIENT_TYPES).toContain('director');
      expect(SecurityIssuance.RULE_701_RECIPIENT_TYPES).toContain('consultant');
    });

    it('should export ISSUE_SEVERITIES', () => {
      expect(SecurityIssuance.ISSUE_SEVERITIES).toEqual(['low', 'medium', 'high', 'critical']);
    });

    it('should export ISSUE_STATUSES', () => {
      expect(SecurityIssuance.ISSUE_STATUSES).toEqual(['open', 'in_progress', 'resolved']);
    });
  });

  // ---- Create ----

  describe('create()', () => {
    it('should create an issuance with auto-generated issuanceId', async () => {
      const result = await SecurityIssuance.create(validData);
      expect(result).toBeDefined();
      expect(result.issuanceId).toMatch(/^iss_/);
    });

    it('should preserve provided issuanceId', async () => {
      const result = await SecurityIssuance.create({
        ...validData,
        issuanceId: 'iss_custom-001'
      });
      expect(result.issuanceId).toBe('iss_custom-001');
    });

    it('should calculate totalConsideration (shares * price)', async () => {
      const result = await SecurityIssuance.create(validData);
      expect(result.totalConsideration).toBe(10000 * 1.50);
      expect(result.totalConsideration).toBe(15000);
    });

    it('should default status to pending', async () => {
      const result = await SecurityIssuance.create(validData);
      expect(result.status).toBe('pending');
    });

    it('should throw for invalid securityType', async () => {
      await expect(
        SecurityIssuance.create({ ...validData, securityType: 'invalid_type' })
      ).rejects.toThrow('securityType must be one of');
    });

    it('should throw for negative numberOfShares', async () => {
      await expect(
        SecurityIssuance.create({ ...validData, numberOfShares: -100 })
      ).rejects.toThrow('Number of shares must be non-negative');
    });

    it('should throw for negative pricePerShare', async () => {
      await expect(
        SecurityIssuance.create({ ...validData, pricePerShare: -0.01 })
      ).rejects.toThrow('Price per share must be non-negative');
    });

    it('should accept zero numberOfShares', async () => {
      const result = await SecurityIssuance.create({
        ...validData,
        numberOfShares: 0
      });
      expect(result.numberOfShares).toBe(0);
      expect(result.totalConsideration).toBe(0);
    });

    it('should accept zero pricePerShare', async () => {
      const result = await SecurityIssuance.create({
        ...validData,
        pricePerShare: 0
      });
      expect(result.pricePerShare).toBe(0);
      expect(result.totalConsideration).toBe(0);
    });

    it('should accept all valid security types', async () => {
      for (const secType of SecurityIssuance.SECURITY_TYPES) {
        store = [];
        idCounter = 0;
        const result = await SecurityIssuance.create({
          ...validData,
          securityType: secType,
          issuanceId: `iss_${secType}`
        });
        expect(result.securityType).toBe(secType);
      }
    });
  });

  // ---- Query Methods ----

  describe('findByIssuanceId()', () => {
    it('should find an issuance by issuanceId', async () => {
      await SecurityIssuance.create({ ...validData, issuanceId: 'iss_find-001' });

      const result = await SecurityIssuance.findByIssuanceId('iss_find-001');
      expect(result).toBeDefined();
      expect(result.stakeholderName).toBe('Jane Doe');
    });

    it('should return null for non-existent issuanceId', async () => {
      const result = await SecurityIssuance.findByIssuanceId('iss_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find issuances by companyId', async () => {
      await SecurityIssuance.create({ ...validData, companyId: 'comp_fc', issuanceId: 'iss_a' });
      await SecurityIssuance.create({ ...validData, companyId: 'comp_fc', issuanceId: 'iss_b' });

      const results = await SecurityIssuance.findByCompany('comp_fc');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      await SecurityIssuance.create({ ...validData, companyId: 'comp_fs', issuanceId: 'iss_c', status: 'pending' });
      await SecurityIssuance.create({ ...validData, companyId: 'comp_fs', issuanceId: 'iss_d', status: 'issued' });

      const results = await SecurityIssuance.findByCompany('comp_fs', { status: 'issued' });
      expect(results.length).toBe(1);
    });

    it('should filter by securityType when provided', async () => {
      await SecurityIssuance.create({ ...validData, companyId: 'comp_st', issuanceId: 'iss_e', securityType: 'common_stock' });
      await SecurityIssuance.create({ ...validData, companyId: 'comp_st', issuanceId: 'iss_f', securityType: 'option' });

      const results = await SecurityIssuance.findByCompany('comp_st', { securityType: 'option' });
      expect(results.length).toBe(1);
    });

    it('should filter by exemptionType when provided', async () => {
      await SecurityIssuance.create({ ...validData, companyId: 'comp_et', issuanceId: 'iss_g', exemptionType: 'rule_701' });
      await SecurityIssuance.create({ ...validData, companyId: 'comp_et', issuanceId: 'iss_h', exemptionType: 'regulation_d_506b' });

      const results = await SecurityIssuance.findByCompany('comp_et', { exemptionType: 'regulation_d_506b' });
      expect(results.length).toBe(1);
    });
  });

  describe('findByStakeholder()', () => {
    it('should find issuances by stakeholderId', async () => {
      await SecurityIssuance.create({ ...validData, stakeholderId: 'sh_query', issuanceId: 'iss_i' });
      await SecurityIssuance.create({ ...validData, stakeholderId: 'sh_query', issuanceId: 'iss_j' });

      const results = await SecurityIssuance.findByStakeholder('sh_query');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      await SecurityIssuance.create({ ...validData, stakeholderId: 'sh_status', issuanceId: 'iss_k', status: 'issued' });
      await SecurityIssuance.create({ ...validData, stakeholderId: 'sh_status', issuanceId: 'iss_l', status: 'pending' });

      const results = await SecurityIssuance.findByStakeholder('sh_status', { status: 'issued' });
      expect(results.length).toBe(1);
    });
  });

  describe('findByExemptionType()', () => {
    it('should find issuances by exemptionType', async () => {
      await SecurityIssuance.create({ ...validData, issuanceId: 'iss_m', exemptionType: 'regulation_d_506b' });
      await SecurityIssuance.create({ ...validData, issuanceId: 'iss_n', exemptionType: 'regulation_d_506b' });

      const results = await SecurityIssuance.findByExemptionType('regulation_d_506b');
      expect(results.length).toBe(2);
    });

    it('should filter by companyId when provided', async () => {
      await SecurityIssuance.create({ ...validData, companyId: 'comp_ex', issuanceId: 'iss_o', exemptionType: 'rule_701' });
      await SecurityIssuance.create({ ...validData, companyId: 'comp_other', issuanceId: 'iss_p', exemptionType: 'rule_701' });

      const results = await SecurityIssuance.findByExemptionType('rule_701', { companyId: 'comp_ex' });
      expect(results.length).toBe(1);
    });
  });

  // ---- Business Logic ----

  describe('getTotalValue()', () => {
    it('should calculate total value (shares * price)', () => {
      expect(SecurityIssuance.getTotalValue({ numberOfShares: 1000, pricePerShare: 10.50 })).toBe(10500);
    });

    it('should return 0 for zero shares', () => {
      expect(SecurityIssuance.getTotalValue({ numberOfShares: 0, pricePerShare: 10 })).toBe(0);
    });

    it('should return 0 for zero price', () => {
      expect(SecurityIssuance.getTotalValue({ numberOfShares: 1000, pricePerShare: 0 })).toBe(0);
    });
  });

  describe('isOverdue()', () => {
    it('should return true when federal filing deadline is past and status is pending', () => {
      const issuance = {
        federalFilingStatus: 'pending',
        federalFilingDeadline: new Date(Date.now() - 86400000).toISOString(),
        stateFilings: []
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(true);
    });

    it('should return false when federal filing is not pending', () => {
      const issuance = {
        federalFilingStatus: 'filed',
        federalFilingDeadline: new Date(Date.now() - 86400000).toISOString(),
        stateFilings: []
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(false);
    });

    it('should return false when federal deadline is in the future', () => {
      const issuance = {
        federalFilingStatus: 'pending',
        federalFilingDeadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        stateFilings: []
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(false);
    });

    it('should return true when a state filing is overdue', () => {
      const issuance = {
        federalFilingStatus: 'filed',
        stateFilings: [
          {
            stateCode: 'CA',
            filingStatus: 'pending',
            filingDeadline: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(true);
    });

    it('should return false when state filing is filed', () => {
      const issuance = {
        federalFilingStatus: 'filed',
        stateFilings: [
          {
            stateCode: 'CA',
            filingStatus: 'filed',
            filingDeadline: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(false);
    });

    it('should return false when no filings exist', () => {
      const issuance = {
        federalFilingStatus: 'not_required',
        stateFilings: []
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(false);
    });

    it('should return false when stateFilings is empty', () => {
      const issuance = {
        federalFilingStatus: 'not_required'
      };
      expect(SecurityIssuance.isOverdue(issuance)).toBe(false);
    });
  });

  describe('getPendingFilingsCount()', () => {
    it('should count federal pending filing', () => {
      const issuance = {
        federalFilingStatus: 'pending',
        stateFilings: []
      };
      expect(SecurityIssuance.getPendingFilingsCount(issuance)).toBe(1);
    });

    it('should count state pending filings', () => {
      const issuance = {
        federalFilingStatus: 'filed',
        stateFilings: [
          { filingStatus: 'pending' },
          { filingStatus: 'filed' },
          { filingStatus: 'pending' }
        ]
      };
      expect(SecurityIssuance.getPendingFilingsCount(issuance)).toBe(2);
    });

    it('should count both federal and state pending filings', () => {
      const issuance = {
        federalFilingStatus: 'pending',
        stateFilings: [
          { filingStatus: 'pending' },
          { filingStatus: 'pending' }
        ]
      };
      expect(SecurityIssuance.getPendingFilingsCount(issuance)).toBe(3);
    });

    it('should return 0 when no pending filings', () => {
      const issuance = {
        federalFilingStatus: 'filed',
        stateFilings: [{ filingStatus: 'filed' }]
      };
      expect(SecurityIssuance.getPendingFilingsCount(issuance)).toBe(0);
    });

    it('should handle missing stateFilings gracefully', () => {
      const issuance = { federalFilingStatus: 'not_required' };
      expect(SecurityIssuance.getPendingFilingsCount(issuance)).toBe(0);
    });
  });

  describe('needsStateFiling()', () => {
    it('should return true for regulation_d_506b exemption without existing filing', () => {
      const issuance = { exemptionType: 'regulation_d_506b', stateFilings: [] };
      expect(SecurityIssuance.needsStateFiling(issuance, 'CA')).toBe(true);
    });

    it('should return true for regulation_d_506c exemption', () => {
      const issuance = { exemptionType: 'regulation_d_506c', stateFilings: [] };
      expect(SecurityIssuance.needsStateFiling(issuance, 'NY')).toBe(true);
    });

    it('should return false for rule_701 exemption', () => {
      const issuance = { exemptionType: 'rule_701', stateFilings: [] };
      expect(SecurityIssuance.needsStateFiling(issuance, 'CA')).toBe(false);
    });

    it('should return false for section_4a2 exemption', () => {
      const issuance = { exemptionType: 'section_4a2', stateFilings: [] };
      expect(SecurityIssuance.needsStateFiling(issuance, 'CA')).toBe(false);
    });

    it('should return false when state filing already filed', () => {
      const issuance = {
        exemptionType: 'regulation_d_506b',
        stateFilings: [{ stateCode: 'CA', filingStatus: 'filed' }]
      };
      expect(SecurityIssuance.needsStateFiling(issuance, 'CA')).toBe(false);
    });

    it('should return true when state filing exists but not filed', () => {
      const issuance = {
        exemptionType: 'regulation_d_506b',
        stateFilings: [{ stateCode: 'CA', filingStatus: 'pending' }]
      };
      expect(SecurityIssuance.needsStateFiling(issuance, 'CA')).toBe(true);
    });

    it('should return true for different state even when another state is filed', () => {
      const issuance = {
        exemptionType: 'regulation_d_506b',
        stateFilings: [{ stateCode: 'CA', filingStatus: 'filed' }]
      };
      expect(SecurityIssuance.needsStateFiling(issuance, 'NY')).toBe(true);
    });
  });

  describe('getUpcomingDeadlines()', () => {
    it('should return federal filing deadline when upcoming', () => {
      const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
      const issuance = {
        federalFilingStatus: 'pending',
        federalFilingDeadline: futureDate,
        stateFilings: []
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines.length).toBe(1);
      expect(deadlines[0].type).toBe('federal');
      expect(deadlines[0].filingType).toBe('Form D');
      expect(deadlines[0].daysRemaining).toBeLessThanOrEqual(10);
    });

    it('should return Form D amendment deadline when required', () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
      const issuance = {
        federalFilingStatus: 'filed',
        formDAmendmentRequired: true,
        formDAmendmentDeadline: futureDate,
        stateFilings: []
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines.length).toBe(1);
      expect(deadlines[0].filingType).toBe('Form D Amendment');
    });

    it('should return state filing deadlines when upcoming', () => {
      const futureDate = new Date(Date.now() + 86400000 * 15).toISOString();
      const issuance = {
        federalFilingStatus: 'filed',
        stateFilings: [
          {
            stateCode: 'CA',
            filingStatus: 'pending',
            filingDeadline: futureDate
          }
        ]
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines.length).toBe(1);
      expect(deadlines[0].type).toBe('state');
      expect(deadlines[0].stateCode).toBe('CA');
    });

    it('should exclude deadlines beyond daysAhead', () => {
      const farFuture = new Date(Date.now() + 86400000 * 60).toISOString();
      const issuance = {
        federalFilingStatus: 'pending',
        federalFilingDeadline: farFuture,
        stateFilings: []
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines.length).toBe(0);
    });

    it('should exclude filed state deadlines', () => {
      const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
      const issuance = {
        federalFilingStatus: 'filed',
        stateFilings: [
          { stateCode: 'CA', filingStatus: 'filed', filingDeadline: futureDate }
        ]
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines.length).toBe(0);
    });

    it('should sort deadlines by date ascending', () => {
      const date1 = new Date(Date.now() + 86400000 * 20).toISOString();
      const date2 = new Date(Date.now() + 86400000 * 5).toISOString();
      const issuance = {
        federalFilingStatus: 'pending',
        federalFilingDeadline: date1,
        stateFilings: [
          { stateCode: 'CA', filingStatus: 'pending', filingDeadline: date2 }
        ]
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines.length).toBe(2);
      expect(new Date(deadlines[0].deadline).getTime()).toBeLessThan(
        new Date(deadlines[1].deadline).getTime()
      );
    });

    it('should handle empty state filings', () => {
      const issuance = {
        federalFilingStatus: 'not_required',
        stateFilings: []
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance, 30);
      expect(deadlines).toEqual([]);
    });

    it('should use default 30 days when daysAhead not specified', () => {
      const futureDate = new Date(Date.now() + 86400000 * 25).toISOString();
      const issuance = {
        federalFilingStatus: 'pending',
        federalFilingDeadline: futureDate,
        stateFilings: []
      };

      const deadlines = SecurityIssuance.getUpcomingDeadlines(issuance);
      expect(deadlines.length).toBe(1);
    });
  });

  // ---- updateComplianceStatus() ----

  describe('updateComplianceStatus()', () => {
    it('should update compliance status for an issuance', async () => {
      await SecurityIssuance.create({ ...validData, issuanceId: 'iss_comp-001' });

      const result = await SecurityIssuance.updateComplianceStatus(
        'iss_comp-001',
        'compliant',
        'All filings complete',
        'reviewer_001'
      );
      expect(result).toBeDefined();
    });

    it('should handle null notes and reviewer', async () => {
      await SecurityIssuance.create({ ...validData, issuanceId: 'iss_comp-002' });

      const result = await SecurityIssuance.updateComplianceStatus(
        'iss_comp-002',
        'pending_review'
      );
      expect(result).toBeDefined();
    });
  });

  // ---- findOverdueFilings() ----

  describe('findOverdueFilings()', () => {
    it('should return issuances with overdue filings', async () => {
      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_overdue',
        issuanceId: 'iss_overdue-001',
        federalFilingStatus: 'pending',
        federalFilingDeadline: new Date(Date.now() - 86400000).toISOString()
      });
      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_overdue',
        issuanceId: 'iss_overdue-002',
        federalFilingStatus: 'filed'
      });

      const results = await SecurityIssuance.findOverdueFilings('comp_overdue');
      expect(results.length).toBe(1);
      expect(results[0].issuanceId).toBe('iss_overdue-001');
    });

    it('should return empty array when no overdue filings', async () => {
      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_current',
        issuanceId: 'iss_current-001',
        federalFilingStatus: 'filed'
      });

      const results = await SecurityIssuance.findOverdueFilings('comp_current');
      expect(results.length).toBe(0);
    });
  });

  // ---- getComplianceSummary() ----

  describe('getComplianceSummary()', () => {
    it('should return compliance summary for a company', async () => {
      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_summary',
        issuanceId: 'iss_sum-001',
        complianceStatus: 'compliant',
        federalFilingStatus: 'filed'
      });
      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_summary',
        issuanceId: 'iss_sum-002',
        complianceStatus: 'pending_review',
        federalFilingStatus: 'pending',
        federalFilingDeadline: new Date(Date.now() - 86400000).toISOString()
      });

      const summary = await SecurityIssuance.getComplianceSummary('comp_summary');

      expect(summary.totalIssuances).toBe(2);
      expect(summary.byComplianceStatus.compliant).toBe(1);
      expect(summary.byComplianceStatus.pending_review).toBe(1);
      expect(summary.byFederalFilingStatus.filed).toBe(1);
      expect(summary.byFederalFilingStatus.pending).toBe(1);
      expect(summary.overdueFilings).toBe(1);
    });

    it('should return empty summary for company with no issuances', async () => {
      const summary = await SecurityIssuance.getComplianceSummary('comp_empty');

      expect(summary.totalIssuances).toBe(0);
      expect(summary.byComplianceStatus.compliant).toBe(0);
      expect(summary.overdueFilings).toBe(0);
      expect(summary.upcomingDeadlines).toEqual([]);
    });

    it('should include upcoming deadlines sorted by date', async () => {
      const date1 = new Date(Date.now() + 86400000 * 20).toISOString();
      const date2 = new Date(Date.now() + 86400000 * 5).toISOString();

      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_dl',
        issuanceId: 'iss_dl-001',
        complianceStatus: 'pending_review',
        federalFilingStatus: 'pending',
        federalFilingDeadline: date1
      });
      await SecurityIssuance.create({
        ...validData,
        companyId: 'comp_dl',
        issuanceId: 'iss_dl-002',
        complianceStatus: 'pending_review',
        federalFilingStatus: 'pending',
        federalFilingDeadline: date2
      });

      const summary = await SecurityIssuance.getComplianceSummary('comp_dl');
      expect(summary.upcomingDeadlines.length).toBe(2);
      expect(new Date(summary.upcomingDeadlines[0].deadline).getTime()).toBeLessThan(
        new Date(summary.upcomingDeadlines[1].deadline).getTime()
      );
    });
  });

  // ---- tableName ----

  describe('tableName', () => {
    it('should have tableName set to security_issuances', () => {
      expect(SecurityIssuance.tableName).toBe('security_issuances');
    });
  });
});
