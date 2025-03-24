/**
 * SPV Management API Controller
 * Feature: OCAE-211: Implement SPV Management API
 * Previously tracked as OCAE-002
 */
const SPV = require('../models/SPV');
const mongoose = require('mongoose');

// Create a new SPV
exports.createSPV = async (req, res) => {
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
};

// Get all SPVs
exports.getSPVs = async (req, res) => {
  try {
    const spvs = await SPV.find();
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs', error: error.message });
  }
};

// Get SPV by ID
exports.getSPVById = async (req, res) => {
  try {
    // Try to find by SPVID first
    let spv = await SPV.findOne({ SPVID: req.params.id });
    
    // If not found, check if it's a valid MongoDB ID and try to find by _id
    if (!spv && mongoose.Types.ObjectId.isValid(req.params.id)) {
      spv = await SPV.findById(req.params.id);
    }
    
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }
    
    res.status(200).json(spv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPV', error: error.message });
  }
};

// Update SPV by ID
exports.updateSPV = async (req, res) => {
  try {
    const { Name, Purpose, Status, ComplianceStatus } = req.body;
    let updatedSPV;
    
    // If it's a valid MongoDB ID, use findByIdAndUpdate
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      updatedSPV = await SPV.findByIdAndUpdate(
        req.params.id,
        { 
          Name, 
          Purpose, 
          Status, 
          ComplianceStatus,
          updatedAt: Date.now()
        },
        { new: true, runValidators: true }
      );
    } else {
      // Otherwise use findOneAndUpdate with SPVID
      updatedSPV = await SPV.findOneAndUpdate(
        { SPVID: req.params.id },
        { 
          Name, 
          Purpose, 
          Status, 
          ComplianceStatus,
          updatedAt: Date.now()
        },
        { new: true, runValidators: true }
      );
    }
    
    if (!updatedSPV) {
      return res.status(404).json({ message: 'SPV not found' });
    }
    
    res.status(200).json(updatedSPV);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update SPV', error: error.message });
  }
};

// Get SPVs by status
exports.getSPVsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    if (!['Active', 'Pending', 'Closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status parameter' });
    }
    
    const spvs = await SPV.find({ Status: status });
    
    if (spvs.length === 0) {
      return res.status(404).json({ message: `No SPVs found with status: ${status}` });
    }
    
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs by status', error: error.message });
  }
};

// Get SPVs by compliance status
exports.getSPVsByComplianceStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    if (!['Compliant', 'NonCompliant', 'PendingReview'].includes(status)) {
      return res.status(400).json({ message: 'Invalid compliance status parameter' });
    }
    
    const spvs = await SPV.find({ ComplianceStatus: status });
    
    if (spvs.length === 0) {
      return res.status(404).json({ message: `No SPVs found with compliance status: ${status}` });
    }
    
    res.status(200).json({ spvs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve SPVs by compliance status', error: error.message });
  }
};

// Get SPVs by parent company ID
exports.getSPVsByParentCompany = async (req, res) => {
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
};

// Delete an SPV by ID
exports.deleteSPV = async (req, res) => {
  try {
    let deletedSPV;
    
    // Check if it's a valid MongoDB ID
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      deletedSPV = await SPV.findByIdAndDelete(req.params.id);
    } else {
      // Otherwise use findOneAndDelete with SPVID
      deletedSPV = await SPV.findOneAndDelete({ SPVID: req.params.id });
    }

    if (!deletedSPV) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    res.status(200).json({ message: 'SPV deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete SPV', error: error.message });
  }
};
