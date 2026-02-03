/**
 * ComplianceTracking Service
 * Issue #76: Implement Security Issuances Register
 *
 * Service for compliance tracking including:
 * - Blue-sky law compliance checking
 * - State-by-state filing requirements
 * - Exemption validation (Rule 701, Regulation D)
 * - Filing deadline calculations
 */

const {
  EXEMPTION_TYPES,
  US_STATE_CODES
} = require('../models/SecurityIssuance');

// State filing requirements database
const STATE_FILING_REQUIREMENTS = {
  CA: {
    regulation_d_506b: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 300,
      scaledFee: true,
      feeCalculation: (amount) => Math.min(300 + Math.floor(amount / 1000000) * 100, 2500),
      exemption: 'Section 25102(f)',
      federalPreemption: true
    },
    regulation_d_506c: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 300,
      scaledFee: true,
      feeCalculation: (amount) => Math.min(300 + Math.floor(amount / 1000000) * 100, 2500),
      exemption: 'Section 25102(f)',
      federalPreemption: true
    },
    rule_701: {
      filingRequired: false,
      baseFee: 0,
      exemptionAvailable: true,
      exemption: 'Section 25102(o)'
    }
  },
  NY: {
    regulation_d_506b: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 1200,
      scaledFee: false,
      federalPreemption: true
    },
    regulation_d_506c: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 1200,
      scaledFee: false,
      federalPreemption: true
    },
    rule_701: {
      filingRequired: false,
      baseFee: 0,
      exemptionAvailable: true
    }
  },
  TX: {
    regulation_d_506b: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 500,
      scaledFee: false,
      federalPreemption: true
    },
    regulation_d_506c: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 500,
      scaledFee: false,
      federalPreemption: true
    },
    rule_701: {
      filingRequired: false,
      baseFee: 0,
      exemptionAvailable: true
    }
  },
  FL: {
    regulation_d_506b: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 100,
      scaledFee: true,
      feeCalculation: (amount) => 100 + amount * 0.0001,
      maxFee: 1000,
      federalPreemption: true
    },
    regulation_d_506c: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 100,
      scaledFee: true,
      feeCalculation: (amount) => 100 + amount * 0.0001,
      maxFee: 1000,
      federalPreemption: true
    },
    rule_701: {
      filingRequired: false,
      baseFee: 0,
      exemptionAvailable: true
    }
  },
  DE: {
    regulation_d_506b: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 150,
      scaledFee: false,
      federalPreemption: true
    },
    regulation_d_506c: {
      filingRequired: true,
      deadlineDays: 15,
      baseFee: 150,
      scaledFee: false,
      federalPreemption: true
    },
    rule_701: {
      filingRequired: false,
      baseFee: 0,
      exemptionAvailable: true
    }
  }
};

// Default state requirements for states not explicitly defined
const DEFAULT_STATE_REQUIREMENTS = {
  regulation_d_506b: {
    filingRequired: true,
    deadlineDays: 15,
    baseFee: 200,
    scaledFee: false,
    federalPreemption: true
  },
  regulation_d_506c: {
    filingRequired: true,
    deadlineDays: 15,
    baseFee: 200,
    scaledFee: false,
    federalPreemption: true
  },
  rule_701: {
    filingRequired: false,
    baseFee: 0,
    exemptionAvailable: true
  }
};

// Rule 701 constants
const RULE_701_LIMITS = {
  AGGREGATE_LIMIT_NO_DISCLOSURE: 5000000,
  AGGREGATE_PERCENTAGE_OF_ASSETS: 0.15,
  AGGREGATE_PERCENTAGE_OF_REVENUE: 0.15,
  AGGREGATE_PERCENTAGE_OF_SECURITIES: 0.15
};

