/**
 * Document Processing Service
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Provides text extraction, preprocessing, language detection, and entity extraction
 * for document processing workflows
 */

const zerodbService = require('./zerodbService');

/**
 * Supported MIME types for text extraction
 */
const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/csv',
  'text/html',
  'application/pdf',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff'
];

/**
 * Language detection patterns (simplified patterns for common languages)
 */
const LANGUAGE_PATTERNS = {
  en: {
    words: ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'been', 'being', 'will', 'would', 'could', 'should', 'and', 'but', 'or', 'not', 'with', 'from'],
    weight: 1.0
  },
  es: {
    words: ['el', 'la', 'los', 'las', 'es', 'son', 'fue', 'ser', 'estar', 'tiene', 'tener', 'que', 'de', 'en', 'para', 'por', 'con', 'como', 'pero', 'si'],
    weight: 1.0
  },
  fr: {
    words: ['le', 'la', 'les', 'est', 'sont', 'avoir', 'etre', 'fait', 'faire', 'que', 'qui', 'de', 'du', 'des', 'en', 'pour', 'avec', 'dans', 'sur', 'pas'],
    weight: 1.0
  },
  de: {
    words: ['der', 'die', 'das', 'ist', 'sind', 'war', 'haben', 'hat', 'sein', 'werden', 'und', 'oder', 'aber', 'nicht', 'mit', 'von', 'zu', 'auf', 'fur', 'bei'],
    weight: 1.0
  },
  pt: {
    words: ['o', 'a', 'os', 'as', 'e', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'nao', 'que', 'se', 'por', 'mais', 'como', 'seu'],
    weight: 1.0
  },
  it: {
    words: ['il', 'la', 'i', 'le', 'e', 'di', 'che', 'non', 'un', 'una', 'per', 'sono', 'con', 'questo', 'come', 'ma', 'da', 'anche', 'piu', 'si'],
    weight: 1.0
  }
};

/**
 * Entity extraction patterns
 */
const ENTITY_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  money: /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?|\d+(?:\.\d+)?\s*(?:million|billion|thousand)\s*(?:dollars?|USD)?/gi,
  percentage: /\d+(?:\.\d+)?%/g,
  date: /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/gi,
  stockTicker: /\b[A-Z]{2,5}\b(?=\s+(?:stock|shares|equity|options)|(?:\s+is\s+|\s+was\s+))/g,
  legalReference: /(?:Section|Article|Clause)\s+\d+[A-Za-z]*(?:\s+of\s+[^.]+)?|(?:Internal Revenue Code|Delaware General Corporation Law|Securities Act)/gi
};

/**
 * Common company suffixes for entity extraction
 */
const COMPANY_SUFFIXES = ['Inc.', 'Inc', 'LLC', 'Ltd.', 'Ltd', 'Corp.', 'Corp', 'Corporation', 'Company', 'Co.', 'Co', 'LP', 'LLP', 'PLC', 'GmbH', 'AG', 'SA'];

