const FinancialReport = require("../models/financialReport");
const jwt = require('jsonwebtoken');
const config = require('../config');
const mongoose = require('mongoose');

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
    if (!reportData) {
      return {
        isValid: false,
        error: 'Report data is required for calculation'
      };
    }

    try {
      const revenue = parseFloat(reportData.TotalRevenue);
      const expenses = parseFloat(reportData.TotalExpenses);
      const reportedNetIncome = parseFloat(reportData.NetIncome);

      if (isNaN(revenue) || isNaN(expenses) || isNaN(reportedNetIncome)) {
        return {
          isValid: false,
          error: 'Invalid numerical values provided'
        };
      }

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
        error: `Error calculating financial metrics: ${error.message}`
      };
    }
  }

  static validateReportingPeriod(reportData) {
    if (!reportData || !reportData.Type || !reportData.Data) {
      return {
        isValid: false,
        error: 'Missing required reporting period data'
      };
    }

    try {
      const { Type, Data } = reportData;

      if (!Data.revenue || !Data.expenses) {
        return {
          isValid: false,
          error: 'Missing revenue or expenses data'
        };
      }

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
      } else if (Type === 'Quarterly') {
        const hasQuarterlyData = 
          Object.keys(Data.revenue).length === 1 && 
          Object.keys(Data.expenses).length === 1;

        if (!hasQuarterlyData) {
          return {
            isValid: false,
            error: 'Quarterly report must include data for exactly one quarter'
          };
        }
      } else {
        return {
          isValid: false,
          error: 'Invalid report type. Must be either Annual or Quarterly'
        };
      }

      return {
        isValid: true,
        error: null
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Error validating reporting period: ${error.message}`
      };
    }
  }

  static validateFinancialReport(reportData) {
    if (!reportData) {
      return {
        isValid: false,
        error: 'Report data is required'
      };
    }

    try {
      // Check required fields
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

      // Check negative values in financial fields
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

      // Validate type-specific requirements
      const periodValidation = this.validateReportingPeriod(reportData);
      if (!periodValidation.isValid) return periodValidation;

      // Validate calculations
      const financialMetrics = this.calculateFinancialMetrics(reportData);
      if (!financialMetrics.isValid) return financialMetrics;

      return {
        isValid: true,
        error: null
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  static async checkUserPermissions(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        const error = new Error('User not authenticated');
        error.statusCode = 401;
        return next(error);
      }

      const requiredPermission = METHOD_PERMISSION_MAP[req.method];
      if (!requiredPermission) {
        const error = new Error('Invalid HTTP method');
        error.statusCode = 405;
        return next(error);
      }

      if (user.role === 'admin') return next();

      if (!user.permissions?.includes(requiredPermission)) {
        const error = new Error('Insufficient permissions');
        error.statusCode = 403;
        return next(error);
      }

      next();
    } catch (error) {
      error.statusCode = error.statusCode || 500;
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

      if (!config.JWT_SECRET) {
        const error = new Error('JWT configuration error');
        error.statusCode = 500;
        return next(error);
      }

      try {
        const decoded = jwt.verify(apiKey, config.JWT_SECRET);
        if (!decoded.permissions || !Array.isArray(decoded.permissions)) {
          const error = new Error('Invalid API key permissions');
          error.statusCode = 401;
          return next(error);
        }
        req.apiPermissions = decoded.permissions;
        next();
      } catch (jwtError) {
        const error = new Error('Invalid API key');
        error.statusCode = 401;
        next(error);
      }
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  }

  static async authorizeReportAccess(req, res, next) {
    try {
      const { id } = req.params;
      const { user } = req;

      if (!user) {
        const error = new Error('User not authenticated');
        error.statusCode = 401;
        return next(error);
      }

      if (!id) {
        const error = new Error('Report ID is required');
        error.statusCode = 400;
        return next(error);
      }

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
      error.statusCode = error.statusCode || 500;
      next(error);
    }
  }

  // CRUD Methods
  static async createFinancialReport(req, res, next) {
    let session;
    try {
      // Check if Mongoose connection is ready and supports transactions
      if (mongoose.connection.readyState === 1 && 
          mongoose.connection.db && 
          mongoose.connection.db.serverConfig && 
          mongoose.connection.db.serverConfig.hasOwnProperty('replset')) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      const validation = this.validateFinancialReport(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }

      const financialReport = new FinancialReport(req.body);
      const newFinancialReport = await financialReport.save({ session });

      if (session) await session.commitTransaction();

      return res.status(201).json(newFinancialReport);
    } catch (error) {
      if (session) await session.abortTransaction();
      next(error);
    } finally {
      if (session) session.endSession();
    }
  }

  static async getFinancialReport(req, res, next) {
    try {
      if (!req.params.id) {
        return res.status(400).json({ message: 'Report ID is required' });
      }

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
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      const reports = await FinancialReport.find()
        .skip(skip)
        .limit(limit)
        .sort({ Timestamp: -1 });

      const totalCount = await FinancialReport.countDocuments();
      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json({
        reports,
        totalCount,
        currentPage: page,
        totalPages,
        limit
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateFinancialReport(req, res, next) {
    let session;
    try {
      // Check if Mongoose connection is ready and supports transactions
      if (mongoose.connection.readyState === 1 && 
          mongoose.connection.db && 
          mongoose.connection.db.serverConfig && 
          mongoose.connection.db.serverConfig.hasOwnProperty('replset')) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      if (!req.params.id) {
        return res.status(400).json({ message: 'Report ID is required' });
      }

      const validation = this.validateFinancialReport(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }

      // Convert Data field to Map if provided as an object
      if (req.body.Data) {
        if (req.body.Data.revenue && !(req.body.Data.revenue instanceof Map)) {
          req.body.Data.revenue = new Map(Object.entries(req.body.Data.revenue));
        }
        if (req.body.Data.expenses && !(req.body.Data.expenses instanceof Map)) {
          req.body.Data.expenses = new Map(Object.entries(req.body.Data.expenses));
        }
      }

      const report = await FinancialReport.findOneAndUpdate(
        { ReportID: req.params.id },
        req.body,
        { 
          new: true, 
          runValidators: true,
          session 
        }
      );

      if (!report) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ message: 'Financial report not found' });
      }

      if (session) await session.commitTransaction();
      res.status(200).json(report);
    } catch (error) {
      if (session) await session.abortTransaction();
      next(error);
    } finally {
      if (session) session.endSession();
    }
  }

  static async deleteFinancialReport(req, res, next) {
    let session;
    try {
      // Check if Mongoose connection is ready and supports transactions
      if (mongoose.connection.readyState === 1 && 
          mongoose.connection.db && 
          mongoose.connection.db.serverConfig && 
          mongoose.connection.db.serverConfig.hasOwnProperty('replset')) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      if (!req.params.id) {
        return res.status(400).json({ message: 'Report ID is required' });
      }

      const report = await FinancialReport.findOneAndDelete(
        { ReportID: req.params.id },
        { session }
      );

      if (!report) {
        if (session) await session.abortTransaction();
        return res.status(404).json({ message: 'Financial report not found' });
      }

      if (session) await session.commitTransaction();
      res.status(200).json({
        message: 'Financial report deleted successfully',
        report
      });
    } catch (error) {
      if (session) await session.abortTransaction();
      next(error);
    } finally {
      if (session) session.endSession();
    }
  }

  static async generateReport(req, res, next) {
    let session;
    try {
      // Check if Mongoose connection is ready and supports transactions
      if (mongoose.connection.readyState === 1 && 
          mongoose.connection.db && 
          mongoose.connection.db.serverConfig && 
          mongoose.connection.db.serverConfig.hasOwnProperty('replset')) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      const validation = this.validateFinancialReport(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }

      const report = await FinancialReport.create([req.body], { session });

      if (session) await session.commitTransaction();
      res.status(201).json(report[0]);
    } catch (error) {
      if (session) await session.abortTransaction();
      next(error);
    } finally {
      if (session) session.endSession();
    }
  }
}

module.exports = {
  calculateFinancialMetrics: FinancialReportController.calculateFinancialMetrics.bind(FinancialReportController),
  validateReportingPeriod: FinancialReportController.validateReportingPeriod.bind(FinancialReportController),
  validateFinancialReport: FinancialReportController.validateFinancialReport.bind(FinancialReportController),
  checkUserPermissions: FinancialReportController.checkUserPermissions.bind(FinancialReportController),
  validateApiKey: FinancialReportController.validateApiKey.bind(FinancialReportController),
  authorizeReportAccess: FinancialReportController.authorizeReportAccess.bind(FinancialReportController),
  createFinancialReport: FinancialReportController.createFinancialReport.bind(FinancialReportController),
  getFinancialReport: FinancialReportController.getFinancialReport.bind(FinancialReportController),
  listFinancialReports: FinancialReportController.listFinancialReports.bind(FinancialReportController),
  updateFinancialReport: FinancialReportController.updateFinancialReport.bind(FinancialReportController),
  deleteFinancialReport: FinancialReportController.deleteFinancialReport.bind(FinancialReportController),
  generateReport: FinancialReportController.generateReport.bind(FinancialReportController)
};
