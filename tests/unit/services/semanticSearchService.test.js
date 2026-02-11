/**
 * Semantic Search Service Test Suite
 *
 * [Feature] OCAE-23: Semantic Document Search
 * Comprehensive test coverage for semantic search functionality including
 * query embedding generation, vector similarity search, filtering, and pagination
 */

const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };

// Mock dependencies before requiring the service
jest.mock('../../../services/vectorService');
jest.mock('../../../services/zerodbService');
jest.mock('../../../models/Document');
jest.mock('../../../models/DocumentEmbeddingModel');

const vectorService = require('../../../services/vectorService');
const zerodbService = require('../../../services/zerodbService');
const Document = require('../../../models/Document');
const DocumentEmbedding = require('../../../models/DocumentEmbeddingModel');

describe('SemanticSearchService', () => {
  let SemanticSearchService;
  let mockCompanyId;
  let mockUserId;

  beforeAll(async () => {
    // Import after mocks are set up
    SemanticSearchService = require('../../../services/semanticSearchService');
    mockCompanyId = generateObjectId();
    mockUserId = generateObjectId();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Embedding Generation', () => {
    it('should generate embedding for a search query', async () => {
      const query = 'Find documents about equity compensation';
      const mockEmbedding = new Array(768).fill(0).map(() => Math.random());

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);

      const result = await SemanticSearchService.generateQueryEmbedding(query);

      // Service normalizes query to lowercase
      expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
        'find documents about equity compensation'
      );
      expect(result).toHaveLength(768);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty query', async () => {
      await expect(
        SemanticSearchService.generateQueryEmbedding('')
      ).rejects.toThrow('Query cannot be empty');
    });

    it('should handle null query', async () => {
      await expect(
        SemanticSearchService.generateQueryEmbedding(null)
      ).rejects.toThrow('Query cannot be empty');
    });

    it('should normalize query text before embedding', async () => {
      const query = '  FIND  Documents   About   EQUITY  ';
      const mockEmbedding = new Array(768).fill(0);

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);

      await SemanticSearchService.generateQueryEmbedding(query);

      expect(vectorService.generateEmbedding).toHaveBeenCalledWith(
        'find documents about equity'
      );
    });
  });

  describe('Vector Similarity Search', () => {
    const mockSearchResults = {
      vectors: [
        {
          id: 'vec-1',
          vector_metadata: {
            document_id: 'doc-1',
            title: 'Stock Option Plan',
            type: 'equity_plan',
            company_id: 'company-1'
          },
          similarity_score: 0.95,
          document: 'Stock option plan content...'
        },
        {
          id: 'vec-2',
          vector_metadata: {
            document_id: 'doc-2',
            title: 'Employee Handbook',
            type: 'policy',
            company_id: 'company-1'
          },
          similarity_score: 0.82,
          document: 'Employee handbook content...'
        }
      ],
      search_time_ms: 45
    };

    it('should perform vector similarity search', async () => {
      const query = 'stock options';
      const mockEmbedding = new Array(768).fill(0);

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      zerodbService.searchVectors.mockResolvedValue(mockSearchResults);

      const result = await SemanticSearchService.search(query);

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('searchTimeMs');
      expect(result.results).toHaveLength(2);
    });

    it('should return results with relevance scores', async () => {
      const query = 'equity compensation';
      const mockEmbedding = new Array(768).fill(0);

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      zerodbService.searchVectors.mockResolvedValue(mockSearchResults);

      const result = await SemanticSearchService.search(query);

      expect(result.results[0]).toHaveProperty('relevanceScore');
      expect(result.results[0].relevanceScore).toBeGreaterThan(0);
      expect(result.results[0].relevanceScore).toBeLessThanOrEqual(1);
    });

    it('should include document metadata in results', async () => {
      const query = 'stock options';
      const mockEmbedding = new Array(768).fill(0);

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      zerodbService.searchVectors.mockResolvedValue(mockSearchResults);

      const result = await SemanticSearchService.search(query);

      const firstResult = result.results[0];
      expect(firstResult).toHaveProperty('documentId');
      expect(firstResult).toHaveProperty('title');
      expect(firstResult).toHaveProperty('category');
      expect(firstResult).toHaveProperty('snippet');
    });

    it('should return top-k results based on limit parameter', async () => {
      const query = 'documents';
      const mockEmbedding = new Array(768).fill(0);
      const options = { limit: 5 };

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      zerodbService.searchVectors.mockResolvedValue(mockSearchResults);

      await SemanticSearchService.search(query, options);

      expect(zerodbService.searchVectors).toHaveBeenCalledWith(
        mockEmbedding,
        5,
        expect.any(String)
      );
    });

    it('should handle no results gracefully', async () => {
      const query = 'nonexistent topic';
      const mockEmbedding = new Array(768).fill(0);

      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 10 });

      const result = await SemanticSearchService.search(query);

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('Filtering', () => {
    const mockVectors = {
      vectors: [
        {
          id: 'vec-1',
          vector_metadata: {
            document_id: 'doc-1',
            title: 'Doc 1',
            type: 'financial',
            company_id: mockCompanyId,
            indexed_at: '2024-01-15T10:00:00Z'
          },
          similarity_score: 0.9
        },
        {
          id: 'vec-2',
          vector_metadata: {
            document_id: 'doc-2',
            title: 'Doc 2',
            type: 'legal',
            company_id: 'other-company',
            indexed_at: '2024-02-01T10:00:00Z'
          },
          similarity_score: 0.85
        },
        {
          id: 'vec-3',
          vector_metadata: {
            document_id: 'doc-3',
            title: 'Doc 3',
            type: 'financial',
            company_id: mockCompanyId,
            indexed_at: '2023-12-01T10:00:00Z'
          },
          similarity_score: 0.8
        }
      ],
      search_time_ms: 30
    };

    beforeEach(() => {
      const mockEmbedding = new Array(768).fill(0);
      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
      zerodbService.searchVectors.mockResolvedValue(mockVectors);
    });

    it('should filter results by company ID', async () => {
      const query = 'documents';
      const options = {
        filters: { companyId: mockCompanyId }
      };

      const result = await SemanticSearchService.search(query, options);

      expect(result.results.every(r => r.companyId === mockCompanyId)).toBe(true);
    });

    it('should filter results by category/type', async () => {
      const query = 'documents';
      const options = {
        filters: { category: 'financial' }
      };

      const result = await SemanticSearchService.search(query, options);

      expect(result.results.every(r => r.category === 'financial')).toBe(true);
    });

    it('should filter results by date range', async () => {
      const query = 'documents';
      const options = {
        filters: {
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31')
          }
        }
      };

      const result = await SemanticSearchService.search(query, options);

      result.results.forEach(r => {
        const indexedDate = new Date(r.indexedAt);
        expect(indexedDate >= options.filters.dateRange.start).toBe(true);
        expect(indexedDate <= options.filters.dateRange.end).toBe(true);
      });
    });

    it('should combine multiple filters', async () => {
      const query = 'documents';
      const options = {
        filters: {
          companyId: mockCompanyId,
          category: 'financial'
        }
      };

      const result = await SemanticSearchService.search(query, options);

      expect(result.results.every(r =>
        r.companyId === mockCompanyId && r.category === 'financial'
      )).toBe(true);
    });
  });

  describe('Pagination', () => {
    const createMockVectors = (count) => ({
      vectors: Array.from({ length: count }, (_, i) => ({
        id: `vec-${i}`,
        vector_metadata: {
          document_id: `doc-${i}`,
          title: `Document ${i}`,
          type: 'general',
          company_id: mockCompanyId
        },
        similarity_score: 0.9 - (i * 0.01)
      })),
      search_time_ms: 50
    });

    beforeEach(() => {
      const mockEmbedding = new Array(768).fill(0);
      vectorService.generateEmbedding.mockResolvedValue(mockEmbedding);
    });

    it('should return paginated results with default page size', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockVectors(25));

      const result = await SemanticSearchService.search('documents');

      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.results.length).toBeLessThanOrEqual(10); // Default page size
    });

    it('should respect custom page size', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockVectors(25));

      const result = await SemanticSearchService.search('documents', {
        pagination: { page: 1, pageSize: 5 }
      });

      expect(result.pageSize).toBe(5);
      expect(result.results.length).toBeLessThanOrEqual(5);
    });

    it('should return correct page of results', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockVectors(25));

      const page1 = await SemanticSearchService.search('documents', {
        pagination: { page: 1, pageSize: 10 }
      });

      const page2 = await SemanticSearchService.search('documents', {
        pagination: { page: 2, pageSize: 10 }
      });

      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);
      expect(page1.results[0].documentId).not.toBe(page2.results[0].documentId);
    });

    it('should calculate total pages correctly', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockVectors(25));

      const result = await SemanticSearchService.search('documents', {
        pagination: { page: 1, pageSize: 10 }
      });

      expect(result.totalPages).toBe(3); // 25 results / 10 per page = 3 pages
    });

    it('should return empty results for out of bounds page', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockVectors(10));

      const result = await SemanticSearchService.search('documents', {
        pagination: { page: 5, pageSize: 10 }
      });

      expect(result.results).toHaveLength(0);
    });

    it('should handle page size larger than results', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockVectors(5));

      const result = await SemanticSearchService.search('documents', {
        pagination: { page: 1, pageSize: 20 }
      });

      expect(result.results.length).toBe(5);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('Relevance Scoring', () => {
    it('should calculate relevance score from similarity', async () => {
      const mockVectors = {
        vectors: [
          { id: 'v1', similarity_score: 0.95, vector_metadata: { document_id: 'd1', title: 'T1', type: 't' } },
          { id: 'v2', similarity_score: 0.75, vector_metadata: { document_id: 'd2', title: 'T2', type: 't' } }
        ],
        search_time_ms: 20
      };

      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue(mockVectors);

      const result = await SemanticSearchService.search('query');

      expect(result.results[0].relevanceScore).toBeGreaterThan(result.results[1].relevanceScore);
    });

    it('should normalize relevance scores between 0 and 1', async () => {
      const mockVectors = {
        vectors: [
          { id: 'v1', similarity_score: 1.5, vector_metadata: { document_id: 'd1', title: 'T1', type: 't' } },
          { id: 'v2', similarity_score: -0.5, vector_metadata: { document_id: 'd2', title: 'T2', type: 't' } }
        ],
        search_time_ms: 20
      };

      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue(mockVectors);

      const result = await SemanticSearchService.search('query');

      result.results.forEach(r => {
        expect(r.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(r.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should boost relevance for title matches', async () => {
      const mockVectors = {
        vectors: [
          { id: 'v1', similarity_score: 0.8, vector_metadata: { document_id: 'd1', title: 'Equity Plan', type: 't' } },
          { id: 'v2', similarity_score: 0.85, vector_metadata: { document_id: 'd2', title: 'Other Document', type: 't' } }
        ],
        search_time_ms: 20
      };

      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue(mockVectors);

      const result = await SemanticSearchService.search('equity plan');

      // Title match should boost doc d1 above d2 despite lower similarity
      const equityDoc = result.results.find(r => r.documentId === 'd1');
      const otherDoc = result.results.find(r => r.documentId === 'd2');

      expect(equityDoc.relevanceScore).toBeGreaterThan(otherDoc.relevanceScore);
    });
  });

  describe('Search Analytics Tracking', () => {
    beforeEach(() => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 10 });
    });

    it('should track search query', async () => {
      const trackSpy = jest.spyOn(SemanticSearchService, 'trackSearchAnalytics');

      await SemanticSearchService.search('test query', { userId: mockUserId });

      expect(trackSpy).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test query',
        userId: mockUserId
      }));
    });

    it('should track search result count', async () => {
      const mockVectors = {
        vectors: [
          { id: 'v1', similarity_score: 0.9, vector_metadata: { document_id: 'd1', title: 'T1', type: 't' } }
        ],
        search_time_ms: 10
      };
      zerodbService.searchVectors.mockResolvedValue(mockVectors);

      const trackSpy = jest.spyOn(SemanticSearchService, 'trackSearchAnalytics');

      await SemanticSearchService.search('query');

      expect(trackSpy).toHaveBeenCalledWith(expect.objectContaining({
        resultCount: 1
      }));
    });

    it('should track search response time', async () => {
      const trackSpy = jest.spyOn(SemanticSearchService, 'trackSearchAnalytics');

      await SemanticSearchService.search('query');

      expect(trackSpy).toHaveBeenCalledWith(expect.objectContaining({
        responseTimeMs: expect.any(Number)
      }));
    });

    it('should track applied filters', async () => {
      const trackSpy = jest.spyOn(SemanticSearchService, 'trackSearchAnalytics');
      const filters = { companyId: mockCompanyId, category: 'financial' };

      await SemanticSearchService.search('query', { filters });

      expect(trackSpy).toHaveBeenCalledWith(expect.objectContaining({
        filters: filters
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding service errors', async () => {
      vectorService.generateEmbedding.mockRejectedValue(new Error('Embedding service unavailable'));

      await expect(
        SemanticSearchService.search('test query')
      ).rejects.toThrow('Failed to generate query embedding');
    });

    it('should handle vector search errors', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockRejectedValue(new Error('Search service unavailable'));

      await expect(
        SemanticSearchService.search('test query')
      ).rejects.toThrow('Search service error');
    });

    it('should validate pagination parameters', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 10 });

      await expect(
        SemanticSearchService.search('query', { pagination: { page: -1 } })
      ).rejects.toThrow('Invalid pagination parameters');

      await expect(
        SemanticSearchService.search('query', { pagination: { pageSize: 0 } })
      ).rejects.toThrow('Invalid pagination parameters');
    });

    it('should handle maximum page size limit', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 10 });

      const result = await SemanticSearchService.search('query', {
        pagination: { page: 1, pageSize: 500 }
      });

      // Should cap at maximum allowed page size (e.g., 100)
      expect(result.pageSize).toBeLessThanOrEqual(100);
    });
  });

  describe('Search Suggestions', () => {
    it('should return search suggestions for partial queries', async () => {
      const suggestions = await SemanticSearchService.getSuggestions('equ', {
        companyId: mockCompanyId
      });

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should limit suggestions count', async () => {
      const suggestions = await SemanticSearchService.getSuggestions('doc', {
        limit: 5
      });

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for very short queries', async () => {
      const suggestions = await SemanticSearchService.getSuggestions('a');
      expect(suggestions).toEqual([]);
    });
  });

  describe('Search Analytics', () => {
    beforeEach(() => {
      // Prime the analytics store with some data
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 10 });
    });

    it('should return analytics summary', async () => {
      // Perform some searches to populate analytics
      await SemanticSearchService.search('test query', { filters: { category: 'financial' } });
      await SemanticSearchService.search('another query', { filters: { category: 'legal' } });

      const analytics = await SemanticSearchService.getSearchAnalytics({});

      expect(analytics).toHaveProperty('totalSearches');
      expect(analytics).toHaveProperty('uniqueQueries');
      expect(analytics).toHaveProperty('averageResponseTime');
      expect(analytics).toHaveProperty('topQueries');
      expect(analytics).toHaveProperty('searchesByCategory');
    });

    it('should filter analytics by company', async () => {
      await SemanticSearchService.search('query', { filters: { companyId: mockCompanyId } });

      const analytics = await SemanticSearchService.getSearchAnalytics({
        companyId: mockCompanyId
      });

      expect(analytics.totalSearches).toBeGreaterThanOrEqual(0);
    });

    it('should filter analytics by date range', async () => {
      await SemanticSearchService.search('query');

      const analytics = await SemanticSearchService.getSearchAnalytics({
        dateRange: {
          start: '2020-01-01',
          end: '2030-12-31'
        }
      });

      expect(analytics).toHaveProperty('totalSearches');
    });
  });

  describe('Highlight Generation', () => {
    const mockVectorsWithContent = {
      vectors: [
        {
          id: 'v1',
          similarity_score: 0.9,
          vector_metadata: {
            document_id: 'd1',
            title: 'Stock Option Plan',
            type: 'equity'
          },
          document: 'This is a comprehensive stock option plan that covers all employees. The stock options vest over four years with a one year cliff. Stock grants are subject to board approval.'
        }
      ],
      search_time_ms: 15
    };

    it('should generate highlights when option is enabled', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue(mockVectorsWithContent);

      const result = await SemanticSearchService.search('stock option', {
        highlight: true
      });

      expect(result.results[0]).toHaveProperty('highlights');
      expect(Array.isArray(result.results[0].highlights)).toBe(true);
    });

    it('should include content when includeContent option is enabled', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue(mockVectorsWithContent);

      const result = await SemanticSearchService.search('stock option', {
        includeContent: true
      });

      expect(result.results[0]).toHaveProperty('content');
      expect(result.results[0].content).toBeTruthy();
    });
  });

  describe('Snippet Generation', () => {
    const createMockWithLongContent = (content) => ({
      vectors: [
        {
          id: 'v1',
          similarity_score: 0.9,
          vector_metadata: {
            document_id: 'd1',
            title: 'Test Document',
            type: 'test'
          },
          document: content
        }
      ],
      search_time_ms: 10
    });

    beforeEach(() => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
    });

    it('should generate snippet from document content', async () => {
      const longContent = 'Lorem ipsum dolor sit amet. '.repeat(50) +
        'This is the important equity vesting content that should be found. ' +
        'More content after the match. '.repeat(50);

      zerodbService.searchVectors.mockResolvedValue(createMockWithLongContent(longContent));

      const result = await SemanticSearchService.search('equity vesting');

      expect(result.results[0]).toHaveProperty('snippet');
      expect(result.results[0].snippet.length).toBeLessThanOrEqual(250);
    });

    it('should handle empty content gracefully', async () => {
      zerodbService.searchVectors.mockResolvedValue(createMockWithLongContent(''));

      const result = await SemanticSearchService.search('query');

      expect(result.results[0].snippet).toBe('');
    });

    it('should add ellipsis for truncated snippets', async () => {
      const longContent = 'Start of content. '.repeat(100) +
        'Important keyword here. ' +
        'More content after. '.repeat(100);

      zerodbService.searchVectors.mockResolvedValue(createMockWithLongContent(longContent));

      const result = await SemanticSearchService.search('keyword');

      expect(result.results[0].snippet).toContain('...');
    });
  });

  describe('Advanced Filtering', () => {
    const createMockWithMetadata = () => ({
      vectors: [
        {
          id: 'v1',
          similarity_score: 0.95,
          vector_metadata: {
            document_id: 'd1',
            title: 'Financial Report',
            type: 'financial',
            company_id: mockCompanyId,
            indexed_at: '2024-06-15T10:00:00Z'
          }
        },
        {
          id: 'v2',
          similarity_score: 0.90,
          vector_metadata: {
            document_id: 'd2',
            title: 'Legal Agreement',
            type: 'legal',
            company_id: 'other-company',
            indexed_at: '2024-03-01T10:00:00Z'
          }
        }
      ],
      search_time_ms: 20
    });

    beforeEach(() => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue(createMockWithMetadata());
    });

    it('should filter by multiple categories', async () => {
      const result = await SemanticSearchService.search('documents', {
        filters: { categories: ['financial', 'legal'] }
      });

      expect(result.results.length).toBe(2);
    });

    it('should apply minimum relevance threshold', async () => {
      const result = await SemanticSearchService.search('documents', {
        minRelevance: 0.92
      });

      result.results.forEach(r => {
        expect(r.relevanceScore).toBeGreaterThanOrEqual(0.92);
      });
    });
  });
});
