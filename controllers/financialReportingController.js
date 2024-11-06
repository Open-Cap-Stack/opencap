// controllers/financialReportingController.js
const FinancialReport = require("../models/financialReport");

// Controller function to create a new financial report
const createFinancialReport = async (req, res, next) => {
  try {
    // Extract financial report data from the request body
    const { 
      ReportID, 
      Type, 
      Data, 
      TotalRevenue,
      TotalExpenses,
      NetIncome,
      EquitySummary,
      Timestamp 
    } = req.body;

    // Create a new financial report document
    const financialReport = new FinancialReport({
      ReportID,
      Type,
      Data,
      TotalRevenue,
      TotalExpenses,
      NetIncome,
      EquitySummary,
      Timestamp
    });

    // Save the financial report document to the database
    const newFinancialReport = await financialReport.save();

    // Respond with the newly created financial report entry
    res.status(201).json(newFinancialReport);
  } catch (error) {
    // Handle errors and pass them to the error handling middleware
    next(error);
  }
};

module.exports = {
  createFinancialReport
};