// controllers/Company.js
// Migrated from MongoDB/Mongoose to ZeroDB
// Issue #16: Migrate Company controller to ZeroDB

const zerodbService = require('../services/zerodbService');

const TABLE_NAME = 'companies';
const VALID_COMPANY_TYPES = ['startup', 'corporation', 'non-profit', 'government'];

/**
 * Validate company data against schema requirements
 * @param {Object} data - Company data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
const validateCompanyData = (data) => {
  const errors = [];
  const { companyId, CompanyName, CompanyType, RegisteredAddress, TaxID, corporationDate } = data;

  if (!companyId) errors.push('companyId is required');
  if (!CompanyName) errors.push('CompanyName is required');
  if (!CompanyType) errors.push('CompanyType is required');
  if (!RegisteredAddress) errors.push('RegisteredAddress is required');
  if (!TaxID) errors.push('TaxID is required');
  if (!corporationDate) errors.push('corporationDate is required');

  if (CompanyType && !VALID_COMPANY_TYPES.includes(CompanyType)) {
    errors.push(`CompanyType must be one of: ${VALID_COMPANY_TYPES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Create a new company
 * @route POST /api/companies
 */
exports.createCompany = async (req, res) => {
  try {
    const { companyId, CompanyName, CompanyType, RegisteredAddress, TaxID, corporationDate } = req.body;

    // Check if all required fields are present
    if (!companyId || !CompanyName || !CompanyType || !RegisteredAddress || !TaxID || !corporationDate) {
      return res.status(400).json({ message: 'Invalid company data' });
    }

    // Validate CompanyType enum
    if (!VALID_COMPANY_TYPES.includes(CompanyType)) {
      return res.status(400).json({
        message: `CompanyType must be one of: ${VALID_COMPANY_TYPES.join(', ')}`
      });
    }

    const now = new Date().toISOString();
    const companyData = {
      companyId,
      CompanyName,
      CompanyType,
      RegisteredAddress,
      TaxID,
      corporationDate,
      createdAt: now,
      updatedAt: now
    };

    // Insert into ZeroDB
    const result = await zerodbService.insertRow(TABLE_NAME, companyData);

    // Return the created company
    const savedCompany = result.rows ? result.rows[0] : result;
    res.status(201).json(savedCompany);
  } catch (error) {
    console.error('Error creating company:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all companies
 * @route GET /api/companies
 */
exports.getAllCompanies = async (req, res) => {
  try {
    // Query all companies from ZeroDB
    const companies = await zerodbService.queryTable(TABLE_NAME, {});

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: 'No companies found' });
    }

    res.status(200).json(companies);
  } catch (error) {
    console.error('Error getting all companies:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a company by ID
 * @route GET /api/companies/:id
 */
exports.getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Query company by ID from ZeroDB
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { _id: id }
    });

    const company = result && result.length > 0 ? result[0] : null;

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error('Error getting company by ID:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a company by ID
 * @route PUT /api/companies/:id
 */
exports.updateCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };

    // Validate CompanyType if provided
    if (updateData.CompanyType && !VALID_COMPANY_TYPES.includes(updateData.CompanyType)) {
      return res.status(400).json({
        message: `CompanyType must be one of: ${VALID_COMPANY_TYPES.join(', ')}`
      });
    }

    // Update in ZeroDB
    await zerodbService.updateRows(TABLE_NAME, { _id: id }, updateData);

    // Fetch the updated company
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { _id: id }
    });

    const updatedCompany = result && result.length > 0 ? result[0] : null;

    if (!updatedCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a company by ID
 * @route DELETE /api/companies/:id
 */
exports.deleteCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if company exists before deleting
    const existingResult = await zerodbService.queryTable(TABLE_NAME, {
      filter: { _id: id }
    });

    const existingCompany = existingResult && existingResult.length > 0 ? existingResult[0] : null;

    if (!existingCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Delete from ZeroDB
    await zerodbService.deleteRows(TABLE_NAME, { _id: id });

    res.status(200).json({ message: 'Company deleted' });
  } catch (error) {
    console.error('Error deleting company:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get company by companyId (business identifier)
 * @route GET /api/companies/by-company-id/:companyId
 */
exports.getCompanyByCompanyId = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Query company by companyId from ZeroDB
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { companyId }
    });

    const company = result && result.length > 0 ? result[0] : null;

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json(company);
  } catch (error) {
    console.error('Error getting company by companyId:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get companies by type
 * @route GET /api/companies/by-type/:type
 */
exports.getCompaniesByType = async (req, res) => {
  try {
    const { type } = req.params;

    // Validate company type
    if (!VALID_COMPANY_TYPES.includes(type)) {
      return res.status(400).json({
        message: `CompanyType must be one of: ${VALID_COMPANY_TYPES.join(', ')}`
      });
    }

    // Query companies by type from ZeroDB
    const companies = await zerodbService.queryTable(TABLE_NAME, {
      filter: { CompanyType: type }
    });

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: 'No companies found for this type' });
    }

    res.status(200).json(companies);
  } catch (error) {
    console.error('Error getting companies by type:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
