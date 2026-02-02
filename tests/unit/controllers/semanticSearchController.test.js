/**
 * Semantic Search Controller Test Suite
 *
 * [Feature] OCAE-23: Semantic Document Search
 * Comprehensive test coverage for the semantic search API endpoint
 * including validation, filtering, pagination, and error handling
 */

const request = require('supertest');
const mongoose = require('mongoose');

// Mock the semantic search service BEFORE importing app
jest.mock('../../../services/semanticSearchService', () => ({
  search: jest.fn(),
  getSuggestions: jest.fn(),
  getSearchAnalytics: jest.fn()
}));

const SemanticSearchService = require('../../../services/semanticSearchService');
const app = require('../../../app');

describe('Semantic Search Controller', () => {
  let mockCompanyId;
  let mockUserId;

  beforeAll(() => {
    mockCompanyId = new mongoose.Types.ObjectId().toString();
    mockUserId = new mongoose.Types.ObjectId().toString();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/documents/search', () => {
    const mockSearchResults = {
      results: [
        {
          documentId: 'doc-1',
          title: 'Stock Option Plan 2024',
          category: 'equity_plan',
          snippet: 'This stock option plan provides...',
          relevanceScore: 0.95,
          companyId: 'company-1',
          indexedAt: '2024-01-15T10:00:00Z'
        },
        {
          documentId: 'doc-2',
          title: 'Employee Equity Agreement',
          category: 'agreement',
          snippet: 'The employee equity agreement outlines...',
          relevanceScore: 0.82,
          companyId: 'company-1',
          indexedAt: '2024-01-10T10:00:00Z'
        }
      ],
      totalCount: 15,
      page: 1,
      pageSize: 10,
      totalPages: 2,
      searchTimeMs: 45
    };

    describe('Successful Search Requests', () => {
      beforeEach(() => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);
      });

      it('should search documents with valid query', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'stock options' })
          .expect(200);

        expect(response.body).toHaveProperty('results');
        expect(response.body).toHaveProperty('totalCount');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('pageSize');
        expect(response.body).toHaveProperty('totalPages');
        expect(response.body).toHaveProperty('searchTimeMs');
        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'stock options',
          expect.any(Object)
        );
      });

      it('should return results with proper structure', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'equity compensation' })
          .expect(200);

        const firstResult = response.body.results[0];
        expect(firstResult).toHaveProperty('documentId');
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('category');
        expect(firstResult).toHaveProperty('snippet');
        expect(firstResult).toHaveProperty('relevanceScore');
      });

      it('should sort results by relevance score descending', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents' })
          .expect(200);

        const scores = response.body.results.map(r => r.relevanceScore);
        const sortedScores = [...scores].sort((a, b) => b - a);
        expect(scores).toEqual(sortedScores);
      });
    });

    describe('Filtering', () => {
      beforeEach(() => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);
      });

      it('should filter by company ID', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { companyId: mockCompanyId }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            filters: expect.objectContaining({ companyId: mockCompanyId })
          })
        );
      });

      it('should filter by category', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { category: 'financial_report' }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            filters: expect.objectContaining({ category: 'financial_report' })
          })
        );
      });

      it('should filter by multiple categories', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { categories: ['financial_report', 'equity_plan'] }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            filters: expect.objectContaining({
              categories: ['financial_report', 'equity_plan']
            })
          })
        );
      });

      it('should filter by date range', async () => {
        const dateRange = {
          start: '2024-01-01',
          end: '2024-12-31'
        };

        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { dateRange }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            filters: expect.objectContaining({ dateRange })
          })
        );
      });

      it('should combine multiple filters', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'equity',
            filters: {
              companyId: mockCompanyId,
              category: 'agreement',
              dateRange: {
                start: '2024-01-01',
                end: '2024-06-30'
              }
            }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'equity',
          expect.objectContaining({
            filters: {
              companyId: mockCompanyId,
              category: 'agreement',
              dateRange: {
                start: '2024-01-01',
                end: '2024-06-30'
              }
            }
          })
        );
      });

      it('should filter by document status', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { status: 'active' }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            filters: expect.objectContaining({ status: 'active' })
          })
        );
      });

      it('should filter by tags', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { tags: ['important', 'compliance'] }
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            filters: expect.objectContaining({ tags: ['important', 'compliance'] })
          })
        );
      });
    });

    describe('Pagination', () => {
      beforeEach(() => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);
      });

      it('should accept page parameter', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            page: 2
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            pagination: expect.objectContaining({ page: 2 })
          })
        );
      });

      it('should accept pageSize parameter', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            pageSize: 20
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            pagination: expect.objectContaining({ pageSize: 20 })
          })
        );
      });

      it('should use default pagination when not specified', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents' })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            pagination: expect.objectContaining({ page: 1, pageSize: 10 })
          })
        );
      });

      it('should return pagination metadata in response', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents', page: 1, pageSize: 10 })
          .expect(200);

        expect(response.body).toHaveProperty('page', 1);
        expect(response.body).toHaveProperty('pageSize', 10);
        expect(response.body).toHaveProperty('totalPages');
        expect(response.body).toHaveProperty('totalCount');
      });
    });

    describe('Query Validation', () => {
      it('should return 400 for missing query', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('query');
      });

      it('should return 400 for empty query', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('query');
      });

      it('should return 400 for query that is too short', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'a' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('minimum');
      });

      it('should return 400 for query that is too long', async () => {
        const longQuery = 'a'.repeat(1001);

        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: longQuery })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('maximum');
      });

      it('should sanitize query input', async () => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);

        await request(app)
          .post('/api/v1/documents/search')
          .send({ query: '  stock   options  ' })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'stock options',
          expect.any(Object)
        );
      });
    });

    describe('Pagination Validation', () => {
      it('should return 400 for invalid page number', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents', page: -1 })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('page');
      });

      it('should return 400 for non-integer page', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents', page: 1.5 })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 400 for invalid pageSize', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents', pageSize: 0 })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('pagesize');
      });

      it('should cap pageSize at maximum allowed value', async () => {
        SemanticSearchService.search.mockResolvedValue({
          ...mockSearchResults,
          pageSize: 100
        });

        await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents', pageSize: 500 })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            pagination: expect.objectContaining({ pageSize: 100 })
          })
        );
      });
    });

    describe('Filter Validation', () => {
      it('should return 400 for invalid company ID format', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { companyId: 'invalid-id' }
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('companyid');
      });

      it('should return 400 for invalid date range', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: {
              dateRange: {
                start: '2024-12-31',
                end: '2024-01-01' // end before start
              }
            }
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('daterange');
      });

      it('should return 400 for invalid category value', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            filters: { category: 123 } // should be string
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Error Handling', () => {
      it('should return 500 for service errors', async () => {
        SemanticSearchService.search.mockRejectedValue(
          new Error('Search service unavailable')
        );

        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.toLowerCase()).toContain('search');
      });

      it('should handle timeout errors', async () => {
        SemanticSearchService.search.mockRejectedValue(
          new Error('Search timeout exceeded')
        );

        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Response Headers', () => {
      beforeEach(() => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);
      });

      it('should include X-Total-Count header', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents' })
          .expect(200);

        expect(response.headers).toHaveProperty('x-total-count');
      });

      it('should include X-Search-Time-Ms header', async () => {
        const response = await request(app)
          .post('/api/v1/documents/search')
          .send({ query: 'documents' })
          .expect(200);

        expect(response.headers).toHaveProperty('x-search-time-ms');
      });
    });

    describe('Search Options', () => {
      beforeEach(() => {
        SemanticSearchService.search.mockResolvedValue(mockSearchResults);
      });

      it('should support minimum relevance threshold', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            minRelevance: 0.5
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            minRelevance: 0.5
          })
        );
      });

      it('should support highlight option', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'stock options',
            highlight: true
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'stock options',
          expect.objectContaining({
            highlight: true
          })
        );
      });

      it('should support includeContent option', async () => {
        await request(app)
          .post('/api/v1/documents/search')
          .send({
            query: 'documents',
            includeContent: true
          })
          .expect(200);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'documents',
          expect.objectContaining({
            includeContent: true
          })
        );
      });
    });
  });

  describe('GET /api/v1/documents/search/suggestions', () => {
    const mockSuggestions = [
      'equity compensation',
      'equity plan',
      'equity agreement',
      'equity vesting'
    ];

    beforeEach(() => {
      SemanticSearchService.getSuggestions.mockResolvedValue(mockSuggestions);
    });

    it('should return search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/documents/search/suggestions')
        .query({ q: 'equ' })
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/documents/search/suggestions')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should limit suggestions count', async () => {
      await request(app)
        .get('/api/v1/documents/search/suggestions')
        .query({ q: 'doc', limit: 3 })
        .expect(200);

      expect(SemanticSearchService.getSuggestions).toHaveBeenCalledWith(
        'doc',
        expect.objectContaining({ limit: 3 })
      );
    });

    it('should filter suggestions by company', async () => {
      await request(app)
        .get('/api/v1/documents/search/suggestions')
        .query({ q: 'doc', companyId: mockCompanyId })
        .expect(200);

      expect(SemanticSearchService.getSuggestions).toHaveBeenCalledWith(
        'doc',
        expect.objectContaining({ companyId: mockCompanyId })
      );
    });
  });

  describe('GET /api/v1/documents/search/analytics', () => {
    const mockAnalytics = {
      totalSearches: 1500,
      uniqueQueries: 850,
      averageResponseTime: 45,
      topQueries: [
        { query: 'equity plan', count: 150 },
        { query: 'stock options', count: 120 }
      ],
      searchesByCategory: {
        financial: 500,
        legal: 300,
        equity: 400
      }
    };

    beforeEach(() => {
      SemanticSearchService.getSearchAnalytics.mockResolvedValue(mockAnalytics);
    });

    it('should return search analytics', async () => {
      const response = await request(app)
        .get('/api/v1/documents/search/analytics')
        .query({ companyId: mockCompanyId })
        .expect(200);

      expect(response.body).toHaveProperty('totalSearches');
      expect(response.body).toHaveProperty('uniqueQueries');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('topQueries');
    });

    it('should filter analytics by date range', async () => {
      await request(app)
        .get('/api/v1/documents/search/analytics')
        .query({
          companyId: mockCompanyId,
          startDate: '2024-01-01',
          endDate: '2024-06-30'
        })
        .expect(200);

      expect(SemanticSearchService.getSearchAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: {
            start: '2024-01-01',
            end: '2024-06-30'
          }
        })
      );
    });
  });
});
