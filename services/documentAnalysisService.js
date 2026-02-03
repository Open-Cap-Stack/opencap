/**
 * Document Analysis Service
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Provides sentiment analysis, risk detection, financial data extraction,
 * and AI-generated insights for document analysis
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');

/**
 * Sentiment patterns
 */
const SENTIMENT_PATTERNS = {
  positive: [
    'excellent', 'outstanding', 'exceptional', 'successful', 'achieved', 'growth',
    'increased', 'improved', 'strong', 'positive', 'exceeded', 'profitable',
    'opportunity', 'innovative', 'leading', 'best', 'great', 'fantastic',
    'remarkable', 'impressive', 'thriving', 'expanding', 'flourishing'
  ],
  negative: [
    'decline', 'loss', 'failed', 'decrease', 'negative', 'risk', 'concern',
    'problem', 'issue', 'challenge', 'difficult', 'poor', 'weak', 'unfavorable',
    'downturn', 'deficit', 'shortfall', 'disappointing', 'struggling', 'critical',
    'severe', 'crisis', 'bankruptcy', 'lawsuit', 'penalty', 'violation'
  ]
};

/**
 * Risk patterns by category
 */
const RISK_PATTERNS = {
  financial: {
    keywords: ['debt', 'default', 'insolvency', 'bankruptcy', 'cash flow', 'credit', 'liquidity', 'deficit', 'loss', 'negative'],
    severity_keywords: { critical: ['bankruptcy', 'insolvency', 'default'], high: ['debt', 'deficit', 'loss'] }
  },
  legal: {
    keywords: ['lawsuit', 'litigation', 'legal', 'court', 'penalty', 'fine', 'violation', 'settlement', 'claim', 'dispute'],
    severity_keywords: { critical: ['lawsuit', 'litigation', 'criminal'], high: ['penalty', 'fine', 'violation'] }
  },
  operational: {
    keywords: ['disruption', 'downtime', 'failure', 'delay', 'shortage', 'supply chain', 'outage', 'incident', 'breakdown'],
    severity_keywords: { critical: ['outage', 'failure', 'breakdown'], high: ['disruption', 'shortage'] }
  },
  compliance: {
    keywords: ['non-compliance', 'violation', 'regulatory', 'audit', 'GDPR', 'SEC', 'SOX', 'breach', 'infringement'],
    severity_keywords: { critical: ['breach', 'violation'], high: ['non-compliance', 'audit finding'] }
  },
  market: {
    keywords: ['competition', 'market share', 'volatility', 'downturn', 'recession', 'decline', 'disruption'],
    severity_keywords: { critical: ['recession', 'market collapse'], high: ['volatility', 'decline'] }
  }
};

/**
 * Financial extraction patterns
 */
const FINANCIAL_PATTERNS = {
  revenue: /(?:revenue|sales|income)\s*(?:of|was|reached|totaled)?\s*\$?[\d,.]+\s*(?:million|billion|M|B)?/gi,
  profit: /(?:profit|net income|earnings|income)\s*(?:of|was|reached)?\s*\$?[\d,.]+\s*(?:million|billion|M|B)?/gi,
  expense: /(?:expense|cost|spending)\s*(?:of|was|totaled)?\s*\$?[\d,.]+\s*(?:million|billion|M|B)?/gi,
  money: /\$[\d,]+(?:\.\d{1,2})?(?:\s*(?:million|billion|M|B|K))?/gi,
  percentage: /(?:increased|decreased|grew|declined|up|down)\s*(?:by\s*)?\d+(?:\.\d+)?%/gi,
  valuation: /(?:valued|valuation|worth)\s*(?:at|of)?\s*\$?[\d,.]+\s*(?:million|billion|M|B)?/gi,
  share: /(?:share price|stock|EPS|earnings per share)\s*(?:of|was|at)?\s*\$?[\d,.]+/gi
};

class DocumentAnalysisService {
  constructor() {
    this.model = 'analysis-v1';
  }

