/**
 * FundraisingRound Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Handles CRUD operations for fundraising rounds using DatabaseAdapter
 * for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');

/**
 * Create a new fundraising round
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createFundraisingRound = async (req, res) => {
  try {
    const savedRound = await databaseAdapter.create('FundraisingRound', req.body);
    res.status(201).json(savedRound);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all fundraising rounds
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getFundraisingRounds = async (req, res) => {
  try {
    const rounds = await databaseAdapter.find('FundraisingRound', {}, {});
    res.status(200).json(rounds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get fundraising round by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getFundraisingRoundById = async (req, res) => {
  try {
    const round = await databaseAdapter.findById('FundraisingRound', req.params.id);
    if (!round) {
      return res.status(404).json({ message: 'Fundraising round not found' });
    }
    res.status(200).json(round);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update fundraising round by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateFundraisingRound = async (req, res) => {
  try {
    const round = await databaseAdapter.findByIdAndUpdate(
      'FundraisingRound',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!round) {
      return res.status(404).json({ message: 'Fundraising round not found' });
    }
    res.status(200).json(round);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete fundraising round by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteFundraisingRound = async (req, res) => {
  try {
    const round = await databaseAdapter.findByIdAndDelete('FundraisingRound', req.params.id);
    if (!round) {
      return res.status(404).json({ message: 'Fundraising round not found' });
    }
    res.status(200).json({ message: 'Fundraising round deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
