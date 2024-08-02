// Import necessary modules and models
const investmentTracker = require('../models/investmentTracker');

// Controller function to create a new investment tracker entry
async function createInvestmentTracker(req, res, next) {
  try {
    // Extract investment tracker data from the request body
    const { TrackID, Company, EquityPercentage, CurrentValue } = req.body;

    // Create a new investment tracker entry
    const investmentTracker = new investmentTracker({
      TrackID,
      Company,
      EquityPercentage,
      CurrentValue,
    });

    // Save the investment tracker entry to the database
    const newInvestmentTracker = await investmentTracker.save();

    // Respond with the newly created investment tracker entry
    res.status(201).json(newInvestmentTracker);
  } catch (error) {
    // Handle errors and pass them to the error handling middleware
    next(error);
  }
}

// Add more controller functions for other routes related to investmentTracker here

module.exports = {
  createInvestmentTracker,
  // Add more controller functions here as needed
};