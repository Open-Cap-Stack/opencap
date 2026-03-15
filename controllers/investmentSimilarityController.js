/**
 * Investment Similarity Controller
 *
 * [Feature] OCAE-024: Investment Similarity Matching API
 * Provides REST endpoints for investment similarity matching,
 * embedding generation, and recommendation features.
 */

const investmentSimilarityService = require('../services/investmentSimilarityService');

/**
 * Create embedding for an investment
 * POST /api/v1/investments/:id/embed
 */
const createInvestmentEmbedding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const investmentData = req.body;

    // Validate investment ID
    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'Invalid investment ID',
        message: 'Investment ID is required'
      });
    }

    // Add ID to investment data
    investmentData.investmentId = id;

    // Generate embedding
    const embeddingResult = await investmentSimilarityService.generateInvestmentEmbedding(investmentData);

    // Store in ZeroDB
    const storageResult = await investmentSimilarityService.storeInvestmentVector(
      id,
      embeddingResult.embedding,
      embeddingResult.metadata
    );

    return res.status(201).json({
      investmentId: id,
      embedded: true,
      vectorId: storageResult.vectorId,
      metadata: embeddingResult.metadata
    });
  } catch (error) {
    console.error('Error creating investment embedding:', error);

    if (error.message.includes('Invalid investment data')) {
      return res.status(400).json({
        error: 'Invalid investment data',
        message: error.message
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Investment not found',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to create investment embedding',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Find similar investments
 * GET /api/v1/investments/:id/similar
 */
const findSimilarInvestments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      limit = '10',
      minSimilarity,
      sector,
      investmentType,
      minAmount,
      maxAmount
    } = req.query;

    // Parse and validate limit
    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = 10;
    }
    parsedLimit = Math.min(parsedLimit, 100); // Cap at 100

    // Build filter options
    const options = {};

    if (minSimilarity) {
      let similarity = parseFloat(minSimilarity);
      // Clamp to valid range
      similarity = Math.max(0, Math.min(1, similarity));
      options.minSimilarity = similarity;
    }

    if (sector) {
      options.sector = sector;
    }

    if (investmentType) {
      options.investmentType = investmentType;
    }

    if (minAmount || maxAmount) {
      options.amountRange = {
        min: minAmount ? parseInt(minAmount, 10) : 0,
        max: maxAmount ? parseInt(maxAmount, 10) : Number.MAX_SAFE_INTEGER
      };
    }

    const result = await investmentSimilarityService.findSimilarInvestments(id, parsedLimit, options);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error finding similar investments:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Investment not found',
        message: error.message
      });
    }

    if (error.message.includes('Invalid investment ID')) {
      return res.status(400).json({
        error: 'Invalid investment ID',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to find similar investments',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get investment recommendations
 * GET /api/v1/investments/recommendations
 */
const getRecommendations = async (req, res, next) => {
  try {
    // Check authentication
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    const {
      sectors,
      investmentTypes,
      minAmount,
      maxAmount,
      excludeIds,
      limit = '10'
    } = req.query;

    // Parse limit
    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      parsedLimit = 10;
    }
    parsedLimit = Math.min(parsedLimit, 50); // Cap at 50 for recommendations

    // Build preferences object
    const preferences = {};

    if (sectors) {
      preferences.sectors = sectors.split(',').map(s => s.trim());
    }

    if (investmentTypes) {
      preferences.investmentTypes = investmentTypes.split(',').map(t => t.trim());
    }

    if (minAmount || maxAmount) {
      preferences.amountRange = {
        min: minAmount ? parseInt(minAmount, 10) : 0,
        max: maxAmount ? parseInt(maxAmount, 10) : Number.MAX_SAFE_INTEGER
      };
    }

    if (excludeIds) {
      preferences.excludeIds = excludeIds.split(',').map(id => id.trim());
    }

    const result = await investmentSimilarityService.getInvestmentRecommendations(
      userId,
      preferences,
      parsedLimit
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting recommendations:', error);

    return res.status(500).json({
      error: 'Failed to get recommendations',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Batch embed multiple investments
 * POST /api/v1/investments/batch/embed
 */
const batchEmbedInvestments = async (req, res, next) => {
  try {
    const { investments } = req.body;

    // Validate input
    if (!investments || !Array.isArray(investments) || investments.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Investments array is required and cannot be empty'
      });
    }

    const result = await investmentSimilarityService.batchEmbedInvestments(investments);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error batch embedding investments:', error);

    return res.status(500).json({
      error: 'Failed to batch embed investments',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get investment analytics
 * GET /api/v1/investments/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const result = await investmentSimilarityService.getInvestmentAnalytics();

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting analytics:', error);

    return res.status(500).json({
      error: 'Failed to get analytics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get investment clusters
 * GET /api/v1/investments/clusters
 */
const getClusters = async (req, res, next) => {
  try {
    const { numClusters = '5' } = req.query;

    let parsedNumClusters = parseInt(numClusters, 10);
    if (isNaN(parsedNumClusters) || parsedNumClusters < 1) {
      parsedNumClusters = 5;
    }
    parsedNumClusters = Math.min(parsedNumClusters, 20); // Cap at 20 clusters

    const result = await investmentSimilarityService.findInvestmentClusters(parsedNumClusters);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting clusters:', error);

    return res.status(500).json({
      error: 'Failed to get clusters',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete investment embedding
 * DELETE /api/v1/investments/:id/embedding
 */
const deleteEmbedding = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await investmentSimilarityService.deleteInvestmentVector(id);

    return res.status(200).json({
      deleted: result.success,
      investmentId: id
    });
  } catch (error) {
    console.error('Error deleting embedding:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Embedding not found',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to delete embedding',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createInvestmentEmbedding,
  findSimilarInvestments,
  getRecommendations,
  batchEmbedInvestments,
  getAnalytics,
  getClusters,
  deleteEmbedding
};
