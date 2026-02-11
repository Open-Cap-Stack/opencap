/**
 * Document Summary Service Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Comprehensive test coverage for document summarization functionality including
 * summary generation, key point extraction, executive summaries, and multi-document summaries
 */

const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };

// Mock dependencies before requiring the service
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

describe('DocumentSummaryService', () => {
  let DocumentSummaryService;
  let mockDocumentId;

  beforeAll(async () => {
    DocumentSummaryService = require('../../../services/documentSummaryService');
    mockDocumentId = generateObjectId();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSummary', () => {
    const sampleDocument = `
      The Company entered into a definitive merger agreement with Acme Corporation.
      The transaction values Acme at $500 million, representing a 25% premium over
      the current stock price. The merger is expected to close in Q3 2024, subject
      to regulatory approval and shareholder vote. The combined entity will have
      over 5,000 employees and annual revenue exceeding $1 billion.

      Key benefits of the merger include:
      - Expanded market presence in the Asia-Pacific region
      - Combined R&D capabilities for product innovation
      - Cost synergies of approximately $50 million annually
      - Enhanced competitive position against market leaders

      The Board of Directors unanimously approved the transaction.
    `;

    it('should generate a summary from document text', async () => {
      const result = await DocumentSummaryService.generateSummary(sampleDocument);

      expect(result).toHaveProperty('summary');
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeLessThan(sampleDocument.length);
    });

    it('should respect maximum length parameter', async () => {
      const maxLength = 100;

      const result = await DocumentSummaryService.generateSummary(sampleDocument, { maxLength });

      expect(result.summary.length).toBeLessThanOrEqual(maxLength + 50); // Allow some flexibility
    });

    it('should include word count in result', async () => {
      const result = await DocumentSummaryService.generateSummary(sampleDocument);

      expect(result).toHaveProperty('wordCount');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should include compression ratio', async () => {
      const result = await DocumentSummaryService.generateSummary(sampleDocument);

      expect(result).toHaveProperty('compressionRatio');
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should handle empty text', async () => {
      const result = await DocumentSummaryService.generateSummary('');

      expect(result.summary).toBe('');
      expect(result.wordCount).toBe(0);
    });

    it('should handle null text', async () => {
      await expect(
        DocumentSummaryService.generateSummary(null)
      ).rejects.toThrow('Text cannot be null or undefined');
    });

    it('should support different summary styles', async () => {
      const extractiveResult = await DocumentSummaryService.generateSummary(sampleDocument, { style: 'extractive' });
      const abstractiveResult = await DocumentSummaryService.generateSummary(sampleDocument, { style: 'abstractive' });

      expect(extractiveResult).toHaveProperty('summary');
      expect(abstractiveResult).toHaveProperty('summary');
      expect(extractiveResult).toHaveProperty('style');
      expect(abstractiveResult).toHaveProperty('style');
    });

    it('should include source sentences for extractive summaries', async () => {
      const result = await DocumentSummaryService.generateSummary(sampleDocument, { style: 'extractive' });

      expect(result).toHaveProperty('sourceSentences');
      expect(Array.isArray(result.sourceSentences)).toBe(true);
    });

    it('should preserve important named entities', async () => {
      const result = await DocumentSummaryService.generateSummary(sampleDocument);

      // Check if key entities are preserved
      expect(result.summary.toLowerCase()).toMatch(/merger|acme|million/i);
    });

    it('should include processing metadata', async () => {
      const result = await DocumentSummaryService.generateSummary(sampleDocument);

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('model');
    });
  });

  describe('extractKeyPoints', () => {
    const sampleDocument = `
      Q4 2024 Financial Results:

      1. Revenue increased by 15% year-over-year to $250 million
      2. Operating margin improved to 22%, up from 18% last year
      3. Customer acquisition grew 30% with 10,000 new enterprise clients
      4. Successfully launched three new product lines in emerging markets
      5. Reduced operational costs by $20 million through automation
      6. Net promoter score reached all-time high of 72
      7. Expanded to 15 new countries across Europe and Asia
    `;

    it('should extract key points from document', async () => {
      const result = await DocumentSummaryService.extractKeyPoints(sampleDocument);

      expect(result).toHaveProperty('keyPoints');
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });

    it('should limit number of key points when specified', async () => {
      const result = await DocumentSummaryService.extractKeyPoints(sampleDocument, { maxPoints: 3 });

      expect(result.keyPoints.length).toBeLessThanOrEqual(3);
    });

    it('should rank key points by importance', async () => {
      const result = await DocumentSummaryService.extractKeyPoints(sampleDocument, { ranked: true });

      expect(result.keyPoints[0]).toHaveProperty('importance');
      // First point should have highest importance
      for (let i = 1; i < result.keyPoints.length; i++) {
        expect(result.keyPoints[i - 1].importance).toBeGreaterThanOrEqual(result.keyPoints[i].importance);
      }
    });

    it('should include confidence scores for each point', async () => {
      const result = await DocumentSummaryService.extractKeyPoints(sampleDocument);

      result.keyPoints.forEach(point => {
        expect(point).toHaveProperty('confidence');
        expect(point.confidence).toBeGreaterThanOrEqual(0);
        expect(point.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty text', async () => {
      const result = await DocumentSummaryService.extractKeyPoints('');

      expect(result.keyPoints).toHaveLength(0);
    });

    it('should categorize key points', async () => {
      const result = await DocumentSummaryService.extractKeyPoints(sampleDocument, { categorize: true });

      result.keyPoints.forEach(point => {
        expect(point).toHaveProperty('category');
      });
    });

    it('should extract numerical insights', async () => {
      const result = await DocumentSummaryService.extractKeyPoints(sampleDocument, { includeNumbers: true });

      const hasNumericalPoints = result.keyPoints.some(point =>
        point.text.match(/\d+/)
      );
      expect(hasNumericalPoints).toBe(true);
    });

    it('should identify action items', async () => {
      const documentWithActions = `
        Meeting notes: We need to complete the budget review by Friday.
        The team must submit quarterly reports by month end.
        Schedule a follow-up meeting with stakeholders.
      `;

      const result = await DocumentSummaryService.extractKeyPoints(documentWithActions, { includeActions: true });

      expect(result).toHaveProperty('actionItems');
    });
  });

  describe('generateExecutiveSummary', () => {
    const longDocument = `
      Annual Report 2024

      Executive Overview:
      This year marked a significant transformation for our company as we navigated
      challenging market conditions while achieving record-breaking results. Our
      strategic initiatives delivered substantial value to shareholders.

      Financial Performance:
      Total revenue reached $2.5 billion, representing a 20% increase from the
      previous year. Net income grew to $400 million, with earnings per share
      of $4.25. We maintained a strong balance sheet with $500 million in cash.

      Strategic Initiatives:
      We completed two major acquisitions, expanding our market presence. The
      integration of TechCo brought advanced AI capabilities. Our digital
      transformation program achieved 90% completion rate.

      Market Position:
      We strengthened our position as the market leader with 35% market share.
      Customer satisfaction scores improved across all segments. Brand recognition
      increased by 25% in target demographics.

      Outlook:
      For 2025, we project revenue growth of 15-18%. We plan to invest $200
      million in R&D. Three new product launches are scheduled for Q2.
    `;

    it('should generate a concise executive summary', async () => {
      const result = await DocumentSummaryService.generateExecutiveSummary(longDocument);

      expect(result).toHaveProperty('executiveSummary');
      expect(result.executiveSummary.length).toBeLessThan(longDocument.length * 0.3);
    });

    it('should target specific length', async () => {
      const targetLength = 150;

      const result = await DocumentSummaryService.generateExecutiveSummary(longDocument, { targetLength });

      // Executive summary should be reasonably concise
      expect(result.executiveSummary.length).toBeLessThan(500);
    });

    it('should include most important information', async () => {
      const result = await DocumentSummaryService.generateExecutiveSummary(longDocument);

      // Should contain key metrics
      expect(result.executiveSummary.toLowerCase()).toMatch(/revenue|billion|growth|market/i);
    });

    it('should be suitable for busy executives', async () => {
      const result = await DocumentSummaryService.generateExecutiveSummary(longDocument);

      // Executive summary should be short enough to read quickly
      const wordCount = result.executiveSummary.split(/\s+/).length;
      expect(wordCount).toBeLessThan(200);
    });

    it('should handle documents without clear structure', async () => {
      const unstructuredDoc = 'This is a simple unstructured document without headers or sections.';

      const result = await DocumentSummaryService.generateExecutiveSummary(unstructuredDoc);

      expect(result).toHaveProperty('executiveSummary');
    });

    it('should include key metrics when available', async () => {
      const result = await DocumentSummaryService.generateExecutiveSummary(longDocument, { includeMetrics: true });

      expect(result).toHaveProperty('keyMetrics');
      expect(Array.isArray(result.keyMetrics)).toBe(true);
    });

    it('should support different formats', async () => {
      const bulletResult = await DocumentSummaryService.generateExecutiveSummary(longDocument, { format: 'bullet' });
      const paragraphResult = await DocumentSummaryService.generateExecutiveSummary(longDocument, { format: 'paragraph' });

      expect(bulletResult.format).toBe('bullet');
      expect(paragraphResult.format).toBe('paragraph');
    });
  });

  describe('summarizeMultiple', () => {
    const documents = [
      {
        id: 'doc1',
        title: 'Q1 Report',
        text: 'Q1 revenue was $100 million with 10% growth. Customer base expanded to 50,000.'
      },
      {
        id: 'doc2',
        title: 'Q2 Report',
        text: 'Q2 revenue reached $120 million with 20% growth. Launched new product line.'
      },
      {
        id: 'doc3',
        title: 'Q3 Report',
        text: 'Q3 revenue hit $130 million. Expanded to 3 new markets. Reduced costs by 15%.'
      }
    ];

    it('should create a unified summary from multiple documents', async () => {
      const result = await DocumentSummaryService.summarizeMultiple(documents);

      expect(result).toHaveProperty('unifiedSummary');
      expect(result.unifiedSummary.length).toBeGreaterThan(0);
    });

    it('should include individual document summaries', async () => {
      const result = await DocumentSummaryService.summarizeMultiple(documents);

      expect(result).toHaveProperty('documentSummaries');
      expect(result.documentSummaries.length).toBe(3);
    });

    it('should identify common themes', async () => {
      const result = await DocumentSummaryService.summarizeMultiple(documents);

      expect(result).toHaveProperty('commonThemes');
      expect(Array.isArray(result.commonThemes)).toBe(true);
    });

    it('should track trends across documents', async () => {
      const result = await DocumentSummaryService.summarizeMultiple(documents, { analyzeTrends: true });

      expect(result).toHaveProperty('trends');
    });

    it('should handle empty document array', async () => {
      const result = await DocumentSummaryService.summarizeMultiple([]);

      expect(result.unifiedSummary).toBe('');
      expect(result.documentSummaries).toHaveLength(0);
    });

    it('should handle single document', async () => {
      const result = await DocumentSummaryService.summarizeMultiple([documents[0]]);

      expect(result).toHaveProperty('unifiedSummary');
      expect(result.documentSummaries.length).toBe(1);
    });

    it('should preserve document order', async () => {
      const result = await DocumentSummaryService.summarizeMultiple(documents);

      expect(result.documentSummaries[0].id).toBe('doc1');
      expect(result.documentSummaries[1].id).toBe('doc2');
      expect(result.documentSummaries[2].id).toBe('doc3');
    });

    it('should identify contradictions', async () => {
      const contradictingDocs = [
        { id: '1', title: 'Report A', text: 'Revenue increased by 20%.' },
        { id: '2', title: 'Report B', text: 'Revenue decreased by 15%.' }
      ];

      const result = await DocumentSummaryService.summarizeMultiple(contradictingDocs, { detectContradictions: true });

      expect(result).toHaveProperty('contradictions');
    });

    it('should handle documents with different topics', async () => {
      const mixedDocs = [
        { id: '1', title: 'Finance', text: 'Financial report with revenue data.' },
        { id: '2', title: 'HR', text: 'Employee handbook and policies.' },
        { id: '3', title: 'Tech', text: 'API documentation and specifications.' }
      ];

      const result = await DocumentSummaryService.summarizeMultiple(mixedDocs);

      expect(result).toHaveProperty('unifiedSummary');
      expect(result).toHaveProperty('topicGroups');
    });
  });

  describe('Summary Quality', () => {
    it('should not lose critical information', async () => {
      const documentWithNumbers = 'The company raised $50 million in Series B funding at a $200 million valuation.';

      const result = await DocumentSummaryService.generateSummary(documentWithNumbers);

      // Key financial figures should be preserved
      expect(result.summary).toMatch(/50|200|million/i);
    });

    it('should maintain grammatical correctness', async () => {
      const sampleText = 'The quarterly report shows strong growth in all sectors.';

      const result = await DocumentSummaryService.generateSummary(sampleText);

      // Basic check that summary ends with proper punctuation
      expect(result.summary.trim()).toMatch(/[.!?]$/);
    });

    it('should handle technical documents', async () => {
      const technicalDoc = `
        The API endpoint accepts POST requests with JSON payload.
        Authentication requires Bearer token in Authorization header.
        Response includes status code 200 for success, 401 for unauthorized.
        Rate limiting is set to 100 requests per minute per API key.
      `;

      const result = await DocumentSummaryService.generateSummary(technicalDoc);

      expect(result.summary).toMatch(/API|endpoint|authentication|request/i);
    });

    it('should handle legal documents', async () => {
      const legalDoc = `
        WHEREAS, the parties have agreed to enter into this binding agreement.
        The Licensee agrees to pay royalties of 5% of net sales.
        This Agreement shall be governed by the laws of Delaware.
        Any disputes shall be resolved through binding arbitration.
      `;

      const result = await DocumentSummaryService.generateSummary(legalDoc);

      expect(result.summary.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle very long documents', async () => {
      const longDoc = 'This is a sentence. '.repeat(5000);

      const result = await DocumentSummaryService.generateSummary(longDoc);

      expect(result).toHaveProperty('summary');
    });

    it('should handle special characters', async () => {
      const specialDoc = 'Document with special chars: @#$%^&*(){}[]|\\:";\'<>,.?/~`';

      const result = await DocumentSummaryService.generateSummary(specialDoc);

      expect(result).toHaveProperty('summary');
    });

    it('should handle unicode characters', async () => {
      const unicodeDoc = 'Document with unicode: \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4 \u4e2d\u6587 \u65e5\u672c\u8a9e';

      const result = await DocumentSummaryService.generateSummary(unicodeDoc);

      expect(result).toHaveProperty('summary');
    });

    it('should handle mixed content', async () => {
      const mixedDoc = `
        Regular text followed by:
        - Bullet points
        - More bullets

        | Table | Data |
        |-------|------|
        | A     | 100  |

        And more regular text at the end.
      `;

      const result = await DocumentSummaryService.generateSummary(mixedDoc);

      expect(result).toHaveProperty('summary');
    });
  });

  describe('Performance', () => {
    it('should summarize documents quickly', async () => {
      const mediumDoc = 'This is a sample sentence. '.repeat(500);

      const startTime = Date.now();
      await DocumentSummaryService.generateSummary(mediumDoc);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle concurrent summarization', async () => {
      const documents = Array(10).fill('Sample document for concurrent processing. '.repeat(50));

      const promises = documents.map(doc =>
        DocumentSummaryService.generateSummary(doc)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toHaveProperty('summary');
      });
    });
  });

  describe('Batch Processing', () => {
    it('should summarize documents in batch', async () => {
      const documents = [
        { id: '1', text: 'First document content.' },
        { id: '2', text: 'Second document content.' },
        { id: '3', text: 'Third document content.' }
      ];

      const result = await DocumentSummaryService.summarizeBatch(documents);

      expect(result).toHaveProperty('results');
      expect(result.results.length).toBe(3);
    });

    it('should track batch progress', async () => {
      const documents = [
        { id: '1', text: 'Doc 1' },
        { id: '2', text: 'Doc 2' }
      ];

      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      await DocumentSummaryService.summarizeBatch(documents, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should handle partial failures', async () => {
      const documents = [
        { id: '1', text: 'Valid document' },
        { id: '2', text: null }
      ];

      const result = await DocumentSummaryService.summarizeBatch(documents);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
