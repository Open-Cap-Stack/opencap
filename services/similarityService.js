/**
 * Similarity Service Layer
 *
 * Provides stakeholder and company similarity search functionality
 * using vector embeddings for meaningful matching and networking recommendations.
 *
 * [Feature] Issue #25: Implement stakeholder/company similarity search
 */

const vectorService = require('./vectorService');
const zerodbService = require('./zerodbService');
const Stakeholder = require('../models/Stakeholder');
const Company = require('../models/Company');

class SimilarityService {
  constructor() {
    this.stakeholderNamespace = 'stakeholders';
    this.companyNamespace = 'companies';
  }

  // =====================
  // STAKEHOLDER SIMILARITY
  // =====================

  /**
   * Generate embedding for a stakeholder profile
   * @param {Object} stakeholder - Stakeholder data
   * @returns {Object} Embedding result with stakeholderId and embedding vector
   */
  async generateStakeholderEmbedding(stakeholder) {
    if (!stakeholder) {
      throw new Error('Invalid stakeholder data');
    }

    if (!stakeholder.stakeholderId) {
      throw new Error('Stakeholder ID is required');
    }

    // Build text representation for embedding
    const textParts = [
      `Name: ${stakeholder.name || 'Unknown'}`,
      `Role: ${stakeholder.role || 'Unknown'}`
    ];

    if (stakeholder.equityHoldings !== undefined) {
      textParts.push(`Equity Holdings: ${stakeholder.equityHoldings}%`);
    }

    if (stakeholder.investmentHistory && stakeholder.investmentHistory.length > 0) {
      textParts.push(`Investment History: ${stakeholder.investmentHistory.join(', ')}`);
    }

    if (stakeholder.industry) {
      textParts.push(`Industry: ${stakeholder.industry}`);
    }

    if (stakeholder.projectId) {
      textParts.push(`Project: ${stakeholder.projectId}`);
    }

    const textRepresentation = textParts.join('. ');
    const embedding = await vectorService.generateEmbedding(textRepresentation);

    return {
      stakeholderId: stakeholder.stakeholderId,
      embedding,
      textRepresentation
    };
  }

  /**
   * Index a stakeholder for similarity search
   * @param {Object} stakeholder - Stakeholder to index
   * @returns {Object} Index result
   */
  async indexStakeholder(stakeholder) {
    const embeddingResult = await this.generateStakeholderEmbedding(stakeholder);

    const metadata = {
      stakeholder_id: stakeholder.stakeholderId,
      name: stakeholder.name,
      role: stakeholder.role,
      project_id: stakeholder.projectId,
      indexed_at: new Date().toISOString()
    };

    if (stakeholder.industry) {
      metadata.industry = stakeholder.industry;
    }

    if (stakeholder.equityHoldings !== undefined) {
      metadata.equity_holdings = stakeholder.equityHoldings;
    }

    const result = await zerodbService.upsertVector(
      embeddingResult.embedding,
      this.stakeholderNamespace,
      metadata,
      embeddingResult.textRepresentation,
      `stakeholder:${stakeholder.stakeholderId}`
    );

    return {
      success: true,
      stakeholderId: stakeholder.stakeholderId,
      result
    };
  }

  /**
   * Find stakeholders similar to a given stakeholder
   * @param {Object} sourceStakeholder - Source stakeholder for comparison
   * @param {number} limit - Maximum results
   * @returns {Object} Similar stakeholders
   */
  async findSimilarStakeholders(sourceStakeholder, limit = 5) {
    const embeddingResult = await this.generateStakeholderEmbedding(sourceStakeholder);

    const searchResults = await zerodbService.searchVectors(
      embeddingResult.embedding,
      limit + 1, // +1 to account for potential self-match
      this.stakeholderNamespace
    );

    // Filter out the source stakeholder from results
    const similarStakeholders = (searchResults.vectors || []).filter(
      v => v.vector_metadata?.stakeholder_id !== sourceStakeholder.stakeholderId
    );

    return {
      source_stakeholder_id: sourceStakeholder.stakeholderId,
      similar_stakeholders: similarStakeholders.slice(0, limit),
      total_count: similarStakeholders.slice(0, limit).length,
      search_time_ms: searchResults.search_time_ms || 0
    };
  }

