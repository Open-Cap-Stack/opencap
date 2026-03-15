/**
 * Global Search Controller
 *
 * Issue #190 - Add Global Multi-Entity Search Endpoint
 *
 * Provides unified search functionality across multiple entity types:
 * - Stakeholders (name, email, company)
 * - Documents (semantic search using existing service)
 * - Tasks (title, description, assignee)
 * - Companies (name, description)
 * - Share Classes (name, description)
 * - 409A Valuations (firm, notes)
 * - Messages (content, sender, recipient)
 */

const Stakeholder = require('../models/Stakeholder');
const Document = require('../models/Document');
const Task = require('../models/Task');
const Company = require('../models/Company');
const ShareClass = require('../models/ShareClass');
const Valuation409A = require('../models/Valuation409A');
const Communication = require('../models/Communication');
const SemanticSearchService = require('../services/semanticSearchService');

/**
 * Configuration constants
 */
const CONFIG = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 500,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  DEFAULT_OFFSET: 0,
  SEARCH_TIMEOUT_MS: 5000, // 5 second timeout
  VALID_ENTITY_TYPES: [
    'stakeholders',
    'documents',
    'tasks',
    'companies',
    'share_classes',
    'valuations',
    'messages'
  ]
};

/**
 * Sanitize and normalize query string
 * @param {string} query - The raw query string
 * @returns {string} - Sanitized query
 */
const sanitizeQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  return query.trim().replace(/\s+/g, ' ');
};

/**
 * Calculate text relevance score using simple string matching
 * @param {string} text - The text to search in
 * @param {string} query - The search query
 * @returns {number} - Relevance score between 0 and 1
 */
const calculateRelevance = (text, query) => {
  if (!text || !query) return 0;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/);

  // Exact match gets highest score
  if (lowerText === lowerQuery) return 1.0;

  // Starts with query gets high score
  if (lowerText.startsWith(lowerQuery)) return 0.9;

  // Contains exact query phrase
  if (lowerText.includes(lowerQuery)) return 0.8;

  // Calculate word match score
  let matchedWords = 0;
  queryWords.forEach(word => {
    if (lowerText.includes(word)) matchedWords++;
  });

  const wordMatchScore = queryWords.length > 0 ? matchedWords / queryWords.length : 0;
  return wordMatchScore * 0.7; // Scale down partial matches
};

/**
 * Calculate combined relevance score from multiple fields
 * @param {Object} entity - Entity to score
 * @param {Array<string>} fields - Field names to check
 * @param {string} query - Search query
 * @returns {number} - Combined relevance score
 */
const calculateCombinedRelevance = (entity, fields, query) => {
  const scores = fields.map(field => {
    const value = entity[field];
    if (!value) return 0;
    return calculateRelevance(String(value), query);
  });

  // Return the highest score among all fields
  return Math.max(...scores, 0);
};

/**
 * Search stakeholders
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} - Search results with relevance scores
 */
