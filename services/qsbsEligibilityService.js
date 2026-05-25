/**
 * QSBS Eligibility Service
 * Issue #656: Section 1202 Qualified Small Business Stock eligibility tracking
 *
 * Checks:
 * - C-Corp status (entity type must be C-Corp or corporation)
 * - Gross assets < $50M at issuance
 * - 5-year holding period countdown
 * - Active business (not in excluded industries)
 *
 * Section 1202 exclusion limit: greater of $10M or 10x basis (per taxpayer per company)
 */

const GROSS_ASSETS_THRESHOLD = 50_000_000; // $50M
const HOLDING_PERIOD_YEARS = 5;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;

// Entity types that qualify as C-Corp for QSBS purposes
const CCORP_ENTITY_TYPES = new Set(['c-corp', 'c_corp', 'corporation', 'c-corporation', 'domestic c corporation']);

// Industries excluded from QSBS (Section 1202(e)(3))
const EXCLUDED_INDUSTRIES = new Set([
  'financial-services', 'financial services', 'banking', 'bank', 'insurance',
  'real-estate', 'real estate', 'hotel', 'hotels', 'motel', 'motels',
  'restaurant', 'restaurants', 'hospitality',
  'legal', 'law', 'legal services',
  'health', 'healthcare', 'medical', 'medical services',
  'accounting', 'brokerage', 'farming', 'agriculture', 'mining'
]);

/**
 * Check whether company entity type qualifies as C-Corp for QSBS.
 * @param {{ entityType: string }} data
 * @returns {{ eligible: boolean, reason: string }}
 */
function checkCCorpStatus(data) {
  const entityType = (data?.entityType || '').toLowerCase().trim();
  const eligible = CCORP_ENTITY_TYPES.has(entityType);

  return {
    eligible,
    reason: eligible
      ? 'Entity is a qualifying C-Corporation under IRC § 1202'
      : `Entity type "${data?.entityType}" does not qualify — must be a domestic C-Corporation`
  };
}

/**
 * Check whether gross assets at issuance were ≤ $50M.
 * @param {{ grossAssetsAtIssuance: number }} data
 * @returns {{ eligible: boolean, grossAssetsAtIssuance: number, thresholdAmount: number, reason: string }}
 */
function checkGrossAssetsThreshold(data) {
  const assets = data?.grossAssetsAtIssuance ?? 0;
  const eligible = assets <= GROSS_ASSETS_THRESHOLD;

  return {
    eligible,
    grossAssetsAtIssuance: assets,
    thresholdAmount: GROSS_ASSETS_THRESHOLD,
    reason: eligible
      ? `Gross assets at issuance ($${assets.toLocaleString()}) are within the $50M threshold`
      : `Gross assets at issuance ($${assets.toLocaleString()}) exceed the $50M QSBS threshold`
  };
}

/**
 * Check 5-year holding period for QSBS.
 * @param {{ acquisitionDate: string }} data
 * @returns {{ eligible: boolean, yearsHeld: number, daysUntilEligible: number, eligibilityDate: string }}
 */
function checkHoldingPeriod(data) {
  if (!data?.acquisitionDate) {
    return {
      eligible: false,
      yearsHeld: 0,
      daysUntilEligible: HOLDING_PERIOD_YEARS * DAYS_PER_YEAR,
      eligibilityDate: null,
      reason: 'Acquisition date not provided — cannot determine holding period'
    };
  }

  const acquisitionDate = new Date(data.acquisitionDate);
  const now = new Date();
  const diffDays = (now - acquisitionDate) / MS_PER_DAY;
  const yearsHeld = diffDays / DAYS_PER_YEAR;
  const requiredDays = HOLDING_PERIOD_YEARS * DAYS_PER_YEAR;
  const daysUntilEligible = Math.max(0, Math.round(requiredDays - diffDays));

  const eligibilityDate = new Date(acquisitionDate);
  eligibilityDate.setFullYear(eligibilityDate.getFullYear() + HOLDING_PERIOD_YEARS);

  const eligible = yearsHeld >= HOLDING_PERIOD_YEARS;

  return {
    eligible,
    yearsHeld: parseFloat(yearsHeld.toFixed(2)),
    daysUntilEligible,
    eligibilityDate: eligibilityDate.toISOString().split('T')[0],
    reason: eligible
      ? `Holding period of ${yearsHeld.toFixed(1)} years satisfies the 5-year QSBS requirement`
      : `Holding period ${yearsHeld.toFixed(1)} years — needs ${daysUntilEligible} more days to qualify`
  };
}

/**
 * Check whether business is in a qualifying active business (not excluded by § 1202(e)(3)).
 * @param {{ businessType: string }} data
 * @returns {{ eligible: boolean, businessType: string, reason: string }}
 */
function checkActiveBusiness(data) {
  const businessType = (data?.businessType || '').toLowerCase().trim();
  const isExcluded = EXCLUDED_INDUSTRIES.has(businessType);
  const eligible = !isExcluded;

  return {
    eligible,
    businessType: data?.businessType,
    reason: eligible
      ? `Business type "${data?.businessType}" qualifies as an active business under § 1202`
      : `Business type "${data?.businessType}" is excluded from QSBS eligibility under § 1202(e)(3)`
  };
}

/**
 * Calculate the maximum QSBS exclusion (greater of $10M or 10x adjusted basis).
 * @param {{ sharesAcquired: number, acquisitionPrice: number }} data
 * @returns {number}
 */
function calcExclusionLimit(data) {
  const shares = data?.sharesAcquired ?? 0;
  const price = data?.acquisitionPrice ?? 0;
  const adjustedBasis = shares * price;
  const tenXBasis = adjustedBasis * 10;
  return Math.max(10_000_000, tenXBasis);
}

/**
 * Full QSBS eligibility evaluation for a stakeholder.
 *
 * @param {Object} data
 * @param {string} data.stakeholderId
 * @param {string} data.entityType
 * @param {number} [data.grossAssetsAtIssuance]
 * @param {string} [data.acquisitionDate]
 * @param {string} [data.businessType]
 * @param {number} [data.sharesAcquired]
 * @param {number} [data.acquisitionPrice]
 * @returns {Object}
 */
function evaluateEligibility(data) {
  const checks = {
    cCorp: checkCCorpStatus(data),
    grossAssets: checkGrossAssetsThreshold(data),
    holdingPeriod: checkHoldingPeriod(data),
    activeBusiness: checkActiveBusiness(data)
  };

  const failedChecks = Object.entries(checks)
    .filter(([, check]) => !check.eligible)
    .map(([name]) => name);

  const overallEligible = failedChecks.length === 0;
  const potentialExclusionLimit = overallEligible ? calcExclusionLimit(data) : 0;

  return {
    stakeholderId: data?.stakeholderId,
    overallEligible,
    failedChecks,
    checks,
    potentialExclusionLimit,
    evaluatedAt: new Date().toISOString(),
    notes: overallEligible
      ? `Qualifies for Section 1202 exclusion up to $${potentialExclusionLimit.toLocaleString()}`
      : `Does not qualify for QSBS. Failed: ${failedChecks.join(', ')}`
  };
}

module.exports = {
  checkCCorpStatus,
  checkGrossAssetsThreshold,
  checkHoldingPeriod,
  checkActiveBusiness,
  evaluateEligibility
};
