/**
 * Plugin Controller
 * Issue #506: Plugin tool handlers
 *
 * Provides plugin-optimized endpoints for AI chat interfaces.
 * The summary endpoint gives a structured overview of the company's cap table.
 */

const zerodbService = require('../services/zerodbService');

/**
 * GET /api/v1/plugin/summary
 *
 * Returns a structured cap table overview for the authenticated user's company.
 * Designed for AI plugin "what's my cap table status" queries.
 */
const getSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const companyId = req.user.companyId;

    // Fetch data from ZeroDB in parallel
    const [stakeholders, shareClasses, safes, valuations] = await Promise.all([
      zerodbService.queryRows('stakeholders', { companyId }).catch(() => []),
      zerodbService.queryRows('share_classes', { companyId }).catch(() => []),
      zerodbService.queryRows('safes', { companyId }).catch(() => []),
      zerodbService.queryRows('valuations_409a', { companyId }).catch(() => [])
    ]);

    // Calculate total authorized shares across all share classes
    const totalAuthorizedShares = (shareClasses || []).reduce((sum, sc) => {
      const data = sc.row_data || sc;
      return sum + (data.authorized_shares || data.authorizedShares || 0);
    }, 0);

    // Find the latest 409A valuation
    const sortedValuations = (valuations || []).sort((a, b) => {
      const dateA = (a.row_data || a).effectiveDate || (a.row_data || a).createdAt || '';
      const dateB = (b.row_data || b).effectiveDate || (b.row_data || b).createdAt || '';
      return dateB.localeCompare(dateA);
    });
    const latestValuation = sortedValuations.length > 0
      ? (sortedValuations[0].row_data || sortedValuations[0])
      : null;

    // Count open SAFEs
    const openSafes = (safes || []).filter(s => {
      const data = s.row_data || s;
      return data.status === 'OPEN' || data.status === 'open';
    });

    // Sum total SAFE investment
    const totalSafeInvestment = openSafes.reduce((sum, s) => {
      const data = s.row_data || s;
      return sum + (data.investment_amount || data.investmentAmount || 0);
    }, 0);

    return res.status(200).json({
      companyId,
      stakeholders: {
        total: (stakeholders || []).length,
        byType: groupByType(stakeholders || [])
      },
      shareClasses: {
        total: (shareClasses || []).length,
        totalAuthorizedShares
      },
      safes: {
        total: (safes || []).length,
        open: openSafes.length,
        totalInvestment: totalSafeInvestment
      },
      latestValuation: latestValuation ? {
        fairMarketValue: latestValuation.fairMarketValue || latestValuation.fmv,
        effectiveDate: latestValuation.effectiveDate,
        status: latestValuation.status
      } : null,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Plugin] Summary error:', error.message);
    return res.status(500).json({ error: 'Failed to generate cap table summary' });
  }
};

/**
 * Groups stakeholders by their type field.
 */
function groupByType(stakeholders) {
  const groups = {};
  for (const s of stakeholders) {
    const data = s.row_data || s;
    const type = data.type || 'UNKNOWN';
    groups[type] = (groups[type] || 0) + 1;
  }
  return groups;
}

module.exports = {
  getSummary
};
