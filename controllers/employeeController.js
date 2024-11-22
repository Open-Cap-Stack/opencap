const mongoose = require('mongoose');
const Employee = require('../models/employeeModel');

exports.createEmployee = async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Database connection error',
      });
    }

    const { EmployeeID, Name, Email } = req.body;

    if (!EmployeeID || !Name || !Email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields: EmployeeID, Name, Email',
      });
    }

    const newEmployee = new Employee(req.body);
    const validationError = newEmployee.validateSync();
    if (validationError) {
      return res.status(400).json({
        error: 'Validation error',
        message: validationError.message,
      });
    }

    const employee = await newEmployee.save();
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



exports.getEmployees = async (req, res) => {
  try {
    if (!mongoose.connection.readyState) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Database connection error'
      });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const employees = await Employee.find()
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Invalid employee ID format'
      });
    }

    if (!mongoose.connection.readyState) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Database connection error'
      });
    }

    const employee = await Employee.findById(req.params.id);
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

exports.updateEmployee = async (req, res) => {
  try {
    // Check for valid ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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
      const { TotalEquity, VestedEquity, UnvestedEquity } = req.body.EquityOverview;

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

    // Perform update
    const updatedEmployee = await Employee.findByIdAndUpdate(
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




exports.deleteEmployee = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Invalid employee ID format'
      });
    }

    if (!mongoose.connection.readyState) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Database connection error'
      });
    }

    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
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