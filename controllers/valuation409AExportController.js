/**
 * Valuation409A Export Controller
 * Feature: Issue #269 - Create 409A data export API for third-party valuation providers
 *
 * Provides comprehensive data export endpoints for packaging 409A inputs
 * for third-party valuation providers.
 */
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Import models
const Company = require('../models/Company');
const ShareClass = require('../models/ShareClass');
const EquityGrant = require('../models/EquityGrant');
const FundraisingRound = require('../models/FundraisingRoundModel');
const MaterialEvent = require('../models/MaterialEvent');
const Valuation409A = require('../models/Valuation409A');

// Export log storage (in production, this would be a database table)
const exportLogs = new Map();

/**
 * Generate data hash for integrity verification
 * @param {Object} data - Data to hash
 * @returns {string} SHA256 hash
 */
function generateDataHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * Calculate completeness score for export data
 * @param {Object} data - Export data
 * @returns {Object} Completeness analysis
 */
function calculateCompleteness(data) {
  const sections = [];
  const missing = [];
  const warnings = [];

  // Check company legal structure
  if (data.company) {
    if (!data.company.entity_type) {
      missing.push({ section: 'company', issue: 'Entity type not defined', severity: 'CRITICAL' });
    }
    if (!data.company.jurisdiction_state && data.company.jurisdiction_country === 'US') {
      missing.push({ section: 'company', issue: 'State of incorporation not defined', severity: 'CRITICAL' });
    }
    if (!data.company.legal_name) {
      missing.push({ section: 'company', issue: 'Legal name not defined', severity: 'WARNING' });
    }
    sections.push('company');
  } else {
    missing.push({ section: 'company', issue: 'Company data missing', severity: 'CRITICAL' });
  }

  // Check cap table
  if (data.capTable) {
    if (!data.capTable.shareClasses || data.capTable.shareClasses.length === 0) {
      missing.push({ section: 'cap_table', issue: 'No share classes defined', severity: 'CRITICAL' });
    }
    sections.push('cap_table');
  }

  // Check option grants
  if (data.optionGrants) {
    if (data.optionGrants.length > 0) {
      const grantsWithoutFMV = data.optionGrants.filter(g => !g.fmvAtGrant);
      if (grantsWithoutFMV.length > 0) {
        warnings.push({
          section: 'option_grants',
          issue: `${grantsWithoutFMV.length} grants without FMV at grant date`,
          severity: 'WARNING'
        });
      }
    }
    sections.push('option_grants');
  }

  // Check financing history
  if (data.financingHistory) {
    if (data.financingHistory.length === 0) {
      warnings.push({ section: 'financing', issue: 'No financing rounds documented', severity: 'WARNING' });
    } else {
      const roundsWithoutValuation = data.financingHistory.filter(r => !r.postMoneyValuation);
      if (roundsWithoutValuation.length > 0) {
        warnings.push({
          section: 'financing',
          issue: `${roundsWithoutValuation.length} rounds without valuation data`,
          severity: 'WARNING'
        });
      }
    }
    sections.push('financing');
  }

  // Check material events
  if (data.materialEvents) {
    const unresolvedEvents = data.materialEvents.filter(e =>
      e.status !== 'resolved' && e.status !== 'dismissed' && e.requires409AUpdate
    );
    if (unresolvedEvents.length > 0) {
      missing.push({
        section: 'material_events',
        issue: `${unresolvedEvents.length} unresolved material events requiring 409A update`,
        severity: 'CRITICAL'
      });
    }
    sections.push('material_events');
  }

  // Check prior valuations
  if (data.priorValuations) {
    sections.push('prior_valuations');
  }

  const totalSections = 6;
  const completedSections = sections.length;
  const criticalMissing = missing.filter(m => m.severity === 'CRITICAL').length;

  return {
    readyForExport: criticalMissing === 0,
    completenessScore: Math.round((completedSections / totalSections) * 100) / 100,
    sectionsPresent: sections,
    missingRequired: missing,
    warnings,
    sectionsCount: {
      total: totalSections,
      present: completedSections
    }
  };
}

/**
 * Export cap table summary
 * GET /api/v1/valuations/export/:companyId/cap-table
 */
