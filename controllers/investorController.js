/**
 * Investor Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Handles CRUD operations for investors using DatabaseAdapter
 * for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');

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
    return res.status(400).json({ error: 'All fields are required' });
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
    res.status(500).json({ error: 'Error creating investor' });
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
      return res.status(404).json({ error: 'Investor not found' });
    }
    res.status(200).json({ investor });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching investor' });
  }
};

/**
 * Get all investors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllInvestors = async (req, res) => {
  try {
    const investors = await databaseAdapter.find('Investor', {}, {});
    res.status(200).json({ investors });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching investors' });
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
    return res.status(400).json({ error: 'All fields are required' });
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
      return res.status(404).json({ error: 'Investor not found' });
    }

    res.status(200).json(investor);
  } catch (error) {
    res.status(500).json({ error: 'Error updating investor' });
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
      return res.status(404).json({ error: 'Investor not found' });
    }

    res.status(200).json({ message: 'Investor deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting investor' });
  }
};
