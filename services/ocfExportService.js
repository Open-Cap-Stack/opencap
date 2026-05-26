'use strict';

/**
 * OCF Export Service
 * Issue #637: Map OpenCap Stack aggregate models to OCF (Open Cap Table Format)
 * event-sourcing schema.
 *
 * OCF spec reference: https://open-cap-table-coalition.github.io/
 */

const Company = require('../models/Company');
const Stakeholder = require('../models/Stakeholder');
const ShareClass = require('../models/ShareClass');
const EquityGrant = require('../models/EquityGrant');
const SAFE = require('../models/SAFE');
const Valuation409A = require('../models/Valuation409A');

// Roles that map to INSTITUTION rather than INDIVIDUAL in OCF
const INSTITUTION_ROLES = ['investor', 'venture_capitalist'];

// ---------------------------------------------------------------------------
// Individual Mappers
// ---------------------------------------------------------------------------

/**
 * Map an OpenCap Company record to an OCF Issuer object.
 * @param {Object} company - Company model record
 * @returns {Object} OCF Issuer
 */
function mapIssuer(company) {
  const issuer = {
    id: company.companyId,
    object_type: 'ISSUER',
    legal_name: company.CompanyName,
    formation_date: company.corporationDate || undefined,
    country_of_formation: 'US',
  };

  if (company.stateOfIncorporation) {
    issuer.state_of_formation = company.stateOfIncorporation;
  }

  if (company.TaxID || company.ein) {
    issuer.tax_ids = [
      {
        tax_id: company.ein || company.TaxID,
        country: 'US',
      },
    ];
  }

  if (company.RegisteredAddress) {
    issuer.address = { address_line_1: company.RegisteredAddress };
  }

  return issuer;
}

/**
 * Map an OpenCap Stakeholder to an OCF Stakeholder object.
 * @param {Object} sh - Stakeholder model record
 * @returns {Object} OCF Stakeholder
 */
function mapStakeholder(sh) {
  const isInstitution = INSTITUTION_ROLES.includes(sh.role);

  const ocf = {
    id: sh.stakeholderId,
    object_type: 'STAKEHOLDER',
    stakeholder_type: isInstitution ? 'INSTITUTION' : 'INDIVIDUAL',
    name: { legal_name: sh.name },
    contact_info: { email: sh.email },
  };

  if (sh.phone) {
    ocf.contact_info.phone = sh.phone;
  }

  if (sh.address) {
    ocf.addresses = [
      {
        address_line_1: sh.address.street || '',
        city: sh.address.city || '',
        state_province: sh.address.state || '',
        postal_code: sh.address.zipCode || '',
        country: sh.address.country || 'USA',
      },
    ];
  }

  return ocf;
}

/**
 * Map an OpenCap ShareClass to an OCF StockClass object.
 * @param {Object} sc - ShareClass model record
 * @returns {Object} OCF StockClass
 */
function mapShareClass(sc) {
  const ocf = {
    id: sc.shareClassId,
    object_type: 'STOCK_CLASS',
    name: sc.name,
    class_type: (sc.classType || 'common').toUpperCase(),
    shares_authorized: sc.authorizedShares,
    shares_issued: sc.issuedShares || sc.outstandingShares || 0,
    par_value: {
      amount: String(sc.parValue != null ? sc.parValue : 0),
      currency: 'USD',
    },
    price_per_share: {
      amount: String(sc.pricePerShare != null ? sc.pricePerShare : 0),
      currency: 'USD',
    },
    votes_per_share: sc.votesPerShare != null ? sc.votesPerShare : 1,
  };

  // Preferred-specific terms
  if (sc.classType === 'preferred') {
    if (sc.liquidationPreference != null) {
      ocf.liquidation_preference_multiple = sc.liquidationPreference;
    }
    if (sc.participationCap != null) {
      ocf.participation_cap_multiple = sc.participationCap;
    }
    if (sc.seniorityRank != null) {
      ocf.seniority = sc.seniorityRank;
    }
    if (sc.conversionRatio != null) {
      ocf.conversion_rights = [
        {
          conversion_mechanism: {
            type: 'RATIO_CONVERSION',
            ratio: {
              numerator: sc.conversionRatio,
              denominator: 1,
            },
          },
        },
      ];
    }
  }

  return ocf;
}

/**
 * Extract date portion (YYYY-MM-DD) from an ISO string.
 * @param {string|Date} dateVal
 * @returns {string|undefined}
 */
function toDateOnly(dateVal) {
  if (!dateVal) return undefined;
  const s = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
  return s.substring(0, 10);
}

/**
 * Map an OpenCap EquityGrant to an OCF StockIssuance transaction.
 * @param {Object} grant - EquityGrant model record
 * @returns {Object} OCF TX_STOCK_ISSUANCE
 */
