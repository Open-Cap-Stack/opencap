const express = require('express');
const ComplianceCheck = require('../models/ComplianceCheck');
const router = express.Router();

// Create a new compliance check
router.post('/', async (req, res) => {
  try {
    // First check if a document with this CheckID already exists
    const existingCheck = await ComplianceCheck.findOne({ CheckID: req.body.CheckID });
    if (existingCheck) {
      return res.status(400).json({
        message: 'Failed to create compliance check',
        error: 'A compliance check with this CheckID already exists'
      });
    }

    const complianceCheck = new ComplianceCheck(req.body);
    const savedCheck = await complianceCheck.save();
    res.status(201).json(savedCheck);
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Failed to create compliance check',
        error: error.message
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
    const checks = await ComplianceCheck.find();
    res.status(200).json(checks);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch compliance checks',
      error: error.message
    });
  }
});

// Delete a compliance check
router.delete('/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        message: 'Invalid compliance check ID'
      });
    }

    const check = await ComplianceCheck.findByIdAndDelete(req.params.id);
    if (!check) {
      return res.status(404).json({
        message: 'Compliance check not found'
      });
    }

    res.status(200).json({
      message: 'Compliance check deleted'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete compliance check',
      error: error.message
    });
  }
});

module.exports = router;