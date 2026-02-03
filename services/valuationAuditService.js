/**
 * Valuation Audit Service
 * Feature: Issue #63 - Implement Valuation Audit Trail
 *
 * Provides comprehensive audit trail and compliance reporting for 409A valuations.
 */
const Valuation409A = require('../models/Valuation409A');
const MaterialEvent = require('../models/MaterialEvent');

// Compliance standards
const COMPLIANCE_STANDARDS = {
  IRS: {
    code: 'IRC_409A',
    name: 'Internal Revenue Code Section 409A',
    requirements: [
      'Independent valuation performed by qualified appraiser',
      'Valuation using appropriate methods (income, market, asset)',
      'Documentation of all material assumptions',
      'Valuation effective for 12 months unless material change',
      'Board approval of FMV determination'
    ]
  },
  GAAP: {
    code: 'ASC_718',
    name: 'ASC 718 Stock Compensation',
    requirements: [
      'Fair value measurement at grant date',
      'Consistent methodology application',
      'Disclosure of valuation methods and assumptions',
      'Volatility and expected term documentation',
      'Risk-free rate and dividend yield documentation'
    ]
  },
  SOC2: {
    code: 'SOC2_TYPE2',
    name: 'SOC 2 Type II',
    requirements: [
      'Access controls for valuation data',
      'Change management documentation',
      'Data integrity verification',
      'Audit trail completeness'
    ]
  }
};