exports.exportCapTable = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { effectiveDate } = req.query;

    // Get company
    const company = await Company.findByCompanyId(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Get share classes
    const shareClasses = await ShareClass.find({});

    // Get equity grants
    const equityGrants = await EquityGrant.findByCompany(companyId);

    // Calculate summary statistics
    const activeGrants = equityGrants.filter(g =>
      ['pending', 'approved', 'active'].includes(g.status)
    );

    const totalGrantedShares = activeGrants.reduce((sum, g) => sum + (g.numberOfShares || 0), 0);
    const totalExercisedShares = activeGrants.reduce((sum, g) => sum + (g.exercisedShares || 0), 0);
    const totalUnvestedShares = totalGrantedShares - totalExercisedShares;

    // Group grants by type
    const grantsByType = {};
    for (const grant of activeGrants) {
      if (!grantsByType[grant.grantType]) {
        grantsByType[grant.grantType] = {
          count: 0,
          totalShares: 0,
          exercised: 0
        };
      }
      grantsByType[grant.grantType].count++;
      grantsByType[grant.grantType].totalShares += grant.numberOfShares || 0;
      grantsByType[grant.grantType].exercised += grant.exercisedShares || 0;
    }

    const capTableExport = {
      exportId: `exp_${uuidv4()}`,
      exportedAt: new Date().toISOString(),
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      company: {
        companyId: company.companyId,
        name: company.CompanyName,
        legalName: company.legal_name,
        entityType: company.entity_type,
        jurisdictionCountry: company.jurisdiction_country,
        jurisdictionState: company.jurisdiction_state
      },
      shareClasses: shareClasses.map(sc => ({
        shareClassId: sc.shareClassId,
        name: sc.name,
        description: sc.description,
        authorizedShares: sc.authorizedShares,
        dilutedShares: sc.dilutedShares,
        ownershipPercentage: sc.ownershipPercentage
      })),
      optionPool: {
        totalGranted: totalGrantedShares,
        exercised: totalExercisedShares,
        outstanding: totalUnvestedShares,
        byType: grantsByType
      },
      fullyDilutedSummary: {
        totalShareClasses: shareClasses.length,
        totalEquityGrants: activeGrants.length,
        calculatedAt: new Date().toISOString()
      }
    };

    // Generate data hash
    capTableExport.dataHash = generateDataHash(capTableExport);

    res.json({
      success: true,
      data: capTableExport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Export financial highlights
 * GET /api/v1/valuations/export/:companyId/financials
 */
exports.exportFinancials = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { fiscalYear } = req.query;

    // Get company
    const company = await Company.findByCompanyId(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Get fundraising rounds for financial context
    const rounds = await FundraisingRound.findByCompany(companyId, {
      sort: { closingDate: -1, date: -1 }
    });

    // Calculate total raised
    const totalRaised = rounds.reduce((sum, r) => sum + (r.amountRaised || 0), 0);

    // Get latest round for valuation context
    const latestRound = rounds[0] || null;

    const financialsExport = {
      exportId: `exp_${uuidv4()}`,
      exportedAt: new Date().toISOString(),
      fiscalYear: fiscalYear || new Date().getFullYear(),
      company: {
        companyId: company.companyId,
        name: company.CompanyName,
        fiscalYearEndMonth: company.fiscal_year_end_month || 12,
        reportingCurrency: company.reporting_currency || 'USD'
      },
      financingHighlights: {
        totalRoundsCompleted: rounds.length,
        totalCapitalRaised: totalRaised,
        roundHistory: rounds.map(r => ({
          roundId: r.roundId,
          roundName: r.roundName,
          roundType: r.RoundType,
          amountRaised: r.amountRaised,
          closingDate: r.closingDate || r.date,
          preMoneyValuation: r.preMoneyValuation,
          postMoneyValuation: r.postMoneyValuation,
          pricePerShare: r.pricePerShare,
          isArmsLength: r.isArmsLength,
          isDownRound: r.isDownRound
        }))
      },
      latestFinancingDetails: latestRound ? {
        roundId: latestRound.roundId,
        roundName: latestRound.roundName,
        roundType: latestRound.RoundType,
        amountRaised: latestRound.amountRaised,
        closingDate: latestRound.closingDate || latestRound.date,
        preMoneyValuation: latestRound.preMoneyValuation,
        postMoneyValuation: latestRound.postMoneyValuation,
        pricePerShare: latestRound.pricePerShare,
        fullyDilutedSharesPre: latestRound.fullyDilutedSharesPre,
        fullyDilutedSharesPost: latestRound.fullyDilutedSharesPost
      } : null,
      keyMetrics: {
        note: 'Financial statements data to be populated from financial reporting module'
      }
    };

    // Generate data hash
    financialsExport.dataHash = generateDataHash(financialsExport);

    res.json({
      success: true,
      data: financialsExport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Export transaction history
 * GET /api/v1/valuations/export/:companyId/transactions
 */
exports.exportTransactions = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;

    // Get company
    const company = await Company.findByCompanyId(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Get equity grants with exercise history
    const equityGrants = await EquityGrant.findByCompany(companyId);

    // Collect all exercise transactions
    const exerciseTransactions = [];
    for (const grant of equityGrants) {
      if (grant.exerciseHistory && grant.exerciseHistory.length > 0) {
        for (const exercise of grant.exerciseHistory) {
          exerciseTransactions.push({
            transactionType: 'EXERCISE',
            grantId: grant.grantId,
            grantType: grant.grantType,
            exerciseDate: exercise.exerciseDate,
            sharesExercised: exercise.sharesExercised,
            exercisePrice: exercise.exercisePrice,
            totalCost: exercise.totalCost,
            paymentMethod: exercise.paymentMethod
          });
        }
      }
    }

    // Get material events for transaction context
    const materialEvents = await MaterialEvent.findByCompany(companyId);

    // Filter by date range if provided
    let filteredTransactions = exerciseTransactions;
    let filteredEvents = materialEvents;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      filteredTransactions = exerciseTransactions.filter(t => {
        const txDate = new Date(t.exerciseDate);
        return txDate >= start && txDate <= end;
      });

      filteredEvents = materialEvents.filter(e => {
        const evtDate = new Date(e.eventDate);
        return evtDate >= start && evtDate <= end;
      });
    }

    // Sort by date
    filteredTransactions.sort((a, b) => new Date(b.exerciseDate) - new Date(a.exerciseDate));

    const transactionsExport = {
      exportId: `exp_${uuidv4()}`,
      exportedAt: new Date().toISOString(),
      dateRange: {
        start: startDate || 'all',
        end: endDate || 'all'
      },
      company: {
        companyId: company.companyId,
        name: company.CompanyName
      },
      exerciseTransactions: filteredTransactions,
      materialEvents: filteredEvents.map(e => ({
        eventId: e.eventId,
        eventType: e.eventType,
        eventDate: e.eventDate,
        description: e.description,
        severity: e.severity || e.impactSeverity,
        requires409AUpdate: e.requires409AUpdate || e.triggersValuation,
        status: e.status
      })),
      summary: {
        totalExercises: filteredTransactions.length,
        totalSharesExercised: filteredTransactions.reduce((sum, t) => sum + (t.sharesExercised || 0), 0),
        totalMaterialEvents: filteredEvents.length,
        eventsRequiring409A: filteredEvents.filter(e => e.requires409AUpdate || e.triggersValuation).length
      }
    };

    // Generate data hash
    transactionsExport.dataHash = generateDataHash(transactionsExport);

    res.json({
      success: true,
      data: transactionsExport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Export full 409A package
 * POST /api/v1/valuations/export
 */
exports.exportFullPackage = async (req, res) => {
  try {
    const {
      company_id,
      effective_date,
      export_format = 'JSON',
      include_sections = ['all'],
      recipient,
      password_protect = false
    } = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id is required'
      });
    }

    // Get company
    const company = await Company.findByCompanyId(company_id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    const exportId = `exp_${uuidv4()}`;
    const effectiveDate = effective_date || new Date().toISOString().split('T')[0];

    // Build the full export package
    const exportPackage = {
      metadata: {
        exportId,
        exportedAt: new Date().toISOString(),
        effectiveDate,
        exportFormat: export_format,
        sectionsIncluded: include_sections,
        recipient: recipient ? {
          firmName: recipient.firm_name,
          contactEmail: recipient.contact_email
        } : null,
        passwordProtected: password_protect,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      },
      company: {
        legalStructure: {
          companyId: company.companyId,
          legalName: company.legal_name || company.CompanyName,
          dbaName: company.dba_name,
          entityType: company.entity_type,
          jurisdictionCountry: company.jurisdiction_country,
          jurisdictionState: company.jurisdiction_state,
          taxId: company.TaxID,
          incorporationDate: company.corporationDate
        },
        businessDescription: {
          name: company.CompanyName,
          type: company.CompanyType
        },
        riskFactors: {
          qualifiedSmallBusiness: company.qualified_small_business,
          section1202Eligible: company.section_1202_eligible
        }
      }
    };

    // Get share classes
    const shareClasses = await ShareClass.find({});
    exportPackage.capTable = {
      shareClasses: shareClasses.map(sc => ({
        shareClassId: sc.shareClassId,
        name: sc.name,
        description: sc.description,
        authorizedShares: sc.authorizedShares,
        dilutedShares: sc.dilutedShares,
        ownershipPercentage: sc.ownershipPercentage,
        amountRaised: sc.amountRaised
      })),
      securitiesOutstanding: {
        totalClasses: shareClasses.length,
        totalAuthorized: shareClasses.reduce((sum, sc) => sum + (sc.authorizedShares || 0), 0),
        totalDiluted: shareClasses.reduce((sum, sc) => sum + (sc.dilutedShares || 0), 0)
      }
    };

    // Get equity grants
    const equityGrants = await EquityGrant.findByCompany(company_id);
    const activeGrants = equityGrants.filter(g =>
      ['pending', 'approved', 'active'].includes(g.status)
    );

    exportPackage.optionGrants = activeGrants.map(g => ({
      grantId: g.grantId,
      grantType: g.grantType,
      numberOfShares: g.numberOfShares,
      strikePrice: g.strikePrice,
      grantDate: g.grantDate,
      expirationDate: g.expirationDate,
      status: g.status,
      exercisedShares: g.exercisedShares,
      fmvAtGrant: g.fmvAtGrant || g.fairMarketValueAtGrant,
      fmvSource: g.fmvSource,
      grantVsFmvStatus: g.grantVsFmvStatus,
      vestingSchedule: g.vestingSchedule
    }));

    // Get financing history
    const rounds = await FundraisingRound.findByCompany(company_id, {
      sort: { closingDate: -1, date: -1 }
    });

    exportPackage.financingHistory = rounds.map(r => ({
      roundId: r.roundId,
      roundName: r.roundName,
      roundType: r.RoundType,
      amountRaised: r.amountRaised,
      date: r.date,
      closingDate: r.closingDate,
      boardApprovalDate: r.boardApprovalDate,
      preMoneyValuation: r.preMoneyValuation,
      postMoneyValuation: r.postMoneyValuation,
      pricePerShare: r.pricePerShare,
      fullyDilutedSharesPre: r.fullyDilutedSharesPre,
      fullyDilutedSharesPost: r.fullyDilutedSharesPost,
      equityGiven: r.equityGiven,
      isArmsLength: r.isArmsLength,
      isInsiderRound: r.isInsiderRound,
      isDownRound: r.isDownRound,
      investorCount: r.investors ? r.investors.length : 0
    }));

    // Get material events
    const materialEvents = await MaterialEvent.findByCompany(company_id);
    exportPackage.materialEvents = materialEvents.map(e => ({
      eventId: e.eventId,
      eventType: e.eventType,
      eventDate: e.eventDate,
      description: e.description,
      severity: e.severity || e.impactSeverity,
      requires409AUpdate: e.requires409AUpdate || e.triggersValuation,
      status: e.status,
      resolution: e.resolution
    }));

    // Get prior valuations
    const valuations = await Valuation409A.find({ companyId: company_id });
    exportPackage.priorValuations = valuations.map(v => ({
      valuationId: v.valuationId,
      status: v.status,
      fairMarketValue: v.fairMarketValue,
      valuationMethod: v.valuationMethod,
      effectiveDate: v.effectiveDate,
      expirationDate: v.expirationDate,
      valuationFirm: v.valuationFirm ? {
        name: v.valuationFirm.name,
        contactName: v.valuationFirm.contactName
      } : null
    }));

    // Calculate completeness
    const completeness = calculateCompleteness(exportPackage);
    exportPackage.validation = completeness;

    // Generate data hash for integrity
    exportPackage.metadata.dataHash = generateDataHash(exportPackage);

    // Log the export
    const exportLog = {
      id: exportId,
      company_id,
      exported_at: new Date().toISOString(),
      exported_by: req.user?._id || 'system',
      recipient_firm: recipient?.firm_name || null,
      effective_date: effectiveDate,
      sections_included: include_sections,
      data_hash: exportPackage.metadata.dataHash,
      download_count: 0
    };
    exportLogs.set(exportId, exportLog);

    res.status(201).json({
      success: true,
      data: exportPackage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get export by ID
 * GET /api/v1/valuations/export/:exportId
 */
exports.getExport = async (req, res) => {
  try {
    const { exportId } = req.params;

    const exportLog = exportLogs.get(exportId);
    if (!exportLog) {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }

    res.json({
      success: true,
      data: exportLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate data completeness before export
 * POST /api/v1/valuations/export/validate
 */
exports.validateExportData = async (req, res) => {
  try {
    const { company_id } = req.body;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id is required'
      });
    }

    // Get company
    const company = await Company.findByCompanyId(company_id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Build minimal export data for validation
    const shareClasses = await ShareClass.find({});
    const equityGrants = await EquityGrant.findByCompany(company_id);
    const rounds = await FundraisingRound.findByCompany(company_id);
    const materialEvents = await MaterialEvent.findByCompany(company_id);
    const valuations = await Valuation409A.find({ companyId: company_id });

    const exportData = {
      company,
      capTable: { shareClasses },
      optionGrants: equityGrants,
      financingHistory: rounds,
      materialEvents,
      priorValuations: valuations
    };

    const completeness = calculateCompleteness(exportData);

    res.json({
      success: true,
      data: completeness
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get export requirements checklist
 * GET /api/v1/valuations/export/requirements
 */
exports.getExportRequirements = async (req, res) => {
  try {
    const requirements = {
      sections: [
        {
          name: 'company',
          displayName: 'Company Legal Structure',
          required: true,
          fields: [
            { field: 'entity_type', required: true, description: 'Legal entity type (C_CORP, S_CORP, LLC, etc.)' },
            { field: 'jurisdiction_country', required: true, description: 'Country of incorporation' },
            { field: 'jurisdiction_state', required: true, description: 'State of incorporation (for US companies)' },
            { field: 'legal_name', required: false, description: 'Full legal entity name' },
            { field: 'fiscal_year_end_month', required: true, description: 'Month fiscal year ends' },
            { field: 'reporting_currency', required: true, description: 'Default reporting currency' }
          ]
        },
        {
          name: 'cap_table',
          displayName: 'Cap Table',
          required: true,
          fields: [
            { field: 'share_classes', required: true, description: 'All share classes defined' },
            { field: 'preferred_terms', required: true, description: 'Preferred terms for each preferred class' },
            { field: 'option_pool', required: true, description: 'Option pool size and grants' }
          ]
        },
        {
          name: 'financing',
          displayName: 'Financing History',
          required: true,
          fields: [
            { field: 'round_history', required: true, description: 'All financing rounds documented' },
            { field: 'latest_round_details', required: true, description: 'Latest financing round with valuation data' },
            { field: 'investor_list', required: false, description: 'List of investors per round' }
          ]
        },
        {
          name: 'financials',
          displayName: 'Financial Statements',
          required: true,
          fields: [
            { field: 'income_statements', required: true, description: 'At least 2 years of income statements' },
            { field: 'balance_sheets', required: true, description: 'At least 2 years of balance sheets' },
            { field: 'cash_flow_statements', required: false, description: 'Cash flow statements' },
            { field: 'key_metrics', required: false, description: 'Key financial metrics' }
          ]
        },
        {
          name: 'governance',
          displayName: 'Governance',
          required: true,
          fields: [
            { field: 'board_composition', required: true, description: 'Current board composition' },
            { field: 'material_events', required: true, description: 'Material events tracking' }
          ]
        },
        {
          name: 'prior_valuations',
          displayName: 'Prior Valuations',
          required: false,
          fields: [
            { field: 'valuation_history', required: false, description: 'Previous 409A valuations' },
            { field: 'methodology_summaries', required: false, description: 'Methodology used in prior valuations' }
          ]
        }
      ],
      validationRules: [
        { rule: 'company_legal_complete', description: 'Company legal structure must be complete' },
        { rule: 'cap_table_reconciled', description: 'Cap table must be fully reconciled' },
        { rule: 'preferred_terms_defined', description: 'Preferred terms defined for all preferred classes' },
        { rule: 'financials_history', description: 'At least 2 years of financial history' },
        { rule: 'latest_financing_documented', description: 'Latest financing round documented' },
        { rule: 'board_current', description: 'Board composition current' },
        { rule: 'no_unresolved_events', description: 'No unresolved material events requiring 409A update' }
      ]
    };

    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Download export (tracks download count)
 * GET /api/v1/valuations/export/:exportId/download
 */
exports.downloadExport = async (req, res) => {
  try {
    const { exportId } = req.params;

    const exportLog = exportLogs.get(exportId);
    if (!exportLog) {
      return res.status(404).json({
        success: false,
        error: 'Export not found'
      });
    }

    // Check expiration
    const expiresAt = new Date(exportLog.exported_at);
    expiresAt.setDate(expiresAt.getDate() + 7);
    if (new Date() > expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'Export has expired'
      });
    }

    // Increment download count
    exportLog.download_count++;
    exportLogs.set(exportId, exportLog);

    // In a real implementation, this would fetch the actual export data
    // and return it as a file download
    res.json({
      success: true,
      message: 'Download tracked',
      data: {
        exportId,
        downloadCount: exportLog.download_count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