// Compliance checklist templates
const COMPLIANCE_CHECKLISTS = {
  regulation_d_506b: {
    items: [
      { id: 'rd-1', description: 'File Form D with SEC within 15 days of first sale', required: true, category: 'federal_filing' },
      { id: 'rd-2', description: 'Verify all non-accredited investors are sophisticated', required: true, category: 'investor_qualification' },
      { id: 'rd-3', description: 'Limit non-accredited investors to 35', required: true, category: 'investor_limits' },
      { id: 'rd-4', description: 'No general solicitation or advertising', required: true, category: 'offering_conduct' },
      { id: 'rd-5', description: 'Provide disclosure documents to non-accredited investors', required: true, category: 'disclosure' },
      { id: 'rd-6', description: 'Obtain signed subscription agreements', required: true, category: 'documentation' },
      { id: 'rd-7', description: 'Issue legended securities certificates', required: true, category: 'documentation' },
      { id: 'rd-8', description: 'File state notice filings within required timeframes', required: true, category: 'state_filing' },
      { id: 'rd-9', description: 'Verify preexisting substantive relationship with investors', required: false, category: 'investor_qualification' },
      { id: 'rd-10', description: 'File Form D amendment if offering terms change', required: false, category: 'federal_filing' }
    ]
  },
  regulation_d_506c: {
    items: [
      { id: 'rc-1', description: 'File Form D with SEC within 15 days of first sale', required: true, category: 'federal_filing' },
      { id: 'rc-2', description: 'Verify all investors are accredited through reasonable steps', required: true, category: 'investor_qualification' },
      { id: 'rc-3', description: 'Document accredited investor verification method', required: true, category: 'documentation' },
      { id: 'rc-4', description: 'Obtain third-party verification or review tax returns/financial statements', required: true, category: 'investor_qualification' },
      { id: 'rc-5', description: 'Obtain signed subscription agreements', required: true, category: 'documentation' },
      { id: 'rc-6', description: 'Issue legended securities certificates', required: true, category: 'documentation' },
      { id: 'rc-7', description: 'File state notice filings within required timeframes', required: true, category: 'state_filing' },
      { id: 'rc-8', description: 'File Form D amendment if offering terms change', required: false, category: 'federal_filing' }
    ]
  },
  rule_701: {
    items: [
      { id: 'r7-1', description: 'Verify recipient is employee, director, officer, or consultant', required: true, category: 'eligibility' },
      { id: 'r7-2', description: 'Confirm compensatory purpose of issuance', required: true, category: 'eligibility' },
      { id: 'r7-3', description: 'Track aggregate offering amount (12-month rolling)', required: true, category: 'limits' },
      { id: 'r7-4', description: 'Verify aggregate limit not exceeded', required: true, category: 'limits' },
      { id: 'r7-5', description: 'Provide required disclosures if over $5M threshold', required: false, category: 'disclosure' },
      { id: 'r7-6', description: 'Maintain written compensatory plan or contract', required: true, category: 'documentation' },
      { id: 'r7-7', description: 'For consultants: verify natural person providing bona fide services', required: false, category: 'eligibility' }
    ]
  }
};

class ComplianceTrackingService {
  /**
   * Get state filing requirements for an exemption type
   */
  static getStateFilingRequirements(exemptionType, states) {
    if (!states || !Array.isArray(states)) {
      return [];
    }

    if (!EXEMPTION_TYPES.includes(exemptionType)) {
      throw new Error('Invalid exemption type');
    }

    return states.map(stateCode => {
      const stateReqs = STATE_FILING_REQUIREMENTS[stateCode] || {};
      const requirements = stateReqs[exemptionType] || DEFAULT_STATE_REQUIREMENTS[exemptionType] || {};

      return {
        stateCode,
        filingRequired: requirements.filingRequired !== false,
        deadlineDays: requirements.deadlineDays || 15,
        fees: requirements.baseFee || 0,
        exemption: requirements.exemption,
        exemptionAvailable: requirements.exemptionAvailable || false,
        federalPreemption: requirements.federalPreemption || false,
        filingType: requirements.federalPreemption ? 'notice' : 'registration'
      };
    });
  }

