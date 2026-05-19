/**
 * Investor Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Handles CRUD operations for investors using DatabaseAdapter
 * for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');
const { errorResponse } = require('../middleware/errorResponse');
const { getPlanById } = require('../config/stripe');

// Investor types surfaced in SPV co-investor signals (VC funds & angel syndicates only)
const SPV_SIGNAL_TYPES = ['venture_capital', 'angel', 'Venture Capital', 'Angel'];

async function getCompanyPlanId(companyId) {
  if (!companyId) return 'free';
  try {
    const sub = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });
    return sub?.planId || 'free';
  } catch {
    return 'free';
  }
}

/**
 * Create a new investor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createInvestor = async (req, res) => {
  const {
    investorId,
    investmentAmount,
    equityPercentage,
    investorType,
    relatedFundraisingRound,
  } = req.body;

  if (
    !investorId ||
    !investmentAmount ||
    !equityPercentage ||
    !investorType ||
    !relatedFundraisingRound
  ) {
    return errorResponse(res, 400, 'All fields are required');
  }

  try {
    const investor = await databaseAdapter.create('Investor', {
      investorId,
      investmentAmount,
      equityPercentage,
      investorType,
      relatedFundraisingRound,
    });
    res.status(201).json(investor);
  } catch (error) {
    errorResponse(res, 500, 'Error creating investor', error);
  }
};

/**
 * Get investor by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getInvestorById = async (req, res) => {
  try {
    const investor = await databaseAdapter.findById('Investor', req.params.id);
    if (!investor) {
      return errorResponse(res, 404, 'Investor not found');
    }
    res.status(200).json({ investor });
  } catch (error) {
    errorResponse(res, 500, 'Error fetching investor', error);
  }
};

/**
 * Get all investors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllInvestors = async (req, res) => {
  try {
    // Filter by companyId to prevent cross-tenant data leakage
    const filter = {};
    const companyId = req.query?.companyId || req.user?.companyId;
    if (companyId) {
      filter.companyId = companyId;
    }
    const investors = await databaseAdapter.find('Investor', filter, {});
    res.status(200).json({ investors });
  } catch (error) {
    errorResponse(res, 500, 'Error fetching investors', error);
  }
};

/**
 * Update investor by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateInvestor = async (req, res) => {
  const {
    investorId,
    investmentAmount,
    equityPercentage,
    investorType,
    relatedFundraisingRound,
  } = req.body;

  if (
    !investorId ||
    !investmentAmount ||
    !equityPercentage ||
    !investorType ||
    !relatedFundraisingRound
  ) {
    return errorResponse(res, 400, 'All fields are required');
  }

  try {
    const investor = await databaseAdapter.findByIdAndUpdate(
      'Investor',
      req.params.id,
      {
        investorId,
        investmentAmount,
        equityPercentage,
        investorType,
        relatedFundraisingRound,
      },
      { new: true }
    );

    if (!investor) {
      return errorResponse(res, 404, 'Investor not found');
    }

    res.status(200).json(investor);
  } catch (error) {
    errorResponse(res, 500, 'Error updating investor', error);
  }
};

/**
 * Delete investor by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteInvestor = async (req, res) => {
  try {
    const investor = await databaseAdapter.findByIdAndDelete('Investor', req.params.id);

    if (!investor) {
      return errorResponse(res, 404, 'Investor not found');
    }

    res.status(200).json({ message: 'Investor deleted' });
  } catch (error) {
    errorResponse(res, 500, 'Error deleting investor', error);
  }
};

/**
 * Search investors by name — returns only VC funds & angel syndicates.
 * Used by the SPV wizard co-investor typeahead to add deal signals.
 * Requires starter plan or above (investor database is a paid feature).
 *
 * GET /api/v1/investor/search?q=<query>&limit=<n>
 */
exports.searchInvestors = async (req, res) => {
  try {
    // Gate: investor database is not available on the free plan
    const companyId = req.user?.companyId;
    const planId = await getCompanyPlanId(companyId);
    const plan = getPlanById(planId);
    if (!plan?.limits?.investorDatabaseAccess) {
      return res.status(403).json({
        error: 'Investor database access requires a paid plan. Upgrade to Starter or above.',
        code: 'PLAN_FEATURE_RESTRICTED',
        requiredPlan: 'starter'
      });
    }

    const q = (req.query.q || '').toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    // Only return VC funds and angel syndicates — used for SPV deal signals
    const all = await databaseAdapter.find('Investor', {}, {});
    const investors = Array.isArray(all) ? all : (all.investors ?? []);

    const signalInvestors = investors.filter((inv) =>
      SPV_SIGNAL_TYPES.includes(inv.investorType)
    );

    const filtered = q
      ? signalInvestors.filter((inv) =>
          inv.name?.toLowerCase().includes(q) ||
          inv.email?.toLowerCase().includes(q)
        )
      : signalInvestors;

    res.status(200).json({ investors: filtered.slice(0, limit) });
  } catch (error) {
    errorResponse(res, 500, 'Error searching investors', error);
  }
};

/**
 * Bulk create investors — platform admin seeding endpoint.
 * Used to populate the master VC/angel fund database that paid users search.
 * Restricted to admin role only (internal platform operation).
 *
 * POST /api/v1/investor/bulk
 */
exports.bulkCreateInvestors = async (req, res) => {
  try {
    // Admin-only: this endpoint seeds the platform investor master database
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Investor bulk seeding is restricted to platform administrators.',
        code: 'ADMIN_REQUIRED'
      });
    }

    const { investors } = req.body;
    if (!Array.isArray(investors) || investors.length === 0) {
      return errorResponse(res, 400, 'investors array is required');
    }

    const results = [];
    const errors = [];

    for (const inv of investors) {
      try {
        const created = await databaseAdapter.create('Investor', {
          investorId: inv.investorId || `inv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: inv.name,
          investorType: inv.investorType || 'venture_capital',
          companyId: inv.companyId || 'platform', // 'platform' = global master database entry
          email: inv.email,
          ...inv,
        });
        results.push(created);
      } catch (err) {
        errors.push({ name: inv.name, error: err.message });
      }
    }

    res.status(201).json({ created: results.length, errors });
  } catch (error) {
    errorResponse(res, 500, 'Error bulk creating investors', error);
  }
};
