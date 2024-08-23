const Corporation = require('../models/corporationModel');

// List Corporations with Pagination, Filtering, and Access Control
exports.listCorporations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = search ? { legalName: new RegExp(search, 'i') } : {};
    const corporations = await Corporation.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Corporation.countDocuments(query);

    res.json({
      corporations,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create New Corporation
exports.createCorporation = async (req, res) => {
  try {
    const { id, legalName, doingBusinessAsName, website } = req.body;

    if (!id || !legalName) {
      return res.status(400).json({ message: 'ID and Legal Name are required' });
    }

    const newCorporation = new Corporation({ id, legalName, doingBusinessAsName, website });
    await newCorporation.save();

    res.status(201).json(newCorporation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Corporation Details
exports.updateCorporation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const corporation = await Corporation.findByIdAndUpdate(id, updateData, { new: true });

    if (!corporation) {
      return res.status(404).json({ message: 'Corporation not found' });
    }

    res.json(corporation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Corporation
exports.deleteCorporation = async (req, res) => {
  try {
    const { id } = req.params;

    const corporation = await Corporation.findByIdAndDelete(id);

    if (!corporation) {
      return res.status(404).json({ message: 'Corporation not found' });
    }

    res.json({ message: 'Corporation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