  /**
   * Calculate filing deadline based on type and issuance date
   */
  static calculateFilingDeadline(filingType, issuanceDate, options = {}) {
    const date = new Date(issuanceDate);

    switch (filingType) {
      case 'form_d':
        // Form D due within 15 days of first sale
        date.setDate(date.getDate() + 15);
        return date;

      case 'state_notice':
        // State filings typically due 15 days after first sale
        const stateCode = options.stateCode;
        const stateReqs = STATE_FILING_REQUIREMENTS[stateCode];
        const deadlineDays = stateReqs?.[options.exemptionType]?.deadlineDays || 15;
        date.setDate(date.getDate() + deadlineDays);
        return date;

      case 'form_d_amendment':
        // Annual amendment due one year after original filing
        date.setFullYear(date.getFullYear() + 1);
        return date;

      default:
        // Default to 15 days
        date.setDate(date.getDate() + 15);
        return date;
    }
  }

  /**
   * Validate Rule 701 compliance
   */
  static validateRule701Compliance(issuanceData) {
    if (!issuanceData) {
      throw new Error('Invalid issuance data');
    }

    const issues = [];
    let isCompliant = true;
    let disclosureRequired = false;

    // Check recipient eligibility
    const eligibleRecipients = ['employee', 'director', 'officer', 'consultant', 'advisor'];
    if (!eligibleRecipients.includes(issuanceData.recipientType)) {
      issues.push('Recipient is not an eligible recipient under Rule 701');
      isCompliant = false;
    }

    // Check consultant eligibility (must be natural person providing bona fide services)
    if (issuanceData.recipientType === 'consultant') {
      if (!issuanceData.consultantDetails?.naturalPerson) {
        issues.push('Consultant must be a natural person');
        isCompliant = false;
      }
      if (!issuanceData.consultantDetails?.providesBonaFideServices) {
        issues.push('Consultant must provide bona fide services');
        isCompliant = false;
      }
      if (issuanceData.consultantDetails?.notCapitalRaising === false) {
        issues.push('Services cannot be for capital raising');
        isCompliant = false;
      }
    }

    // Calculate aggregate limit
    const maxByRevenue = (issuanceData.companyRevenue || 0) * RULE_701_LIMITS.AGGREGATE_PERCENTAGE_OF_REVENUE;
    const maxBySecurities = (issuanceData.outstandingSecurities || 0) * RULE_701_LIMITS.AGGREGATE_PERCENTAGE_OF_SECURITIES;
    const aggregateLimit = Math.max(
      1000000, // Minimum $1M
      maxByRevenue,
      maxBySecurities
    );

    // Check if aggregate limit exceeded
    if (issuanceData.totalOfferedAmount > aggregateLimit) {
      issues.push(`Total offering amount exceeds Rule 701 aggregate limit of $${aggregateLimit.toLocaleString()}`);
      isCompliant = false;
    }

    // Check if disclosure is required (over $5M)
    if (issuanceData.totalOfferedAmount > RULE_701_LIMITS.AGGREGATE_LIMIT_NO_DISCLOSURE) {
      disclosureRequired = true;
    }

    return {
      isCompliant,
      issues,
      disclosureRequired,
      disclosureRequirements: disclosureRequired ? {
        riskFactors: true,
        financialStatements: true,
        summary: 'Must provide disclosure documents including risk factors and financial statements'
      } : null,
      aggregateLimit,
      remainingCapacity: Math.max(0, aggregateLimit - issuanceData.totalOfferedAmount)
    };
  }

