/**
 * ComplianceCheck Controller
 * Issue #20: Migrate to ZeroDB via DatabaseAdapter
 */
const databaseAdapter = require('../services/databaseAdapter');

// Create a new compliance check
exports.createComplianceCheck = async (req, res) => {
  try {
    const { CheckID, SPVID, RegulationType, Status, Details, Timestamp, LastCheckedBy } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!CheckID) missingFields.push('CheckID');
    if (!SPVID) missingFields.push('SPVID');
    if (!RegulationType) missingFields.push('RegulationType');
    if (!Status) missingFields.push('Status');
    if (!Timestamp) missingFields.push('Timestamp');
    if (!LastCheckedBy) missingFields.push('LastCheckedBy');

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Failed to create compliance check',
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    const complianceData = {
      CheckID,
      SPVID,
      RegulationType,
      Status,
      Details,
      Timestamp,
      LastCheckedBy,
      companyId: req.body.companyId || req.user?.companyId,
    };

    const savedComplianceCheck = await databaseAdapter.create('ComplianceCheck', complianceData);
    res.status(201).json(savedComplianceCheck);
  } catch (error) {
    console.error('Error creating compliance check:', error.message);
    res.status(500).json({
      message: 'Failed to create compliance check',
      error: error.message,
    });
  }
};

// Get all compliance checks
exports.getComplianceChecks = async (req, res) => {
  try {
    const query = {};
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;
    const complianceChecks = await databaseAdapter.find('ComplianceCheck', query);
    res.status(200).json({ complianceChecks });
  } catch (error) {
    console.error('Error retrieving compliance checks:', error.message);
    res.status(500).json({
      message: 'Failed to retrieve compliance checks',
      error: error.message,
    });
  }
};

// Delete a compliance check by ID
exports.deleteComplianceCheck = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedComplianceCheck = await databaseAdapter.findByIdAndDelete('ComplianceCheck', id);

    if (!deletedComplianceCheck) {
      return res.status(404).json({
        message: 'Compliance check not found',
      });
    }

    res.status(200).json({
      message: 'Compliance check deleted',
    });
  } catch (error) {
    console.error('Error deleting compliance check:', error.message);
    res.status(500).json({
      message: 'Failed to delete compliance check',
      error: error.message,
    });
  }
};
