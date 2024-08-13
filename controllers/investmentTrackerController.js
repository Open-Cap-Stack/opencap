const investmentTrackerModel = require('../models/investmentTrackerModel');

async function trackInvestment(req, res, next) {
  try {
    const { TrackID, Company, EquityPercentage, CurrentValue } = req.body;

    if (!TrackID || !Company || !EquityPercentage || !CurrentValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
  trackInvestment,
};
