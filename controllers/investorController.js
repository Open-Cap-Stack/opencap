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