  /**
   * Find similar stakeholders by stakeholder ID
   * @param {string} stakeholderId - Stakeholder ID to search from
   * @param {number} limit - Maximum results
   * @returns {Object} Similar stakeholders
   */
  async findSimilarStakeholdersById(stakeholderId, limit = 5) {
    const stakeholder = await Stakeholder.findOne({ stakeholderId });

    if (!stakeholder) {
      throw new Error('Stakeholder not found');
    }

    return this.findSimilarStakeholders(stakeholder, limit);
  }

  /**
   * Search stakeholders by role-based query
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @param {Object} filters - Optional filters (role, industry, etc.)
   * @returns {Object} Search results
   */
  async searchStakeholdersByRole(query, limit = 10, filters = {}) {
    const queryEmbedding = await vectorService.generateEmbedding(query);

    const searchResults = await zerodbService.searchVectors(
      queryEmbedding,
      limit * 2, // Fetch extra for filtering
      this.stakeholderNamespace
    );

    let filteredResults = searchResults.vectors || [];

    if (filters.role) {
      filteredResults = filteredResults.filter(
        v => v.vector_metadata?.role === filters.role
      );
    }

    if (filters.industry) {
      filteredResults = filteredResults.filter(
        v => v.vector_metadata?.industry === filters.industry
      );
    }

    return {
      query,
      results: filteredResults.slice(0, limit),
      total_count: filteredResults.slice(0, limit).length,
      search_time_ms: searchResults.search_time_ms || 0
    };
  }

  // ==================
  // COMPANY SIMILARITY
  // ==================

  /**
   * Generate embedding for a company profile
   * @param {Object} company - Company data
   * @returns {Object} Embedding result with companyId and embedding vector
   */
  async generateCompanyEmbedding(company) {
    if (!company) {
      throw new Error('Invalid company data');
    }

    if (!company.companyId) {
      throw new Error('Company ID is required');
    }

    // Build text representation for embedding
    const textParts = [
      `Company Name: ${company.CompanyName || 'Unknown'}`,
      `Company Type: ${company.CompanyType || 'Unknown'}`
    ];

    if (company.industry) {
      textParts.push(`Industry: ${company.industry}`);
    }

    if (company.stage) {
      textParts.push(`Funding Stage: ${company.stage}`);
    }

    if (company.RegisteredAddress) {
      textParts.push(`Location: ${company.RegisteredAddress}`);
    }

    if (company.corporationDate) {
      const year = new Date(company.corporationDate).getFullYear();
      textParts.push(`Founded: ${year}`);
    }

    const textRepresentation = textParts.join('. ');
    const embedding = await vectorService.generateEmbedding(textRepresentation);

    return {
      companyId: company.companyId,
      embedding,
      textRepresentation
    };
  }

  /**
   * Index a company for similarity search
   * @param {Object} company - Company to index
   * @returns {Object} Index result
   */
  async indexCompany(company) {
    const embeddingResult = await this.generateCompanyEmbedding(company);

    const metadata = {
      company_id: company.companyId,
      company_name: company.CompanyName,
      company_type: company.CompanyType,
      indexed_at: new Date().toISOString()
    };

    if (company.industry) {
      metadata.industry = company.industry;
    }

    if (company.stage) {
      metadata.stage = company.stage;
    }

    if (company.RegisteredAddress) {
      metadata.location = company.RegisteredAddress;
    }

    const result = await zerodbService.upsertVector(
      embeddingResult.embedding,
      this.companyNamespace,
      metadata,
      embeddingResult.textRepresentation,
      `company:${company.companyId}`
    );

    return {
      success: true,
      companyId: company.companyId,
      result
    };
  }

  /**
   * Find companies similar to a given company
   * @param {Object} sourceCompany - Source company for comparison
   * @param {number} limit - Maximum results
   * @returns {Object} Similar companies
   */
  async findSimilarCompanies(sourceCompany, limit = 5) {
    const embeddingResult = await this.generateCompanyEmbedding(sourceCompany);

    const searchResults = await zerodbService.searchVectors(
      embeddingResult.embedding,
      limit + 1, // +1 to account for potential self-match
      this.companyNamespace
    );

    // Filter out the source company from results
    const similarCompanies = (searchResults.vectors || []).filter(
      v => v.vector_metadata?.company_id !== sourceCompany.companyId
    );

    return {
      source_company_id: sourceCompany.companyId,
      similar_companies: similarCompanies.slice(0, limit),
      total_count: similarCompanies.slice(0, limit).length,
      search_time_ms: searchResults.search_time_ms || 0
    };
  }