  /**
   * Validate Regulation D compliance
   */
  static validateRegulationDCompliance(offeringData) {
    const issues = [];
    let isCompliant = true;

    if (offeringData.exemptionType === 'regulation_d_506b') {
      // Check non-accredited investor limit
      if (offeringData.nonAccreditedInvestors > 35) {
        issues.push('506(b) offerings limited to 35 non-accredited investors');
        isCompliant = false;
      }

      // Check general solicitation
      if (offeringData.generalSolicitation) {
        issues.push('General solicitation not permitted for 506(b) offerings');
        isCompliant = false;
      }

    } else if (offeringData.exemptionType === 'regulation_d_506c') {
      // Check accredited only
      if (offeringData.nonAccreditedInvestors > 0) {
        issues.push('506(c) offerings are accredited only - no non-accredited investors permitted');
        isCompliant = false;
      }

      // Check verification method
      if (offeringData.investorVerification !== 'reasonable_steps' &&
          offeringData.investorVerification !== 'third_party_verification') {
        issues.push('506(c) requires reasonable steps to verify accredited investor status');
        isCompliant = false;
      }
    }

    return {
      isCompliant,
      issues,
      exemptionType: offeringData.exemptionType,
      investorCounts: {
        accredited: offeringData.accreditedInvestors,
        nonAccredited: offeringData.nonAccreditedInvestors
      }
    };
  }

  /**
   * Check blue-sky compliance for investor states
   */
  static checkBlueSkyCompliance(issuanceData) {
    const { exemptionType, investorStates, issuanceDate } = issuanceData;

    const states = investorStates.map(stateCode => {
      const stateReqs = STATE_FILING_REQUIREMENTS[stateCode] || {};
      const requirements = stateReqs[exemptionType] || DEFAULT_STATE_REQUIREMENTS[exemptionType] || {};

      const filingRequired = requirements.filingRequired !== false;
      const deadline = filingRequired
        ? this.calculateFilingDeadline('state_notice', issuanceDate, { stateCode, exemptionType })
        : null;

      return {
        stateCode,
        filingRequired,
        filingType: requirements.federalPreemption ? 'notice' : 'registration',
        federalPreemption: requirements.federalPreemption || false,
        deadline,
        fee: requirements.baseFee || 0,
        exemption: requirements.exemption,
        status: 'pending'
      };
    });

    return {
      exemptionType,
      states,
      totalFilingsRequired: states.filter(s => s.filingRequired).length,
      totalFees: states.reduce((sum, s) => sum + (s.filingRequired ? s.fee : 0), 0)
    };
  }

  /**
   * Get state filing fees
   */
  static getStateFees(stateCode, exemptionType, options = {}) {
    const stateReqs = STATE_FILING_REQUIREMENTS[stateCode] || {};
    const requirements = stateReqs[exemptionType] || DEFAULT_STATE_REQUIREMENTS[exemptionType] || {};

    let baseFee = requirements.baseFee || 0;
    let scaledFee = baseFee;

    if (requirements.scaledFee && requirements.feeCalculation && options.offeringAmount) {
      scaledFee = requirements.feeCalculation(options.offeringAmount);
      if (requirements.maxFee) {
        scaledFee = Math.min(scaledFee, requirements.maxFee);
      }
    }

    return {
      stateCode,
      exemptionType,
      baseFee,
      scaledFee,
      offeringAmount: options.offeringAmount
    };
  }

  /**
   * Get compliance checklist for an exemption type
   */
  static getComplianceChecklist(exemptionType) {
    if (!EXEMPTION_TYPES.includes(exemptionType)) {
      throw new Error('Invalid exemption type');
    }

    const checklist = COMPLIANCE_CHECKLISTS[exemptionType];
    if (!checklist) {
      // Return a generic checklist for other exemption types
      return {
        exemptionType,
        items: [
          { id: 'gen-1', description: 'Verify exemption requirements are met', required: true, category: 'general' },
          { id: 'gen-2', description: 'Maintain proper documentation', required: true, category: 'documentation' },
          { id: 'gen-3', description: 'File required notices with regulators', required: true, category: 'filing' }
        ]
      };
    }

    return {
      exemptionType,
      ...checklist
    };
  }

