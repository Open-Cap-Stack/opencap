/**
 * Semantic Search Controller Test Suite
 * Rewritten to unit test controller directly without supertest/app
 */

jest.mock('../../../services/semanticSearchService', () => ({
  search: jest.fn(),
  getSuggestions: jest.fn(),
  getSearchAnalytics: jest.fn()
}));

const SemanticSearchService = require('../../../services/semanticSearchService');
const semanticSearchController = require('../../../controllers/semanticSearchController');

describe('Semantic Search Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      query: {},
      params: {},
      user: { id: 'user-123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      headers: {}
    };
  });

  const mockSearchResults = {
    results: [
      { documentId: 'doc-1', title: 'Stock Option Plan 2024', category: 'equity_plan', snippet: 'This stock option plan provides...', relevanceScore: 0.95, companyId: 'company-1', indexedAt: '2024-01-15T10:00:00Z' },
      { documentId: 'doc-2', title: 'Employee Equity Agreement', category: 'agreement', snippet: 'The employee equity agreement outlines...', relevanceScore: 0.82, companyId: 'company-1', indexedAt: '2024-01-10T10:00:00Z' }
    ],
    totalCount: 15, page: 1, pageSize: 10, totalPages: 2, searchTimeMs: 45
  };

  describe('POST /api/v1/documents/search', () => {
    describe('Successful Search Requests', () => {
      beforeEach(() => { SemanticSearchService.search.mockResolvedValue(mockSearchResults); });

      it('should search documents with valid query', async () => {
        mockReq.body = { query: 'stock options' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ results: expect.any(Array), totalCount: expect.any(Number) }));
        expect(SemanticSearchService.search).toHaveBeenCalledWith('stock options', expect.any(Object));
      });

      it('should return results with proper structure', async () => {
        mockReq.body = { query: 'equity compensation' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        const body = mockRes.json.mock.calls[0][0];
        expect(body.results[0]).toHaveProperty('documentId');
        expect(body.results[0]).toHaveProperty('title');
        expect(body.results[0]).toHaveProperty('relevanceScore');
      });

      it('should sort results by relevance score descending', async () => {
        mockReq.body = { query: 'documents' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        const body = mockRes.json.mock.calls[0][0];
        const scores = body.results.map(r => r.relevanceScore);
        const sorted = [...scores].sort((a, b) => b - a);
        expect(scores).toEqual(sorted);
      });
    });

    describe('Filtering', () => {
      beforeEach(() => { SemanticSearchService.search.mockResolvedValue(mockSearchResults); });

      it('should filter by company ID', async () => {
        mockReq.body = { query: 'documents', filters: { companyId: '507f1f77bcf86cd799439011' } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ filters: expect.objectContaining({ companyId: '507f1f77bcf86cd799439011' }) }));
      });

      it('should filter by category', async () => {
        mockReq.body = { query: 'documents', filters: { category: 'financial_report' } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should filter by multiple categories', async () => {
        mockReq.body = { query: 'documents', filters: { categories: ['financial_report', 'equity_plan'] } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ filters: expect.objectContaining({ categories: ['financial_report', 'equity_plan'] }) }));
      });

      it('should filter by date range', async () => {
        mockReq.body = { query: 'documents', filters: { dateRange: { start: '2024-01-01', end: '2024-12-31' } } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should combine multiple filters', async () => {
        mockReq.body = { query: 'equity', filters: { companyId: '507f1f77bcf86cd799439011', category: 'agreement', dateRange: { start: '2024-01-01', end: '2024-06-30' } } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
      });

      it('should filter by document status', async () => {
        mockReq.body = { query: 'documents', filters: { status: 'active' } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ filters: expect.objectContaining({ status: 'active' }) }));
      });

      it('should filter by tags', async () => {
        mockReq.body = { query: 'documents', filters: { tags: ['important', 'compliance'] } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ filters: expect.objectContaining({ tags: ['important', 'compliance'] }) }));
      });
    });

    describe('Pagination', () => {
      beforeEach(() => { SemanticSearchService.search.mockResolvedValue(mockSearchResults); });

      it('should accept page parameter', async () => {
        mockReq.body = { query: 'documents', page: 2 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ pagination: expect.objectContaining({ page: 2 }) }));
      });

      it('should accept pageSize parameter', async () => {
        mockReq.body = { query: 'documents', pageSize: 20 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ pagination: expect.objectContaining({ pageSize: 20 }) }));
      });

      it('should use default pagination when not specified', async () => {
        mockReq.body = { query: 'documents' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ pagination: expect.objectContaining({ page: 1, pageSize: 10 }) }));
      });

      it('should return pagination metadata in response', async () => {
        mockReq.body = { query: 'documents', page: 1, pageSize: 10 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        const body = mockRes.json.mock.calls[0][0];
        expect(body).toHaveProperty('page', 1);
        expect(body).toHaveProperty('pageSize', 10);
        expect(body).toHaveProperty('totalPages');
        expect(body).toHaveProperty('totalCount');
      });
    });

    describe('Query Validation', () => {
      it('should return 400 for missing query', async () => {
        mockReq.body = {};
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        const body = mockRes.json.mock.calls[0][0];
        expect(body.error.toLowerCase()).toContain('query');
      });

      it('should return 400 for empty query', async () => {
        mockReq.body = { query: '' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for query that is too short', async () => {
        mockReq.body = { query: 'a' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        const body = mockRes.json.mock.calls[0][0];
        expect(body.error.toLowerCase()).toContain('minimum');
      });

      it('should return 400 for query that is too long', async () => {
        mockReq.body = { query: 'a'.repeat(1001) };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        const body = mockRes.json.mock.calls[0][0];
        expect(body.error.toLowerCase()).toContain('maximum');
      });

      it('should sanitize query input', async () => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);
        mockReq.body = { query: '  stock   options  ' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('stock options', expect.any(Object));
      });
    });

    describe('Pagination Validation', () => {
      it('should return 400 for invalid page number', async () => {
        mockReq.body = { query: 'documents', page: -1 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for non-integer page', async () => {
        mockReq.body = { query: 'documents', page: 1.5 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for invalid pageSize', async () => {
        mockReq.body = { query: 'documents', pageSize: 0 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should cap pageSize at maximum allowed value', async () => {
        SemanticSearchService.search.mockResolvedValue({ ...mockSearchResults, pageSize: 100 });
        mockReq.body = { query: 'documents', pageSize: 500 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ pagination: expect.objectContaining({ pageSize: 100 }) }));
      });
    });

    describe('Filter Validation', () => {
      it('should return 400 for invalid company ID format', async () => {
        mockReq.body = { query: 'documents', filters: { companyId: 'invalid-id' } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for invalid date range', async () => {
        mockReq.body = { query: 'documents', filters: { dateRange: { start: '2024-12-31', end: '2024-01-01' } } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for invalid category value', async () => {
        mockReq.body = { query: 'documents', filters: { category: 123 } };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Error Handling', () => {
      it('should return 500 for service errors', async () => {
        SemanticSearchService.search.mockRejectedValue(new Error('Search service unavailable'));
        mockReq.body = { query: 'documents' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        const body = mockRes.json.mock.calls[0][0];
        expect(body.error.toLowerCase()).toContain('search');
      });

      it('should handle timeout errors', async () => {
        SemanticSearchService.search.mockRejectedValue(new Error('Search timeout exceeded'));
        mockReq.body = { query: 'documents' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500);
      });
    });

    describe('Response Headers', () => {
      beforeEach(() => { SemanticSearchService.search.mockResolvedValue(mockSearchResults); });

      it('should include X-Total-Count header', async () => {
        mockReq.body = { query: 'documents' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.set).toHaveBeenCalledWith('X-Total-Count', '15');
      });

      it('should include X-Search-Time-Ms header', async () => {
        mockReq.body = { query: 'documents' };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(mockRes.set).toHaveBeenCalledWith('X-Search-Time-Ms', '45');
      });
    });

    describe('Search Options', () => {
      beforeEach(() => { SemanticSearchService.search.mockResolvedValue(mockSearchResults); });

      it('should support minimum relevance threshold', async () => {
        mockReq.body = { query: 'documents', minRelevance: 0.5 };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ minRelevance: 0.5 }));
      });

      it('should support highlight option', async () => {
        mockReq.body = { query: 'stock options', highlight: true };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('stock options', expect.objectContaining({ highlight: true }));
      });

      it('should support includeContent option', async () => {
        mockReq.body = { query: 'documents', includeContent: true };
        await semanticSearchController.searchDocuments(mockReq, mockRes);
        expect(SemanticSearchService.search).toHaveBeenCalledWith('documents', expect.objectContaining({ includeContent: true }));
      });
    });
  });

  describe('GET /api/v1/documents/search/suggestions', () => {
    const mockSuggestions = ['equity compensation', 'equity plan', 'equity agreement'];

    beforeEach(() => { SemanticSearchService.getSuggestions.mockResolvedValue(mockSuggestions); });

    it('should return search suggestions', async () => {
      mockReq.query = { q: 'equ' };
      await semanticSearchController.getSuggestions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const body = mockRes.json.mock.calls[0][0];
      expect(body).toHaveProperty('suggestions');
      expect(Array.isArray(body.suggestions)).toBe(true);
    });

    it('should return 400 for missing query parameter', async () => {
      mockReq.query = {};
      await semanticSearchController.getSuggestions(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should limit suggestions count', async () => {
      mockReq.query = { q: 'doc', limit: '3' };
      await semanticSearchController.getSuggestions(mockReq, mockRes);
      expect(SemanticSearchService.getSuggestions).toHaveBeenCalledWith('doc', expect.objectContaining({ limit: 3 }));
    });

    it('should filter suggestions by company', async () => {
      mockReq.query = { q: 'doc', companyId: '507f1f77bcf86cd799439011' };
      await semanticSearchController.getSuggestions(mockReq, mockRes);
      expect(SemanticSearchService.getSuggestions).toHaveBeenCalledWith('doc', expect.objectContaining({ companyId: '507f1f77bcf86cd799439011' }));
    });
  });

  describe('GET /api/v1/documents/search/analytics', () => {
    const mockAnalytics = { totalSearches: 1500, uniqueQueries: 850, averageResponseTime: 45, topQueries: [{ query: 'equity plan', count: 150 }], searchesByCategory: { financial: 500 } };

    beforeEach(() => { SemanticSearchService.getSearchAnalytics.mockResolvedValue(mockAnalytics); });

    it('should return search analytics', async () => {
      mockReq.query = { companyId: '507f1f77bcf86cd799439011' };
      await semanticSearchController.getSearchAnalytics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      const body = mockRes.json.mock.calls[0][0];
      expect(body).toHaveProperty('totalSearches');
      expect(body).toHaveProperty('uniqueQueries');
    });

    it('should filter analytics by date range', async () => {
      mockReq.query = { companyId: '507f1f77bcf86cd799439011', startDate: '2024-01-01', endDate: '2024-06-30' };
      await semanticSearchController.getSearchAnalytics(mockReq, mockRes);
      expect(SemanticSearchService.getSearchAnalytics).toHaveBeenCalledWith(expect.objectContaining({ dateRange: { start: '2024-01-01', end: '2024-06-30' } }));
    });
  });
});
