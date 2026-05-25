/**
 * Cap Table Health Scorecard Service
 * Issue #660: Standalone health scorecard for cap table quality
 *
 * Score dimensions (weighted):
 * - Document completeness   20%
 * - OCTA compliance         20%
 * - 409A currency           15%
 * - Stakeholder completeness 15%
 * - Structural cleanliness  15%
 * - SAFE/note status        15%
 */

const DIMENSION_WEIGHTS = {
  documentCompleteness:    0.20,
  octaCompliance:          0.20,
  valuation409ACurrency:   0.15,
  stakeholderCompleteness: 0.15,
  structuralCleanliness:   0.15,
  safeNoteStatus:          0.15
};

// Required document types for a healthy cap table
const REQUIRED_DOCUMENT_TYPES = [
  'articles_of_incorporation',
  'bylaws',
  'stock_plan',
  'shareholder_agreement',
  'board_consents'
];

// Required stakeholder fields for OCTA compliance
const OCTA_STAKEHOLDER_FIELDS = ['stakeholderId', 'name', 'email', 'role', 'sharesOwned', 'shareClass'];
const STAKEHOLDER_PROFILE_FIELDS = ['name', 'email', 'role', 'address', 'taxId'];

/**
 * Score document completeness (presence of required document types).
 */
function scoreDocumentCompleteness(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return { score: 0, presentTypes: [], missingTypes: REQUIRED_DOCUMENT_TYPES };
  }

  const presentTypes = new Set(documents.map(d => d.type).filter(Boolean));
  const missingTypes = REQUIRED_DOCUMENT_TYPES.filter(t => !presentTypes.has(t));
  const coverage = (REQUIRED_DOCUMENT_TYPES.length - missingTypes.length) / REQUIRED_DOCUMENT_TYPES.length;

  return {
    score: Math.round(coverage * 100),
    presentTypes: [...presentTypes],
    missingTypes
  };
}

/**
 * Score OCTA compliance based on stakeholder field completeness and share class integrity.
 */
function scoreOctaCompliance({ stakeholders = [], shareClasses = [] } = {}) {
  if (!stakeholders.length) return { score: 0, issues: ['No stakeholders found'] };

  let totalFieldScore = 0;
  for (const sh of stakeholders) {
    const present = OCTA_STAKEHOLDER_FIELDS.filter(f => sh[f] !== undefined && sh[f] !== null && sh[f] !== '').length;
    totalFieldScore += present / OCTA_STAKEHOLDER_FIELDS.length;
  }

  const avgCompleteness = totalFieldScore / stakeholders.length;
  const shareClassBonus = shareClasses.length > 0 ? 0.1 : 0;
  const rawScore = Math.min(1, avgCompleteness + shareClassBonus);

  return {
    score: Math.round(rawScore * 100),
    stakeholderCount: stakeholders.length,
    shareClassCount: shareClasses.length,
    issues: []
  };
}

/**
 * Score 409A valuation currency (freshness within 12 months).
 */
function score409ACurrency({ lastValuationDate }) {
  if (!lastValuationDate) {
    return { score: 0, monthsOld: null, reason: 'No 409A valuation on record' };
  }

  const ageMs = Date.now() - new Date(lastValuationDate).getTime();
  const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);

  // Linear decay from 100 at 0 months to 0 at 18 months
  const decayedScore = Math.max(0, Math.min(100, 100 - (ageMonths / 18) * 100));

  return {
    score: Math.round(decayedScore),
    monthsOld: parseFloat(ageMonths.toFixed(1)),
    reason: ageMonths > 12 ? 'Valuation is stale (>12 months)' : 'Valuation is current'
  };
}

/**
 * Score stakeholder profile completeness.
 */
