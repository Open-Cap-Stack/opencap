// controllers/financialReportAuthController.js
const FinancialReport = require("../models/financialReport");

const METHOD_PERMISSION_MAP = {
  GET: 'read:reports',
  POST: 'create:reports',
  PUT: 'update:reports',
  PATCH: 'update:reports',
  DELETE: 'delete:reports'
};

const checkUserPermissions = async (req, res, next) => {
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
};

const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      const error = new Error('API key is required');
      error.statusCode = 401;
      return next(error);
    }

    // Implement your API key validation logic here
    // This is a placeholder that always succeeds
    req.apiPermissions = ['read:reports'];
    next();
  } catch (error) {
    error.statusCode = 500;
    next(error);
  }
};

const authorizeReportAccess = async (req, res, next) => {
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
};

module.exports = {
  checkUserPermissions,
  validateApiKey,
  authorizeReportAccess
};