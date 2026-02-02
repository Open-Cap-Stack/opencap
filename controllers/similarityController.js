/**
 * Similarity Controller
 *
 * API endpoints for stakeholder and company similarity search.
 *
 * [Feature] Issue #25: Implement stakeholder/company similarity search
 */

const similarityService = require('../services/similarityService');

/**
 * Find similar stakeholders to a given stakeholder
 * POST /api/similarity/stakeholders/search
 */
exports.findSimilarStakeholders = async (req, res) => {
  try {
    const { stakeholder, limit = 5 } = req.body;

    if (!stakeholder) {
      return res.status(400).json({
        error: 'Stakeholder data is required'
      });
    }

    if (!stakeholder.stakeholderId) {
      return res.status(400).json({
        error: 'Stakeholder ID is required'
      });
    }

    const result = await similarityService.findSimilarStakeholders(stakeholder, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error finding similar stakeholders:', error);
    res.status(500).json({
      error: 'Error finding similar stakeholders',
      message: error.message
    });
  }
};

/**
 * Find similar stakeholders by stakeholder ID
 * GET /api/similarity/stakeholders/:id/similar
 */
exports.findSimilarStakeholdersById = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (!id) {
      return res.status(400).json({
        error: 'Stakeholder ID is required'
      });
    }

    const result = await similarityService.findSimilarStakeholdersById(id, limit);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Stakeholder not found') {
      return res.status(404).json({
        error: 'Stakeholder not found'
      });
    }

    console.error('Error finding similar stakeholders by ID:', error);
    res.status(500).json({
      error: 'Error finding similar stakeholders',
      message: error.message
    });
  }
};

/**
 * Search stakeholders by role query
 * GET /api/similarity/stakeholders/search/role
 */
exports.searchStakeholdersByRole = async (req, res) => {
  try {
    const { query, limit = 10, role, industry } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const filters = {};
    if (role) filters.role = role;
    if (industry) filters.industry = industry;

    const result = await similarityService.searchStakeholdersByRole(
      query,
      parseInt(limit),
      filters
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching stakeholders by role:', error);
    res.status(500).json({
      error: 'Error searching stakeholders',
      message: error.message
    });
  }
};

/**
 * Index a stakeholder for similarity search
 * POST /api/similarity/stakeholders/index
 */
exports.indexStakeholder = async (req, res) => {
  try {
    const stakeholder = req.body;

    if (!stakeholder || !stakeholder.stakeholderId) {
      return res.status(400).json({
        error: 'Valid stakeholder data with stakeholderId is required'
      });
    }

    const result = await similarityService.indexStakeholder(stakeholder);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error indexing stakeholder:', error);
    res.status(500).json({
      error: 'Error indexing stakeholder',
      message: error.message
    });
  }
};

/**
 * Find similar companies to a given company
 * POST /api/similarity/companies/search
 */
exports.findSimilarCompanies = async (req, res) => {
  try {
    const { company, limit = 5 } = req.body;

    if (!company) {
      return res.status(400).json({
        error: 'Company data is required'
      });
    }

    if (!company.companyId) {
      return res.status(400).json({
        error: 'Company ID is required'
      });
    }

    const result = await similarityService.findSimilarCompanies(company, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error finding similar companies:', error);
    res.status(500).json({
      error: 'Error finding similar companies',
      message: error.message
    });
  }
};

/**
 * Find similar companies by company ID
 * GET /api/similarity/companies/:id/similar
 */
exports.findSimilarCompaniesById = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (!id) {
      return res.status(400).json({
        error: 'Company ID is required'
      });
    }

    const result = await similarityService.findSimilarCompaniesById(id, limit);

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Company not found') {
      return res.status(404).json({
        error: 'Company not found'
      });
    }

    console.error('Error finding similar companies by ID:', error);
    res.status(500).json({
      error: 'Error finding similar companies',
      message: error.message
    });
  }
};

/**
 * Search companies by type query
 * GET /api/similarity/companies/search/type
 */
exports.searchCompaniesByType = async (req, res) => {
  try {
    const { query, limit = 10, companyType, industry, stage } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const filters = {};
    if (companyType) filters.companyType = companyType;
    if (industry) filters.industry = industry;
    if (stage) filters.stage = stage;

    const result = await similarityService.searchCompaniesByType(
      query,
      parseInt(limit),
      filters
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching companies by type:', error);
    res.status(500).json({
      error: 'Error searching companies',
      message: error.message
    });
  }
};

/**
 * Index a company for similarity search
 * POST /api/similarity/companies/index
 */
exports.indexCompany = async (req, res) => {
  try {
    const company = req.body;

    if (!company || !company.companyId) {
      return res.status(400).json({
        error: 'Valid company data with companyId is required'
      });
    }

    const result = await similarityService.indexCompany(company);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error indexing company:', error);
    res.status(500).json({
      error: 'Error indexing company',
      message: error.message
    });
  }
};

/**
 * Index all stakeholders from database
 * POST /api/similarity/stakeholders/index-all
 */
exports.indexAllStakeholders = async (req, res) => {
  try {
    const result = await similarityService.indexAllStakeholders();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error indexing all stakeholders:', error);
    res.status(500).json({
      error: 'Error indexing stakeholders',
      message: error.message
    });
  }
};

/**
 * Index all companies from database
 * POST /api/similarity/companies/index-all
 */
exports.indexAllCompanies = async (req, res) => {
  try {
    const result = await similarityService.indexAllCompanies();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error indexing all companies:', error);
    res.status(500).json({
      error: 'Error indexing companies',
      message: error.message
    });
  }
};

/**
 * Find network connections for a stakeholder
 * POST /api/similarity/network/connections
 */
exports.findNetworkConnections = async (req, res) => {
  try {
    const { stakeholder, limit = 10 } = req.body;

    if (!stakeholder) {
      return res.status(400).json({
        error: 'Stakeholder data is required'
      });
    }

    if (!stakeholder.stakeholderId) {
      return res.status(400).json({
        error: 'Stakeholder ID is required'
      });
    }

    const result = await similarityService.findNetworkConnections(stakeholder, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error finding network connections:', error);
    res.status(500).json({
      error: 'Error finding network connections',
      message: error.message
    });
  }
};

/**
 * Find companies for a stakeholder (investor matching)
 * POST /api/similarity/match/companies
 */
exports.findCompaniesForStakeholder = async (req, res) => {
  try {
    const { stakeholder, limit = 10 } = req.body;

    if (!stakeholder) {
      return res.status(400).json({
        error: 'Stakeholder data is required'
      });
    }

    if (!stakeholder.stakeholderId) {
      return res.status(400).json({
        error: 'Stakeholder ID is required'
      });
    }

    const result = await similarityService.findCompaniesForStakeholder(stakeholder, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error finding companies for stakeholder:', error);
    res.status(500).json({
      error: 'Error finding companies',
      message: error.message
    });
  }
};

/**
 * Get similarity analytics
 * GET /api/similarity/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const result = await similarityService.getSimilarityAnalytics();

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting similarity analytics:', error);
    res.status(500).json({
      error: 'Error getting analytics',
      message: error.message
    });
  }
};
