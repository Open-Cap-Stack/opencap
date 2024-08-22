const express = require('express');
const SPV = require('../models/SPV');
const router = express.Router();

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