class ValuationAuditService {
  /**
   * Get complete audit trail for a valuation
   */
  static async getValuationAuditTrail(valuationId) {
    const valuation = await Valuation409A.findOne({ valuationId })
      .populate('companyId', 'name')
      .populate('requestedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('boardApproval.approvedBy', 'firstName lastName email')
      .populate('documents.uploadedBy', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName email');

    if (!valuation) {
      throw new Error('Valuation not found');
    }

    const auditTrail = {
      valuation: {
        valuationId: valuation.valuationId,
        companyId: valuation.companyId,
        status: valuation.status,
        fairMarketValue: valuation.fairMarketValue,
        effectiveDate: valuation.effectiveDate,
        expirationDate: valuation.expirationDate,
        reason: valuation.reason
      },
      timeline: this._buildTimeline(valuation),
      statusHistory: valuation.statusHistory.map(h => ({
        status: h.status,
        changedAt: h.changedAt,
        changedBy: h.changedBy ? {
          name: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
          email: h.changedBy.email
        } : null,
        reason: h.reason
      })),
      documents: valuation.documents.map(d => ({
        type: d.type,
        name: d.name,
        uploadedAt: d.uploadedAt,
        uploadedBy: d.uploadedBy ? {
          name: `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`,
          email: d.uploadedBy.email
        } : null
      })),
      boardApproval: valuation.boardApproval ? {
        approved: valuation.boardApproval.approved,
        approvedAt: valuation.boardApproval.approvedAt,
        approvedBy: valuation.boardApproval.approvedBy ? {
          name: `${valuation.boardApproval.approvedBy.firstName} ${valuation.boardApproval.approvedBy.lastName}`,
          email: valuation.boardApproval.approvedBy.email
        } : null,
        resolution: valuation.boardApproval.resolution
      } : null,
      valuationFirm: valuation.valuationFirm,
      metadata: {
        createdAt: valuation.createdAt,
        updatedAt: valuation.updatedAt,
        createdBy: valuation.createdBy ? {
          name: `${valuation.createdBy.firstName} ${valuation.createdBy.lastName}`,
          email: valuation.createdBy.email
        } : null
      }
    };

    return auditTrail;
  }

  /**
   * Build timeline from valuation data
   */
  static _buildTimeline(valuation) {
    const timeline = [];

    // Add creation
    timeline.push({
      event: 'Valuation Requested',
      date: valuation.requestedAt || valuation.createdAt,
      actor: valuation.requestedBy ? `${valuation.requestedBy.firstName} ${valuation.requestedBy.lastName}` : 'System',
      details: `Reason: ${valuation.reason}`
    });

    // Add status changes
    valuation.statusHistory.forEach(h => {
      if (h.status !== 'requested') {
        timeline.push({
          event: `Status changed to ${h.status}`,
          date: h.changedAt,
          actor: h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : 'System',
          details: h.reason
        });
      }
    });

    // Add valuation firm assignment
    if (valuation.valuationFirm?.assignedAt) {
      timeline.push({
        event: 'Valuation Firm Assigned',
        date: valuation.valuationFirm.assignedAt,
        actor: 'System',
        details: valuation.valuationFirm.name
      });
    }

    // Add document uploads
    valuation.documents.forEach(d => {
      timeline.push({
        event: `Document Uploaded: ${d.type}`,
        date: d.uploadedAt,
        actor: d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : 'System',
        details: d.name
      });
    });

    // Add board approval
    if (valuation.boardApproval?.approvedAt) {
      timeline.push({
        event: 'Board Approval',
        date: valuation.boardApproval.approvedAt,
        actor: valuation.boardApproval.approvedBy ?
          `${valuation.boardApproval.approvedBy.firstName} ${valuation.boardApproval.approvedBy.lastName}` : 'Board',
        details: valuation.boardApproval.resolution
      });
    }

    // Sort by date
    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Get company valuation history with audit details
   */
  static async getCompanyValuationHistory(companyId, options = {}) {
    const query = { companyId };

    if (options.status) query.status = options.status;
    if (options.startDate || options.endDate) {
      query.effectiveDate = {};
      if (options.startDate) query.effectiveDate.$gte = new Date(options.startDate);
      if (options.endDate) query.effectiveDate.$lte = new Date(options.endDate);
    }

    const valuations = await Valuation409A.find(query)
      .populate('requestedBy', 'firstName lastName')
      .populate('boardApproval.approvedBy', 'firstName lastName')
      .sort({ effectiveDate: -1 });

    return valuations.map(v => ({
      valuationId: v.valuationId,
      status: v.status,
      fairMarketValue: v.fairMarketValue,
      effectiveDate: v.effectiveDate,
      expirationDate: v.expirationDate,
      reason: v.reason,
      valuationMethod: v.valuationMethod,
      valuationFirm: v.valuationFirm?.name,
      boardApproved: v.boardApproval?.approved || false,
      documentCount: v.documents?.length || 0,
      requestedBy: v.requestedBy ? `${v.requestedBy.firstName} ${v.requestedBy.lastName}` : null,
      createdAt: v.createdAt,
      isExpired: v.isExpired
    }));
  }

  /**
   * Generate IRS compliance report
   */
  static async generateIRSComplianceReport(companyId, fiscalYear = null) {
    const year = fiscalYear || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const valuations = await Valuation409A.find({
      companyId,
      $or: [
        { effectiveDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    }).populate('boardApproval.approvedBy', 'firstName lastName title');

    const complianceChecks = [];

    valuations.forEach(v => {
      const checks = {
        valuationId: v.valuationId,
        effectiveDate: v.effectiveDate,
        fairMarketValue: v.fairMarketValue,
        requirements: {}
      };

      // Check each IRS requirement
      COMPLIANCE_STANDARDS.IRS.requirements.forEach((req, idx) => {
        let compliant = false;
        let evidence = null;

        switch (idx) {
          case 0: // Independent valuation
            compliant = !!v.valuationFirm?.name;
            evidence = v.valuationFirm?.name || 'No valuation firm assigned';
            break;
          case 1: // Appropriate methods
            compliant = ['income', 'market', 'asset', 'hybrid'].includes(v.valuationMethod);
            evidence = v.valuationMethod || 'Method not specified';
            break;
          case 2: // Documentation
            compliant = v.documents?.some(d => d.type === 'valuation_report');
            evidence = compliant ? 'Valuation report on file' : 'No valuation report found';
            break;
          case 3: // 12-month validity
            compliant = v.expirationDate && v.effectiveDate &&
              ((new Date(v.expirationDate) - new Date(v.effectiveDate)) / (1000 * 60 * 60 * 24) <= 366);
            evidence = compliant ? 'Valid for 12 months' : 'Expiration period issue';
            break;
          case 4: // Board approval
            compliant = v.boardApproval?.approved === true;
            evidence = compliant ?
              `Approved by ${v.boardApproval.approvedBy?.firstName} ${v.boardApproval.approvedBy?.lastName}` :
              'Board approval not recorded';
            break;
        }

        checks.requirements[req] = { compliant, evidence };
      });

      checks.overallCompliant = Object.values(checks.requirements).every(r => r.compliant);
      complianceChecks.push(checks);
    });

    return {
      reportType: 'IRS_409A_COMPLIANCE',
      standard: COMPLIANCE_STANDARDS.IRS,
      fiscalYear: year,
      generatedAt: new Date(),
      companyId,
      valuationCount: valuations.length,
      compliantCount: complianceChecks.filter(c => c.overallCompliant).length,
      nonCompliantCount: complianceChecks.filter(c => !c.overallCompliant).length,
      valuations: complianceChecks
    };
  }

  /**
   * Generate GAAP compliance report (ASC 718)
   */
  static async generateGAAPComplianceReport(companyId, fiscalYear = null) {
    const year = fiscalYear || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const valuations = await Valuation409A.find({
      companyId,
      effectiveDate: { $gte: startDate, $lte: endDate }
    });

    const methodConsistency = this._checkMethodConsistency(valuations);

    return {
      reportType: 'GAAP_ASC_718_COMPLIANCE',
      standard: COMPLIANCE_STANDARDS.GAAP,
      fiscalYear: year,
      generatedAt: new Date(),
      companyId,
      valuationCount: valuations.length,
      methodologyConsistent: methodConsistency.consistent,
      methodsUsed: methodConsistency.methods,
      disclosureRequirements: {
        valuationMethodsDocumented: valuations.every(v => v.valuationMethod),
        assumptionsDocumented: valuations.every(v => v.documents?.length > 0),
        fmvDeterminations: valuations.map(v => ({
          valuationId: v.valuationId,
          effectiveDate: v.effectiveDate,
          fairMarketValue: v.fairMarketValue,
          method: v.valuationMethod
        }))
      }
    };
  }

  /**
   * Check methodology consistency across valuations
   */
  static _checkMethodConsistency(valuations) {
    const methods = [...new Set(valuations.map(v => v.valuationMethod).filter(Boolean))];
    return {
      consistent: methods.length <= 1,
      methods
    };
  }

  /**
   * Generate comprehensive audit report
   */
  static async generateAuditReport(companyId, options = {}) {
    const [
      valuationHistory,
      irsCompliance,
      gaapCompliance,
      materialEvents
    ] = await Promise.all([
      this.getCompanyValuationHistory(companyId, options),
      this.generateIRSComplianceReport(companyId, options.fiscalYear),
      this.generateGAAPComplianceReport(companyId, options.fiscalYear),
      MaterialEvent.find({
        companyId,
        triggersValuation: true
      }).sort({ eventDate: -1 }).limit(20)
    ]);

    const currentValuation = await Valuation409A.findCurrentValuation(companyId);

    return {
      reportType: 'COMPREHENSIVE_AUDIT_REPORT',
      generatedAt: new Date(),
      companyId,
      reportPeriod: {
        fiscalYear: options.fiscalYear || new Date().getFullYear(),
        startDate: options.startDate,
        endDate: options.endDate
      },
      executiveSummary: {
        totalValuations: valuationHistory.length,
        currentValuation: currentValuation ? {
          valuationId: currentValuation.valuationId,
          fairMarketValue: currentValuation.fairMarketValue,
          effectiveDate: currentValuation.effectiveDate,
          expirationDate: currentValuation.expirationDate,
          daysUntilExpiration: currentValuation.daysUntilExpiration
        } : null,
        irsCompliance: {
          compliant: irsCompliance.compliantCount === irsCompliance.valuationCount,
          compliantCount: irsCompliance.compliantCount,
          totalCount: irsCompliance.valuationCount
        },
        gaapCompliance: {
          methodologyConsistent: gaapCompliance.methodologyConsistent
        },
        materialEventsCount: materialEvents.length,
        unresolvedMaterialEvents: materialEvents.filter(e =>
          !['resolved', 'dismissed'].includes(e.status)
        ).length
      },
      valuationHistory,
      irsComplianceReport: irsCompliance,
      gaapComplianceReport: gaapCompliance,
      materialEvents: materialEvents.map(e => ({
        eventId: e.eventId,
        eventType: e.eventType,
        eventDate: e.eventDate,
        status: e.status,
        impactSeverity: e.impactSeverity
      })),
      complianceStandards: COMPLIANCE_STANDARDS
    };
  }

  /**
   * Export audit report as structured data for external systems
   */
  static async exportAuditData(companyId, format = 'json') {
    const auditReport = await this.generateAuditReport(companyId);

    if (format === 'json') {
      return auditReport;
    }

    // Could add CSV, XML, or other formats here
    return auditReport;
  }
}

module.exports = ValuationAuditService;
