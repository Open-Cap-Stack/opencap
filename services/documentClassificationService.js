/**
 * Document Classification Service
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Provides document type classification, confidence scoring,
 * classifier training, and classification statistics
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');

/**
 * Supported classification types
 */
const CLASSIFICATION_TYPES = [
  'financial',
  'legal',
  'contract',
  'equity',
  'compliance',
  'hr',
  'technical',
  'corporate',
  'general'
];

/**
 * Classification patterns for rule-based classification
 */
const CLASSIFICATION_PATTERNS = {
  financial: {
    keywords: ['revenue', 'profit', 'income', 'balance sheet', 'cash flow', 'ebitda', 'earnings', 'financial', 'quarterly', 'annual report', 'fiscal', 'assets', 'liabilities', 'dividend', 'investment', 'roi', 'margin', 'gross', 'net income', 'budget', 'expense', 'accounting'],
    weight: 1.0
  },
  legal: {
    keywords: ['whereas', 'hereby', 'plaintiff', 'defendant', 'court', 'jurisdiction', 'lawsuit', 'litigation', 'statute', 'law', 'legal', 'attorney', 'counsel', 'judgment', 'verdict', 'appeal', 'petition', 'motion', 'fiduciary', 'tort', 'liability'],
    weight: 1.0
  },
  contract: {
    keywords: ['agreement', 'party', 'parties', 'terms', 'conditions', 'execute', 'signature', 'witness', 'effective date', 'termination', 'breach', 'indemnify', 'obligations', 'covenant', 'warrant', 'representation', 'amendment', 'binding', 'hereby agrees'],
    weight: 1.0
  },
  equity: {
    keywords: ['stock option', 'shares', 'vesting', 'exercise price', 'grant', 'optionee', 'equity', 'iso', 'nso', 'strike price', 'cliff', 'accelerate', 'dilution', 'cap table', 'preferred', 'common stock', 'warrant', 'convertible'],
    weight: 1.0
  },
  compliance: {
    keywords: ['compliance', 'audit', 'sox', 'sarbanes', 'sec', 'regulation', 'internal control', 'risk management', 'regulatory', 'policy', 'procedure', 'governance', 'oversight', 'monitoring', 'assessment', 'certification'],
    weight: 1.0
  },
  hr: {
    keywords: ['employee', 'handbook', 'vacation', 'pto', 'benefits', 'enrollment', 'performance review', 'compensation', 'salary', 'bonus', 'onboarding', 'termination', 'policy', 'workplace', 'conduct', 'harassment', 'discrimination'],
    weight: 1.0
  },
  technical: {
    keywords: ['api', 'documentation', 'endpoint', 'request', 'response', 'function', 'method', 'parameter', 'authentication', 'authorization', 'database', 'server', 'client', 'protocol', 'specification', 'implementation', 'architecture'],
    weight: 1.0
  },
  corporate: {
    keywords: ['board', 'directors', 'resolution', 'meeting', 'minutes', 'shareholder', 'bylaws', 'articles', 'incorporation', 'corporate', 'officer', 'ceo', 'cfo', 'secretary', 'quorum', 'vote', 'unanimously', 'charter'],
    weight: 1.0
  }
};

/**
 * Classification statistics storage
 */
let classificationStats = {
  totalClassifications: 0,
  classificationsByType: {},
  totalConfidence: 0,
  totalProcessingTime: 0,
  feedbackCount: 0,
  correctPredictions: 0,
  history: []
};

/**
 * Training data storage
 */
let trainingData = [];
let trainingHistory = [];

class DocumentClassificationService {
  constructor() {
    this.model = 'rule-based-v1';
  }