function mapEquityGrant(grant) {
  const ocf = {
    id: grant.grantId,
    object_type: 'TX_STOCK_ISSUANCE',
    security_id: grant.grantId,
    custom_id: grant.grantId,
    date: toDateOnly(grant.grantDate),
    stakeholder_id: grant.employeeId,
    quantity: grant.numberOfShares,
    share_price: {
      amount: String(grant.strikePrice != null ? grant.strikePrice : 0),
      currency: 'USD',
    },
  };

  if (grant.equityPlanId) {
    ocf.stock_plan_id = grant.equityPlanId;
  }

  // Map grant type for options
  if (['ISO', 'NSO'].includes(grant.grantType)) {
    ocf.option_grant_type = grant.grantType;
  }

  // Vesting conditions
  if (grant.vestingSchedule) {
    const vs = grant.vestingSchedule;
    ocf.vesting_conditions = [
      {
        cliff_months: vs.cliffMonths || 0,
        vesting_period_months: vs.vestingPeriodMonths || 0,
        vesting_frequency: vs.vestingFrequency || 'monthly',
        vesting_start_date: toDateOnly(vs.vestingStartDate),
      },
    ];
  }

  return ocf;
}

/**
 * Map an OpenCap SAFE to an OCF ConvertibleIssuance transaction.
 * @param {Object} safe - SAFE model record
 * @returns {Object} OCF TX_CONVERTIBLE_ISSUANCE
 */
function mapSAFE(safe) {
  const ocf = {
    id: safe.safeId,
    object_type: 'TX_CONVERTIBLE_ISSUANCE',
    security_id: safe.safeId,
    date: toDateOnly(safe.fundedAt || safe.signedAt || safe.createdAt),
    stakeholder_id: safe.investorId,
    investment_amount: {
      amount: String(safe.investmentAmount || 0),
      currency: safe.currency || 'USD',
    },
    convertible_type: 'SAFE',
  };

  // Build conversion triggers
  const triggers = [];
  const trigger = { type: 'QUALIFIED_FINANCING' };

  if (safe.valuationCap) {
    trigger.conversion_valuation_cap = {
      amount: String(safe.valuationCap),
      currency: safe.currency || 'USD',
    };
  }
  if (safe.discountRate) {
    trigger.conversion_discount = safe.discountRate;
  }
  triggers.push(trigger);
  ocf.conversion_triggers = triggers;

  if (safe.proRataRights != null) {
    ocf.pro_rata_rights = safe.proRataRights;
  }

  return ocf;
}

/**
 * Map an OpenCap Valuation409A to an OCF Valuation object.
 * @param {Object} val - Valuation409A model record
 * @returns {Object} OCF Valuation
 */
function mapValuation(val) {
  const ocf = {
    id: val.valuationId,
    object_type: 'VALUATION',
    price_per_share: {
      amount: String(val.fairMarketValue),
      currency: 'USD',
    },
    effective_date: toDateOnly(val.effectiveDate),
    valuation_type: '409A',
  };

  if (val.valuationFirm && val.valuationFirm.name) {
    ocf.provider = val.valuationFirm.name;
  }

  if (val.boardApproval && val.boardApproval.approvedAt) {
    ocf.board_approval_date = toDateOnly(val.boardApproval.approvedAt);
  }

  if (val.valuationMethod) {
    ocf.method = val.valuationMethod;
  }

  if (val.expirationDate) {
    ocf.expiration_date = toDateOnly(val.expirationDate);
  }

  return ocf;
}

// ---------------------------------------------------------------------------
// Main Export Function
// ---------------------------------------------------------------------------

/**
 * Export a company's cap table data as an OCF (Open Cap Table Format) package.
 * @param {string} companyId - The company to export
 * @returns {Promise<{ocfPackage: Object, stats: Object}>}
 */
async function exportToOCF(companyId) {
  // Fetch company (required)
  const company = await Company.findByCompanyId(companyId);
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  // Fetch all related records in parallel
  const [stakeholders, shareClasses, equityGrants, safes, valuations] =
    await Promise.all([
      Stakeholder.findByCompany(companyId),
      ShareClass.findByCompany(companyId),
      EquityGrant.findByCompany(companyId),
      SAFE.findByCompany(companyId),
      Valuation409A.findByCompany(companyId),
    ]);

  // Map to OCF objects
  const issuer = mapIssuer(company);
  const ocfStakeholders = (stakeholders || []).map(mapStakeholder);
  const ocfStockClasses = (shareClasses || []).map(mapShareClass);

  // Transactions combine equity grants (stock issuances) and SAFEs (convertible issuances)
  const stockIssuances = (equityGrants || []).map(mapEquityGrant);
  const convertibleIssuances = (safes || []).map(mapSAFE);
  const transactions = [...stockIssuances, ...convertibleIssuances];

  const ocfValuations = (valuations || []).map(mapValuation);

  const ocfPackage = {
    ocfVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    issuer,
    stakeholders: ocfStakeholders,
    stockClasses: ocfStockClasses,
    transactions,
    valuations: ocfValuations,
  };

  const stats = {
    stakeholderCount: ocfStakeholders.length,
    stockClassCount: ocfStockClasses.length,
    transactionCount: transactions.length,
    valuationCount: ocfValuations.length,
  };

  return { ocfPackage, stats };
}

module.exports = {
  exportToOCF,
  mapIssuer,
  mapStakeholder,
  mapShareClass,
  mapEquityGrant,
  mapSAFE,
  mapValuation,
};
