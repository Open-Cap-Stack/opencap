/**
 * Employee Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Handles CRUD operations for employees using DatabaseAdapter
 * for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');
const { isValidObjectId } = require('../utils/inputSanitizer');

/**
 * Create a new employee
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createEmployee = async (req, res) => {
  try {
    const { EmployeeID, Name, Email } = req.body;

    if (!EmployeeID || !Name || !Email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields: EmployeeID, Name, Email',
      });
    }

    req.body.companyId = req.body.companyId || req.user?.companyId;

    // Check for existing employee with same EmployeeID (explicit duplicate check)
    const existingEmployee = await databaseAdapter.findOne('Employee', { EmployeeID });
    if (existingEmployee) {
      return res.status(400).json({
        error: 'Duplicate key error',
        message: 'Duplicate field: EmployeeID',
      });
    }

    // Check for existing employee with same Email (explicit duplicate check)
    const existingEmail = await databaseAdapter.findOne('Employee', { Email });
    if (existingEmail) {
      return res.status(400).json({
        error: 'Duplicate key error',
        message: 'Duplicate field: Email',
      });
    }

    const employee = await databaseAdapter.create('Employee', req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({
      error: error.code === 11000 ? 'Duplicate key error' : 'Internal server error',
      message: error.code === 11000
        ? `Duplicate field: ${Object.keys(error.keyPattern)[0]}`
        : error.message,
    });
  }
};



/**
 * Get all employees with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEmployees = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const query = {};
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;

    const employees = await databaseAdapter.find('Employee', query, { skip, limit });

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Get employee by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getEmployeeById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid employee ID format'
      });
    }

    const employee = await databaseAdapter.findById('Employee', req.params.id);
    if (!employee) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Employee not found'
      });
    }
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Update employee by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateEmployee = async (req, res) => {
  try {
    // Check for valid ID
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid employee ID format',
      });
    }

    // Check for non-empty update payload
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No data provided for update',
      });
    }

    // Manual validation for nested fields (e.g., EquityOverview, VestingSchedule)
    if (req.body.EquityOverview) {
      const { TotalEquity } = req.body.EquityOverview;

      if (TotalEquity !== undefined && typeof TotalEquity !== 'number') {
        return res.status(400).json({
          error: 'Validation error',
          message: 'TotalEquity must be a number',
        });
      }

      if (TotalEquity === undefined) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'TotalEquity is required in EquityOverview',
        });
      }
    }

    // Perform update using DatabaseAdapter
    const updatedEmployee = await databaseAdapter.findByIdAndUpdate(
      'Employee',
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Employee not found',
      });
    }

    res.status(200).json(updatedEmployee);
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate key error',
        message: `An employee with this ${Object.keys(error.keyPattern)[0]} already exists`,
      });
    }

    // Handle other unexpected errors
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};




/**
 * Delete employee by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteEmployee = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid employee ID format'
      });
    }

    const deletedEmployee = await databaseAdapter.findByIdAndDelete('Employee', req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Employee not found'
      });
    }

    res.status(200).json({
      message: 'Employee deleted successfully',
      data: deletedEmployee
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};