  /**
   * Analyze sentiment of document text
   * @param {string} text - Document text to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeSentiment(text, options = {}) {
    if (text === null || text === undefined) {
      throw new Error('Text cannot be null or undefined');
    }

    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        hasMixedSentiment: false,
        keyPhrases: [],
        sectionSentiments: []
      };
    }

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    const keyPhrases = [];

    // Count sentiment words
    for (const word of SENTIMENT_PATTERNS.positive) {
      const matches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      if (matches > 0) {
        positiveCount += matches;
        keyPhrases.push({ phrase: word, sentiment: 'positive' });
      }
    }

    for (const word of SENTIMENT_PATTERNS.negative) {
      const matches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      if (matches > 0) {
        negativeCount += matches;
        keyPhrases.push({ phrase: word, sentiment: 'negative' });
      }
    }

    // Calculate score (-1 to 1)
    const total = positiveCount + negativeCount;
    let score = 0;
    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
    }

    // Determine sentiment
    let sentiment = 'neutral';
    if (score > 0.2) {
      sentiment = 'positive';
    } else if (score < -0.2) {
      sentiment = 'negative';
    }

    // Check for mixed sentiment
    const hasMixedSentiment = positiveCount > 2 && negativeCount > 2;

    // Calculate confidence based on word count
    const wordCount = text.split(/\s+/).length;
    let confidence = Math.min(total / Math.max(wordCount * 0.1, 1), 0.99);

    // Section sentiment analysis
    let sectionSentiments;
    if (options.bySections) {
      sectionSentiments = this.analyzeSectionSentiments(text);
    }

    return {
      sentiment,
      score,
      confidence,
      hasMixedSentiment,
      keyPhrases: options.extractPhrases ? keyPhrases.slice(0, 10) : undefined,
      sectionSentiments,
      positiveCount,
      negativeCount,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze sentiment by sections
   * @param {string} text - Document text
   * @returns {Array} Section sentiments
   */
  analyzeSectionSentiments(text) {
    // Split by paragraph or newlines
    const sections = text.split(/\n\n+/).filter(s => s.trim().length > 0);

    return sections.map((section, index) => {
      const lowerSection = section.toLowerCase();
      let positive = 0;
      let negative = 0;

      SENTIMENT_PATTERNS.positive.forEach(word => {
        if (lowerSection.includes(word)) positive++;
      });
      SENTIMENT_PATTERNS.negative.forEach(word => {
        if (lowerSection.includes(word)) negative++;
      });

      const total = positive + negative;
      const score = total > 0 ? (positive - negative) / total : 0;

      return {
        sectionIndex: index,
        sentiment: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
        score
      };
    });
  }

  /**
   * Detect risks in document text
   * @param {string} text - Document text to analyze
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Risk detection result
   */
  async detectRisks(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return {
        risks: [],
        overallRiskScore: 0,
        risksByCategory: {}
      };
    }

    const lowerText = text.toLowerCase();
    const risks = [];
    const risksByCategory = {};

    for (const [category, patterns] of Object.entries(RISK_PATTERNS)) {
      const categoryRisks = [];

      for (const keyword of patterns.keywords) {
        const regex = new RegExp(`[^.]*\\b${keyword}\\b[^.]*\\.?`, 'gi');
        const matches = text.match(regex) || [];

        for (const match of matches) {
          // Determine severity
          let severity = 'medium';
          for (const [sev, sevKeywords] of Object.entries(patterns.severity_keywords)) {
            if (sevKeywords.some(k => match.toLowerCase().includes(k))) {
              severity = sev;
              break;
            }
          }

          // Generate mitigation suggestion
          const mitigation = options.suggestMitigation
            ? this.generateMitigationSuggestion(category, keyword)
            : undefined;

          categoryRisks.push({
            category,
            keyword,
            severity,
            context: match.trim().substring(0, 200),
            mitigation
          });
        }
      }

      if (categoryRisks.length > 0) {
        risks.push(...categoryRisks);
        risksByCategory[category] = categoryRisks.length;
      }
    }