  /**
   * Calculate aggregate offering amount
   */
  static calculateAggregateOfferingAmount(issuances, options = {}) {
    if (!issuances || !Array.isArray(issuances)) {
      return { total: 0, issued: 0, pending: 0, rolling12Month: 0 };
    }

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    let total = 0;
    let issued = 0;
    let pending = 0;
    let rolling12Month = 0;

    issuances.forEach(issuance => {
      if (issuance.status === 'cancelled') {
        return;
      }

      const amount = issuance.totalConsideration || 0;
      total += amount;

      if (issuance.status === 'issued') {
        issued += amount;
      } else if (issuance.status === 'pending') {
        pending += amount;
      }

      if (options.rolling12Month && issuance.issuanceDate) {
        const issuanceDate = new Date(issuance.issuanceDate);
        if (issuanceDate >= twelveMonthsAgo) {
          rolling12Month += amount;
        }
      }
    });

    return {
      total,
      issued,
      pending,
      rolling12Month: options.rolling12Month ? rolling12Month : undefined
    };
  }

  /**
   * Generate comprehensive compliance report
   */
  static generateComplianceReport(companyData) {
    const { companyId, issuances = [] } = companyData;

    const report = {
      companyId,
      generatedAt: new Date(),
      summary: {
        totalIssuances: issuances.length,
        totalConsideration: 0,
        byExemptionType: {},
        byComplianceStatus: {
          compliant: 0,
          pending_review: 0,
          non_compliant: 0,
          remediation_required: 0
        }
      },
      stateFilingSummary: {
        total: 0,
        filed: 0,
        pending: 0,
        overdue: 0
      },
      warnings: [],
      recommendations: [],
      issuanceDetails: []
    };

    issuances.forEach(issuance => {
      const detail = {
        issuanceId: issuance.issuanceId,
        exemptionType: issuance.exemptionType,
        complianceStatus: issuance.complianceStatus,
        federalFilingStatus: issuance.federalFilingStatus,
        stateFilings: issuance.stateFilings || []
      };

      report.summary.totalConsideration += issuance.totalConsideration || 0;

      // Count by exemption type
      if (issuance.exemptionType) {
        report.summary.byExemptionType[issuance.exemptionType] =
          (report.summary.byExemptionType[issuance.exemptionType] || 0) + 1;
      }

      // Count by compliance status
      if (report.summary.byComplianceStatus[issuance.complianceStatus] !== undefined) {
        report.summary.byComplianceStatus[issuance.complianceStatus]++;
      }

      // Check for overdue federal filings
      if (issuance.federalFilingStatus === 'overdue') {
        report.warnings.push(`Issuance ${issuance.issuanceId} has overdue federal filing`);
      }

      // Aggregate state filing stats
      (issuance.stateFilings || []).forEach(filing => {
        report.stateFilingSummary.total++;
        if (filing.filingStatus === 'filed') {
          report.stateFilingSummary.filed++;
        } else if (filing.filingStatus === 'pending') {
          report.stateFilingSummary.pending++;
        } else if (filing.filingStatus === 'overdue') {
          report.stateFilingSummary.overdue++;
          report.warnings.push(`Issuance ${issuance.issuanceId} has overdue ${filing.stateCode} state filing`);
        }
      });

      report.issuanceDetails.push(detail);
    });

    // Add recommendations
    if (report.summary.byComplianceStatus.non_compliant > 0) {
      report.recommendations.push('Address non-compliant issuances immediately');
    }
    if (report.stateFilingSummary.pending > 0) {
      report.recommendations.push('Complete pending state filings before deadlines');
    }
    if (report.warnings.length > 0) {
      report.recommendations.push('Review and resolve all warnings');
    }

    return report;
  }
}

module.exports = ComplianceTrackingService;
