const express = require('express');
const mongoose = require('mongoose');
const ComplianceCheck = require('../models/ComplianceCheck');
const router = express.Router();

// Create a new compliance check
router.post('/', async (req, res) => {
  try {
    const { CheckID } = req.body;

    if (!CheckID) {
      return res.status(400).json({
        message: 'Failed to create compliance check',
        error: 'CheckID is required'
      });
    }

    // Check for existing compliance check
    const existingCheck = await ComplianceCheck.findOne({ CheckID });
    if (existingCheck) {
      return res.status(400).json({
        message: 'A compliance check with this CheckID already exists'
      });
    }

    const complianceCheck = new ComplianceCheck(req.body);
    const savedCheck = await complianceCheck.save();
    
    res.status(201).json(savedCheck);
  } catch (error) {
    console.error('Create compliance check error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Failed to create compliance check',
        error: error.message
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A compliance check with this CheckID already exists'
      });
    }

    // Handle other errors
    res.status(500).json({
      message: 'Failed to create compliance check',
      error: error.message
    });
  }
});

// Get all compliance checks
router.get('/', async (req, res) => {
  try {
    const checks = await ComplianceCheck.find().sort({ Timestamp: -1 }).exec();
    res.status(200).json({
      success: true,
      complianceChecks: checks,
    });
  } catch (error) {
    console.error('Database error occurred while fetching compliance checks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance checks',
      error: error.message,
    });
  }
});

// Add a route to find non-compliant checks - MOVED BEFORE :id ROUTES TO PREVENT ROUTE MATCHING ISSUES
router.get('/non-compliant', async (req, res) => {
  try {
    const nonCompliantChecks = await ComplianceCheck.findNonCompliant();
    res.status(200).json({ complianceChecks: nonCompliantChecks });
  } catch (error) {
    console.error('Fetch non-compliant checks error:', error);
    res.status(500).json({
      message: 'Failed to retrieve non-compliant checks',
      error: error.message
    });
  }
});

// Get compliance check by ID - New Endpoint
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid compliance check ID format'
      });
    }

    const complianceCheck = await ComplianceCheck.findById(id);
    if (!complianceCheck) {
      return res.status(404).json({
        message: 'Compliance check not found'
      });
    }

    res.status(200).json(complianceCheck);
  } catch (error) {
    console.error('Get compliance check by ID error:', error);
    res.status(500).json({
      message: 'Failed to retrieve compliance check',
      error: error.message
    });
  }
});

// Update compliance check by ID - New Endpoint
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid compliance check ID format'
      });
    }

    // Check if compliance check exists
    const existingCheck = await ComplianceCheck.findById(id);
    if (!existingCheck) {
      return res.status(404).json({
        message: 'Compliance check not found'
      });
    }

    // Allow updating certain fields but prevent updating CheckID
    if (req.body.CheckID && req.body.CheckID !== existingCheck.CheckID) {
      return res.status(400).json({
        message: 'CheckID cannot be modified'
      });
    }

    try {
      // Update the document with validation
      const updatedCheck = await ComplianceCheck.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );
      
      res.status(200).json(updatedCheck);
    } catch (validationError) {
      // Handle validation errors
      if (validationError.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Validation failed',
          error: validationError.message
        });
      }
      throw validationError; // Rethrow if it's not a validation error
    }
  } catch (error) {
    console.error('Update compliance check error:', error);
    res.status(500).json({
      message: 'Failed to update compliance check',
      error: error.message
    });
  }
});

// Delete a compliance check
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid compliance check ID format'
      });
    }

    const deletedCheck = await ComplianceCheck.findByIdAndDelete(id);
    if (!deletedCheck) {
      return res.status(404).json({
        message: 'Compliance check not found'
      });
    }

    res.status(200).json({
      message: 'Compliance check deleted',
      deletedCheck
    });
  } catch (error) {
    console.error('Delete compliance check error:', error);
    res.status(500).json({
      message: 'Failed to delete compliance check',
      error: error.message
    });
  }
});

module.exports = router;