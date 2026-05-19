// controllers/Company.js
// Migrated from MongoDB/Mongoose to ZeroDB
// Issue #16: Migrate Company controller to ZeroDB

const zerodbService = require('../services/zerodbService');

const TABLE_NAME = 'companies';
const VALID_COMPANY_TYPES = ['startup', 'corporation', 'non-profit', 'government'];
const VALID_ENTITY_TYPES = ['C_CORP', 'S_CORP', 'LLC', 'LP', 'DELAWARE_C_CORP', 'DELAWARE_LLC'];
const LEGAL_STRUCTURE_FIELDS = [
  'entityType', 'stateOfIncorporation', 'dateOfIncorporation',
  'qualifiedSmallBusiness', 'section1202Eligible', 'taxStatus',
  'registeredAgentName', 'registeredAgentAddress', 'ein',
  'fiscalYearEnd', 'authorizedShares'
];

/**
 * Unwrap ZeroDB response to a flat array of row objects.
 * queryTable may return { data: [...] } or a plain array.
 * Each item may have row_data wrapping the actual fields.
 */
function unwrapZeroDBResponse(result) {
  if (!result) return [];
  const rawData = result.data || result.rows || result || [];
  if (Array.isArray(rawData)) {
    return rawData.map(item => {
      if (item.row_data) {
        return {
          ...item.row_data,
          id: item.row_id || item.row_data.id,
          _id: item.row_id || item.row_data._id || item.row_data.id,
          row_id: item.row_id
        };
      }
      return item;
    });
  }
  return rawData;
}

/**
 * Create a new company
 * @route POST /api/companies
 */