  /**
   * Find similar companies by company ID
   * @param {string} companyId - Company ID to search from
   * @param {number} limit - Maximum results
   * @returns {Object} Similar companies
   */
  async findSimilarCompaniesById(companyId, limit = 5) {
    const company = await Company.findOne({ companyId });

    if (!company) {
      throw new Error('Company not found');
    }

    return this.findSimilarCompanies(company, limit);
  }

  /**
   * Search companies by type-based query
   * @param {string} query - Search query
   * @param {number} limit - Maximum results
   * @param {Object} filters - Optional filters (companyType, industry, etc.)
   * @returns {Object} Search results
   */
  async searchCompaniesByType(query, limit = 10, filters = {}) {
    const queryEmbedding = await vectorService.generateEmbedding(query);

    const searchResults = await zerodbService.searchVectors(
      queryEmbedding,
      limit * 2, // Fetch extra for filtering
      this.companyNamespace
    );

    let filteredResults = searchResults.vectors || [];

    if (filters.companyType) {
      filteredResults = filteredResults.filter(
        v => v.vector_metadata?.company_type === filters.companyType
      );
    }

    if (filters.industry) {
      filteredResults = filteredResults.filter(
        v => v.vector_metadata?.industry === filters.industry
      );
    }

    if (filters.stage) {
      filteredResults = filteredResults.filter(
        v => v.vector_metadata?.stage === filters.stage
      );
    }

    return {
      query,
      results: filteredResults.slice(0, limit),
      total_count: filteredResults.slice(0, limit).length,
      search_time_ms: searchResults.search_time_ms || 0
    };
  }

  // ================
  // BATCH OPERATIONS
  // ================

  /**
   * Index all stakeholders from database
   * @returns {Object} Batch index result
   */
  async indexAllStakeholders() {
    const stakeholders = await Stakeholder.find();
    let indexedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const stakeholder of stakeholders) {
      try {
        await this.indexStakeholder(stakeholder);
        indexedCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          stakeholderId: stakeholder.stakeholderId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      indexed_count: indexedCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Index all companies from database
   * @returns {Object} Batch index result
   */
  async indexAllCompanies() {
    const companies = await Company.find();
    let indexedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const company of companies) {
      try {
        await this.indexCompany(company);
        indexedCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          companyId: company.companyId,
          error: error.message
        });
      }
    }

