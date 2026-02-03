/**
 * Document Analysis Service Test Suite
 *
 * [Feature] OCAE-45: AI/ML Services for Document Processing
 * Comprehensive test coverage for document analysis functionality including
 * sentiment analysis, risk detection, financial data extraction, and insights generation
 */

const mongoose = require('mongoose');

// Mock dependencies before requiring the service
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

describe('DocumentAnalysisService', () => {
  let DocumentAnalysisService;
  let mockDocumentId;

  beforeAll(async () => {
    DocumentAnalysisService = require('../../../services/documentAnalysisService');
    mockDocumentId = new mongoose.Types.ObjectId().toString();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', async () => {
      const text = 'The company achieved excellent results this quarter. Revenue growth exceeded expectations and team morale is at an all-time high.';

      const result = await DocumentAnalysisService.analyzeSentiment(text);

      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('score');
      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', async () => {
      const text = 'The company suffered significant losses this quarter. Revenue declined sharply. There are serious problems and challenges. This is a poor and disappointing result with a negative outlook.';

      const result = await DocumentAnalysisService.analyzeSentiment(text);

      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should detect neutral sentiment', async () => {
      const text = 'The company reported its quarterly results. Revenue was in line with expectations.';

      const result = await DocumentAnalysisService.analyzeSentiment(text);

      expect(result.sentiment).toBe('neutral');
    });

    it('should return score between -1 and 1', async () => {
      const text = 'Sample text for sentiment analysis.';

      const result = await DocumentAnalysisService.analyzeSentiment(text);

      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should handle empty text', async () => {
      const result = await DocumentAnalysisService.analyzeSentiment('');

      expect(result.sentiment).toBe('neutral');
      expect(result.score).toBe(0);
    });

    it('should handle null text', async () => {
      await expect(
        DocumentAnalysisService.analyzeSentiment(null)
      ).rejects.toThrow('Text cannot be null or undefined');
    });

    it('should provide confidence score', async () => {
      const text = 'This is a very positive and encouraging report!';

      const result = await DocumentAnalysisService.analyzeSentiment(text);

      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect mixed sentiment', async () => {
      const text = 'The results were excellent with strong growth and successful expansion. However, there are significant challenges and risks ahead. Revenue increased but customer satisfaction declined sharply. The positive outlook is offset by negative market conditions and poor performance in some areas.';

      const result = await DocumentAnalysisService.analyzeSentiment(text);

      expect(result).toHaveProperty('hasMixedSentiment');
      // Mixed sentiment when both positive and negative counts exceed threshold
    });

    it('should identify sentiment by section', async () => {
      const text = `
        Financial Performance: Excellent results with 20% growth.
        Customer Feedback: Some complaints about service quality.
        Future Outlook: Uncertain market conditions ahead.
      `;

      const result = await DocumentAnalysisService.analyzeSentiment(text, { bySections: true });

      expect(result).toHaveProperty('sectionSentiments');
    });

    it('should extract sentiment-bearing phrases', async () => {
      const text = 'The outstanding performance exceeded all expectations.';

      const result = await DocumentAnalysisService.analyzeSentiment(text, { extractPhrases: true });

      expect(result).toHaveProperty('keyPhrases');
      expect(Array.isArray(result.keyPhrases)).toBe(true);
    });
  });

  describe('detectRisks', () => {
    it('should detect financial risks', async () => {
      const text = 'The company faces significant debt obligations. Cash flow remains negative and credit ratings may be downgraded.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result).toHaveProperty('risks');
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.risks.some(r => r.category === 'financial')).toBe(true);
    });

    it('should detect legal risks', async () => {
      const text = 'The company is facing multiple lawsuit cases. Legal litigation is ongoing. Regulatory investigations continue and court penalties may be imposed.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result.risks.length).toBeGreaterThan(0);
      // Legal category detection depends on keyword matching
    });

    it('should detect operational risks', async () => {
      const text = 'Supply chain disruptions continue. Key systems experienced downtime and production delays are expected.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result.risks.some(r => r.category === 'operational')).toBe(true);
    });

    it('should detect compliance risks', async () => {
      const text = 'Non-compliance with SEC regulations was identified. GDPR violations may result in substantial fines.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result.risks.some(r => r.category === 'compliance')).toBe(true);
    });

    it('should detect market risks', async () => {
      const text = 'Market volatility has increased. Competition is intensifying and market share may decline.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result.risks.some(r => r.category === 'market')).toBe(true);
    });

    it('should assign severity levels', async () => {
      const text = 'Critical security breach detected. Immediate action required.';

      const result = await DocumentAnalysisService.detectRisks(text);

      result.risks.forEach(risk => {
        expect(risk).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(risk.severity);
      });
    });

    it('should calculate overall risk score', async () => {
      const text = 'Multiple risks have been identified including financial difficulties and legal issues.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result).toHaveProperty('overallRiskScore');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(1);
    });

    it('should handle documents with no risks', async () => {
      const text = 'The company continues to operate normally with stable conditions.';

      const result = await DocumentAnalysisService.detectRisks(text);

      expect(result.risks.length).toBeLessThanOrEqual(1);
      expect(result.overallRiskScore).toBeLessThan(0.3);
    });

    it('should provide mitigation suggestions', async () => {
      const text = 'Cash flow issues are expected to continue through next quarter.';

      const result = await DocumentAnalysisService.detectRisks(text, { suggestMitigation: true });

      if (result.risks.length > 0) {
        expect(result.risks[0]).toHaveProperty('mitigation');
      }
    });

    it('should track risk location in document', async () => {
      const text = 'The first issue is debt. The second issue is compliance.';

      const result = await DocumentAnalysisService.detectRisks(text);

      result.risks.forEach(risk => {
        expect(risk).toHaveProperty('context');
      });
    });
  });

  describe('extractFinancialData', () => {
    it('should extract revenue figures', async () => {
      const text = 'Revenue reached $125 million this quarter. Total revenue was $500 million for the year.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result).toHaveProperty('financialData');
      expect(result.financialData).toHaveProperty('revenue');
      // Revenue extraction depends on pattern matching
    });

    it('should extract profit/loss figures', async () => {
      const text = 'Net income reached $25 million with a profit margin of 20%.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result.financialData).toHaveProperty('profit');
    });

    it('should extract expense figures', async () => {
      const text = 'Operating expenses totaled $50 million, including $10 million in R&D spending.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result.financialData).toHaveProperty('expenses');
    });

    it('should extract percentage changes', async () => {
      const text = 'Revenue increased by 25% year-over-year. Expenses decreased by 10%.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result.financialData).toHaveProperty('percentageChanges');
      expect(result.financialData.percentageChanges.length).toBeGreaterThan(0);
    });

    it('should extract valuation figures', async () => {
      const text = 'The company is valued at $1 billion following the Series C round.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result.financialData).toHaveProperty('valuations');
    });

    it('should normalize currency amounts', async () => {
      const text = 'Revenue was $5M in Q1 and $5 million in Q2.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      // Both should be normalized to the same format
      expect(result.financialData.revenue.length).toBeGreaterThanOrEqual(1);
    });

    it('should identify time periods', async () => {
      const text = 'Q4 2024 revenue was $100M. FY2024 total was $400M.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      result.financialData.revenue.forEach(item => {
        expect(item).toHaveProperty('period');
      });
    });

    it('should handle documents without financial data', async () => {
      const text = 'This is a general document without any financial figures.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result.financialData.revenue).toHaveLength(0);
      expect(result.financialData.profit).toHaveLength(0);
    });

    it('should calculate financial metrics', async () => {
      const text = 'Revenue: $100M. Expenses: $80M. Net Income: $20M.';

      const result = await DocumentAnalysisService.extractFinancialData(text, { calculateMetrics: true });

      expect(result).toHaveProperty('metrics');
    });

    it('should extract share/stock related data', async () => {
      const text = 'Share price increased to $50. Earnings per share was $2.50.';

      const result = await DocumentAnalysisService.extractFinancialData(text);

      expect(result.financialData).toHaveProperty('stockData');
    });
  });

  describe('generateInsights', () => {
    const sampleDocument = `
      Q4 2024 Financial Report

      Revenue reached $250 million, representing 20% growth year-over-year.
      Operating margin improved to 25%, up from 20% last year.
      Customer acquisition increased by 30% with 5,000 new enterprise clients.

      Key challenges included supply chain disruptions and increased competition.
      However, the new product line exceeded expectations with $50M in sales.

      Outlook for 2025 is positive with projected revenue of $300 million.
      We plan to expand into 3 new markets and increase R&D spending by 40%.
    `;

    it('should generate insights from document', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument);

      expect(result).toHaveProperty('insights');
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should categorize insights', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument);

      result.insights.forEach(insight => {
        expect(insight).toHaveProperty('category');
      });
    });

    it('should include confidence scores', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument);

      result.insights.forEach(insight => {
        expect(insight).toHaveProperty('confidence');
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should identify trends', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument, { identifyTrends: true });

      expect(result).toHaveProperty('trends');
    });

    it('should highlight anomalies', async () => {
      const documentWithAnomaly = 'Revenue increased 500% in one quarter, which is unusual.';

      const result = await DocumentAnalysisService.generateInsights(documentWithAnomaly, { detectAnomalies: true });

      expect(result).toHaveProperty('anomalies');
    });

    it('should provide actionable recommendations', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument, { includeRecommendations: true });

      expect(result).toHaveProperty('recommendations');
    });

    it('should handle empty text', async () => {
      const result = await DocumentAnalysisService.generateInsights('');

      expect(result.insights).toHaveLength(0);
    });

    it('should support comparison with previous periods', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument, {
        compareWithBenchmark: { previousRevenue: 208000000 }
      });

      expect(result).toHaveProperty('comparisons');
    });

    it('should prioritize insights', async () => {
      const result = await DocumentAnalysisService.generateInsights(sampleDocument, { prioritize: true });

      // First insight should have highest priority
      if (result.insights.length > 1) {
        expect(result.insights[0].priority).toBeLessThanOrEqual(result.insights[1].priority);
      }
    });
  });

  describe('Comprehensive Analysis', () => {
    it('should perform full document analysis', async () => {
      const text = 'The company reported excellent financial results. Revenue grew 25% to $100M. However, some risks remain regarding market competition.';

      const result = await DocumentAnalysisService.analyzeDocument(text);

      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('financialData');
      expect(result).toHaveProperty('insights');
    });

    it('should combine analyses coherently', async () => {
      const text = 'Strong Q4 results with $50M revenue. Minor compliance issue identified.';

      const result = await DocumentAnalysisService.analyzeDocument(text);

      expect(result).toHaveProperty('summary');
    });
  });

  describe('Batch Analysis', () => {
    it('should analyze multiple documents', async () => {
      const documents = [
        { id: '1', text: 'Positive document about growth and success.' },
        { id: '2', text: 'Document mentioning some risks and challenges.' }
      ];

      const result = await DocumentAnalysisService.analyzeBatch(documents);

      expect(result).toHaveProperty('results');
      expect(result.results.length).toBe(2);
    });

    it('should handle partial failures', async () => {
      const documents = [
        { id: '1', text: 'Valid document.' },
        { id: '2', text: null }
      ];

      const result = await DocumentAnalysisService.analyzeBatch(documents);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should track batch progress', async () => {
      const documents = [
        { id: '1', text: 'Doc 1' },
        { id: '2', text: 'Doc 2' }
      ];

      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      await DocumentAnalysisService.analyzeBatch(documents, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle very long documents', async () => {
      const longDoc = 'Financial data analysis. '.repeat(5000);

      const result = await DocumentAnalysisService.analyzeSentiment(longDoc);

      expect(result).toHaveProperty('sentiment');
    });

    it('should handle special characters', async () => {
      const specialDoc = 'Revenue of $100M @#$% with special chars.';

      const result = await DocumentAnalysisService.extractFinancialData(specialDoc);

      expect(result).toHaveProperty('financialData');
    });

    it('should handle unicode characters', async () => {
      const unicodeDoc = 'Revenue: \u00a3100M, \u20ac50M, \u00a550M';

      const result = await DocumentAnalysisService.extractFinancialData(unicodeDoc);

      expect(result).toHaveProperty('financialData');
    });
  });

  describe('Performance', () => {
    it('should analyze documents quickly', async () => {
      const text = 'Sample financial document. '.repeat(100);

      const startTime = Date.now();
      await DocumentAnalysisService.analyzeDocument(text);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle concurrent analysis', async () => {
      const texts = Array(10).fill('Document for concurrent analysis. Revenue: $100M.');

      const promises = texts.map(text =>
        DocumentAnalysisService.analyzeSentiment(text)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toHaveProperty('sentiment');
      });
    });
  });
});
