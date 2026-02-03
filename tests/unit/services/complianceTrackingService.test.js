/**
 * ComplianceTracking Service Test Suite
 * Issue #76: Implement Security Issuances Register
 *
 * Tests for the compliance tracking service including:
 * - Blue-sky law compliance checking
 * - State filing requirements
 * - Exemption validation
 * - Filing deadline calculations
 */

// Import service directly - it has no dependencies that need mocking
const ComplianceTrackingService = require('../../../services/complianceTrackingService');

describe('ComplianceTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStateFilingRequirements', () => {
    it('should return filing requirements for Regulation D 506(b)', () => {
      const requirements = ComplianceTrackingService.getStateFilingRequirements(
        'regulation_d_506b',
        ['CA', 'NY', 'TX']
      );

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(3);
      expect(requirements[0]).toHaveProperty('stateCode');
      expect(requirements[0]).toHaveProperty('filingRequired');
      expect(requirements[0]).toHaveProperty('deadlineDays');
      expect(requirements[0]).toHaveProperty('fees');
    });

    it('should return filing requirements for Regulation D 506(c)', () => {
      const requirements = ComplianceTrackingService.getStateFilingRequirements(
        'regulation_d_506c',
        ['CA', 'FL']
      );

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(2);
    });

    it('should return filing requirements for Rule 701', () => {
      const requirements = ComplianceTrackingService.getStateFilingRequirements(
        'rule_701',
        ['CA', 'NY']
      );

      expect(requirements).toBeDefined();
      // Rule 701 may have different state requirements
      requirements.forEach(req => {
        expect(req.stateCode).toBeDefined();
        expect(req.exemptionAvailable).toBeDefined();
      });
    });

    it('should handle empty states array', () => {
      const requirements = ComplianceTrackingService.getStateFilingRequirements(
        'regulation_d_506b',
        []
      );

      expect(requirements).toEqual([]);
    });

    it('should throw error for invalid exemption type', () => {
      expect(() => {
        ComplianceTrackingService.getStateFilingRequirements(
          'invalid_exemption',
          ['CA']
        );
      }).toThrow('Invalid exemption type');
    });
  });

  describe('calculateFilingDeadline', () => {
    it('should calculate Form D filing deadline (15 days after first sale)', () => {
      const issuanceDate = new Date('2024-01-15');
      const deadline = ComplianceTrackingService.calculateFilingDeadline(
        'form_d',
        issuanceDate
      );

      expect(deadline).toEqual(new Date('2024-01-30'));
    });

    it('should calculate state filing deadline based on state rules', () => {
      const issuanceDate = new Date('2024-01-15');
      const deadline = ComplianceTrackingService.calculateFilingDeadline(
        'state_notice',
        issuanceDate,
        { stateCode: 'CA' }
      );

      expect(deadline).toBeInstanceOf(Date);
      expect(deadline > issuanceDate).toBe(true);
    });

    it('should calculate Form D amendment deadline (annual)', () => {
      const originalFilingDate = new Date('2024-01-15');
      const deadline = ComplianceTrackingService.calculateFilingDeadline(
        'form_d_amendment',
        originalFilingDate
      );

      // Annual amendment due one year after original filing
      expect(deadline).toEqual(new Date('2025-01-15'));
    });

    it('should handle different filing types', () => {
      const issuanceDate = new Date('2024-01-15');

      const deadlines = ['form_d', 'state_notice', 'form_d_amendment'].map(type =>
        ComplianceTrackingService.calculateFilingDeadline(type, issuanceDate)
      );

      deadlines.forEach(deadline => {
        expect(deadline).toBeInstanceOf(Date);
      });
    });
  });

  describe('validateRule701Compliance', () => {
    it('should validate compliant Rule 701 issuance', () => {
      const issuanceData = {
        securityType: 'option',
        recipientType: 'employee',
        totalOfferedAmount: 1000000,
        companyRevenue: 50000000,
        outstandingSecurities: 10000000
      };

      const result = ComplianceTrackingService.validateRule701Compliance(issuanceData);

      expect(result.isCompliant).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should detect when Rule 701 aggregate limit is exceeded', () => {
      const issuanceData = {
        securityType: 'option',
        recipientType: 'employee',
        totalOfferedAmount: 10000000, // Over $10M threshold
        companyRevenue: 5000000, // 15% of revenue is only $750,000
        outstandingSecurities: 5000000
      };

      const result = ComplianceTrackingService.validateRule701Compliance(issuanceData);

      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('aggregate limit'));
    });

    it('should detect ineligible recipient type', () => {
      const issuanceData = {
        securityType: 'option',
        recipientType: 'outside_investor', // Not eligible for Rule 701
        totalOfferedAmount: 100000,
        companyRevenue: 50000000,
        outstandingSecurities: 10000000
      };

      const result = ComplianceTrackingService.validateRule701Compliance(issuanceData);

      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('eligible recipient'));
    });

    it('should validate consultant eligibility', () => {
      const issuanceData = {
        securityType: 'option',
        recipientType: 'consultant',
        consultantDetails: {
          naturalPerson: true,
          providesBonaFideServices: true,
          notCapitalRaising: true
        },
        totalOfferedAmount: 100000,
        companyRevenue: 50000000,
        outstandingSecurities: 10000000
      };

      const result = ComplianceTrackingService.validateRule701Compliance(issuanceData);

      expect(result.isCompliant).toBe(true);
    });

    it('should require disclosure when over $5M threshold', () => {
      const issuanceData = {
        securityType: 'option',
        recipientType: 'employee',
        totalOfferedAmount: 6000000, // Over $5M disclosure threshold
        companyRevenue: 100000000,
        outstandingSecurities: 50000000
      };

      const result = ComplianceTrackingService.validateRule701Compliance(issuanceData);

      expect(result.disclosureRequired).toBe(true);
      expect(result.disclosureRequirements).toBeDefined();
    });
  });

  describe('validateRegulationDCompliance', () => {
    it('should validate compliant Regulation D 506(b) offering', () => {
      const offeringData = {
        exemptionType: 'regulation_d_506b',
        accreditedInvestors: 50,
        nonAccreditedInvestors: 35, // Max 35 allowed
        generalSolicitation: false,
        investorVerification: 'self_certification'
      };

      const result = ComplianceTrackingService.validateRegulationDCompliance(offeringData);

      expect(result.isCompliant).toBe(true);
    });

    it('should detect too many non-accredited investors for 506(b)', () => {
      const offeringData = {
        exemptionType: 'regulation_d_506b',
        accreditedInvestors: 50,
        nonAccreditedInvestors: 40, // Over 35 limit
        generalSolicitation: false
      };

      const result = ComplianceTrackingService.validateRegulationDCompliance(offeringData);

      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('non-accredited'));
    });

    it('should detect general solicitation violation for 506(b)', () => {
      const offeringData = {
        exemptionType: 'regulation_d_506b',
        accreditedInvestors: 50,
        nonAccreditedInvestors: 0,
        generalSolicitation: true // Not allowed for 506(b)
      };

      const result = ComplianceTrackingService.validateRegulationDCompliance(offeringData);

      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('general solicitation'));
    });

    it('should validate compliant Regulation D 506(c) offering', () => {
      const offeringData = {
        exemptionType: 'regulation_d_506c',
        accreditedInvestors: 100,
        nonAccreditedInvestors: 0, // Must be zero for 506(c)
        generalSolicitation: true, // Allowed for 506(c)
        investorVerification: 'reasonable_steps'
      };

      const result = ComplianceTrackingService.validateRegulationDCompliance(offeringData);

      expect(result.isCompliant).toBe(true);
    });

    it('should detect non-accredited investors for 506(c)', () => {
      const offeringData = {
        exemptionType: 'regulation_d_506c',
        accreditedInvestors: 50,
        nonAccreditedInvestors: 1, // Not allowed for 506(c)
        generalSolicitation: true,
        investorVerification: 'reasonable_steps'
      };

      const result = ComplianceTrackingService.validateRegulationDCompliance(offeringData);

      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('accredited only'));
    });

    it('should require reasonable steps verification for 506(c)', () => {
      const offeringData = {
        exemptionType: 'regulation_d_506c',
        accreditedInvestors: 50,
        nonAccreditedInvestors: 0,
        generalSolicitation: true,
        investorVerification: 'self_certification' // Not sufficient for 506(c)
      };

      const result = ComplianceTrackingService.validateRegulationDCompliance(offeringData);

      expect(result.isCompliant).toBe(false);
      expect(result.issues).toContain(expect.stringContaining('reasonable steps'));
    });
  });

  describe('checkBlueSkyCompliance', () => {
    it('should return compliance status for all investor states', () => {
      const issuanceData = {
        exemptionType: 'regulation_d_506b',
        investorStates: ['CA', 'NY', 'TX', 'FL'],
        issuanceDate: new Date('2024-01-15')
      };

      const result = ComplianceTrackingService.checkBlueSkyCompliance(issuanceData);

      expect(result).toBeDefined();
      expect(result.states).toHaveLength(4);
      result.states.forEach(state => {
        expect(state).toHaveProperty('stateCode');
        expect(state).toHaveProperty('filingRequired');
        expect(state).toHaveProperty('deadline');
        expect(state).toHaveProperty('status');
      });
    });

    it('should identify states requiring filing', () => {
      const issuanceData = {
        exemptionType: 'regulation_d_506b',
        investorStates: ['CA', 'NY'],
        issuanceDate: new Date('2024-01-15')
      };

      const result = ComplianceTrackingService.checkBlueSkyCompliance(issuanceData);

      // CA and NY typically require Form D notice filings
      const filingRequiredStates = result.states.filter(s => s.filingRequired);
      expect(filingRequiredStates.length).toBeGreaterThan(0);
    });

    it('should calculate correct filing deadlines per state', () => {
      const issuanceData = {
        exemptionType: 'regulation_d_506b',
        investorStates: ['CA'],
        issuanceDate: new Date('2024-01-15')
      };

      const result = ComplianceTrackingService.checkBlueSkyCompliance(issuanceData);

      const caFiling = result.states.find(s => s.stateCode === 'CA');
      expect(caFiling.deadline).toBeInstanceOf(Date);
    });

    it('should handle federal preemption for 506 offerings', () => {
      const issuanceData = {
        exemptionType: 'regulation_d_506b',
        investorStates: ['CA'],
        issuanceDate: new Date('2024-01-15')
      };

      const result = ComplianceTrackingService.checkBlueSkyCompliance(issuanceData);

      // 506 offerings have federal preemption - states can only require notice filing
      const caFiling = result.states.find(s => s.stateCode === 'CA');
      expect(caFiling.federalPreemption).toBe(true);
      expect(caFiling.filingType).toBe('notice');
    });
  });

  describe('getStateFees', () => {
    it('should return filing fees for California', () => {
      const fees = ComplianceTrackingService.getStateFees('CA', 'regulation_d_506b');

      expect(fees).toBeDefined();
      expect(fees.baseFee).toBeGreaterThanOrEqual(0);
      expect(typeof fees.baseFee).toBe('number');
    });

    it('should return filing fees for New York', () => {
      const fees = ComplianceTrackingService.getStateFees('NY', 'regulation_d_506b');

      expect(fees).toBeDefined();
      expect(fees.baseFee).toBeGreaterThanOrEqual(0);
    });

    it('should return zero fees for states with no filing requirement', () => {
      // Some states may have no fees for certain exemptions
      const fees = ComplianceTrackingService.getStateFees('DE', 'rule_701');

      expect(fees).toBeDefined();
      expect(fees.baseFee).toBe(0);
    });

    it('should calculate scaled fees based on offering amount', () => {
      const fees = ComplianceTrackingService.getStateFees('CA', 'regulation_d_506b', {
        offeringAmount: 5000000
      });

      expect(fees).toBeDefined();
      expect(fees.scaledFee).toBeDefined();
    });
  });

  describe('getComplianceChecklist', () => {
    it('should return complete checklist for Regulation D offering', () => {
      const checklist = ComplianceTrackingService.getComplianceChecklist('regulation_d_506b');

      expect(checklist).toBeDefined();
      expect(checklist.items).toBeInstanceOf(Array);
      expect(checklist.items.length).toBeGreaterThan(0);

      checklist.items.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('required');
        expect(item).toHaveProperty('category');
      });
    });

    it('should include Form D filing in Regulation D checklist', () => {
      const checklist = ComplianceTrackingService.getComplianceChecklist('regulation_d_506b');

      const formDItem = checklist.items.find(item =>
        item.description.toLowerCase().includes('form d')
      );
      expect(formDItem).toBeDefined();
      expect(formDItem.required).toBe(true);
    });

    it('should return complete checklist for Rule 701', () => {
      const checklist = ComplianceTrackingService.getComplianceChecklist('rule_701');

      expect(checklist).toBeDefined();
      expect(checklist.items).toBeInstanceOf(Array);

      // Rule 701 has specific requirements
      const employeeVerification = checklist.items.find(item =>
        item.category === 'eligibility'
      );
      expect(employeeVerification).toBeDefined();
    });

    it('should throw error for invalid exemption type', () => {
      expect(() => {
        ComplianceTrackingService.getComplianceChecklist('invalid_exemption');
      }).toThrow('Invalid exemption type');
    });
  });

  describe('calculateAggregateOfferingAmount', () => {
    it('should calculate total offering amount for a company', () => {
      const issuances = [
        { totalConsideration: 100000, status: 'issued' },
        { totalConsideration: 250000, status: 'issued' },
        { totalConsideration: 150000, status: 'pending' }
      ];

      const aggregate = ComplianceTrackingService.calculateAggregateOfferingAmount(issuances);

      expect(aggregate.total).toBe(500000);
      expect(aggregate.issued).toBe(350000);
      expect(aggregate.pending).toBe(150000);
    });

    it('should exclude cancelled issuances', () => {
      const issuances = [
        { totalConsideration: 100000, status: 'issued' },
        { totalConsideration: 50000, status: 'cancelled' }
      ];

      const aggregate = ComplianceTrackingService.calculateAggregateOfferingAmount(issuances);

      expect(aggregate.total).toBe(100000);
    });

    it('should calculate 12-month rolling aggregate for Rule 701', () => {
      const now = new Date();
      const issuances = [
        {
          totalConsideration: 100000,
          status: 'issued',
          issuanceDate: new Date(now - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        {
          totalConsideration: 200000,
          status: 'issued',
          issuanceDate: new Date(now - 400 * 24 * 60 * 60 * 1000) // Over 12 months ago
        }
      ];

      const aggregate = ComplianceTrackingService.calculateAggregateOfferingAmount(
        issuances,
        { rolling12Month: true }
      );

      expect(aggregate.rolling12Month).toBe(100000);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', () => {
      const companyData = {
        companyId: 'COMP-001',
        issuances: [
          {
            id: '1',
            issuanceId: 'ISS-001',
            exemptionType: 'rule_701',
            complianceStatus: 'compliant',
            totalConsideration: 100000
          }
        ]
      };

      const report = ComplianceTrackingService.generateComplianceReport(companyData);

      expect(report).toBeDefined();
      expect(report.companyId).toBe('COMP-001');
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.issuanceDetails).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should include overdue filing warnings', () => {
      const companyData = {
        companyId: 'COMP-001',
        issuances: [
          {
            id: '1',
            issuanceId: 'ISS-001',
            exemptionType: 'regulation_d_506b',
            federalFilingStatus: 'overdue',
            totalConsideration: 500000
          }
        ]
      };

      const report = ComplianceTrackingService.generateComplianceReport(companyData);

      expect(report.warnings).toBeDefined();
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('overdue');
    });

    it('should include state filing summary', () => {
      const companyData = {
        companyId: 'COMP-001',
        issuances: [
          {
            id: '1',
            issuanceId: 'ISS-001',
            exemptionType: 'regulation_d_506b',
            stateFilings: [
              { stateCode: 'CA', filingStatus: 'filed' },
              { stateCode: 'NY', filingStatus: 'pending' }
            ],
            totalConsideration: 500000
          }
        ]
      };

      const report = ComplianceTrackingService.generateComplianceReport(companyData);

      expect(report.stateFilingSummary).toBeDefined();
      expect(report.stateFilingSummary.filed).toBe(1);
      expect(report.stateFilingSummary.pending).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null issuance data gracefully', () => {
      expect(() => {
        ComplianceTrackingService.validateRule701Compliance(null);
      }).toThrow('Invalid issuance data');
    });

    it('should handle undefined states array', () => {
      const requirements = ComplianceTrackingService.getStateFilingRequirements(
        'regulation_d_506b',
        undefined
      );

      expect(requirements).toEqual([]);
    });

    it('should handle empty company data for report generation', () => {
      const report = ComplianceTrackingService.generateComplianceReport({
        companyId: 'COMP-001',
        issuances: []
      });

      expect(report).toBeDefined();
      expect(report.summary.totalIssuances).toBe(0);
    });
  });
});
