/**
 * Document Summary Service
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Provides document summarization, key point extraction,
 * executive summary generation, and multi-document summarization
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');

/**
 * Summary configuration
 */
const CONFIG = {
  DEFAULT_MAX_LENGTH: 500,
  DEFAULT_MAX_POINTS: 5,
  SENTENCE_IMPORTANCE_THRESHOLD: 0.3,
  EXECUTIVE_SUMMARY_TARGET: 150
};

/**
 * Key phrase patterns for importance scoring
 */
const IMPORTANCE_PATTERNS = {
  financial: ['revenue', 'profit', 'income', 'million', 'billion', 'growth', 'increase', 'decrease', 'earnings', 'margin'],
  action: ['must', 'should', 'need to', 'required', 'essential', 'critical', 'important', 'deadline', 'complete', 'submit'],
  result: ['achieved', 'reached', 'completed', 'successful', 'resulted', 'improved', 'reduced', 'increased', 'decreased'],
  quantitative: ['percent', '%', 'million', 'billion', 'thousand', 'ratio', 'rate', 'score', 'index']
};

class DocumentSummaryService {
  constructor() {
    this.model = 'extractive-v1';
  }

  /**
   * Generate a summary from document text
   * @param {string} text - Document text to summarize
   * @param {Object} options - Summary options
   * @returns {Promise<Object>} Summary result
   */
  async generateSummary(text, options = {}) {
    if (text === null || text === undefined) {
      throw new Error('Text cannot be null or undefined');
    }

    if (!text || text.trim().length === 0) {
      return {
        summary: '',
        wordCount: 0,
        compressionRatio: 0,
        style: options.style || 'extractive',
        sourceSentences: [],
        generatedAt: new Date().toISOString(),
        model: this.model
      };
    }

    const maxLength = options.maxLength || CONFIG.DEFAULT_MAX_LENGTH;
    const style = options.style || 'extractive';

    // Split into sentences
    const sentences = this.splitIntoSentences(text);

    // Score sentences by importance
    const scoredSentences = sentences.map((sentence, index) => ({
      text: sentence,
      index,
      score: this.calculateSentenceImportance(sentence, text, index, sentences.length)
    }));

    // Sort by score
    const rankedSentences = [...scoredSentences].sort((a, b) => b.score - a.score);

    // Select top sentences until max length is reached
    let summaryText = '';
    const selectedSentences = [];

    for (const sentence of rankedSentences) {
      const potentialText = summaryText + ' ' + sentence.text;
      if (potentialText.trim().length <= maxLength || selectedSentences.length === 0) {
        selectedSentences.push(sentence);
        summaryText = potentialText.trim();
      }
    }

    // Sort selected sentences by original order for coherence
    selectedSentences.sort((a, b) => a.index - b.index);
    const orderedSummary = selectedSentences.map(s => s.text).join(' ').trim();

    // Ensure summary ends with proper punctuation
    let finalSummary = orderedSummary;
    if (finalSummary && !finalSummary.match(/[.!?]$/)) {
      finalSummary += '.';
    }

    const originalWordCount = this.countWords(text);
    const summaryWordCount = this.countWords(finalSummary);
    const compressionRatio = originalWordCount > 0 ? summaryWordCount / originalWordCount : 0;

    return {
      summary: finalSummary,
      wordCount: summaryWordCount,
      originalWordCount,
      compressionRatio,
      style,
      sourceSentences: selectedSentences.map(s => ({
        text: s.text,
        index: s.index,
        score: s.score
      })),
      generatedAt: new Date().toISOString(),
      model: this.model
    };
  }

  /**
   * Extract key points from document
   * @param {string} text - Document text
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Key points result
   */
  async extractKeyPoints(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return {
        keyPoints: [],
        actionItems: []
      };
    }

    const maxPoints = options.maxPoints || CONFIG.DEFAULT_MAX_POINTS;
    const sentences = this.splitIntoSentences(text);

    // Score and categorize sentences
    const scoredSentences = sentences.map((sentence, index) => {
      const score = this.calculateSentenceImportance(sentence, text, index, sentences.length);
      const category = this.categorizeSentence(sentence);
      const hasNumbers = /\d+/.test(sentence);
      const isAction = this.isActionItem(sentence);

      return {
        text: sentence,
        index,
        score,
        category,
        hasNumbers,
        isAction,
        importance: score,
        confidence: Math.min(score * 1.2, 0.99)
      };
    });