const searchStakeholders = async (query, limit, companyId) => {
  try {
    const filter = {};
    if (companyId) filter.companyId = companyId;
    // Get all stakeholders (in production, this should use database text search)
    const stakeholders = await Stakeholder.find(filter);
    const lowerQuery = query.toLowerCase();

    // Filter and score
    const results = stakeholders
      .map(stakeholder => {
        const relevance = calculateCombinedRelevance(
          stakeholder,
          ['name', 'email', 'role'],
          query
        );
        return { ...stakeholder, relevance };
      })
      .filter(s => s.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(s => ({
        id: s._id,
        name: s.name,
        email: s.email,
        role: s.role,
        relevance: parseFloat(s.relevance.toFixed(2)),
        entityType: 'stakeholder'
      }));

    return results;
  } catch (error) {
    console.error('Error searching stakeholders:', error);
    return [];
  }
};

/**
 * Search documents using semantic search service
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @param {number} pageSize - Page size
 * @returns {Promise<Array>} - Search results
 */
const searchDocuments = async (query, page, pageSize, companyId) => {
  try {
    const searchOptions = {
      pagination: {
        page,
        pageSize
      },
      filters: companyId ? { companyId } : {},
      minRelevance: 0,
      highlight: false,
      includeContent: false
    };

    const result = await SemanticSearchService.search(query, searchOptions);

    return result.results.map(doc => ({
      id: doc.documentId || doc._id,
      name: doc.name,
      title: doc.title || doc.name,
      type: doc.category || doc.type,
      relevance: doc.relevance || doc.score || 0.5,
      entityType: 'document'
    }));
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
};

/**
 * Search tasks
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} - Search results with relevance scores
 */
const searchTasks = async (query, limit, companyId) => {
  try {
    const filter = {};
    if (companyId) filter.companyId = companyId;
    const tasks = await Task.find(filter);

    const results = tasks
      .map(task => {
        const relevance = calculateCombinedRelevance(
          task,
          ['title', 'description'],
          query
        );
        return { ...task, relevance };
      })
      .filter(t => t.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(t => ({
        id: t._id,
        title: t.title,
        description: t.description,
        status: t.status,
        assignee: t.assigneeId,
        relevance: parseFloat(t.relevance.toFixed(2)),
        entityType: 'task'
      }));

    return results;
  } catch (error) {
    console.error('Error searching tasks:', error);
    return [];
  }
};

/**
 * Search companies
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} - Search results with relevance scores
 */
const searchCompanies = async (query, limit, companyId) => {
  try {
    const filter = {};
    if (companyId) filter.companyId = companyId;
    const companies = await Company.find(filter);

    const results = companies
      .map(company => {
        const relevance = calculateCombinedRelevance(
          company,
          ['CompanyName', 'CompanyType'],
          query
        );
        return { ...company, relevance };
      })
      .filter(c => c.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(c => ({
        id: c._id,
        name: c.CompanyName,
        type: c.CompanyType,
        relevance: parseFloat(c.relevance.toFixed(2)),
        entityType: 'company'
      }));

    return results;
  } catch (error) {
    console.error('Error searching companies:', error);
    return [];
  }
};

/**
 * Search share classes
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} - Search results with relevance scores
 */
const searchShareClasses = async (query, limit, companyId) => {
  try {
    const filter = {};
    if (companyId) filter.companyId = companyId;
    const shareClasses = await ShareClass.find(filter);

    const results = shareClasses
      .map(sc => {
        const relevance = calculateCombinedRelevance(
          sc,
          ['name', 'description'],
          query
        );
        return { ...sc, relevance };
      })
      .filter(sc => sc.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(sc => ({
        id: sc._id,
        name: sc.name,
        description: sc.description,
        relevance: parseFloat(sc.relevance.toFixed(2)),
        entityType: 'share_class'
      }));

    return results;
  } catch (error) {
    console.error('Error searching share classes:', error);
    return [];
  }
};

/**
 * Search 409A valuations
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} - Search results with relevance scores
 */
const searchValuations = async (query, limit, companyId) => {
  try {
    // Check if find method exists (handle both ZeroDB and test mocks)
    if (typeof Valuation409A.find !== 'function') {
      console.warn('Valuation409A.find is not a function');
      return [];
    }

    const filter = {};
    if (companyId) filter.companyId = companyId;
    const valuations = await Valuation409A.find(filter);

    const results = valuations
      .map(val => {
        const firmName = val.valuationFirm?.name || '';
        const relevance = calculateCombinedRelevance(
          { firmName, notes: val.notes, reason: val.reason },
          ['firmName', 'notes', 'reason'],
          query
        );
        return { ...val, relevance };
      })
      .filter(v => v.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(v => ({
        id: v._id,
        valuationId: v.valuationId,
        firm: v.valuationFirm?.name,
        status: v.status,
        fairMarketValue: v.fairMarketValue,
        effectiveDate: v.effectiveDate,
        relevance: parseFloat(v.relevance.toFixed(2)),
        entityType: 'valuation'
      }));

    return results;
  } catch (error) {
    console.error('Error searching valuations:', error);
    return [];
  }
};

/**
 * Search messages/communications
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} - Search results with relevance scores
 */
const searchMessages = async (query, limit, companyId) => {
  try {
    const filter = {};
    if (companyId) filter.companyId = companyId;
    const messages = await Communication.find(filter);

    const results = messages
      .map(msg => {
        const relevance = calculateCombinedRelevance(
          msg,
          ['Content', 'Sender', 'Recipient'],
          query
        );
        return { ...msg, relevance };
      })
      .filter(m => m.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(m => ({
        id: m._id,
        content: m.Content?.substring(0, 100), // Truncate for preview
        sender: m.Sender,
        recipient: m.Recipient,
        type: m.MessageType,
        timestamp: m.Timestamp,
        relevance: parseFloat(m.relevance.toFixed(2)),
        entityType: 'message'
      }));

    return results;
  } catch (error) {
    console.error('Error searching messages:', error);
    return [];
  }
};

/**
 * Global search across all entity types
 * GET /api/v1/search
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const globalSearch = async (req, res) => {
  const startTime = Date.now();

  try {
    const { q, types, limit, offset } = req.query;
    const companyId = req.query.companyId || req.user?.companyId;

    // Validate query parameter
    if (!q && q !== '') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const sanitizedQuery = sanitizeQuery(q);

    if (!q || sanitizedQuery.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" cannot be empty'
      });
    }

    if (sanitizedQuery.length < CONFIG.MIN_QUERY_LENGTH) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    }

    if (sanitizedQuery.length > CONFIG.MAX_QUERY_LENGTH) {
      return res.status(400).json({
        success: false,
        error: 'Query cannot exceed 500 characters'
      });
    }

    // Parse and validate entity types
    let entityTypes = CONFIG.VALID_ENTITY_TYPES;
    if (types) {
      const requestedTypes = types.split(',').map(t => t.trim());
      const invalidTypes = requestedTypes.filter(t => !CONFIG.VALID_ENTITY_TYPES.includes(t));

      if (invalidTypes.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid entity type: ${invalidTypes[0]}. Valid types are: ${CONFIG.VALID_ENTITY_TYPES.join(', ')}`
        });
      }

      entityTypes = requestedTypes;
    }

    // Parse pagination parameters
    const resultLimit = Math.min(
      parseInt(limit, 10) || CONFIG.DEFAULT_LIMIT,
      CONFIG.MAX_LIMIT
    );
    const resultOffset = parseInt(offset, 10) || CONFIG.DEFAULT_OFFSET;

    // Perform searches for each entity type with timeout protection
    const searchPromises = [];
    const results = {};

    if (entityTypes.includes('stakeholders')) {
      searchPromises.push(
        searchStakeholders(sanitizedQuery, resultLimit, companyId)
          .then(r => { results.stakeholders = r; })
      );
    }

    if (entityTypes.includes('documents')) {
      const page = Math.floor(resultOffset / resultLimit) + 1;
      searchPromises.push(
        searchDocuments(sanitizedQuery, page, resultLimit, companyId)
          .then(r => { results.documents = r; })
      );
    }

    if (entityTypes.includes('tasks')) {
      searchPromises.push(
        searchTasks(sanitizedQuery, resultLimit, companyId)
          .then(r => { results.tasks = r; })
      );
    }

    if (entityTypes.includes('companies')) {
      searchPromises.push(
        searchCompanies(sanitizedQuery, resultLimit, companyId)
          .then(r => { results.companies = r; })
      );
    }

    if (entityTypes.includes('share_classes')) {
      searchPromises.push(
        searchShareClasses(sanitizedQuery, resultLimit, companyId)
          .then(r => { results.share_classes = r; })
      );
    }

    if (entityTypes.includes('valuations')) {
      searchPromises.push(
        searchValuations(sanitizedQuery, resultLimit, companyId)
          .then(r => { results.valuations = r; })
      );
    }

    if (entityTypes.includes('messages')) {
      searchPromises.push(
        searchMessages(sanitizedQuery, resultLimit, companyId)
          .then(r => { results.messages = r; })
      );
    }

    // Wait for all searches to complete with timeout
    await Promise.race([
      Promise.all(searchPromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), CONFIG.SEARCH_TIMEOUT_MS)
      )
    ]).catch(error => {
      if (error.message === 'Search timeout') {
        console.warn('Search timed out after 5 seconds');
      }
    });

    // Calculate total results
    const totalResults = Object.values(results).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );

    // Calculate search time
    const searchTimeMs = Date.now() - startTime;

    // Set response headers
    res.set('X-Search-Time-Ms', searchTimeMs.toString());
    res.set('X-Total-Count', totalResults.toString());

    return res.status(200).json({
      success: true,
      query: sanitizedQuery,
      results,
      totalResults,
      metadata: {
        limit: resultLimit,
        offset: resultOffset,
        searchTimeMs,
        timedOut: searchTimeMs >= CONFIG.SEARCH_TIMEOUT_MS
      }
    });

  } catch (error) {
    console.error('Global search error:', error);

    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'An error occurred while processing your search request'
      : error.message;

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Get search suggestions for autocomplete
 * GET /api/v1/search/suggestions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    // Validate query parameter
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const sanitizedQuery = sanitizeQuery(q);
    const companyId = req.query.companyId || req.user?.companyId;
    const limit = 10; // Fixed limit for suggestions

    const companyFilter = companyId ? { companyId } : {};

    // Get suggestions from multiple sources
    const [stakeholders, companies, tasks, documents] = await Promise.all([
      Stakeholder.find(companyFilter).then(all =>
        all.filter(s =>
          s.name?.toLowerCase().includes(sanitizedQuery.toLowerCase())
        ).slice(0, 3)
      ).catch(() => []),

      Company.find(companyFilter).then(all =>
        all.filter(c =>
          c.CompanyName?.toLowerCase().includes(sanitizedQuery.toLowerCase())
        ).slice(0, 3)
      ).catch(() => []),

      Task.find(companyFilter).then(all =>
        all.filter(t =>
          t.title?.toLowerCase().includes(sanitizedQuery.toLowerCase())
        ).slice(0, 2)
      ).catch(() => []),

      Document.find(companyFilter).then(all =>
        all.filter(d =>
          d.name?.toLowerCase().includes(sanitizedQuery.toLowerCase())
        ).slice(0, 2)
      ).catch(() => [])
    ]);

    // Build suggestions array
    const suggestions = [
      ...stakeholders.map(s => ({
        text: s.name,
        type: 'stakeholder',
        entityType: 'stakeholder',
        id: s._id
      })),
      ...companies.map(c => ({
        text: c.CompanyName,
        type: 'company',
        entityType: 'company',
        id: c._id
      })),
      ...tasks.map(t => ({
        text: t.title,
        type: 'task',
        entityType: 'task',
        id: t._id
      })),
      ...documents.map(d => ({
        text: d.name,
        type: 'document',
        entityType: 'document',
        id: d._id
      }))
    ].slice(0, limit);

    return res.status(200).json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Get suggestions error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions'
    });
  }
};

module.exports = {
  globalSearch,
  getSearchSuggestions
};
