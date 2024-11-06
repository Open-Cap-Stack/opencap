// controllers/financialReportingController.js
const FinancialReport = require("../models/financialReport");
const jwt = require('jsonwebtoken');
const config = require('../config');

// Constants
const METHOD_PERMISSION_MAP = {
  GET: 'read:reports',
  POST: 'create:reports',
  PUT: 'update:reports',
  PATCH: 'update:reports',
  DELETE: 'delete:reports'
};

class FinancialReportController {
  // Business Logic Methods
  static calculateFinancialMetrics(reportData) {
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
  }

  static validateReportingPeriod(reportData) {
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
  }

  static validateFinancialReport(reportData) {
    try {
      // Check required fields
      const requiredFields = [
        'ReportID', 'Type', 'Data', 'TotalRevenue',
        'TotalExpenses', 'NetIncome', 'Timestamp'
      ];

      const missingFields = requiredFields.filter(field => !reportData[field]);
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }

      // Check negative values
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

      // Validate quarterly data
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

      // Validate calculations and period
      const financialMetrics = this.calculateFinancialMetrics(reportData);
      if (!financialMetrics.isValid) return financialMetrics;

      const periodValidation = this.validateReportingPeriod(reportData);
      if (!periodValidation.isValid) return periodValidation;

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
  }

  // Authorization Methods
  static async checkUserPermissions(req, res, next) {
    try {
      const { user } = req;
      const requiredPermission = METHOD_PERMISSION_MAP[req.method];

      if (user.role === 'admin') return next();

      if (!user.permissions.includes(requiredPermission)) {
        const error = new Error('Insufficient permissions');
        error.statusCode = 403;
        return next(error);
      }

      next();
    } catch (error) {
      error.statusCode = 500;
      next(error);
    }
  }

  static async validateApiKey(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        const error = new Error('API key is required');
        error.statusCode = 401;
        return next(error);
      }

      try {
        const decoded = jwt.verify(apiKey, config.JWT_SECRET);
        req.apiPermissions = decoded.permissions;
        next();
      } catch (jwtError) {
        const error = new Error('Invalid API key');
        error.statusCode = 401;
        next(error);
      }
    } catch (error) {
      error.statusCode = 500;
      next(error);
    }
  }

  static async authorizeReportAccess(req, res, next) {
    try {
      const { id } = req.params;
      const { user } = req;

      const report = await FinancialReport.findOne({ ReportID: id });

      if (!report) {
        const error = new Error('Report not found');
        error.statusCode = 404;
        return next(error);
      }

      if (user.role === 'admin') return next();

      if (report.userId !== user.id) {
        const error = new Error('Unauthorized access to report');
        error.statusCode = 403;
        return next(error);
      }

      next();
    } catch (error) {
      error.statusCode = 500;
      next(error);
    }
  }

  // CRUD Methods
  static async createFinancialReport(req, res, next) {
    try {
      const validation = this.validateFinancialReport(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }

      const financialReport = new FinancialReport(req.body);
      const newFinancialReport = await financialReport.save();
      res.status(201).json(newFinancialReport);
    } catch (error) {
      next(error);
    }
  }

  static async getFinancialReport(req, res, next) {
    try {
      const report = await FinancialReport.findOne({ ReportID: req.params.id });
      if (!report) {
        return res.status(404).json({ message: 'Financial report not found' });
      }
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  static async listFinancialReports(req, res, next) {
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
  }

  static async updateFinancialReport(req, res, next) {
    try {
      const validation = this.validateFinancialReport(req.body);
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
  }

  static async deleteFinancialReport(req, res, next) {
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
  }
}

// Export as individual functions to maintain compatibility with existing code
module.exports = {
  calculateFinancialMetrics: FinancialReportController.calculateFinancialMetrics,
  validateReportingPeriod: FinancialReportController.validateReportingPeriod,
  validateFinancialReport: FinancialReportController.validateFinancialReport,
  checkUserPermissions: FinancialReportController.checkUserPermissions,
  validateApiKey: FinancialReportController.validateApiKey,
  authorizeReportAccess: FinancialReportController.authorizeReportAccess,
  createFinancialReport: FinancialReportController.createFinancialReport,
  getFinancialReport: FinancialReportController.getFinancialReport,
  listFinancialReports: FinancialReportController.listFinancialReports,
  updateFinancialReport: FinancialReportController.updateFinancialReport,
  deleteFinancialReport: FinancialReportController.deleteFinancialReport
};