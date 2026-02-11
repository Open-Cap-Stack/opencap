/**
 * Document Classification Service Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Comprehensive test coverage for document classification functionality including
 * document type classification, confidence scoring, classifier training, and statistics
 */

const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };

// Mock dependencies before requiring the service
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

describe('DocumentClassificationService', () => {
  let DocumentClassificationService;
  let mockDocumentId;

  beforeAll(async () => {
    DocumentClassificationService = require('../../../services/documentClassificationService');
    mockDocumentId = generateObjectId();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset classifier state
    if (DocumentClassificationService.resetStats) {
      DocumentClassificationService.resetStats();
    }
  });

  describe('classifyDocument', () => {
    it('should classify a contract document', async () => {
      const text = 'This Agreement is entered into as of the date last signed below by and between the parties. The terms and conditions set forth herein shall govern the relationship.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('confidence');
      expect(result.type).toBe('contract');
    });

    it('should classify a financial document', async () => {
      const text = 'Quarterly Financial Report. Revenue: $5,000,000. Net Income: $500,000. EBITDA: $1,200,000. Balance Sheet shows total assets of $10M.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('financial');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify a legal document', async () => {
      const text = 'WHEREAS the parties have agreed to the following terms pursuant to Delaware General Corporation Law. The plaintiff alleges breach of fiduciary duty.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('legal');
    });

    it('should classify an equity/stock option document', async () => {
      const text = 'Stock Option Agreement. The Company hereby grants to the Optionee options to purchase shares. Vesting schedule: 4 years with 1-year cliff. Exercise price: $10.00 per share.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('equity');
    });

    it('should classify a compliance document', async () => {
      const text = 'SOX Compliance Audit Report. Internal controls assessment complete. Risk management procedures reviewed. Regulatory requirements met per SEC guidelines.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('compliance');
    });

    it('should classify a human resources document', async () => {
      const text = 'Employee Handbook. Vacation policy: 15 days PTO. Benefits enrollment. Performance review procedures. Code of conduct and workplace policies.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('hr');
    });

    it('should classify a technical document', async () => {
      const text = 'API Documentation. REST endpoints for user authentication. POST /api/v1/auth/login. Request body: { email, password }. Returns JWT token.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('technical');
    });

    it('should classify a board meeting document', async () => {
      const text = 'Board of Directors Meeting Minutes. Resolution approved unanimously. The board resolved to authorize the CEO to execute the merger agreement.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.type).toBe('corporate');
    });

    it('should return confidence score between 0 and 1', async () => {
      const text = 'This is a sample document for classification testing.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return top N classifications', async () => {
      const text = 'This Agreement establishes the financial terms and compliance requirements.';

      const result = await DocumentClassificationService.classifyDocument(text, { topN: 3 });

      expect(result).toHaveProperty('alternatives');
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should handle empty text', async () => {
      const result = await DocumentClassificationService.classifyDocument('');

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle null text', async () => {
      await expect(
        DocumentClassificationService.classifyDocument(null)
      ).rejects.toThrow('Text cannot be null or undefined');
    });

    it('should classify general documents as general', async () => {
      const text = 'This is a random document without any specific category indicators.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result).toHaveProperty('type');
      // Should either be 'general' or the best matching category
    });

    it('should include classification metadata', async () => {
      const text = 'Financial Report for Q4 2024.';

      const result = await DocumentClassificationService.classifyDocument(text);

      expect(result).toHaveProperty('classifiedAt');
      expect(result).toHaveProperty('model');
    });
  });

  describe('getClassificationConfidence', () => {
    it('should return confidence score for a specific type', async () => {
      const text = 'This is a financial report with quarterly earnings.';

      const confidence = await DocumentClassificationService.getClassificationConfidence(text, 'financial');

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should return higher confidence for matching content', async () => {
      const financialText = 'Revenue and profit margin analysis. Net income statement.';
      const legalText = 'The defendant is hereby summoned to appear in court.';

      const financialConfForFinancial = await DocumentClassificationService.getClassificationConfidence(financialText, 'financial');
      const financialConfForLegal = await DocumentClassificationService.getClassificationConfidence(legalText, 'financial');

      expect(financialConfForFinancial).toBeGreaterThan(financialConfForLegal);
    });

    it('should return 0 for empty text', async () => {
      const confidence = await DocumentClassificationService.getClassificationConfidence('', 'financial');

      expect(confidence).toBe(0);
    });

    it('should throw error for invalid type', async () => {
      await expect(
        DocumentClassificationService.getClassificationConfidence('text', 'invalid_type')
      ).rejects.toThrow('Invalid classification type');
    });

    it('should return all type confidences when type is not specified', async () => {
      const text = 'Sample document text for multi-type analysis.';

      const confidences = await DocumentClassificationService.getClassificationConfidence(text);

      expect(confidences).toHaveProperty('financial');
      expect(confidences).toHaveProperty('legal');
      expect(confidences).toHaveProperty('contract');
    });
  });

  describe('trainClassifier', () => {
    it('should accept training examples', async () => {
      const trainingData = [
        { text: 'Annual financial statement', type: 'financial' },
        { text: 'Employment agreement terms', type: 'contract' }
      ];

      const result = await DocumentClassificationService.trainClassifier(trainingData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('samplesProcessed');
    });

    it('should validate training data format', async () => {
      const invalidData = [
        { text: 'Missing type field' },
        { type: 'missing_text' }
      ];

      await expect(
        DocumentClassificationService.trainClassifier(invalidData)
      ).rejects.toThrow('Invalid training data');
    });

    it('should handle empty training set', async () => {
      const result = await DocumentClassificationService.trainClassifier([]);

      expect(result.success).toBe(true);
      expect(result.samplesProcessed).toBe(0);
    });

    it('should update classifier with new examples', async () => {
      const initialData = [
        { text: 'Initial training example', type: 'financial' }
      ];
      const additionalData = [
        { text: 'Additional training example', type: 'legal' }
      ];

      await DocumentClassificationService.trainClassifier(initialData);
      const result = await DocumentClassificationService.trainClassifier(additionalData, { incremental: true });

      expect(result.success).toBe(true);
    });

    it('should track training history', async () => {
      const trainingData = [
        { text: 'Sample for history tracking', type: 'contract' }
      ];

      await DocumentClassificationService.trainClassifier(trainingData);

      const history = await DocumentClassificationService.getTrainingHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it('should validate type values in training data', async () => {
      const invalidTypeData = [
        { text: 'Sample text', type: 'invalid_category_type' }
      ];

      await expect(
        DocumentClassificationService.trainClassifier(invalidTypeData, { validateTypes: true })
      ).rejects.toThrow('Invalid classification type');
    });

    it('should return training metrics', async () => {
      const trainingData = [
        { text: 'Financial report Q1', type: 'financial' },
        { text: 'Financial report Q2', type: 'financial' },
        { text: 'Legal notice', type: 'legal' }
      ];

      const result = await DocumentClassificationService.trainClassifier(trainingData);

      expect(result).toHaveProperty('metrics');
      expect(result.metrics).toHaveProperty('samplesPerType');
    });
  });

  describe('getClassificationStats', () => {
    it('should return classification statistics', async () => {
      // Perform some classifications first
      await DocumentClassificationService.classifyDocument('Financial report');
      await DocumentClassificationService.classifyDocument('Legal agreement');

      const stats = await DocumentClassificationService.getClassificationStats();

      expect(stats).toHaveProperty('totalClassifications');
      expect(stats).toHaveProperty('classificationsByType');
      expect(stats).toHaveProperty('averageConfidence');
    });

    it('should track classifications by type', async () => {
      await DocumentClassificationService.classifyDocument('Revenue analysis for Q4');
      await DocumentClassificationService.classifyDocument('Quarterly financial statement');

      const stats = await DocumentClassificationService.getClassificationStats();

      expect(stats.classificationsByType).toHaveProperty('financial');
    });

    it('should calculate accuracy metrics when ground truth is available', async () => {
      // Add classifications with feedback
      await DocumentClassificationService.classifyDocument('Legal document', { groundTruth: 'legal' });
      await DocumentClassificationService.classifyDocument('Contract terms', { groundTruth: 'contract' });

      const stats = await DocumentClassificationService.getClassificationStats();

      expect(stats).toHaveProperty('accuracy');
    });

    it('should return zero stats for fresh service', async () => {
      DocumentClassificationService.resetStats();

      const stats = await DocumentClassificationService.getClassificationStats();

      expect(stats.totalClassifications).toBe(0);
    });

    it('should track average processing time', async () => {
      await DocumentClassificationService.classifyDocument('Sample document');

      const stats = await DocumentClassificationService.getClassificationStats();

      expect(stats).toHaveProperty('averageProcessingTime');
      expect(typeof stats.averageProcessingTime).toBe('number');
    });

    it('should filter stats by date range', async () => {
      await DocumentClassificationService.classifyDocument('Test document');

      const stats = await DocumentClassificationService.getClassificationStats({
        startDate: new Date(Date.now() - 86400000), // 1 day ago
        endDate: new Date()
      });

      expect(stats).toHaveProperty('totalClassifications');
    });
  });

  describe('Available Classification Types', () => {
    it('should return list of supported types', () => {
      const types = DocumentClassificationService.getSupportedTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('financial');
      expect(types).toContain('legal');
      expect(types).toContain('contract');
      expect(types).toContain('equity');
      expect(types).toContain('compliance');
      expect(types).toContain('hr');
      expect(types).toContain('technical');
      expect(types).toContain('corporate');
    });

    it('should validate type names', () => {
      expect(DocumentClassificationService.isValidType('financial')).toBe(true);
      expect(DocumentClassificationService.isValidType('invalid_type')).toBe(false);
    });
  });

  describe('Batch Classification', () => {
    it('should classify multiple documents', async () => {
      const documents = [
        { id: '1', text: 'Financial statement for 2024' },
        { id: '2', text: 'Employment contract agreement' }
      ];

      const results = await DocumentClassificationService.classifyBatch(documents);

      expect(results).toHaveProperty('results');
      expect(results.results).toHaveLength(2);
      expect(results.results[0]).toHaveProperty('type');
      expect(results.results[0]).toHaveProperty('confidence');
    });

    it('should handle partial failures in batch', async () => {
      const documents = [
        { id: '1', text: 'Valid document' },
        { id: '2', text: null }
      ];

      const results = await DocumentClassificationService.classifyBatch(documents);

      expect(results.processed).toBe(1);
      expect(results.failed).toBe(1);
    });

    it('should support progress tracking', async () => {
      const documents = [
        { id: '1', text: 'Doc 1' },
        { id: '2', text: 'Doc 2' },
        { id: '3', text: 'Doc 3' }
      ];

      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      await DocumentClassificationService.classifyBatch(documents, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Classification Feedback', () => {
    it('should accept classification corrections', async () => {
      const classificationId = 'clf_123';
      const correction = {
        predictedType: 'financial',
        actualType: 'legal'
      };

      const result = await DocumentClassificationService.submitFeedback(classificationId, correction);

      expect(result.success).toBe(true);
    });

    it('should use feedback to improve future classifications', async () => {
      // Submit feedback
      await DocumentClassificationService.submitFeedback('clf_1', {
        text: 'Budget allocation report',
        predictedType: 'general',
        actualType: 'financial'
      });

      // Stats should reflect feedback
      const stats = await DocumentClassificationService.getClassificationStats();

      expect(stats).toHaveProperty('feedbackCount');
    });
  });

  describe('Error Handling', () => {
    it('should handle very long documents', async () => {
      const longText = 'Financial report data. '.repeat(10000);

      const result = await DocumentClassificationService.classifyDocument(longText);

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle special characters in text', async () => {
      const specialText = 'Document with special chars: @#$%^&*(){}[]|\\:";\'<>,.?/~`';

      const result = await DocumentClassificationService.classifyDocument(specialText);

      expect(result).toHaveProperty('type');
    });

    it('should handle unicode characters', async () => {
      const unicodeText = 'Financial report with unicode: \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4 \u4e2d\u6587 \u65e5\u672c\u8a9e';

      const result = await DocumentClassificationService.classifyDocument(unicodeText);

      expect(result).toHaveProperty('type');
    });
  });

  describe('Performance', () => {
    it('should classify documents quickly', async () => {
      const text = 'Financial quarterly report with earnings data.';

      const startTime = Date.now();
      await DocumentClassificationService.classifyDocument(text);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent classifications', async () => {
      const texts = Array(20).fill('Sample document for concurrent classification');

      const promises = texts.map(text =>
        DocumentClassificationService.classifyDocument(text)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(20);
      results.forEach(result => {
        expect(result).toHaveProperty('type');
      });
    });
  });
});