  /**
   * Classify a document based on its text content
   * @param {string} text - Document text to classify
   * @param {Object} options - Classification options
   * @returns {Promise<Object>} Classification result
   */
  async classifyDocument(text, options = {}) {
    const startTime = Date.now();

    if (text === null || text === undefined) {
      throw new Error('Text cannot be null or undefined');
    }

    if (!text || text.trim().length === 0) {
      return {
        type: 'unknown',
        confidence: 0,
        alternatives: [],
        classifiedAt: new Date().toISOString(),
        model: this.model
      };
    }

    const normalizedText = text.toLowerCase();
    const scores = {};

    // Calculate scores for each classification type
    for (const [type, patterns] of Object.entries(CLASSIFICATION_PATTERNS)) {
      let matchCount = 0;
      let totalWeight = 0;

      for (const keyword of patterns.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          matchCount++;
          // Longer keyword matches are weighted more heavily
          totalWeight += 1 + (keyword.length / 10);
        }
      }

      // Calculate normalized score
      const keywordScore = matchCount / patterns.keywords.length;
      const weightedScore = totalWeight / patterns.keywords.length;
      scores[type] = (keywordScore * 0.6 + weightedScore * 0.4) * patterns.weight;
    }

    // Sort types by score
    const sortedTypes = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([type, score]) => ({
        type,
        confidence: Math.min(score * 2, 0.99) // Scale and cap at 0.99
      }));

    const topType = sortedTypes[0];
    const alternatives = sortedTypes.slice(1, options.topN || 3);

    const processingTime = Date.now() - startTime;

    // Track statistics
    this.trackClassification(topType.type, topType.confidence, processingTime, options.groundTruth);

    return {
      type: topType.confidence > 0.1 ? topType.type : 'general',
      confidence: topType.confidence,
      alternatives,
      classifiedAt: new Date().toISOString(),
      model: this.model,
      processingTimeMs: processingTime
    };
  }

  /**
   * Get classification confidence for a specific type
   * @param {string} text - Document text
   * @param {string} type - Classification type (optional)
   * @returns {Promise<number|Object>} Confidence score(s)
   */
  async getClassificationConfidence(text, type) {
    if (!text || text.trim().length === 0) {
      if (type) {
        return 0;
      }
      return Object.fromEntries(CLASSIFICATION_TYPES.map(t => [t, 0]));
    }

    if (type && !CLASSIFICATION_TYPES.includes(type)) {
      throw new Error(`Invalid classification type: ${type}`);
    }

    const normalizedText = text.toLowerCase();

    const calculateTypeConfidence = (targetType) => {
      const patterns = CLASSIFICATION_PATTERNS[targetType];
      if (!patterns) return 0;

      let matchCount = 0;
      let totalWeight = 0;

      for (const keyword of patterns.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          matchCount++;
          totalWeight += 1 + (keyword.length / 10);
        }
      }

      const keywordScore = matchCount / patterns.keywords.length;
      const weightedScore = totalWeight / patterns.keywords.length;
      return Math.min((keywordScore * 0.6 + weightedScore * 0.4) * 2, 0.99);
    };

    if (type) {
      return calculateTypeConfidence(type);
    }

    // Return confidences for all types
    const confidences = {};
    for (const t of CLASSIFICATION_TYPES) {
      confidences[t] = calculateTypeConfidence(t);
    }

    return confidences;
  }

  /**
   * Train the classifier with new examples
   * @param {Array} data - Training data
   * @param {Object} options - Training options
   * @returns {Promise<Object>} Training result
   */
  async trainClassifier(data, options = {}) {
    if (!Array.isArray(data)) {
      throw new Error('Training data must be an array');
    }

    if (data.length === 0) {
      return {
        success: true,
        samplesProcessed: 0,
        metrics: { samplesPerType: {} }
      };
    }

    // Validate training data
    const invalidEntries = data.filter(entry => !entry.text || !entry.type);
    if (invalidEntries.length > 0) {
      throw new Error('Invalid training data: each entry must have text and type fields');
    }

    // Validate types if option is set
    if (options.validateTypes) {
      const invalidTypes = data.filter(entry => !CLASSIFICATION_TYPES.includes(entry.type));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid classification type: ${invalidTypes[0].type}`);
      }
    }

    // Track samples per type
    const samplesPerType = {};
    for (const entry of data) {
      samplesPerType[entry.type] = (samplesPerType[entry.type] || 0) + 1;
    }

    // Store training data
    if (options.incremental) {
      trainingData = [...trainingData, ...data];
    } else {
      trainingData = [...data];
    }

    // Record training history
    const trainingRecord = {
      timestamp: new Date().toISOString(),
      samplesProcessed: data.length,
      samplesPerType,
      incremental: options.incremental || false
    };
    trainingHistory.push(trainingRecord);

    return {
      success: true,
      samplesProcessed: data.length,
      metrics: {
        samplesPerType,
        totalTrainingData: trainingData.length
      },
      trainingId: `train_${Date.now()}`
    };
  }

  /**
   * Get training history
   * @returns {Promise<Array>} Training history
   */
  async getTrainingHistory() {
    return [...trainingHistory];
  }

  /**
   * Get classification statistics
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getClassificationStats(options = {}) {
    let filteredHistory = classificationStats.history;

    // Filter by date range if specified
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);

      filteredHistory = filteredHistory.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    const totalFromHistory = filteredHistory.length;
    const avgConfidence = totalFromHistory > 0
      ? filteredHistory.reduce((sum, e) => sum + e.confidence, 0) / totalFromHistory
      : 0;
    const avgProcessingTime = totalFromHistory > 0
      ? filteredHistory.reduce((sum, e) => sum + (e.processingTime || 0), 0) / totalFromHistory
      : 0;

    // Calculate classifications by type from filtered history
    const byType = {};
    filteredHistory.forEach(entry => {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    });

    // Calculate accuracy if ground truth is available
    const withGroundTruth = filteredHistory.filter(e => e.groundTruth);
    const accuracy = withGroundTruth.length > 0
      ? withGroundTruth.filter(e => e.type === e.groundTruth).length / withGroundTruth.length
      : null;

    return {
      totalClassifications: totalFromHistory,
      classificationsByType: byType,
      averageConfidence: avgConfidence,
      averageProcessingTime: avgProcessingTime,
      feedbackCount: classificationStats.feedbackCount,
      accuracy
    };
  }

  /**
   * Reset classification statistics
   */
  resetStats() {
    classificationStats = {
      totalClassifications: 0,
      classificationsByType: {},
      totalConfidence: 0,
      totalProcessingTime: 0,
      feedbackCount: 0,
      correctPredictions: 0,
      history: []
    };
  }

  /**
   * Track a classification for statistics
   * @param {string} type - Classified type
   * @param {number} confidence - Confidence score
   * @param {number} processingTime - Processing time in ms
   * @param {string} groundTruth - Actual type if known
   */
  trackClassification(type, confidence, processingTime, groundTruth) {
    classificationStats.totalClassifications++;
    classificationStats.classificationsByType[type] =
      (classificationStats.classificationsByType[type] || 0) + 1;
    classificationStats.totalConfidence += confidence;
    classificationStats.totalProcessingTime += processingTime;

    if (groundTruth && type === groundTruth) {
      classificationStats.correctPredictions++;
    }

    classificationStats.history.push({
      type,
      confidence,
      processingTime,
      groundTruth,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get list of supported classification types
   * @returns {Array} Supported types
   */
  getSupportedTypes() {
    return [...CLASSIFICATION_TYPES];
  }

  /**
   * Check if a type is valid
   * @param {string} type - Type to check
   * @returns {boolean} Whether the type is valid
   */
  isValidType(type) {
    return CLASSIFICATION_TYPES.includes(type);
  }

  /**
   * Classify multiple documents in batch
   * @param {Array} documents - Documents to classify
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch classification results
   */
  async classifyBatch(documents, options = {}) {
    const results = [];
    const errors = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        const result = await this.classifyDocument(doc.text, options);
        results.push({
          id: doc.id,
          ...result
        });
        processed++;
      } catch (error) {
        errors.push({
          id: doc.id,
          error: error.message
        });
        failed++;
      }

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          processed: processed + failed,
          total: documents.length,
          percentage: Math.round(((processed + failed) / documents.length) * 100)
        });
      }
    }

    return {
      processed,
      failed,
      results,
      errors
    };
  }

  /**
   * Submit feedback for a classification
   * @param {string} classificationId - Classification ID
   * @param {Object} feedback - Feedback data
   * @returns {Promise<Object>} Feedback result
   */
  async submitFeedback(classificationId, feedback) {
    classificationStats.feedbackCount++;

    // Store feedback for potential model improvement
    if (feedback.text && feedback.actualType) {
      trainingData.push({
        text: feedback.text,
        type: feedback.actualType,
        source: 'feedback',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      feedbackId: `fb_${Date.now()}`,
      classificationId
    };
  }
}

// Export singleton instance
module.exports = new DocumentClassificationService();
