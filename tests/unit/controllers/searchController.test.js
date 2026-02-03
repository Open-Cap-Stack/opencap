/**
 * Global Search Controller Tests
 *
 * Issue #190 - Add Global Multi-Entity Search Endpoint
 * Comprehensive test suite for global multi-entity search functionality
 */

const searchController = require('../../../controllers/searchController');
const Stakeholder = require('../../../models/Stakeholder');
const Document = require('../../../models/Document');
const Task = require('../../../models/Task');
const Company = require('../../../models/Company');
const ShareClass = require('../../../models/ShareClass');
const Valuation409A = require('../../../models/Valuation409A');
const Communication = require('../../../models/Communication');
const SemanticSearchService = require('../../../services/semanticSearchService');

// Mock all dependencies
jest.mock('../../../models/Stakeholder', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Document', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Task', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Company', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/ShareClass', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Valuation409A', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Communication', () => ({
  find: jest.fn()
}));
jest.mock('../../../services/semanticSearchService');

describe('searchController', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;
  let mockSet;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock returns (empty arrays)
    Stakeholder.find.mockResolvedValue([]);
    Document.find.mockResolvedValue([]);
    Task.find.mockResolvedValue([]);
    Company.find.mockResolvedValue([]);
    ShareClass.find.mockResolvedValue([]);
    Valuation409A.find.mockResolvedValue([]);
    Communication.find.mockResolvedValue([]);
    SemanticSearchService.search.mockResolvedValue({ results: [], totalCount: 0 });

    // Setup mock response
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    mockSet = jest.fn();

    mockRes = {
      status: mockStatus,
      json: mockJson,
      set: mockSet
    };

    // Setup mock request
    mockReq = {
      query: {},
      user: { id: 'user123' }
    };
  });

  describe('globalSearch', () => {
    describe('Query Parameter Validation', () => {
      it('should return 400 if query parameter is missing', async () => {
        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Query parameter "q" is required'
        });
      });

      it('should return 400 if query is empty string', async () => {
        mockReq.query.q = '';

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Query parameter "q" cannot be empty'
        });
      });

      it('should return 400 if query is only whitespace', async () => {
        mockReq.query.q = '   ';

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Query parameter "q" cannot be empty'
        });
      });

      it('should return 400 if query is less than 2 characters', async () => {
        mockReq.query.q = 'a';

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Query must be at least 2 characters long'
        });
      });

      it('should return 400 if query exceeds 500 characters', async () => {
        mockReq.query.q = 'a'.repeat(501);

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Query cannot exceed 500 characters'
        });
      });
    });

    describe('Entity Type Filtering', () => {
      it('should return 400 for invalid entity type', async () => {
        mockReq.query.q = 'test';
        mockReq.query.types = 'invalid_type';

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid entity type: invalid_type. Valid types are: stakeholders, documents, tasks, companies, share_classes, valuations, messages'
        });
      });

      it('should accept single valid entity type', async () => {
        mockReq.query.q = 'test';
        mockReq.query.types = 'stakeholders';

        Stakeholder.find.mockResolvedValue([
          { _id: '1', name: 'Test Stakeholder', role: 'investor' }
        ]);

        await searchController.globalSearch(mockReq, mockRes);

        expect(Stakeholder.find).toHaveBeenCalled();
        expect(mockStatus).toHaveBeenCalledWith(200);
      });

      it('should accept multiple valid entity types', async () => {
        mockReq.query.q = 'test';
        mockReq.query.types = 'stakeholders,documents';

        Stakeholder.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [],
          totalCount: 0
        });

        await searchController.globalSearch(mockReq, mockRes);

        expect(Stakeholder.find).toHaveBeenCalled();
        expect(SemanticSearchService.search).toHaveBeenCalled();
        expect(mockStatus).toHaveBeenCalledWith(200);
      });
    });

    describe('Pagination Parameters', () => {
      it('should use default limit of 10 if not specified', async () => {
        mockReq.query.q = 'test';

        Stakeholder.find.mockResolvedValue([]);
        Document.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [],
          totalCount: 0
        });

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(200);
        const response = mockJson.mock.calls[0][0];
        expect(response.metadata.limit).toBe(10);
      });

      it('should accept custom limit parameter', async () => {
        mockReq.query.q = 'test';
        mockReq.query.limit = '5';

        Stakeholder.find.mockResolvedValue([]);
        Document.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [],
          totalCount: 0
        });

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response.metadata.limit).toBe(5);
      });

      it('should cap limit at 50', async () => {
        mockReq.query.q = 'test';
        mockReq.query.limit = '100';

        Stakeholder.find.mockResolvedValue([]);
        Document.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [],
          totalCount: 0
        });

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response.metadata.limit).toBe(50);
      });

      it('should use default offset of 0 if not specified', async () => {
        mockReq.query.q = 'test';

        Stakeholder.find.mockResolvedValue([]);
        Document.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [],
          totalCount: 0
        });

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response.metadata.offset).toBe(0);
      });

      it('should accept custom offset parameter', async () => {
        mockReq.query.q = 'test';
        mockReq.query.offset = '10';

        Stakeholder.find.mockResolvedValue([]);
        Document.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [],
          totalCount: 0
        });

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response.metadata.offset).toBe(10);
      });
    });

    describe('Search All Entity Types', () => {
      it('should search all entity types when no type filter is specified', async () => {
        mockReq.query.q = 'test query';

        // Mock all entity searches
        Stakeholder.find.mockResolvedValue([
          { _id: '1', name: 'Test Stakeholder', email: 'test@example.com', role: 'investor' }
        ]);
        Task.find.mockResolvedValue([
          { _id: '2', title: 'Test Task', description: 'Test description', status: 'pending' }
        ]);
        Company.find.mockResolvedValue([
          { _id: '3', CompanyName: 'Test Company', CompanyType: 'startup' }
        ]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({
          results: [
            { documentId: '4', name: 'Test Document', category: 'contract' }
          ],
          totalCount: 1
        });

        await searchController.globalSearch(mockReq, mockRes);

        expect(Stakeholder.find).toHaveBeenCalled();
        expect(Task.find).toHaveBeenCalled();
        expect(Company.find).toHaveBeenCalled();
        expect(ShareClass.find).toHaveBeenCalled();
        expect(Valuation409A.find).toHaveBeenCalled();
        expect(Communication.find).toHaveBeenCalled();
        expect(SemanticSearchService.search).toHaveBeenCalled();

        expect(mockStatus).toHaveBeenCalledWith(200);
        const response = mockJson.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.results.stakeholders).toHaveLength(1);
        expect(response.results.tasks).toHaveLength(1);
        expect(response.results.companies).toHaveLength(1);
        expect(response.results.documents).toHaveLength(1);
        expect(response.totalResults).toBe(4);
      });

      it('should include relevance scores for stakeholders', async () => {
        mockReq.query.q = 'doe';

        Stakeholder.find.mockResolvedValue([
          { _id: '1', name: 'John Doe', email: 'john@example.com', role: 'investor' },
          { _id: '2', name: 'Jane Doe', email: 'jane@example.com', role: 'employee' },
          { _id: '3', name: 'Bob Smith', email: 'bob@example.com', role: 'investor' }
        ]);

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        // Should only include John Doe and Jane Doe (not Bob Smith who doesn't match)
        expect(response.results.stakeholders.length).toBeGreaterThan(0);

        // Check relevance scores are present and valid
        response.results.stakeholders.forEach(result => {
          expect(result).toHaveProperty('relevance');
          expect(result.relevance).toBeGreaterThanOrEqual(0);
          expect(result.relevance).toBeLessThanOrEqual(1);
        });

        // All returned results should have matching text
        response.results.stakeholders.forEach(result => {
          const matchesQuery =
            result.name?.toLowerCase().includes('doe') ||
            result.email?.toLowerCase().includes('doe');
          expect(matchesQuery).toBe(true);
        });
      });

      it('should include entity type in all results', async () => {
        mockReq.query.q = 'test';

        Stakeholder.find.mockResolvedValue([
          { _id: '1', name: 'Test Stakeholder', email: 'test@example.com' }
        ]);
        Task.find.mockResolvedValue([
          { _id: '2', title: 'Test Task' }
        ]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({ results: [], totalCount: 0 });

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response.results.stakeholders[0].entityType).toBe('stakeholder');
        expect(response.results.tasks[0].entityType).toBe('task');
      });
    });

    describe('Search Specific Entity Types', () => {
      it('should only search stakeholders when type is stakeholders', async () => {
        mockReq.query.q = 'test';
        mockReq.query.types = 'stakeholders';

        Stakeholder.find.mockResolvedValue([
          { _id: '1', name: 'Test Stakeholder', email: 'test@example.com', role: 'investor' }
        ]);

        await searchController.globalSearch(mockReq, mockRes);

        expect(Stakeholder.find).toHaveBeenCalled();
        expect(Task.find).not.toHaveBeenCalled();
        expect(Company.find).not.toHaveBeenCalled();
        expect(SemanticSearchService.search).not.toHaveBeenCalled();

        const response = mockJson.mock.calls[0][0];
        expect(response.results.stakeholders).toBeDefined();
        expect(response.results.tasks).toBeUndefined();
      });

      it('should search documents using semantic search', async () => {
        mockReq.query.q = 'investment agreement';
        mockReq.query.types = 'documents';

        SemanticSearchService.search.mockResolvedValue({
          results: [
            { documentId: '1', name: 'Investment Agreement 2024', category: 'contract' }
          ],
          totalCount: 1
        });

        await searchController.globalSearch(mockReq, mockRes);

        expect(SemanticSearchService.search).toHaveBeenCalledWith(
          'investment agreement',
          expect.objectContaining({
            pagination: expect.objectContaining({
              page: 1,
              pageSize: 10
            })
          })
        );

        const response = mockJson.mock.calls[0][0];
        expect(response.results.documents).toHaveLength(1);
      });
    });

    describe('Response Format', () => {
      it('should return properly formatted response with all metadata', async () => {
        mockReq.query.q = 'test';

        Stakeholder.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({ results: [], totalCount: 0 });

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('query', 'test');
        expect(response).toHaveProperty('results');
        expect(response).toHaveProperty('totalResults');
        expect(response).toHaveProperty('metadata');
        expect(response.metadata).toHaveProperty('limit');
        expect(response.metadata).toHaveProperty('offset');
        expect(response.metadata).toHaveProperty('searchTimeMs');
      });

      it('should set search time header', async () => {
        mockReq.query.q = 'test';

        Stakeholder.find.mockResolvedValue([]);
        Task.find.mockResolvedValue([]);
        Company.find.mockResolvedValue([]);
        ShareClass.find.mockResolvedValue([]);
        Valuation409A.find.mockResolvedValue([]);
        Communication.find.mockResolvedValue([]);
        SemanticSearchService.search.mockResolvedValue({ results: [], totalCount: 0 });

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockSet).toHaveBeenCalledWith(
          'X-Search-Time-Ms',
          expect.any(String)
        );
      });

      it('should respect limit for each entity type', async () => {
        mockReq.query.q = 'test';
        mockReq.query.limit = '2';

        // Return more results than limit - all matching the query
        Stakeholder.find.mockResolvedValue([
          { _id: '1', name: 'Test Stakeholder 1', email: 'test1@example.com' },
          { _id: '2', name: 'Test Stakeholder 2', email: 'test2@example.com' },
          { _id: '3', name: 'Test Stakeholder 3', email: 'test3@example.com' }
        ]);

        await searchController.globalSearch(mockReq, mockRes);

        const response = mockJson.mock.calls[0][0];
        expect(response.results.stakeholders.length).toBeLessThanOrEqual(2);
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockReq.query.q = 'test';

        // All entities fail
        Stakeholder.find.mockRejectedValue(new Error('Database connection failed'));
        Task.find.mockRejectedValue(new Error('Database connection failed'));
        Company.find.mockRejectedValue(new Error('Database connection failed'));
        ShareClass.find.mockRejectedValue(new Error('Database connection failed'));
        Valuation409A.find.mockRejectedValue(new Error('Database connection failed'));
        Communication.find.mockRejectedValue(new Error('Database connection failed'));
        SemanticSearchService.search.mockRejectedValue(new Error('Database connection failed'));

        await searchController.globalSearch(mockReq, mockRes);

        // Should still return 200 with empty results (graceful degradation)
        expect(mockStatus).toHaveBeenCalledWith(200);
        const response = mockJson.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.totalResults).toBe(0);
      });

      it('should continue searching other entities if one fails', async () => {
        mockReq.query.q = 'test';

        Stakeholder.find.mockRejectedValue(new Error('Stakeholder search failed'));
        Task.find.mockResolvedValue([
          { _id: '1', title: 'Test Task', description: 'Test description' }
        ]);

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(200);
        const response = mockJson.mock.calls[0][0];
        expect(response.results.stakeholders).toEqual([]);
        expect(response.results.tasks.length).toBeGreaterThan(0);
      });

      it('should handle semantic search service errors', async () => {
        mockReq.query.q = 'test';
        mockReq.query.types = 'documents';

        SemanticSearchService.search.mockRejectedValue(new Error('Semantic search failed'));

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(200);
        const response = mockJson.mock.calls[0][0];
        expect(response.results.documents).toEqual([]);
      });
    });

    describe('Search Timeout', () => {
      it('should timeout after 5 seconds', async () => {
        mockReq.query.q = 'test';

        // Mock a slow search that takes longer than timeout
        Stakeholder.find.mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve([]), 6000);
        }));

        await searchController.globalSearch(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(200);
        const response = mockJson.mock.calls[0][0];
        expect(response.metadata).toHaveProperty('timedOut');
      }, 10000); // Increase test timeout
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return 400 if query parameter is missing', async () => {
      await searchController.getSearchSuggestions(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Query parameter "q" is required'
      });
    });

    it('should return suggestions from all entity types', async () => {
      mockReq.query.q = 'john';

      Stakeholder.find.mockResolvedValue([
        { _id: '1', name: 'John Doe', email: 'john@example.com' }
      ]);
      Company.find.mockResolvedValue([
        { _id: '2', CompanyName: 'Johnson Corp' }
      ]);
      Task.find.mockResolvedValue([]);
      Document.find.mockResolvedValue([]);

      await searchController.getSearchSuggestions(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.suggestions).toBeInstanceOf(Array);
      expect(response.suggestions.length).toBeGreaterThan(0);
    });

    it('should limit suggestions to 10 by default', async () => {
      mockReq.query.q = 'test';

      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        _id: `${i}`,
        name: `Test ${i}`
      }));

      Stakeholder.find.mockResolvedValue(manyResults);
      Company.find.mockResolvedValue([]);
      Task.find.mockResolvedValue([]);
      Document.find.mockResolvedValue([]);

      await searchController.getSearchSuggestions(mockReq, mockRes);

      const response = mockJson.mock.calls[0][0];
      expect(response.suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should include entity type in suggestions', async () => {
      mockReq.query.q = 'test';

      Stakeholder.find.mockResolvedValue([
        { _id: '1', name: 'Test Stakeholder' }
      ]);
      Company.find.mockResolvedValue([]);
      Task.find.mockResolvedValue([]);
      Document.find.mockResolvedValue([]);

      await searchController.getSearchSuggestions(mockReq, mockRes);

      const response = mockJson.mock.calls[0][0];
      expect(response.suggestions[0]).toHaveProperty('entityType');
    });
  });
});