    return {
      success: true,
      indexed_count: indexedCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // =======================
  // CROSS-ENTITY SIMILARITY
  // =======================

  /**
   * Find networking recommendations for a stakeholder
   * @param {Object} stakeholder - Stakeholder to find connections for
   * @param {number} limit - Maximum results
   * @returns {Object} Network connection recommendations
   */
  async findNetworkConnections(stakeholder, limit = 10) {
    // Generate embedding for the stakeholder
    const embeddingResult = await this.generateStakeholderEmbedding(stakeholder);

    // Search for similar stakeholders
    const searchResults = await zerodbService.searchVectors(
      embeddingResult.embedding,
      limit * 2,
      this.stakeholderNamespace
    );

    // Filter out self and prioritize complementary roles
    let recommendations = (searchResults.vectors || []).filter(
      v => v.vector_metadata?.stakeholder_id !== stakeholder.stakeholderId
    );

    // Sort by relevance: prioritize complementary roles
    const complementaryRoles = this.getComplementaryRoles(stakeholder.role);
    recommendations = recommendations.sort((a, b) => {
      const aIsComplementary = complementaryRoles.includes(a.vector_metadata?.role);
      const bIsComplementary = complementaryRoles.includes(b.vector_metadata?.role);

      if (aIsComplementary && !bIsComplementary) return -1;
      if (!aIsComplementary && bIsComplementary) return 1;
      return (b.similarity_score || 0) - (a.similarity_score || 0);
    });

    return {
      source_stakeholder_id: stakeholder.stakeholderId,
      recommendations: recommendations.slice(0, limit),
      total_count: recommendations.slice(0, limit).length,
      search_time_ms: searchResults.search_time_ms || 0
    };
  }

  /**
   * Get complementary roles for networking
   * @param {string} role - Source role
   * @returns {Array} Complementary roles
   */
  getComplementaryRoles(role) {
    const roleMap = {
      'Founder': ['Investor', 'Angel Investor', 'Advisor', 'Board Member'],
      'CEO': ['Investor', 'Board Member', 'Advisor'],
      'Investor': ['Founder', 'CEO', 'CTO'],
      'Angel Investor': ['Founder', 'CEO', 'CTO'],
      'Advisor': ['Founder', 'CEO', 'Investor'],
      'Board Member': ['Founder', 'CEO', 'Investor'],
      'CTO': ['Investor', 'Advisor', 'Founder'],
      'CFO': ['Investor', 'Board Member', 'Advisor']
    };

    return roleMap[role] || [];
  }

  /**
   * Find companies matching a stakeholder's investment criteria
   * @param {Object} stakeholder - Stakeholder (typically investor)
   * @param {number} limit - Maximum results
   * @returns {Object} Matched companies
   */
  async findCompaniesForStakeholder(stakeholder, limit = 10) {
    // Build query from stakeholder's investment preferences
    const queryParts = [];

    if (stakeholder.industry) {
      queryParts.push(`Industry: ${stakeholder.industry}`);
    }

    if (stakeholder.investmentPreferences) {
      if (stakeholder.investmentPreferences.stage) {
        queryParts.push(`Stage: ${stakeholder.investmentPreferences.stage}`);
      }
      if (stakeholder.investmentPreferences.sectors) {
        queryParts.push(`Sectors: ${stakeholder.investmentPreferences.sectors.join(', ')}`);
      }
    }

    if (stakeholder.role) {
      queryParts.push(`Looking for: ${stakeholder.role} opportunities`);
    }

    const query = queryParts.join('. ') || `Investment opportunities for ${stakeholder.role}`;
    const queryEmbedding = await vectorService.generateEmbedding(query);

    const searchResults = await zerodbService.searchVectors(
      queryEmbedding,
      limit,
      this.companyNamespace
    );

    return {
      source_stakeholder_id: stakeholder.stakeholderId,
      matched_companies: searchResults.vectors || [],
      total_count: (searchResults.vectors || []).length,
      search_time_ms: searchResults.search_time_ms || 0
    };
  }

  // =========
  // ANALYTICS
  // =========

  /**
   * Get analytics for similarity operations
   * @returns {Object} Analytics data
   */
  async getSimilarityAnalytics() {
    // Get all indexed vectors
    const stakeholderVectors = await zerodbService.listVectors(this.stakeholderNamespace, 0, 10000);
    const companyVectors = await zerodbService.listVectors(this.companyNamespace, 0, 10000);

    const allVectors = [...(stakeholderVectors || []), ...(companyVectors || [])];

    // Count by type
    let stakeholderCount = 0;
    let companyCount = 0;

    allVectors.forEach(vector => {
      if (vector.vector_metadata?.stakeholder_id) {
        stakeholderCount++;
      } else if (vector.vector_metadata?.company_id) {
        companyCount++;
      }
    });

    // Role distribution for stakeholders
    const roleDistribution = {};
    (stakeholderVectors || []).forEach(vector => {
      const role = vector.vector_metadata?.role || 'Unknown';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });

    // Company type distribution
    const companyTypeDistribution = {};
    (companyVectors || []).forEach(vector => {
      const type = vector.vector_metadata?.company_type || 'Unknown';
      companyTypeDistribution[type] = (companyTypeDistribution[type] || 0) + 1;
    });

    return {
      total_indexed: allVectors.length,
      stakeholder_count: stakeholderCount,
      company_count: companyCount,
      role_distribution: roleDistribution,
      company_type_distribution: companyTypeDistribution,
      last_updated: new Date().toISOString()
    };
  }
}

// Export singleton instance
module.exports = new SimilarityService();
