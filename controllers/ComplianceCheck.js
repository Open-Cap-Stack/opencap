const ComplianceCheck = require('../models/ComplianceCheck');

// Create a new compliance check
exports.createComplianceCheck = async (req, res) => {
  try {
    const { CheckID, SPVID, RegulationType, Status, Details, Timestamp } = req.body;

    if (!CheckID || !SPVID || !RegulationType || !Status || !Timestamp) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newComplianceCheck = new ComplianceCheck({
      CheckID,
      SPVID,
      RegulationType,
      Status,
      Details,
      Timestamp,
    });

    const savedComplianceCheck = await newComplianceCheck.save();
    res.status(201).json(savedComplianceCheck);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create compliance check', error: error.message });
  }
};

// Get all compliance checks
exports.getComplianceChecks = async (req, res) => {
  try {
    const complianceChecks = await ComplianceCheck.find();
    res.status(200).json({ complianceChecks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve compliance checks', error: error.message });
  }
};

// Delete a compliance check by ID
exports.deleteComplianceCheck = async (req, res) => {
  try {
    const deletedComplianceCheck = await ComplianceCheck.findByIdAndDelete(req.params.id);

    if (!deletedComplianceCheck) {
      return res.status(404).json({ message: 'Compliance check not found' });
    }

    res.status(200).json({ message: 'Compliance check deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete compliance check', error: error.message });
  }
};