class DocumentProcessingService {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Extract text from document content based on MIME type
   * @param {string|Buffer} content - Document content
   * @param {string} mimeType - MIME type of the content
   * @returns {Promise<Object>} Extracted text with metadata
   */
  async extractText(content, mimeType) {
    if (content === null || content === undefined) {
      throw new Error('Content cannot be null or undefined');
    }

    if (!this.isSupportedMimeType(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    let text = '';

    try {
      switch (mimeType) {
        case 'text/plain':
        case 'text/csv':
          text = this.extractPlainText(content);
          break;
        case 'text/html':
          text = this.extractHtmlText(content);
          break;
        case 'application/pdf':
          text = await this.extractPdfText(content);
          break;
        case 'application/json':
          text = this.extractJsonText(content);
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          text = await this.extractWordText(content);
          break;
        case 'image/png':
        case 'image/jpeg':
        case 'image/gif':
        case 'image/tiff':
          text = await this.extractImageText(content);
          break;
        default:
          text = content.toString();
      }
    } catch (error) {
      // Return empty text on extraction errors instead of crashing
      text = '';
    }

    const wordCount = this.countWords(text);
    const characterCount = text.length;

    return {
      text,
      mimeType,
      wordCount,
      characterCount,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Extract text from plain text content
   * @param {string|Buffer} content - Plain text content
   * @returns {string} Extracted text
   */
  extractPlainText(content) {
    if (Buffer.isBuffer(content)) {
      return content.toString('utf-8');
    }
    return String(content);
  }

  /**
   * Extract text from HTML content
   * @param {string|Buffer} content - HTML content
   * @returns {string} Extracted text
   */
  extractHtmlText(content) {
    const html = Buffer.isBuffer(content) ? content.toString('utf-8') : String(content);
    // Remove HTML tags
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract text from PDF content (mocked for testing)
   * @param {Buffer} content - PDF buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractPdfText(content) {
    // In production, would use pdf.js-extract or similar
    // For now, return mock extraction
    if (!content || (Buffer.isBuffer(content) && content.length === 0)) {
      return '';
    }

    // Mock extraction - in production would use actual PDF parsing library
    return '[PDF text extraction placeholder]';
  }

  /**
   * Extract text from JSON content
   * @param {string|Buffer} content - JSON content
   * @returns {string} Stringified and flattened JSON text
   */
  extractJsonText(content) {
    try {
      const jsonStr = Buffer.isBuffer(content) ? content.toString('utf-8') : String(content);
      const json = JSON.parse(jsonStr);
      return this.flattenJson(json);
    } catch (error) {
      return String(content);
    }
  }

  /**
   * Flatten JSON object to searchable text
   * @param {Object} obj - JSON object
   * @returns {string} Flattened text
   */
  flattenJson(obj, prefix = '') {
    const parts = [];

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        continue;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.flattenJson(value, path));
      } else if (Array.isArray(value)) {
        parts.push(value.map(v =>
          typeof v === 'object' ? this.flattenJson(v, path) : String(v)
        ).join(' '));
      } else {
        parts.push(String(value));
      }
    }

    return parts.join(' ');
  }

  /**
   * Extract text from Word document (mocked for testing)
   * @param {Buffer} content - Word document buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractWordText(content) {
    // In production, would use mammoth or similar library
    if (!content || (Buffer.isBuffer(content) && content.length === 0)) {
      return '';
    }

    // Mock extraction - in production would use actual Word parsing library
    return '[Word document text extraction placeholder]';
  }

  /**
   * Extract text from image using OCR (mocked for testing)
   * @param {Buffer} content - Image buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractImageText(content) {
    // In production, would use Tesseract.js or cloud OCR service
    if (!content || (Buffer.isBuffer(content) && content.length === 0)) {
      return '';
    }

    // Mock OCR extraction - in production would use actual OCR
    return '[OCR text extraction placeholder]';
  }

  /**
   * Preprocess text for further processing
   * @param {string} text - Input text
   * @param {Object} options - Preprocessing options
   * @returns {Promise<Object>} Preprocessed text with metadata
   */
  async preprocessText(text, options = {}) {
    if (!text) {
      return {
        text: '',
        originalLength: 0,
        processedLength: 0,
        operationsApplied: []
      };
    }

    let result = text;
    const operationsApplied = [];

    // Normalize whitespace (always applied)
    result = result.replace(/\s+/g, ' ').trim();
    operationsApplied.push('normalizeWhitespace');

    // Remove HTML tags
    if (options.removeHtml) {
      result = result
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      operationsApplied.push('removeHtml');
    }

    // Convert to lowercase
    if (options.toLowerCase) {
      result = result.toLowerCase();
      operationsApplied.push('toLowerCase');
    }

    // Remove special characters
    if (options.removeSpecialChars) {
      result = result.replace(/[^\w\s.,!?'-]/g, '');
      operationsApplied.push('removeSpecialChars');
    }

    // Remove numbers
    if (options.removeNumbers) {
      result = result.replace(/\d+/g, '');
      operationsApplied.push('removeNumbers');
    }

    // Normalize whitespace again after all operations
    result = result.replace(/\s+/g, ' ').trim();

    return {
      text: result,
      originalLength: text.length,
      processedLength: result.length,
      operationsApplied
    };
  }

  /**
   * Detect the language of the text
   * @param {string} text - Input text
   * @returns {Promise<Object>} Language detection result
   */
  async detectLanguage(text) {
    if (!text || text.trim().length === 0) {
      return {
        language: 'unknown',
        confidence: 0,
        alternatives: [],
        isMultilingual: false
      };
    }

    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const wordSet = new Set(words);

    // Calculate scores for each language
    const scores = {};
    let totalMatches = 0;

    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matches = 0;
      for (const word of patterns.words) {
        if (wordSet.has(word)) {
          matches++;
        }
      }
      scores[lang] = (matches / patterns.words.length) * patterns.weight;
      totalMatches += matches;
    }

    // Find the language with highest score
    let detectedLanguage = 'en'; // Default to English
    let maxScore = 0;
    const alternatives = [];

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        if (maxScore > 0) {
          alternatives.push({ language: detectedLanguage, confidence: maxScore });
        }
        maxScore = score;
        detectedLanguage = lang;
      } else if (score > 0) {
        alternatives.push({ language: lang, confidence: score });
      }
    }

    // Sort alternatives by confidence
    alternatives.sort((a, b) => b.confidence - a.confidence);

    // Calculate confidence based on text length and match strength
    let confidence = maxScore;
    if (words.length < 5) {
      confidence *= 0.5; // Lower confidence for short text
    } else if (words.length < 20) {
      confidence *= 0.8;
    }

    // Cap confidence at 0.99
    confidence = Math.min(confidence, 0.99);

    // Detect multilingual text
    const isMultilingual = alternatives.some(alt => alt.confidence > 0.3 * maxScore);

    return {
      language: detectedLanguage,
      confidence,
      alternatives: alternatives.slice(0, 3),
      isMultilingual
    };
  }

  /**
   * Extract named entities from text
   * @param {string} text - Input text
   * @returns {Promise<Object>} Extracted entities
   */
  async extractEntities(text) {
    if (!text) {
      return {
        entities: {
          companies: [],
          people: [],
          dates: [],
          money: [],
          percentages: [],
          locations: [],
          emails: [],
          phoneNumbers: [],
          legalReferences: [],
          stockTickers: []
        },
        totalCount: 0
      };
    }

    const entities = {
      companies: this.extractCompanies(text),
      people: this.extractPeople(text),
      dates: this.extractDates(text),
      money: this.extractMoney(text),
      percentages: this.extractPercentages(text),
      locations: this.extractLocations(text),
      emails: this.extractEmails(text),
      phoneNumbers: this.extractPhoneNumbers(text),
      legalReferences: this.extractLegalReferences(text),
      stockTickers: this.extractStockTickers(text)
    };

    const totalCount = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0);

    return {
      entities,
      totalCount
    };
  }

