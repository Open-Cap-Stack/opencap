const express = require('express');
const SPV = require('../models/SPV');
const router = express.Router();
const mongoose = require('mongoose');

// POST /api/spvs - Create a new SPV
router.post('/', async (req, res) => {
  try {
    const { SPVID, Name, Purpose, CreationDate, Status, ParentCompanyID, ComplianceStatus } = req.body;

    if (!SPVID || !Name || !Purpose || !CreationDate || !Status || !ParentCompanyID || !ComplianceStatus) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newSPV = new SPV({
      SPVID,
      Name,
      Purpose,
      CreationDate,
      Status,
      ParentCompanyID,
      ComplianceStatus,
    });

    const savedSPV = await newSPV.save();
    res.status(201).json(savedSPV);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create SPV', error: error.message });
  }
});

// GET /api/spvs - Get all SPVs
router.get('/', async (req, res) => {
  try {
    const spvs = await SPV.find();
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs', error: error.message });
  }
});

// GET /api/spvs/status/:status - Get SPVs by status
router.get('/status/:status', async (req, res) => {
  try {
    const status = req.params.status;
    const spvs = await SPV.find({ Status: status });
    
    if (spvs.length === 0) {
      return res.status(404).json({ message: `No SPVs found with status: ${status}` });
    }
    
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs by status', error: error.message });
  }
});

// GET /api/spvs/compliance/:status - Get SPVs by compliance status
router.get('/compliance/:status', async (req, res) => {
  try {
    const complianceStatus = req.params.status;
    const spvs = await SPV.find({ ComplianceStatus: complianceStatus });
    
    if (spvs.length === 0) {
      return res.status(404).json({ message: `No SPVs found with compliance status: ${complianceStatus}` });
    }
    
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs by compliance status', error: error.message });
  }
});

// GET /api/spvs/parent/:id - Get SPVs by parent company ID
router.get('/parent/:id', async (req, res) => {
  try {
    const parentId = req.params.id;
    const spvs = await SPV.find({ ParentCompanyID: parentId });
    
    if (spvs.length === 0) {
      return res.status(404).json({ message: `No SPVs found for parent company: ${parentId}` });
    }
    
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs by parent company', error: error.message });
  }
});

// GET /api/spvs/:id - Get an SPV by ID
router.get('/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid SPV ID format' });
    }

    const spv = await SPV.findById(req.params.id);
    
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }
    
    res.status(200).json(spv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPV', error: error.message });
  }
});

// PUT /api/spvs/:id - Update an SPV by ID
router.put('/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid SPV ID format' });
    }
    
    // Prevent SPVID from being updated (it's the unique identifier)
    if (req.body.SPVID) {
      delete req.body.SPVID;
    }
    
    const updatedSPV = await SPV.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedSPV) {
      return res.status(404).json({ message: 'SPV not found' });
    }
    
    res.status(200).json(updatedSPV);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update SPV', error: error.message });
  }
});

// DELETE /api/spvs/:id - Delete an SPV by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedSPV = await SPV.findByIdAndDelete(req.params.id);

    if (!deletedSPV) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    res.status(200).json({ message: 'SPV deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete SPV', error: error.message });
  }
});

module.exports = router;
