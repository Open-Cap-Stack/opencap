// controllers/Company.js
const Company = require('../models/Company');

// Create a new company
exports.createCompany = async (req, res) => {
  try {
    const { companyId, CompanyName, CompanyType, RegisteredAddress, TaxID, corporationDate } = req.body;

    // Check if all required fields are present
    if (!companyId || !CompanyName || !CompanyType || !RegisteredAddress || !TaxID || !corporationDate) {
      return res.status(400).json({ message: 'Invalid company data' });
    }

    const company = new Company({
      companyId,
      CompanyName,
      CompanyType,
      RegisteredAddress,
      TaxID,
      corporationDate,
    });

    const savedCompany = await company.save();
    res.status(201).json(savedCompany);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all companies
exports.getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    if (companies.length === 0) {
      return res.status(404).json({ message: 'No companies found' });
    }
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a company by ID
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a company by ID
exports.updateCompanyById = async (req, res) => {
  try {
    const updatedCompany = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.status(200).json(updatedCompany);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a company by ID
exports.deleteCompanyById = async (req, res) => {
  try {
    const deletedCompany = await Company.findByIdAndDelete(req.params.id);
    if (!deletedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.status(200).json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