  /**
   * Extract company names from text
   * @param {string} text - Input text
   * @returns {Array} Company entities
   */
  extractCompanies(text) {
    const companies = [];

    // Pattern for company names with common suffixes
    const suffixPattern = COMPANY_SUFFIXES.map(s => s.replace('.', '\\.')).join('|');
    const companyRegex = new RegExp(`([A-Z][a-zA-Z]*(?:\\s+[A-Z][a-zA-Z]*)*\\s+(?:${suffixPattern}))`, 'g');

    let match;
    while ((match = companyRegex.exec(text)) !== null) {
      companies.push({
        name: match[1].trim(),
        type: 'COMPANY',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.85
      });
    }

    return companies;
  }

  /**
   * Extract person names from text
   * @param {string} text - Input text
   * @returns {Array} Person entities
   */
  extractPeople(text) {
    const people = [];

    // Simple pattern for names (capitalized words that might be names)
    const nameRegex = /([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/g;

    const excludeWords = new Set(['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Which', 'While', 'With', 'From', 'Into', 'Under', 'Over', 'After', 'Before', 'During', 'Section', 'Article', 'Chapter']);

    let match;
    while ((match = nameRegex.exec(text)) !== null) {
      const firstName = match[1];
      const lastName = match[2];

      if (!excludeWords.has(firstName) && !excludeWords.has(lastName)) {
        const fullName = match[3] ? `${firstName} ${lastName} ${match[3]}` : `${firstName} ${lastName}`;
        people.push({
          name: fullName,
          firstName,
          lastName,
          type: 'PERSON',
          startIndex: match.index,
          endIndex: match.index + fullName.length,
          confidence: 0.7
        });
      }
    }

    return people;
  }

  /**
   * Extract dates from text
   * @param {string} text - Input text
   * @returns {Array} Date entities
   */
  extractDates(text) {
    const dates = [];
    const dateRegex = ENTITY_PATTERNS.date;

    let match;
    while ((match = dateRegex.exec(text)) !== null) {
      dates.push({
        text: match[0],
        type: 'DATE',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9
      });
    }

    return dates;
  }

  /**
   * Extract monetary amounts from text
   * @param {string} text - Input text
   * @returns {Array} Money entities
   */
  extractMoney(text) {
    const money = [];
    const moneyRegex = ENTITY_PATTERNS.money;

    let match;
    while ((match = moneyRegex.exec(text)) !== null) {
      money.push({
        text: match[0],
        type: 'MONEY',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.95
      });
    }

    return money;
  }

  /**
   * Extract percentages from text
   * @param {string} text - Input text
   * @returns {Array} Percentage entities
   */
  extractPercentages(text) {
    const percentages = [];
    const percentRegex = ENTITY_PATTERNS.percentage;

    let match;
    while ((match = percentRegex.exec(text)) !== null) {
      percentages.push({
        text: match[0],
        value: parseFloat(match[0]),
        type: 'PERCENTAGE',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.99
      });
    }

    return percentages;
  }

  /**
   * Extract locations from text
   * @param {string} text - Input text
   * @returns {Array} Location entities
   */
  extractLocations(text) {
    const locations = [];

    // Common US cities and states
    const cityStateRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(California|Texas|Florida|New York|Illinois|Pennsylvania|Ohio|Georgia|North Carolina|Michigan|Arizona|Washington|Colorado|Massachusetts|Virginia|Delaware|USA|United States)/g;

    let match;
    while ((match = cityStateRegex.exec(text)) !== null) {
      locations.push({
        text: match[0],
        city: match[1],
        state: match[2],
        type: 'LOCATION',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.85
      });
    }

    return locations;
  }

  /**
   * Extract email addresses from text
   * @param {string} text - Input text
   * @returns {Array} Email strings
   */
  extractEmails(text) {
    const matches = text.match(ENTITY_PATTERNS.email);
    return matches || [];
  }

  /**
   * Extract phone numbers from text
   * @param {string} text - Input text
   * @returns {Array} Phone number entities
   */
  extractPhoneNumbers(text) {
    const phoneNumbers = [];
    const phoneRegex = ENTITY_PATTERNS.phone;

    let match;
    while ((match = phoneRegex.exec(text)) !== null) {
      phoneNumbers.push({
        text: match[0],
        type: 'PHONE',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9
      });
    }

    return phoneNumbers;
  }

  /**
   * Extract legal references from text
   * @param {string} text - Input text
   * @returns {Array} Legal reference entities
   */
  extractLegalReferences(text) {
    const references = [];
    const legalRegex = ENTITY_PATTERNS.legalReference;

    let match;
    while ((match = legalRegex.exec(text)) !== null) {
      references.push({
        text: match[0],
        type: 'LEGAL_REFERENCE',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.85
      });
    }

    return references;
  }

  /**
   * Extract stock tickers from text
   * @param {string} text - Input text
   * @returns {Array} Stock ticker strings
   */
  extractStockTickers(text) {
    const tickers = new Set();

    // Look for common stock ticker patterns
    const tickerRegex = /\b(AAPL|GOOGL|GOOG|MSFT|AMZN|META|TSLA|NVDA|JPM|V|JNJ|WMT|PG|UNH|HD|MA|DIS|ADBE|NFLX|PYPL|INTC|CSCO|PFE|VZ|T|KO|PEP|ABT|MRK|NKE|CRM)\b/g;

    let match;
    while ((match = tickerRegex.exec(text)) !== null) {
      tickers.add(match[1]);
    }

    return Array.from(tickers);
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

  /**
   * Get list of supported MIME types
   * @returns {Array} Supported MIME types
   */
  getSupportedMimeTypes() {
    return [...SUPPORTED_MIME_TYPES];
  }

  /**
   * Check if MIME type is supported
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} Whether the MIME type is supported
   */
  isSupportedMimeType(mimeType) {
    return SUPPORTED_MIME_TYPES.includes(mimeType);
  }

  /**
   * Process multiple documents in batch
   * @param {Array} documents - Array of documents to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing results
   */
  async processBatch(documents, options = {}) {
    const results = [];
    const errors = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        const result = await this.extractText(doc.content, doc.mimeType);
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
}

// Export singleton instance
module.exports = new DocumentProcessingService();
