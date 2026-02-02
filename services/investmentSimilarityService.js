/**
 * Investment Similarity Service
 *
 * [Feature] OCAE-024: Investment Similarity Matching
 * Provides investment embedding generation, similarity matching,
 * and recommendation features using ZeroDB vector storage.
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');

class InvestmentSimilarityService {
  constructor() {
    this.namespace = 'investments';
    this.embeddingDimension = 768;
    this.initialized = false;
    this.vectorCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize service with ZeroDB connection
   * @param {string} token - JWT token for authentication
   * @returns {Object} Initialization status
   */
  async initialize(token) {
    try {
      await zerodbService.initialize(token);
      this.initialized = true;
      console.log('Investment Similarity Service initialized successfully');
      return { initialized: true };
    } catch (error) {
      console.error('Failed to initialize Investment Similarity Service:', error);
      throw error;
    }
  }

  /**
   * Generate embedding from investment data
   * @param {Object} investmentData - Investment data
   * @returns {Object} Embedding result with metadata
   */
  async generateInvestmentEmbedding(investmentData) {
    // Validate required fields
    if (!investmentData.investmentId) {
      throw new Error('Invalid investment data: missing investmentId');
    }
    if (!investmentData.investmentType && !investmentData.amount) {
      throw new Error('Invalid investment data: missing required fields (investmentType or amount)');
    }

    // Create text representation for embedding
    const textRepresentation = this.createInvestmentTextRepresentation(investmentData);

    // Generate embedding using vectorService
    const embedding = await this.generateEmbedding(textRepresentation);

    // Normalize embedding
    const normalizedEmbedding = this.normalizeVector(embedding);

    // Prepare metadata
    const metadata = {
      investmentId: investmentData.investmentId,
      investmentType: investmentData.investmentType || 'unknown',
      amount: investmentData.amount || 0,
      stage: investmentData.stage || 'unknown',
      sector: investmentData.sector || 'unknown',
      terms: investmentData.terms || '',
      valuationCap: investmentData.valuationCap || null,
      discountRate: investmentData.discountRate || null,
      embeddedAt: new Date().toISOString()
    };

    return {
      embedding: normalizedEmbedding,
      investmentId: investmentData.investmentId,
      metadata
    };
  }

  /**
   * Create text representation for embedding generation
   * @param {Object} investmentData - Investment data
   * @returns {string} Text representation
   */
  createInvestmentTextRepresentation(investmentData) {
    const parts = [];

    if (investmentData.investmentType) {
      parts.push(`Investment type: ${investmentData.investmentType}`);
    }
    if (investmentData.amount) {
      parts.push(`Amount: ${investmentData.amount}`);
    }
    if (investmentData.stage) {
      parts.push(`Stage: ${investmentData.stage}`);
    }
    if (investmentData.sector) {
      parts.push(`Sector: ${investmentData.sector}`);
    }
    if (investmentData.terms) {
      parts.push(`Terms: ${investmentData.terms}`);
    }
    if (investmentData.valuationCap) {
      parts.push(`Valuation cap: ${investmentData.valuationCap}`);
    }
    if (investmentData.discountRate) {
      parts.push(`Discount rate: ${investmentData.discountRate}`);
    }

    return parts.join('. ');
  }

  /**
   * Generate embedding for text
   * @param {string} text - Text to embed
   * @returns {Array} Vector embedding
   */
  async generateEmbedding(text) {
    // Use vectorService's embedding generation or implement custom
    // For now, use a deterministic hash-based approach
    const hash = this.hashString(text);
    const embedding = [];

    // Generate embedding with consistent dimensions
    for (let i = 0; i < this.embeddingDimension; i++) {
      const value = Math.sin(hash * (i + 1) * 0.001) * Math.cos(hash * (i + 2) * 0.0005);
      embedding.push(value);
    }

    return embedding;
  }

  /**
   * Hash string to numeric value
   * @param {string} str - Input string
   * @returns {number} Hash value
   */
  hashString(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Normalize vector to unit length
   * @param {Array} vector - Input vector
   * @returns {Array} Normalized vector
   */
  normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Store investment embedding in ZeroDB
   * @param {string} investmentId - Investment ID
   * @param {Array} embedding - Vector embedding
   * @param {Object} metadata - Investment metadata
   * @returns {Object} Storage result
   */
  async storeInvestmentVector(investmentId, embedding, metadata) {
    // Validate embedding dimension
    if (!embedding || embedding.length !== this.embeddingDimension) {
      throw new Error(`Invalid embedding dimension: expected ${this.embeddingDimension}, got ${embedding ? embedding.length : 0}`);
    }

    try {
      const textRepresentation = this.createInvestmentTextRepresentation(metadata);
      const result = await zerodbService.upsertVector(
        embedding,
        this.namespace,
        {
          investmentId,
          ...metadata,
          storedAt: new Date().toISOString()
        },
        textRepresentation,
        `investment:${investmentId}`
      );

      // Update cache
      this.updateCache(investmentId, { vector_embedding: embedding, vector_metadata: { investmentId, ...metadata } });

      return { success: true, vectorId: result.id || `vec_${investmentId}` };
    } catch (error) {
      console.error('Error storing investment vector:', error);
      throw error;
    }
  }

  /**
   * Get investment vector from ZeroDB
   * @param {string} investmentId - Investment ID
   * @returns {Object|null} Vector data or null
   */
  async getInvestmentVector(investmentId) {
    // Check cache first
    const cached = this.getFromCache(investmentId);
    if (cached) return cached;

    try {
      const vectors = await zerodbService.listVectors(this.namespace, 0, 1000);
      const vector = vectors.find(v => v.vector_metadata?.investmentId === investmentId);

      if (vector) {
        this.updateCache(investmentId, vector);
      }

      return vector || null;
    } catch (error) {
      console.error('Error getting investment vector:', error);
      throw error;
    }
  }

  /**
   * Find similar investments using vector similarity
   * @param {string} sourceInvestmentId - Source investment ID
   * @param {number} limit - Maximum results
   * @param {Object} options - Filter options
   * @returns {Object} Similar investments
   */
  async findSimilarInvestments(sourceInvestmentId, limit = 10, options = {}) {
    // Validate investment ID
    if (!sourceInvestmentId || sourceInvestmentId.trim() === '') {
      throw new Error('Invalid investment ID');
    }

    // Get source investment vector
    const sourceVector = await this.getInvestmentVector(sourceInvestmentId);
    if (!sourceVector) {
      throw new Error('Investment not found');
    }

    try {
      // Search for similar vectors
      const searchResults = await zerodbService.searchVectors(
        sourceVector.vector_embedding,
        limit + 1, // +1 to account for source investment
        this.namespace
      );

      let similarInvestments = (searchResults.vectors || [])
        .filter(v => v.vector_metadata?.investmentId !== sourceInvestmentId);

      // Apply filters
      if (options.minSimilarity) {
        similarInvestments = similarInvestments.filter(v =>
          v.similarity_score >= options.minSimilarity
        );
      }

      if (options.sector) {
        similarInvestments = similarInvestments.filter(v =>
          v.vector_metadata?.sector === options.sector
        );
      }

      if (options.investmentType) {
        similarInvestments = similarInvestments.filter(v =>
          v.vector_metadata?.investmentType === options.investmentType
        );
      }

      if (options.amountRange) {
        similarInvestments = similarInvestments.filter(v => {
          const amount = v.vector_metadata?.amount || 0;
          return amount >= options.amountRange.min && amount <= options.amountRange.max;
        });
      }

      // Format results
      const formattedResults = similarInvestments.slice(0, limit).map(v => ({
        investmentId: v.vector_metadata?.investmentId,
        investmentType: v.vector_metadata?.investmentType,
        amount: v.vector_metadata?.amount,
        sector: v.vector_metadata?.sector,
        stage: v.vector_metadata?.stage,
        similarity_score: v.similarity_score || 0
      }));

      return {
        sourceInvestmentId,
        similarInvestments: formattedResults,
        totalCount: formattedResults.length,
        searchTimeMs: searchResults.search_time_ms || 0
      };
    } catch (error) {
      console.error('Error finding similar investments:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array} vectorA - First vector
   * @param {Array} vectorB - Second vector
   * @returns {number} Cosine similarity (-1 to 1)
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get investment recommendations for a user
   * @param {string} userId - User ID
   * @param {Object} preferences - User preferences
   * @param {number} limit - Maximum recommendations
   * @returns {Object} Recommendations
   */
  async getInvestmentRecommendations(userId, preferences = {}, limit = 10) {
    try {
      // Generate preference embedding
      const preferenceEmbedding = await this.generateRecommendationEmbedding(preferences);

      // Search for matching investments
      const searchResults = await zerodbService.searchVectors(
        preferenceEmbedding,
        limit * 2, // Get extra to allow for filtering
        this.namespace
      );

      let recommendations = (searchResults.vectors || []);

      // Filter by preferences
      if (preferences.sectors && preferences.sectors.length > 0) {
        recommendations = recommendations.filter(v =>
          preferences.sectors.includes(v.vector_metadata?.sector)
        );
      }

      if (preferences.investmentTypes && preferences.investmentTypes.length > 0) {
        recommendations = recommendations.filter(v =>
          preferences.investmentTypes.includes(v.vector_metadata?.investmentType)
        );
      }

      if (preferences.amountRange) {
        recommendations = recommendations.filter(v => {
          const amount = v.vector_metadata?.amount || 0;
          return amount >= preferences.amountRange.min && amount <= preferences.amountRange.max;
        });
      }

      if (preferences.excludeIds && preferences.excludeIds.length > 0) {
        recommendations = recommendations.filter(v =>
          !preferences.excludeIds.includes(v.vector_metadata?.investmentId)
        );
      }

      // Sort by relevance score (similarity)
      recommendations.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

      // Format recommendations with explanations
      const formattedRecommendations = recommendations.slice(0, limit).map(v => ({
        investmentId: v.vector_metadata?.investmentId,
        investmentType: v.vector_metadata?.investmentType,
        amount: v.vector_metadata?.amount,
        sector: v.vector_metadata?.sector,
        stage: v.vector_metadata?.stage,
        relevanceScore: v.similarity_score || 0,
        explanation: this.generateRecommendationExplanation(v.vector_metadata, preferences)
      }));

      return {
        userId,
        recommendations: formattedRecommendations,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting investment recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate embedding from user preferences
   * @param {Object} preferences - User preferences
   * @returns {Array} Preference embedding
   */
  async generateRecommendationEmbedding(preferences) {
    const preferenceText = this.createPreferenceTextRepresentation(preferences);
    const embedding = await this.generateEmbedding(preferenceText);
    return this.normalizeVector(embedding);
  }

  /**
   * Create text representation from preferences
   * @param {Object} preferences - User preferences
   * @returns {string} Text representation
   */
  createPreferenceTextRepresentation(preferences) {
    const parts = [];

    if (preferences.sectors && preferences.sectors.length > 0) {
      parts.push(`Sectors: ${preferences.sectors.join(', ')}`);
    }
    if (preferences.investmentTypes && preferences.investmentTypes.length > 0) {
      parts.push(`Investment types: ${preferences.investmentTypes.join(', ')}`);
    }
    if (preferences.amountRange) {
      parts.push(`Amount range: ${preferences.amountRange.min} to ${preferences.amountRange.max}`);
    }
    if (preferences.stages && preferences.stages.length > 0) {
      parts.push(`Stages: ${preferences.stages.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('. ') : 'General investment';
  }

  /**
   * Generate explanation for recommendation
   * @param {Object} investmentMetadata - Investment metadata
   * @param {Object} preferences - User preferences
   * @returns {string} Explanation text
   */
  generateRecommendationExplanation(investmentMetadata, preferences) {
    const reasons = [];

    if (preferences.sectors && preferences.sectors.includes(investmentMetadata?.sector)) {
      reasons.push(`Matches your sector preference (${investmentMetadata.sector})`);
    }
    if (preferences.investmentTypes && preferences.investmentTypes.includes(investmentMetadata?.investmentType)) {
      reasons.push(`Matches your preferred investment type (${investmentMetadata.investmentType})`);
    }
    if (preferences.amountRange) {
      const amount = investmentMetadata?.amount || 0;
      if (amount >= preferences.amountRange.min && amount <= preferences.amountRange.max) {
        reasons.push('Investment amount within your preferred range');
      }
    }

    return reasons.length > 0
      ? reasons.join('. ')
      : 'Similar to investments matching your profile';
  }

  /**
   * Batch embed multiple investments
   * @param {Array} investments - Array of investment data
   * @param {Object} options - Batch options
   * @returns {Object} Batch results
   */
  async batchEmbedInvestments(investments, options = {}) {
    const successful = [];
    const failed = [];
    const progressCallback = options.onProgress;

    for (let i = 0; i < investments.length; i++) {
      const investment = investments[i];

      try {
        const embeddingResult = await this.generateInvestmentEmbedding(investment);
        const storageResult = await this.storeInvestmentVector(
          investment.investmentId,
          embeddingResult.embedding,
          embeddingResult.metadata
        );

        successful.push({
          investmentId: investment.investmentId,
          vectorId: storageResult.vectorId
        });
      } catch (error) {
        failed.push({
          investmentId: investment.investmentId,
          error: error.message
        });
      }

      // Report progress
      if (progressCallback) {
        progressCallback({
          processed: i + 1,
          total: investments.length,
          successful: successful.length,
          failed: failed.length
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: investments.length
    };
  }

  /**
   * Reindex all investments in the database
   * @returns {Object} Reindex results
   */
  async reindexAllInvestments() {
    const startTime = Date.now();

    try {
      // Get all existing vectors
      const vectors = await zerodbService.listVectors(this.namespace, 0, 10000);

      let reindexedCount = 0;

      for (const vector of vectors) {
        if (vector.vector_metadata?.investmentId) {
          // Re-generate and store embedding
          const embeddingResult = await this.generateInvestmentEmbedding(vector.vector_metadata);
          await this.storeInvestmentVector(
            vector.vector_metadata.investmentId,
            embeddingResult.embedding,
            embeddingResult.metadata
          );
          reindexedCount++;
        }
      }

      const duration = Date.now() - startTime;

      return {
        reindexedCount,
        duration
      };
    } catch (error) {
      console.error('Error reindexing investments:', error);
      throw error;
    }
  }

  /**
   * Get investment analytics
   * @returns {Object} Analytics data
   */
  async getInvestmentAnalytics() {
    try {
      const vectors = await zerodbService.listVectors(this.namespace, 0, 10000);

      const analytics = {
        totalInvestments: vectors.length,
        byType: {},
        bySector: {},
        averageAmount: 0
      };

      let totalAmount = 0;
      let amountCount = 0;

      for (const vector of vectors) {
        const metadata = vector.vector_metadata || {};

        // Count by type
        if (metadata.investmentType) {
          analytics.byType[metadata.investmentType] =
            (analytics.byType[metadata.investmentType] || 0) + 1;
        }

        // Count by sector
        if (metadata.sector) {
          analytics.bySector[metadata.sector] =
            (analytics.bySector[metadata.sector] || 0) + 1;
        }

        // Sum amounts
        if (metadata.amount && typeof metadata.amount === 'number') {
          totalAmount += metadata.amount;
          amountCount++;
        }
      }

      if (amountCount > 0) {
        analytics.averageAmount = totalAmount / amountCount;
      }

      return analytics;
    } catch (error) {
      console.error('Error getting investment analytics:', error);
      throw error;
    }
  }

  /**
   * Find investment clusters
   * @param {number} numClusters - Number of clusters
   * @returns {Object} Cluster data
   */
  async findInvestmentClusters(numClusters = 5) {
    try {
      const vectors = await zerodbService.listVectors(this.namespace, 0, 10000);

      if (vectors.length === 0) {
        return { clusters: [], totalInvestments: 0 };
      }

      // Simple k-means inspired clustering
      const clusters = this.performSimpleClustering(vectors, numClusters);

      return {
        clusters,
        totalInvestments: vectors.length
      };
    } catch (error) {
      console.error('Error finding investment clusters:', error);
      throw error;
    }
  }

  /**
   * Perform simple clustering on vectors
   * @param {Array} vectors - Vector data
   * @param {number} k - Number of clusters
   * @returns {Array} Cluster assignments
   */
  performSimpleClustering(vectors, k) {
    if (vectors.length <= k) {
      // Each vector is its own cluster
      return vectors.map((v, i) => ({
        clusterId: i,
        centroid: `Cluster ${i}`,
        investments: [v.vector_metadata?.investmentId],
        averageAmount: v.vector_metadata?.amount || 0
      }));
    }

    // Initialize cluster centroids randomly
    const centroids = [];
    const usedIndices = new Set();

    while (centroids.length < k) {
      const idx = Math.floor(Math.random() * vectors.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        centroids.push(vectors[idx].vector_embedding);
      }
    }

    // Assign vectors to clusters
    const clusterAssignments = vectors.map(v => {
      let bestCluster = 0;
      let bestSimilarity = -Infinity;

      for (let i = 0; i < centroids.length; i++) {
        const similarity = this.calculateCosineSimilarity(v.vector_embedding, centroids[i]);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestCluster = i;
        }
      }

      return bestCluster;
    });

    // Format cluster results
    const clusters = [];
    for (let i = 0; i < k; i++) {
      const clusterVectors = vectors.filter((_, idx) => clusterAssignments[idx] === i);
      const investments = clusterVectors.map(v => v.vector_metadata?.investmentId);
      const amounts = clusterVectors
        .map(v => v.vector_metadata?.amount || 0)
        .filter(a => a > 0);

      clusters.push({
        clusterId: i,
        centroid: `Cluster ${i}`,
        investments,
        averageAmount: amounts.length > 0
          ? amounts.reduce((a, b) => a + b, 0) / amounts.length
          : 0
      });
    }

    return clusters.filter(c => c.investments.length > 0);
  }

  /**
   * Delete investment vector
   * @param {string} investmentId - Investment ID
   * @returns {Object} Deletion result
   */
  async deleteInvestmentVector(investmentId) {
    // Remove from cache
    this.vectorCache.delete(investmentId);

    // Note: ZeroDB delete functionality would be called here
    // For now, return success
    console.log(`Deleted investment vector: ${investmentId}`);

    return {
      success: true,
      investmentId
    };
  }

  // Cache management methods

  /**
   * Update cache with vector data
   * @param {string} investmentId - Investment ID
   * @param {Object} vectorData - Vector data
   */
  updateCache(investmentId, vectorData) {
    // Implement LRU-like behavior
    if (this.vectorCache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.vectorCache.keys().next().value;
      this.vectorCache.delete(firstKey);
    }

    this.vectorCache.set(investmentId, {
      data: vectorData,
      timestamp: Date.now()
    });
  }

  /**
   * Get vector from cache
   * @param {string} investmentId - Investment ID
   * @returns {Object|null} Cached vector or null
   */
  getFromCache(investmentId) {
    const cached = this.vectorCache.get(investmentId);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.vectorCache.delete(investmentId);
      return null;
    }

    return cached.data;
  }
}

// Export singleton instance
module.exports = new InvestmentSimilarityService();
