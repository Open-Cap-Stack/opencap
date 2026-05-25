/**
 * Carta Migration Scorer Service
 * Issue #652: Analyze a Carta export and return migration readiness score
 *
 * Score dimensions:
 * - Stakeholders completeness (25%)
 * - Share classes (20%)
 * - Equity grants (20%)
 * - SAFEs/notes (15%)
 * - Documents (20%)
 */

const DIMENSION_WEIGHTS = {
  stakeholders: 0.25,
  shareClasses: 0.20,
  equityGrants: 0.20,
  safesAndNotes: 0.15,
  documents: 0.20
};

const STAKEHOLDER_REQUIRED_FIELDS = ['name', 'email', 'role', 'shares'];
const SHARE_CLASS_REQUIRED_FIELDS = ['name', 'authorizedShares', 'pricePerShare'];
const EQUITY_GRANT_REQUIRED_FIELDS = ['grantee', 'shares', 'vestingSchedule', 'cliffMonths'];
const SAFE_REQUIRED_FIELDS = ['investor', 'amount', 'valuationCap'];
const DOCUMENT_TYPES = ['incorporation', 'termSheet', 'optionGrant', 'boardConsent', 'stockPurchase'];

/**
 * Compute completeness score for an array of objects against required fields.
 * Returns { score: 0-100, missingFields: [] }
 */
function scoreObjectArray(items, requiredFields) {
  if (!Array.isArray(items) || items.length === 0) {
    return { score: 0, count: 0, missingFields: requiredFields.slice() };
  }

  const missingFieldsSet = new Set();
  let totalFieldScore = 0;

  for (const item of items) {
    let presentFields = 0;
    for (const field of requiredFields) {
      if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
        presentFields++;
      } else {
        missingFieldsSet.add(field);
      }
    }
    totalFieldScore += presentFields / requiredFields.length;
  }

  const avgCompleteness = totalFieldScore / items.length;
  // Bonus for having multiple records (up to 20% extra)
  const countBonus = Math.min(0.2, (items.length - 1) * 0.05);
  const rawScore = Math.min(1, avgCompleteness + countBonus);

  return {
    score: Math.round(rawScore * 100),
    count: items.length,
    missingFields: Array.from(missingFieldsSet)
  };
}

/**
 * Score the documents dimension — checks both quantity and type variety
 */
function scoreDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return { score: 0, count: 0, missingFields: ['documents'] };
  }

  const presentTypes = new Set(documents.map(d => d.type).filter(Boolean));
  const typeVarietyRatio = presentTypes.size / DOCUMENT_TYPES.length;
  const countScore = Math.min(1, documents.length / 5); // 5+ docs = full count score
  const rawScore = (typeVarietyRatio * 0.6 + countScore * 0.4);

  const missingTypes = DOCUMENT_TYPES.filter(t => !presentTypes.has(t));

  return {
    score: Math.round(rawScore * 100),
    count: documents.length,
    missingFields: missingTypes.length > 0 ? missingTypes.map(t => `document type: ${t}`) : []
  };
}

/**
 * Map numeric score to readiness label
 */
function getReadinessLabel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Analyze a Carta export and return migration readiness score.
 *
 * @param {Object} exportData - Carta export data
 * @param {Array} [exportData.stakeholders]
 * @param {Array} [exportData.shareClasses]
 * @param {Array} [exportData.equityGrants]
 * @param {Array} [exportData.safes]
 * @param {Array} [exportData.documents]
 * @returns {Object} { overallScore, readinessLabel, dimensions }
 */
function analyzeExport(exportData) {
  const data = exportData || {};

  const dimensions = {
    stakeholders: scoreObjectArray(data.stakeholders, STAKEHOLDER_REQUIRED_FIELDS),
    shareClasses: scoreObjectArray(data.shareClasses, SHARE_CLASS_REQUIRED_FIELDS),
    equityGrants: scoreObjectArray(data.equityGrants, EQUITY_GRANT_REQUIRED_FIELDS),
    safesAndNotes: scoreObjectArray(data.safes, SAFE_REQUIRED_FIELDS),
    documents: scoreDocuments(data.documents)
  };

  const overallScore = Math.round(
    dimensions.stakeholders.score * DIMENSION_WEIGHTS.stakeholders +
    dimensions.shareClasses.score * DIMENSION_WEIGHTS.shareClasses +
    dimensions.equityGrants.score * DIMENSION_WEIGHTS.equityGrants +
    dimensions.safesAndNotes.score * DIMENSION_WEIGHTS.safesAndNotes +
    dimensions.documents.score * DIMENSION_WEIGHTS.documents
  );

  return {
    overallScore,
    readinessLabel: getReadinessLabel(overallScore),
    dimensions
  };
}

module.exports = { analyzeExport };