    // Filter and sort
    let keyPoints = [...scoredSentences]
      .filter(s => s.score > CONFIG.SENTENCE_IMPORTANCE_THRESHOLD || s.hasNumbers)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPoints);

    // If ranked option, sort by importance
    if (options.ranked) {
      keyPoints.sort((a, b) => b.importance - a.importance);
    }

    // Extract action items if requested
    const actionItems = options.includeActions
      ? scoredSentences.filter(s => s.isAction)
      : undefined;

    return {
      keyPoints,
      actionItems,
      totalSentences: sentences.length
    };
  }

  /**
   * Generate an executive summary
   * @param {string} text - Document text
   * @param {Object} options - Summary options
   * @returns {Promise<Object>} Executive summary result
   */
  async generateExecutiveSummary(text, options = {}) {
    if (!text || text.trim().length === 0) {
      return {
        executiveSummary: '',
        format: options.format || 'paragraph',
        keyMetrics: []
      };
    }

    const targetLength = options.targetLength || CONFIG.EXECUTIVE_SUMMARY_TARGET;
    const format = options.format || 'paragraph';

    // Get the most important sentences
    const sentences = this.splitIntoSentences(text);
    const scoredSentences = sentences.map((sentence, index) => ({
      text: sentence,
      index,
      score: this.calculateSentenceImportance(sentence, text, index, sentences.length)
    }));

    // Get top sentences
    const topSentences = [...scoredSentences]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Sort by original order
    topSentences.sort((a, b) => a.index - b.index);

    let executiveSummary;

    if (format === 'bullet') {
      executiveSummary = topSentences.map(s => `- ${s.text.trim()}`).join('\n');
    } else {
      executiveSummary = topSentences.map(s => s.text.trim()).join(' ');
    }

    // Extract key metrics if requested
    const keyMetrics = options.includeMetrics
      ? this.extractMetrics(text)
      : [];

    return {
      executiveSummary,
      format,
      keyMetrics,
      wordCount: this.countWords(executiveSummary),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Summarize multiple documents into a unified summary
   * @param {Array} documents - Documents to summarize
   * @param {Object} options - Summary options
   * @returns {Promise<Object>} Multi-document summary result
   */
  async summarizeMultiple(documents, options = {}) {
    if (!documents || documents.length === 0) {
      return {
        unifiedSummary: '',
        documentSummaries: [],
        commonThemes: [],
        topicGroups: []
      };
    }

    // Generate individual summaries
    const documentSummaries = [];
    for (const doc of documents) {
      try {
        const summary = await this.generateSummary(doc.text);
        documentSummaries.push({
          id: doc.id,
          title: doc.title,
          summary: summary.summary,
          wordCount: summary.wordCount
        });
      } catch (error) {
        documentSummaries.push({
          id: doc.id,
          title: doc.title,
          summary: '',
          error: error.message
        });
      }
    }

    // Combine summaries
    const combinedText = documentSummaries
      .filter(s => s.summary)
      .map(s => s.summary)
      .join(' ');

    // Generate unified summary from combined text
    const unifiedResult = await this.generateSummary(combinedText, {
      maxLength: options.maxLength || 500
    });

    // Find common themes
    const commonThemes = this.findCommonThemes(documents);

    // Group by topic
    const topicGroups = this.groupByTopic(documents);

    // Analyze trends if requested
    const trends = options.analyzeTrends
      ? this.analyzeTrends(documents)
      : undefined;

    // Detect contradictions if requested
    const contradictions = options.detectContradictions
      ? this.detectContradictions(documents)
      : undefined;

    return {
      unifiedSummary: unifiedResult.summary,
      documentSummaries,
      commonThemes,
      topicGroups,
      trends,
      contradictions,
      documentCount: documents.length
    };
  }

  /**
   * Summarize documents in batch
   * @param {Array} documents - Documents to summarize
   * @param {Object} options - Batch options
   * @returns {Promise<Object>} Batch summary results
   */
  async summarizeBatch(documents, options = {}) {
    const results = [];
    const errors = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        const result = await this.generateSummary(doc.text);
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
   * Split text into sentences
   * @param {string} text - Input text
   * @returns {Array} Sentences
   */
  splitIntoSentences(text) {
    // Split on sentence boundaries while preserving common abbreviations
    const sentences = text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * Calculate importance score for a sentence
   * @param {string} sentence - Sentence to score
   * @param {string} fullText - Full document text
   * @param {number} position - Sentence position
   * @param {number} totalSentences - Total number of sentences
   * @returns {number} Importance score
   */
  calculateSentenceImportance(sentence, fullText, position, totalSentences) {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;

    // Position weight - first and last sentences are often important
    if (position < 3) {
      score += 0.2; // First few sentences
    } else if (position >= totalSentences - 2) {
      score += 0.1; // Last few sentences
    }

    // Length penalty for very short or very long sentences
    const words = sentence.split(/\s+/).length;
    if (words >= 5 && words <= 30) {
      score += 0.1;
    }

    // Check for important patterns
    for (const [category, patterns] of Object.entries(IMPORTANCE_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerSentence.includes(pattern.toLowerCase())) {
          score += 0.1;
        }
      }
    }

    // Numerical content bonus
    const numberMatches = sentence.match(/\d+/g);
    if (numberMatches) {
      score += Math.min(numberMatches.length * 0.05, 0.2);
    }

    // Capitalize named entities (proper nouns)
    const properNouns = sentence.match(/[A-Z][a-z]+/g);
    if (properNouns && properNouns.length > 0) {
      score += Math.min(properNouns.length * 0.03, 0.15);
    }

    // Cap the score
    return Math.min(score, 1.0);
  }

  /**
   * Categorize a sentence by content type
   * @param {string} sentence - Sentence to categorize
   * @returns {string} Category
   */
  categorizeSentence(sentence) {
    const lower = sentence.toLowerCase();

    for (const [category, patterns] of Object.entries(IMPORTANCE_PATTERNS)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          return category;
        }
      }
    }

    return 'general';
  }

  /**
   * Check if a sentence is an action item
   * @param {string} sentence - Sentence to check
   * @returns {boolean} Whether it's an action item
   */
  isActionItem(sentence) {
    const actionPatterns = [
      /\b(must|should|need to|have to|required to)\b/i,
      /\b(complete|submit|schedule|review|prepare|send)\b.*\b(by|before|until)\b/i,
      /\bdeadline\b/i,
      /\b(todo|to-do|action item)\b/i
    ];

    return actionPatterns.some(pattern => pattern.test(sentence));
  }

  /**
   * Extract metrics from text
   * @param {string} text - Input text
   * @returns {Array} Extracted metrics
   */
  extractMetrics(text) {
    const metrics = [];

    // Money amounts
    const moneyPattern = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|M|B))?/gi;
    const moneyMatches = text.match(moneyPattern);
    if (moneyMatches) {
      moneyMatches.forEach(match => {
        metrics.push({ type: 'money', value: match });
      });
    }

    // Percentages
    const percentPattern = /\d+(?:\.\d+)?%/g;
    const percentMatches = text.match(percentPattern);
    if (percentMatches) {
      percentMatches.forEach(match => {
        metrics.push({ type: 'percentage', value: match });
      });
    }

    // Growth/change indicators
    const growthPattern = /(increased|decreased|grew|reduced|improved)\s+(?:by\s+)?\d+/gi;
    const growthMatches = text.match(growthPattern);
    if (growthMatches) {
      growthMatches.forEach(match => {
        metrics.push({ type: 'change', value: match });
      });
    }

    return metrics;
  }

  /**
   * Find common themes across documents
   * @param {Array} documents - Documents to analyze
   * @returns {Array} Common themes
   */
  findCommonThemes(documents) {
    const wordFrequency = {};

    // Count word frequency across all documents
    for (const doc of documents) {
      if (!doc.text) continue;

      const words = doc.text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4); // Skip short words

      for (const word of words) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    }

    // Find words that appear in multiple documents
    const threshold = Math.max(2, Math.floor(documents.length * 0.5));
    const commonWords = Object.entries(wordFrequency)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ theme: word, occurrences: count }));

    return commonWords;
  }

  /**
   * Group documents by topic
   * @param {Array} documents - Documents to group
   * @returns {Array} Topic groups
   */
  groupByTopic(documents) {
    const topicKeywords = {
      financial: ['revenue', 'profit', 'income', 'financial', 'earnings', 'budget'],
      hr: ['employee', 'handbook', 'policy', 'benefits', 'vacation'],
      legal: ['agreement', 'contract', 'legal', 'court', 'law'],
      technical: ['api', 'documentation', 'system', 'software', 'technical']
    };

    const groups = {};

    for (const doc of documents) {
      if (!doc.text) continue;

      const lowerText = doc.text.toLowerCase();
      let assignedTopic = 'other';
      let maxScore = 0;

      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        let score = 0;
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            score++;
          }
        }
        if (score > maxScore) {
          maxScore = score;
          assignedTopic = topic;
        }
      }

      if (!groups[assignedTopic]) {
        groups[assignedTopic] = [];
      }
      groups[assignedTopic].push(doc.id);
    }

    return Object.entries(groups).map(([topic, docIds]) => ({
      topic,
      documentIds: docIds
    }));
  }

  /**
   * Analyze trends across documents
   * @param {Array} documents - Documents to analyze
   * @returns {Object} Trend analysis
   */
  analyzeTrends(documents) {
    const metrics = [];

    for (const doc of documents) {
      if (!doc.text) continue;

      const docMetrics = this.extractMetrics(doc.text);
      metrics.push({
        id: doc.id,
        title: doc.title,
        metrics: docMetrics
      });
    }

    return {
      documentCount: documents.length,
      metricsExtracted: metrics.reduce((sum, m) => sum + m.metrics.length, 0),
      byDocument: metrics
    };
  }

  /**
   * Detect contradictions across documents
   * @param {Array} documents - Documents to check
   * @returns {Array} Detected contradictions
   */
  detectContradictions(documents) {
    const contradictions = [];

    // Simple contradiction detection based on opposite keywords
    const opposites = {
      'increased': 'decreased',
      'grew': 'declined',
      'improved': 'worsened',
      'profit': 'loss',
      'growth': 'decline'
    };

    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        if (!documents[i].text || !documents[j].text) continue;

        const text1 = documents[i].text.toLowerCase();
        const text2 = documents[j].text.toLowerCase();

        for (const [word1, word2] of Object.entries(opposites)) {
          if ((text1.includes(word1) && text2.includes(word2)) ||
              (text1.includes(word2) && text2.includes(word1))) {
            contradictions.push({
              documents: [documents[i].id, documents[j].id],
              terms: [word1, word2],
              type: 'potential_contradiction'
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Count words in text
   * @param {string} text - Input text
   * @returns {number} Word count
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }
}

// Export singleton instance
module.exports = new DocumentSummaryService();
