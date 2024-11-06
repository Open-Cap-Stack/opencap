// controllers/financialReportingController.js
const FinancialReport = require("../models/financialReport");

// Business Logic Functions
const calculateFinancialMetrics = (reportData) => {
  try {
    const revenue = parseFloat(reportData.TotalRevenue);
    const expenses = parseFloat(reportData.TotalExpenses);
    const reportedNetIncome = parseFloat(reportData.NetIncome);

    const calculatedNetIncome = (revenue - expenses).toFixed(2);
    const isValid = calculatedNetIncome === reportedNetIncome.toFixed(2);

    return {
      isValid,
      calculatedNetIncome,
      error: isValid ? null : 'Net income does not match revenue minus expenses'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error calculating financial metrics'
    };
  }
};

const validateReportingPeriod = (reportData) => {
  try {
    const { Type, Data } = reportData;

    if (Type === 'Annual') {
      const requiredQuarters = ['q1', 'q2', 'q3', 'q4'];
      const hasAllQuarters = requiredQuarters.every(quarter => 
        Data.revenue[quarter] !== undefined && 
        Data.expenses[quarter] !== undefined
      );

      if (!hasAllQuarters) {
        return {
          isValid: false,
          error: 'Annual report must include data for all quarters'
        };
      }
    }

    if (Type === 'Quarterly') {
      const hasQuarterlyData = 
        Object.keys(Data.revenue).length === 1 && 
        Object.keys(Data.expenses).length === 1;

      if (!hasQuarterlyData) {
        return {
          isValid: false,
          error: 'Quarterly report must include data for exactly one quarter'
        };
      }
    }

    return {
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error validating reporting period'
    };
  }
};

const validateFinancialReport = (reportData) => {
  try {
    // Check for required fields
    const requiredFields = [
      'ReportID',
      'Type',
      'Data',
      'TotalRevenue',
      'TotalExpenses',
      'NetIncome',
      'Timestamp'
    ];

    const missingFields = requiredFields.filter(field => !reportData[field]);
    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    // Check for negative values in top-level financial fields
    const financialFields = ['TotalRevenue', 'TotalExpenses', 'NetIncome'];
    const hasNegativeValues = financialFields.some(field => 
      parseFloat(reportData[field]) < 0
    );

    if (hasNegativeValues) {
      return {
        isValid: false,
        error: 'Financial values cannot be negative'
      };
    }

    // Check quarterly data for negative values
    if (reportData.Data) {
      const hasNegativeQuarterlyData = Object.values(reportData.Data).some(category =>
        Object.values(category).some(value => value < 0)
      );

      if (hasNegativeQuarterlyData) {
        return {
          isValid: false,
          error: 'Financial values cannot be negative'
        };
      }
    }

    // Validate financial calculations
    const financialMetrics = calculateFinancialMetrics(reportData);
    if (!financialMetrics.isValid) {
      return financialMetrics;
    }

    // Validate reporting period
    const periodValidation = validateReportingPeriod(reportData);
    if (!periodValidation.isValid) {
      return periodValidation;
    }

    return {
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Error validating financial report'
    };
  }
};

// CRUD Controller Functions
const createFinancialReport = async (req, res, next) => {
  try {
    // Validate the report data before saving
    const validation = validateFinancialReport(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const financialReport = new FinancialReport(req.body);
    const newFinancialReport = await financialReport.save();
    res.status(201).json(newFinancialReport);
  } catch (error) {
    next(error);
  }
};

const getFinancialReport = async (req, res, next) => {
  try {
    const report = await FinancialReport.findOne({ ReportID: req.params.id });
    if (!report) {
      return res.status(404).json({ message: 'Financial report not found' });
    }
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

const listFinancialReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await FinancialReport.find()
      .skip(skip)
      .limit(limit);

    const totalCount = await FinancialReport.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      reports,
      totalCount,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

const updateFinancialReport = async (req, res, next) => {
  try {
    // Validate the update data before applying
    const validation = validateFinancialReport(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const report = await FinancialReport.findOneAndUpdate(
      { ReportID: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Financial report not found' });
    }

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

const deleteFinancialReport = async (req, res, next) => {
  try {
    const report = await FinancialReport.findOneAndDelete({ 
      ReportID: req.params.id 
    });

    if (!report) {
      return res.status(404).json({ message: 'Financial report not found' });
    }

    res.status(200).json({
      message: 'Financial report deleted successfully',
      report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Business Logic Functions
  calculateFinancialMetrics,
  validateReportingPeriod,
  validateFinancialReport,
  
  // CRUD Functions
  createFinancialReport,
  getFinancialReport,
  listFinancialReports,
  updateFinancialReport,
  deleteFinancialReport
};