'use strict';

/**
 * Investor Readiness Score Service
 * Issue #651: Public API + lead magnet scoring engine
 *
 * Scores a company 0-100 based on presence and quality of key
 * investor readiness documents. Scoring weights:
 *   - Cap table (25 pts): share classes, equity grants, SAFEs
 *   - Formation docs (20 pts): certificate of incorporation, bylaws
 *   - Financials (20 pts): P&L, balance sheet, bank statements
 *   - Compliance (15 pts): board minutes, IP assignments, shareholder agreements
 *   - 409A valuation (10 pts): current valuation
 *   - Other (10 pts): pitch deck, operating agreement
 */

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

const CATEGORIES = {
  capTable: {
    maxPoints: 25,
    keywords: [
      { label: 'Share classes', terms: ['share class', 'common stock', 'preferred stock', 'class a', 'class b', 'series a', 'series b', 'series seed'] },
      { label: 'Equity grants', terms: ['equity grant', 'stock option', 'option pool', 'vesting', 'esop', 'equity plan'] },
      { label: 'SAFEs / Convertible notes', terms: ['safe', 'convertible note', 'safe note', 'conversion cap', 'discount rate', 'valuation cap'] },
    ],
  },
  formationDocs: {
    maxPoints: 20,
    keywords: [
      { label: 'Certificate of Incorporation', terms: ['certificate of incorporation', 'articles of incorporation', 'charter'] },
      { label: 'Bylaws', terms: ['bylaws', 'by-laws', 'corporate bylaws'] },
    ],
  },
  financials: {
    maxPoints: 20,
    keywords: [
      { label: 'Profit & Loss statement', terms: ['profit and loss', 'p&l', 'income statement', 'revenue', 'cogs', 'net income'] },
      { label: 'Balance sheet', terms: ['balance sheet', 'total assets', 'total liabilities', 'shareholders equity'] },
      { label: 'Bank statements', terms: ['bank statement', 'ending balance', 'account statement'] },
    ],
  },
  compliance: {
    maxPoints: 15,
    keywords: [
      { label: 'Board minutes', terms: ['board minutes', 'board meeting', 'board resolution', 'board consent'] },
      { label: 'IP assignments', terms: ['ip assignment', 'intellectual property assignment', 'invention assignment', 'proprietary information'] },
      { label: 'Shareholder agreements', terms: ['shareholder agreement', 'stockholder agreement', 'drag-along', 'tag-along', 'voting agreement'] },
    ],
  },
  valuation409A: {
    maxPoints: 10,
    keywords: [
      { label: '409A valuation', terms: ['409a', 'fair market value', 'fmv', 'valuation report', 'independent appraisal'] },
    ],
  },
  other: {
    maxPoints: 10,
    keywords: [
      { label: 'Pitch deck', terms: ['pitch deck', 'investor deck', 'fundraising deck', 'market size', 'traction'] },
      { label: 'Operating agreement', terms: ['operating agreement', 'llc agreement', 'member agreement'] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Check if any of the keyword terms appear in the combined text.
 */
function matchesKeyword(combinedText, keyword) {
  return keyword.terms.some(term => combinedText.includes(term));
}

/**
 * Score a single category against a combined text blob from all documents.
 * Returns { earned, maxPoints, matched, missing }.
 */
function scoreCategory(categoryDef, combinedText) {
  const totalKeywords = categoryDef.keywords.length;
  if (totalKeywords === 0) return { earned: 0, maxPoints: categoryDef.maxPoints, matched: [], missing: [] };

  const matched = [];
  const missing = [];

  for (const kw of categoryDef.keywords) {
    if (matchesKeyword(combinedText, kw)) {
      matched.push(kw.label);
    } else {
      missing.push(kw.label);
    }
  }

  const ratio = matched.length / totalKeywords;
  const earned = Math.round(categoryDef.maxPoints * ratio);

  return { earned, maxPoints: categoryDef.maxPoints, matched, missing };
}

/**
 * Build a lowercased, combined text blob from document name + textContent.
 */
function buildCombinedText(documents) {
  return documents
    .map(d => `${(d.name || '')} ${(d.textContent || '')}`)
    .join(' ')
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score an array of user-supplied documents (name + textContent).
 *
 * @param {Array<{name: string, textContent: string}>} documents
 * @returns {{ score, criticalGaps, allGaps, topRecommendations, upgradePrompt, breakdown }}
 */
function scoreDocuments(documents) {
  const combinedText = buildCombinedText(documents);

  const breakdown = {};
  let totalEarned = 0;

  for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
    const catResult = scoreCategory(catDef, combinedText);
    breakdown[catKey] = catResult;
    totalEarned += catResult.earned;
  }

  // Collect all gaps ordered by category weight (highest first)
  const allGaps = [];
  const categoryOrder = ['capTable', 'formationDocs', 'financials', 'compliance', 'valuation409A', 'other'];
  for (const catKey of categoryOrder) {
    const cat = breakdown[catKey];
    for (const label of cat.missing) {
      allGaps.push({ category: catKey, document: label, impact: CATEGORIES[catKey].maxPoints });
    }
  }

  // Sort gaps by impact descending so highest-weight gaps come first
  allGaps.sort((a, b) => b.impact - a.impact);

  const criticalGaps = allGaps.slice(0, 3);

  // Build recommendations based on gaps
  const topRecommendations = allGaps.slice(0, 5).map(gap => {
    return `Upload your ${gap.document} to improve your readiness score (up to ${gap.impact} points for ${gap.category}).`;
  });

  const upgradePrompt =
    'Sign up for OpenCap to get a full readiness report, AI-powered gap analysis, and an investor-ready data room.';

  return {
    score: totalEarned,
    criticalGaps,
    allGaps,
    topRecommendations,
    upgradePrompt,
    breakdown,
  };
}

/**
 * Score based on structured company data from ZeroDB (documents, shareClasses,
 * equityGrants, safes). Converts DB records into the text-based scoring format.
 *
 * @param {{ documents: Array, shareClasses: Array, equityGrants: Array, safes: Array }} companyData
 * @returns {{ score, criticalGaps, allGaps, topRecommendations, upgradePrompt, breakdown }}
 */
function scoreFromCompanyData(companyData) {
  const { documents = [], shareClasses = [], equityGrants = [], safes = [] } = companyData;

  // Convert structured data into pseudo-documents for the text-based scorer
  const syntheticDocs = [];

  // Map DB document records
  for (const doc of documents) {
    syntheticDocs.push({
      name: doc.name || doc.documentType || '',
      textContent: doc.documentType || doc.description || '',
    });
  }

  // Inject structured data as synthetic text
  if (shareClasses.length > 0) {
    syntheticDocs.push({
      name: 'share_classes',
      textContent: `Share classes: ${shareClasses.map(sc => sc.name || sc.className).join(', ')}. Common stock preferred stock.`,
    });
  }

  if (equityGrants.length > 0) {
    syntheticDocs.push({
      name: 'equity_grants',
      textContent: `Equity grants for ${equityGrants.length} recipients. Stock option vesting schedule.`,
    });
  }

  if (safes.length > 0) {
    syntheticDocs.push({
      name: 'safes',
      textContent: `SAFE notes: ${safes.length} outstanding. Valuation cap conversion.`,
    });
  }

  return scoreDocuments(syntheticDocs);
}

module.exports = {
  scoreDocuments,
  scoreFromCompanyData,
  // Exported for testing
  CATEGORIES,
};