function scoreStakeholderCompleteness(stakeholders) {
  if (!Array.isArray(stakeholders) || stakeholders.length === 0) {
    return { score: 0, avgCompleteness: 0 };
  }

  let totalScore = 0;
  for (const sh of stakeholders) {
    const present = STAKEHOLDER_PROFILE_FIELDS.filter(f => sh[f] !== undefined && sh[f] !== null && sh[f] !== '').length;
    totalScore += present / STAKEHOLDER_PROFILE_FIELDS.length;
  }

  const avg = totalScore / stakeholders.length;
  return {
    score: Math.round(avg * 100),
    avgCompleteness: parseFloat(avg.toFixed(2))
  };
}

/**
 * Score structural cleanliness — detect over-issuance, missing authorizations, etc.
 */
function scoreStructuralCleanliness({ shareClasses = [], equityGrants = [] } = {}) {
  if (!shareClasses.length) return { score: 50, issues: ['No share classes defined'] };

  const issues = [];

  for (const sc of shareClasses) {
    const authorized = sc.authorizedShares || 0;
    const issued = sc.issuedShares || 0;
    if (issued > authorized) {
      issues.push(`${sc.name}: issued (${issued}) exceeds authorized (${authorized})`);
    }
  }

  const deduction = issues.length * 25;
  const score = Math.max(0, 100 - deduction);

  return {
    score,
    issues,
    shareClassCount: shareClasses.length
  };
}

/**
 * Score SAFE/note status — completeness of SAFE fields.
 */
function scoreSafeNoteStatus(safes) {
  if (!Array.isArray(safes) || safes.length === 0) {
    // No SAFEs is not a problem
    return { score: 100, count: 0, issues: [] };
  }

  const SAFE_REQUIRED = ['investor', 'amount', 'valuationCap', 'discountRate', 'status'];
  const issues = [];
  let totalScore = 0;

  for (const safe of safes) {
    const present = SAFE_REQUIRED.filter(f => safe[f] !== undefined && safe[f] !== null).length;
    const completeness = present / SAFE_REQUIRED.length;
    totalScore += completeness;
    if (completeness < 1) {
      const missing = SAFE_REQUIRED.filter(f => safe[f] === undefined || safe[f] === null);
      issues.push(`SAFE for ${safe.investor || 'unknown'}: missing ${missing.join(', ')}`);
    }
  }

  const avgCompleteness = totalScore / safes.length;
  return {
    score: Math.round(avgCompleteness * 100),
    count: safes.length,
    issues
  };
}

/**
 * Map numeric score to letter grade.
 */
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Compute a full cap table health scorecard.
 *
 * @param {Object} data
 * @param {string} data.companyId
 * @param {Array}  [data.documents]
 * @param {Array}  [data.stakeholders]
 * @param {Array}  [data.shareClasses]
 * @param {Array}  [data.equityGrants]
 * @param {Array}  [data.safes]
 * @param {string} [data.lastValuationDate]
 * @returns {Object}
 */
function computeHealthScore(data = {}) {
  const {
    companyId,
    documents = [],
    stakeholders = [],
    shareClasses = [],
    equityGrants = [],
    safes = [],
    lastValuationDate = null
  } = data;

  const dimensions = {
    documentCompleteness:    scoreDocumentCompleteness(documents),
    octaCompliance:          scoreOctaCompliance({ stakeholders, shareClasses }),
    valuation409ACurrency:   score409ACurrency({ lastValuationDate }),
    stakeholderCompleteness: scoreStakeholderCompleteness(stakeholders),
    structuralCleanliness:   scoreStructuralCleanliness({ shareClasses, equityGrants }),
    safeNoteStatus:          scoreSafeNoteStatus(safes)
  };

  const overallScore = Math.round(
    Object.entries(DIMENSION_WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + (dimensions[key].score * weight);
    }, 0)
  );

  return {
    companyId,
    overallScore,
    grade: getGrade(overallScore),
    dimensions,
    dimensionWeights: { ...DIMENSION_WEIGHTS },
    computedAt: new Date().toISOString()
  };
}

module.exports = {
  scoreDocumentCompleteness,
  scoreOctaCompliance,
  score409ACurrency,
  scoreStakeholderCompleteness,
  scoreStructuralCleanliness,
  scoreSafeNoteStatus,
  computeHealthScore
};
