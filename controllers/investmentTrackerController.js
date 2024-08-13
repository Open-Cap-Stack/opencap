const investmentTrackerModel = require('../models/investmentTracker');

async function createInvestmentTracker(req, res, next) {
  try {
    const { TrackID, Company, EquityPercentage, CurrentValue } = req.body;

    const newInvestment = new investmentTrackerModel({
      TrackID,
      Company,
      EquityPercentage,
      CurrentValue,
    });

    const savedInvestment = await newInvestment.save();
    res.status(201).json(savedInvestment);
  } catch (error) {
    console.log(error); // Log the error for debugging
    next(error);
  }
}

module.exports = {
  createInvestmentTracker,
};
