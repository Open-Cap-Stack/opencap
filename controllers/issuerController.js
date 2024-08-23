const Issuer = require('../models/issuerModel');

// List all issuers
exports.listIssuers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Pagination parameters
    const issuers = await Issuer.find()
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    res.status(200).json({
      issuers,
      nextPageToken: Buffer.from((Number(page) + 1).toString()).toString('base64'),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving issuers', error });
  }
};

// Get a specific issuer by ID
exports.getIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const issuer = await Issuer.findById(issuerId);
    
    if (!issuer) {
      return res.status(404).json({ message: 'Issuer not found' });
    }

    res.status(200).json({ issuer });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving issuer', error });
  }
};

// Create a new issuer
exports.createIssuer = async (req, res) => {
  try {
    const issuer = new Issuer(req.body);
    await issuer.save();
    res.status(201).json({ message: 'Issuer created successfully', issuer });
  } catch (error) {
    console.log('Error creating issuer:', error); // Debugging statement
    res.status(400).json({ message: 'Error creating issuer', error });
  }
};

// Update an existing issuer
exports.updateIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const issuer = await Issuer.findByIdAndUpdate(issuerId, req.body, { new: true, runValidators: true });
    
    if (!issuer) {
      return res.status(404).json({ message: 'Issuer not found' });
    }

    res.status(200).json({ message: 'Issuer updated successfully', issuer });
  } catch (error) {
    console.log('Error updating issuer:', error); // Debugging statement
    res.status(400).json({ message: 'Error updating issuer', error });
  }
};

// Delete an issuer (soft-deletion or hard-deletion)
exports.deleteIssuer = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const issuer = await Issuer.findByIdAndDelete(issuerId);
    
    if (!issuer) {
      return res.status(404).json({ message: 'Issuer not found' });
    }

    res.status(200).json({ message: 'Issuer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting issuer', error });
  }
};