exports.createCompany = async (req, res) => {
  try {
    const body = req.body;

    // Accept both frontend field names (name, companyType) and backend names (CompanyName, CompanyType).
    const CompanyName = body.CompanyName || body.name;
    // Map frontend companyType values to backend enum values
    const COMPANY_TYPE_MAP = {
      'Delaware C-Corp': 'startup',
      'LLC': 'startup',
      'Other': 'startup',
      'startup': 'startup',
      'corporation': 'corporation',
      'non-profit': 'non-profit',
      'government': 'government',
    };
    const CompanyType = COMPANY_TYPE_MAP[body.CompanyType] || COMPANY_TYPE_MAP[body.companyType] || body.CompanyType || body.companyType;
    const RegisteredAddress = body.RegisteredAddress || body.incorporationState || 'Not specified';
    const TaxID = body.TaxID || body.ein || `TBD-${Date.now()}`;
    const corporationDate = body.corporationDate || body.foundedDate || new Date().toISOString().split('T')[0];
    // Auto-generate companyId from name if not provided
    const companyId = body.companyId || `company-${Date.now()}`;

    // Only company name and type are required from the user
    if (!CompanyName || !CompanyType) {
      return res.status(400).json({ message: 'Company name and type are required' });
    }

    // Validate CompanyType enum
    if (!VALID_COMPANY_TYPES.includes(CompanyType)) {
      return res.status(400).json({
        message: `CompanyType must be one of: ${VALID_COMPANY_TYPES.join(', ')}`
      });
    }

    // Validate entityType if provided
    if (req.body.entityType && !VALID_ENTITY_TYPES.includes(req.body.entityType)) {
      return res.status(400).json({
        message: `entityType must be one of: ${VALID_ENTITY_TYPES.join(', ')}`
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

    // Include optional legal structure fields if provided
    for (const field of LEGAL_STRUCTURE_FIELDS) {
      if (req.body[field] !== undefined) {
        companyData[field] = req.body[field];
      }
    }

    // Check for duplicate companyId
    const existing = await zerodbService.queryTable(TABLE_NAME, { filter: { companyId } });
    const existingRows = unwrapZeroDBResponse(existing);
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Company with this companyId already exists' });
    }

    // Insert into ZeroDB
    const result = await zerodbService.insertRow(TABLE_NAME, companyData);

    // Return the created company (insertRow returns { data: [...] })
    const savedCompany = result.data?.[0] || result.rows?.[0] || result;
    const company = savedCompany?.row_data
      ? { ...savedCompany.row_data, _id: savedCompany.row_id || savedCompany.row_data._id, row_id: savedCompany.row_id }
      : savedCompany;

    // If the user has no companyId yet (onboarding), link them to the new company
    if (req.user && !req.user.companyId) {
      const newCompanyId = company.companyId || companyId;
      try {
        await zerodbService.updateRows('users', {
          filter: { _id: req.user.userId },
          update: { companyId: newCompanyId, updatedAt: new Date().toISOString() }
        });
      } catch (userUpdateError) {
        // Non-blocking: company was created successfully, log but don't fail
        console.error('Failed to update user companyId after company creation:', userUpdateError.message);
      }
    }

    res.status(201).json(company);
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
    // Scope to the authenticated user's company — never return all companies.
    const userCompanyId = req.query.companyId || req.user?.companyId;
    if (!userCompanyId) {
      return res.status(200).json([]);
    }

    const result = await zerodbService.queryTable(TABLE_NAME, { filter: { companyId: userCompanyId } });
    const companies = unwrapZeroDBResponse(result);

    if (!companies || companies.length === 0) {
      return res.status(200).json([]);
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
    const rows = unwrapZeroDBResponse(result);

    const company = rows.length > 0 ? rows[0] : null;

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
    await zerodbService.updateRows(TABLE_NAME, { filter: { _id: id }, update: updateData });

    // Fetch the updated company
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { _id: id }
    });
    const rows = unwrapZeroDBResponse(result);

    const updatedCompany = rows.length > 0 ? rows[0] : null;

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
    const existingRows = unwrapZeroDBResponse(existingResult);

    const existingCompany = existingRows.length > 0 ? existingRows[0] : null;

    if (!existingCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // T1-2: Cascade-aware delete - check for and remove child entities
    const companyId = existingCompany.companyId || id;
    const childTables = [
      'stakeholders',
      'equity_grants',
      'securities',
      'valuations',
      'documents',
      'activities',
      'notifications',
      'transactions'
    ];

    const orphanWarnings = [];
    for (const table of childTables) {
      try {
        const childResult = await zerodbService.queryTable(table, {
          filter: { companyId },
          limit: 1
        });
        const children = unwrapZeroDBResponse(childResult);
        if (children && children.length > 0) {
          orphanWarnings.push(table);
        }
      } catch (e) {
        // Table may not exist - that's fine
      }
    }

    if (orphanWarnings.length > 0 && !req.query.force) {
      return res.status(409).json({
        message: 'Company has associated data in the following tables. Use ?force=true to delete anyway.',
        associatedTables: orphanWarnings
      });
    }

    // If force=true, delete child entities first
    if (orphanWarnings.length > 0 && req.query.force === 'true') {
      for (const table of orphanWarnings) {
        try {
          await zerodbService.deleteRows(table, { filter: { companyId } });
        } catch (e) {
          console.error(`Error deleting ${table} for company ${companyId}:`, e.message);
        }
      }
    }

    // Delete the company from ZeroDB
    await zerodbService.deleteRows(TABLE_NAME, { filter: { _id: id } });

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

    // Query all companies and filter in-memory (ZeroDB filters don't search inside row_data)
    const result = await zerodbService.queryTable(TABLE_NAME, {});
    const rows = unwrapZeroDBResponse(result);

    const company = rows.find(row => row.companyId === companyId) || null;

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
    const result = await zerodbService.queryTable(TABLE_NAME, {
      filter: { CompanyType: type }
    });
    const companies = unwrapZeroDBResponse(result);

    if (!companies || companies.length === 0) {
      return res.status(404).json({ message: 'No companies found for this type' });
    }

    res.status(200).json(companies);
  } catch (error) {
    console.error('Error getting companies by type:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
