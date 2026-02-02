/**
 * Investment Tracker Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');

const MODEL_NAME = 'InvestmentTracker';

async function trackInvestment(req, res, next) {
  try {
    const { TrackID, Company, EquityPercentage, CurrentValue } = req.body;

    if (!TrackID || !Company || !EquityPercentage || !CurrentValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const investmentData = {
      TrackID,
      Company,
      EquityPercentage,
      CurrentValue,
    };

    const savedInvestment = await databaseAdapter.create(MODEL_NAME, investmentData);
    res.status(201).json(savedInvestment);
  } catch (error) {
    console.log(error); // Log the error for debugging
    next(error);
  }
}

module.exports = {
  trackInvestment,
};