    // Calculate overall risk score
    const severityScores = { critical: 1.0, high: 0.7, medium: 0.4, low: 0.2 };
    const totalScore = risks.reduce((sum, risk) => sum + (severityScores[risk.severity] || 0.3), 0);
    const overallRiskScore = Math.min(totalScore / Math.max(risks.length, 1), 1);

    return {
      risks,
      overallRiskScore,
      risksByCategory,
      totalRisks: risks.length,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Generate mitigation suggestion for a risk
   * @param {string} category - Risk category
   * @param {string} keyword - Risk keyword
   * @returns {string} Mitigation suggestion
   */
  generateMitigationSuggestion(category, keyword) {
    const suggestions = {
      financial: 'Review cash flow projections and consider contingency financing options.',
      legal: 'Consult with legal counsel to assess exposure and develop response strategy.',
      operational: 'Implement backup systems and develop business continuity plans.',
      compliance: 'Conduct internal audit and implement remediation measures.',
      market: 'Diversify revenue streams and monitor market conditions closely.'
    };

    return suggestions[category] || 'Conduct detailed risk assessment and develop mitigation plan.';
  }

  /**
   * Extract financial data from document text
   * @param {string} text - Document text to analyze
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Financial data extraction result
   */
  async extractFinancialData(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return {
        financialData: {
          revenue: [],
          profit: [],
          expenses: [],
          percentageChanges: [],
          valuations: [],
          stockData: []
        },
        metrics: {}
      };
    }

    const financialData = {
      revenue: this.extractFinancialItems(text, 'revenue'),
      profit: this.extractFinancialItems(text, 'profit'),
      expenses: this.extractFinancialItems(text, 'expense'),
      percentageChanges: this.extractPercentageChanges(text),
      valuations: this.extractFinancialItems(text, 'valuation'),
      stockData: this.extractFinancialItems(text, 'share')
    };

    // Calculate metrics if requested
    let metrics;
    if (options.calculateMetrics && financialData.revenue.length > 0) {
      metrics = this.calculateFinancialMetrics(financialData);
    }

    return {
      financialData,
      metrics,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Extract financial items by type
   * @param {string} text - Document text
   * @param {string} type - Type of financial data
   * @returns {Array} Extracted items
   */
  extractFinancialItems(text, type) {
    const items = [];
    const pattern = FINANCIAL_PATTERNS[type];
    if (!pattern) return items;

    const matches = text.match(pattern) || [];

    for (const match of matches) {
      const amount = this.extractAmount(match);
      const period = this.extractPeriod(text, match);

      items.push({
        text: match,
        amount,
        period,
        type
      });
    }

    return items;
  }

  /**
   * Extract monetary amount from text
   * @param {string} text - Text containing amount
   * @returns {Object} Parsed amount
   */
  extractAmount(text) {
    const amountMatch = text.match(/\$?([\d,.]+)\s*(million|billion|M|B|K)?/i);
    if (!amountMatch) return null;

    let value = parseFloat(amountMatch[1].replace(/,/g, ''));
    const multiplier = amountMatch[2];

    if (multiplier) {
      const multipliers = {
        'million': 1000000, 'M': 1000000,
        'billion': 1000000000, 'B': 1000000000,
        'K': 1000, 'thousand': 1000
      };
      value *= multipliers[multiplier] || 1;
    }

    return {
      raw: amountMatch[0],
      value,
      currency: 'USD'
    };
  }

  /**
   * Extract time period from context
   * @param {string} fullText - Full document text
   * @param {string} match - Matched text
   * @returns {string|null} Extracted period
   */
  extractPeriod(fullText, match) {
    const periodPatterns = [
      /Q[1-4]\s*\d{4}/i,
      /(?:FY|fiscal year)\s*\d{4}/i,
      /\d{4}/,
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
    ];

    // Look for period near the match
    const matchIndex = fullText.indexOf(match);
    const context = fullText.substring(Math.max(0, matchIndex - 50), matchIndex + match.length + 50);

    for (const pattern of periodPatterns) {
      const periodMatch = context.match(pattern);
      if (periodMatch) {
        return periodMatch[0];
      }
    }

    return null;
  }

  /**
   * Extract percentage changes from text
   * @param {string} text - Document text
   * @returns {Array} Percentage changes
   */
  extractPercentageChanges(text) {
    const changes = [];
    const pattern = FINANCIAL_PATTERNS.percentage;
    const matches = text.match(pattern) || [];

    for (const match of matches) {
      const percentMatch = match.match(/(\d+(?:\.\d+)?)%/);
      const directionMatch = match.match(/increased|decreased|grew|declined|up|down/i);

      changes.push({
        text: match,
        percentage: percentMatch ? parseFloat(percentMatch[1]) : null,
        direction: directionMatch ? directionMatch[0].toLowerCase() : 'unknown'
      });
    }

    return changes;
  }

  /**
   * Calculate financial metrics
   * @param {Object} financialData - Extracted financial data
   * @returns {Object} Calculated metrics
   */
  calculateFinancialMetrics(financialData) {
    const metrics = {};

    if (financialData.revenue.length > 0 && financialData.profit.length > 0) {
      const revenue = financialData.revenue[0].amount?.value;
      const profit = financialData.profit[0].amount?.value;

      if (revenue && profit) {
        metrics.profitMargin = (profit / revenue * 100).toFixed(2) + '%';
      }
    }

    return metrics;
  }

  /**
   * Generate insights from document
   * @param {string} text - Document text
   * @param {Object} options - Insight options
   * @returns {Promise<Object>} Generated insights
   */
  async generateInsights(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return {
        insights: [],
        trends: [],
        anomalies: [],
        recommendations: [],
        comparisons: []
      };
    }

    const insights = [];

    // Extract financial data for insights
    const financialResult = await this.extractFinancialData(text);
    const sentimentResult = await this.analyzeSentiment(text);
    const riskResult = await this.detectRisks(text);

    // Generate financial insights
    if (financialResult.financialData.revenue.length > 0) {
      insights.push({
        category: 'financial',
        text: `Revenue data identified: ${financialResult.financialData.revenue.length} revenue figures found.`,
        confidence: 0.85,
        priority: 1
      });
    }

    if (financialResult.financialData.percentageChanges.length > 0) {
      const growthChanges = financialResult.financialData.percentageChanges.filter(
        c => ['increased', 'grew', 'up'].includes(c.direction)
      );
      if (growthChanges.length > 0) {
        insights.push({
          category: 'growth',
          text: `Positive growth indicators found: ${growthChanges.length} growth metrics identified.`,
          confidence: 0.8,
          priority: 2
        });
      }
    }

    // Generate sentiment insight
    if (sentimentResult.sentiment !== 'neutral') {
      insights.push({
        category: 'sentiment',
        text: `Document has ${sentimentResult.sentiment} sentiment (score: ${sentimentResult.score.toFixed(2)}).`,
        confidence: sentimentResult.confidence,
        priority: 3
      });
    }

    // Generate risk insight
    if (riskResult.risks.length > 0) {
      insights.push({
        category: 'risk',
        text: `${riskResult.totalRisks} risk indicators identified across ${Object.keys(riskResult.risksByCategory).length} categories.`,
        confidence: 0.85,
        priority: 1
      });
    }

    // Identify trends if requested
    let trends;
    if (options.identifyTrends) {
      trends = this.identifyTrends(financialResult, sentimentResult);
    }

    // Detect anomalies if requested
    let anomalies;
    if (options.detectAnomalies) {
      anomalies = this.detectAnomalies(text, financialResult);
    }

    // Generate recommendations if requested
    let recommendations;
    if (options.includeRecommendations) {
      recommendations = this.generateRecommendations(insights, riskResult);
    }

    // Comparison with benchmark if provided
    let comparisons;
    if (options.compareWithBenchmark) {
      comparisons = this.compareWithBenchmark(financialResult, options.compareWithBenchmark);
    }

    // Sort by priority if requested
    if (options.prioritize) {
      insights.sort((a, b) => a.priority - b.priority);
    }

    return {
      insights,
      trends,
      anomalies,
      recommendations,
      comparisons,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Identify trends in data
   * @param {Object} financialResult - Financial extraction result
   * @param {Object} sentimentResult - Sentiment analysis result
   * @returns {Array} Identified trends
   */
  identifyTrends(financialResult, sentimentResult) {
    const trends = [];

    const percentageChanges = financialResult.financialData.percentageChanges;
    const positiveChanges = percentageChanges.filter(c => ['increased', 'grew', 'up'].includes(c.direction));
    const negativeChanges = percentageChanges.filter(c => ['decreased', 'declined', 'down'].includes(c.direction));

    if (positiveChanges.length > negativeChanges.length) {
      trends.push({
        type: 'growth',
        direction: 'positive',
        description: 'Overall positive growth trend observed'
      });
    } else if (negativeChanges.length > positiveChanges.length) {
      trends.push({
        type: 'decline',
        direction: 'negative',
        description: 'Overall negative trend observed'
      });
    }

    return trends;
  }

  /**
   * Detect anomalies in data
   * @param {string} text - Document text
   * @param {Object} financialResult - Financial extraction result
   * @returns {Array} Detected anomalies
   */
  detectAnomalies(text, financialResult) {
    const anomalies = [];

    // Check for unusually high percentage changes
    for (const change of financialResult.financialData.percentageChanges) {
      if (change.percentage && change.percentage > 100) {
        anomalies.push({
          type: 'unusual_change',
          description: `Unusually high change: ${change.text}`,
          severity: change.percentage > 200 ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  /**
   * Generate recommendations based on analysis
   * @param {Array} insights - Generated insights
   * @param {Object} riskResult - Risk detection result
   * @returns {Array} Recommendations
   */
  generateRecommendations(insights, riskResult) {
    const recommendations = [];

    if (riskResult.risks.length > 0) {
      recommendations.push({
        category: 'risk_management',
        text: 'Develop mitigation strategies for identified risks.',
        priority: 'high'
      });
    }

    const hasFinancialData = insights.some(i => i.category === 'financial');
    if (hasFinancialData) {
      recommendations.push({
        category: 'financial_review',
        text: 'Review financial performance against targets and industry benchmarks.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Compare with benchmark data
   * @param {Object} financialResult - Financial extraction result
   * @param {Object} benchmark - Benchmark data
   * @returns {Array} Comparisons
   */
  compareWithBenchmark(financialResult, benchmark) {
    const comparisons = [];

    if (benchmark.previousRevenue && financialResult.financialData.revenue.length > 0) {
      const currentRevenue = financialResult.financialData.revenue[0].amount?.value;
      if (currentRevenue) {
        const change = ((currentRevenue - benchmark.previousRevenue) / benchmark.previousRevenue * 100);
        comparisons.push({
          metric: 'revenue',
          current: currentRevenue,
          previous: benchmark.previousRevenue,
          change: change.toFixed(2) + '%'
        });
      }
    }

    return comparisons;
  }

  /**
   * Perform comprehensive document analysis
   * @param {string} text - Document text
   * @returns {Promise<Object>} Complete analysis result
   */
  async analyzeDocument(text) {
    const [sentiment, risks, financialData, insights] = await Promise.all([
      this.analyzeSentiment(text),
      this.detectRisks(text),
      this.extractFinancialData(text),
      this.generateInsights(text)
    ]);

    return {
      sentiment,
      risks,
      financialData: financialData.financialData,
      insights: insights.insights,
      summary: `Document analysis complete. Sentiment: ${sentiment.sentiment}. Risks: ${risks.totalRisks || 0}. Financial items: ${financialData.financialData.revenue.length + financialData.financialData.profit.length}.`,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze documents in batch
   * @param {Array} documents - Documents to analyze
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch analysis results
   */
  async analyzeBatch(documents, options = {}) {
    const results = [];
    const errors = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        const result = await this.analyzeDocument(doc.text);
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
}

// Export singleton instance
module.exports = new DocumentAnalysisService();
