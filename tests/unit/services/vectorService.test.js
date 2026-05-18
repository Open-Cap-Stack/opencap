/**
 * Unit Tests for VectorService
 *
 * Tests document indexing, vector search, compliance checking, analytics,
 * and embedding generation. All ZeroDB calls are mocked.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  upsertVector: jest.fn(),
  searchVectors: jest.fn(),
  listVectors: jest.fn(),
  projectId: 'mock-project-id'
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-vector-uuid')
}));

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

describe('VectorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.upsertVector.mockResolvedValue({ id: 'vec-1' });
    zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 5 });
    zerodbService.listVectors.mockResolvedValue([]);
  });

  // ---------------------------------------------------------------------------
  // Constructor / namespace properties
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('sets documentNamespace to "documents"', () => {
      expect(vectorService.documentNamespace).toBe('documents');
    });

    it('sets complianceNamespace to "compliance"', () => {
      expect(vectorService.complianceNamespace).toBe('compliance');
    });

    it('sets financialNamespace to "financial"', () => {
      expect(vectorService.financialNamespace).toBe('financial');
    });

    it('sets userNamespace to "users"', () => {
      expect(vectorService.userNamespace).toBe('users');
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------
  describe('initialize', () => {
    it('calls zerodbService.initialize with the provided token', async () => {
      zerodbService.initialize.mockResolvedValue(undefined);
      await vectorService.initialize('jwt-token-abc');

      expect(zerodbService.initialize).toHaveBeenCalledWith('jwt-token-abc');
    });

    it('rethrows errors from zerodbService.initialize', async () => {
      zerodbService.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(vectorService.initialize('bad-token')).rejects.toThrow('Init failed');
    });
  });

  // ---------------------------------------------------------------------------
  // simpleHash
  // ---------------------------------------------------------------------------
  describe('simpleHash', () => {
    it('returns 0 for an empty string', () => {
      expect(vectorService.simpleHash('')).toBe(0);
    });

    it('returns a number for a non-empty string', () => {
      const hash = vectorService.simpleHash('hello world');
      expect(typeof hash).toBe('number');
    });

    it('returns the same hash for the same input', () => {
      const hash1 = vectorService.simpleHash('test string');
      const hash2 = vectorService.simpleHash('test string');
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different inputs', () => {
      const hash1 = vectorService.simpleHash('string one');
      const hash2 = vectorService.simpleHash('string two');
      expect(hash1).not.toBe(hash2);
    });
  });

  // ---------------------------------------------------------------------------
  // generateEmbedding
  // ---------------------------------------------------------------------------
  describe('generateEmbedding', () => {
    it('returns an array of 768 numbers', async () => {
      const embedding = await vectorService.generateEmbedding('some text');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding).toHaveLength(768);
    });

    it('returns numeric values for each dimension', async () => {
      const embedding = await vectorService.generateEmbedding('test');

      embedding.forEach(value => {
        expect(typeof value).toBe('number');
        expect(isNaN(value)).toBe(false);
      });
    });

    it('returns different embeddings for different inputs', async () => {
      const emb1 = await vectorService.generateEmbedding('document one');
      const emb2 = await vectorService.generateEmbedding('document two');

      // The first element should differ for distinct inputs
      expect(emb1[0]).not.toBe(emb2[0]);
    });

    it('returns the same embedding for the same input', async () => {
      const emb1 = await vectorService.generateEmbedding('consistent text');
      const emb2 = await vectorService.generateEmbedding('consistent text');

      expect(emb1[0]).toBe(emb2[0]);
      expect(emb1[767]).toBe(emb2[767]);
    });
  });

  // ---------------------------------------------------------------------------
  // indexDocument
  // ---------------------------------------------------------------------------
  describe('indexDocument', () => {
    it('calls upsertVector in documents namespace for a generic document', async () => {
      await vectorService.indexDocument('doc-1', 'My Doc', 'Content here', 'generic', {});

      expect(zerodbService.upsertVector).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Number)]),
        'documents',
        expect.objectContaining({ document_id: 'doc-1', title: 'My Doc', type: 'generic' }),
        'Content here',
        'document:doc-1'
      );
    });

    it('uses complianceNamespace for compliance_document type', async () => {
      await vectorService.indexDocument('doc-2', 'Compliance Doc', 'Text', 'compliance_document', {});

      expect(zerodbService.upsertVector).toHaveBeenCalledWith(
        expect.any(Array),
        'compliance',
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });

    it('uses financialNamespace for financial_report type', async () => {
      await vectorService.indexDocument('doc-3', 'Q4 Report', 'Revenue: 1M', 'financial_report', {});

      expect(zerodbService.upsertVector).toHaveBeenCalledWith(
        expect.any(Array),
        'financial',
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });

    it('includes custom metadata in vector metadata', async () => {
      await vectorService.indexDocument('doc-4', 'Title', 'Body', 'generic', {
        company_id: 'co-1',
        year: 2024
      });

      const vectorMeta = zerodbService.upsertVector.mock.calls[0][2];
      expect(vectorMeta.company_id).toBe('co-1');
      expect(vectorMeta.year).toBe(2024);
    });

    it('includes indexed_at timestamp in metadata', async () => {
      await vectorService.indexDocument('doc-5', 'Title', 'Body', 'generic', {});

      const vectorMeta = zerodbService.upsertVector.mock.calls[0][2];
      expect(vectorMeta.indexed_at).toBeDefined();
    });

    it('rethrows errors from upsertVector', async () => {
      zerodbService.upsertVector.mockRejectedValue(new Error('Upsert failed'));

      await expect(
        vectorService.indexDocument('doc-fail', 'Title', 'Body', 'generic', {})
      ).rejects.toThrow('Upsert failed');
    });
  });

  // ---------------------------------------------------------------------------
  // searchDocuments
  // ---------------------------------------------------------------------------
  describe('searchDocuments', () => {
    it('calls searchVectors and returns a results object', async () => {
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'doc-1', type: 'generic' }, similarity_score: 0.9 }
        ],
        search_time_ms: 12
      });

      const result = await vectorService.searchDocuments('quarterly revenue', 'documents', 5);

      expect(result.query).toBe('quarterly revenue');
      expect(result.results).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.search_time_ms).toBe(12);
    });

    it('filters by type when filters.type is provided', async () => {
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [
          { vector_metadata: { type: 'financial_report' }, similarity_score: 0.8 },
          { vector_metadata: { type: 'compliance_document' }, similarity_score: 0.7 }
        ]
      });

      const result = await vectorService.searchDocuments('report', 'documents', 10, {
        type: 'financial_report'
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].vector_metadata.type).toBe('financial_report');
    });

    it('filters by dateRange when provided', async () => {
      const recent = new Date('2024-06-01').toISOString();
      const old = new Date('2023-01-01').toISOString();
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [
          { vector_metadata: { indexed_at: recent }, similarity_score: 0.9 },
          { vector_metadata: { indexed_at: old }, similarity_score: 0.8 }
        ]
      });

      const result = await vectorService.searchDocuments('query', 'documents', 10, {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
      });

      expect(result.results).toHaveLength(1);
    });

    it('returns empty results when searchVectors returns no vectors', async () => {
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 3 });

      const result = await vectorService.searchDocuments('nothing', 'documents', 10);

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('rethrows errors from searchVectors', async () => {
      zerodbService.searchVectors.mockRejectedValue(new Error('Search failed'));

      await expect(vectorService.searchDocuments('query')).rejects.toThrow('Search failed');
    });
  });

  // ---------------------------------------------------------------------------
  // searchFinancialDocuments
  // ---------------------------------------------------------------------------
  describe('searchFinancialDocuments', () => {
    it('delegates to searchDocuments with financialNamespace', async () => {
      const searchSpy = jest.spyOn(vectorService, 'searchDocuments').mockResolvedValue({
        query: 'revenue', results: [], total_count: 0, search_time_ms: 1
      });

      await vectorService.searchFinancialDocuments('revenue', 5, {});

      expect(searchSpy).toHaveBeenCalledWith('revenue', 'financial', 5, {});
      searchSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // searchComplianceDocuments
  // ---------------------------------------------------------------------------
  describe('searchComplianceDocuments', () => {
    it('delegates to searchDocuments with complianceNamespace', async () => {
      const searchSpy = jest.spyOn(vectorService, 'searchDocuments').mockResolvedValue({
        query: 'regulation', results: [], total_count: 0, search_time_ms: 1
      });

      await vectorService.searchComplianceDocuments('regulation', 10, {});

      expect(searchSpy).toHaveBeenCalledWith('regulation', 'compliance', 10, {});
      searchSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // findSimilarDocuments
  // ---------------------------------------------------------------------------
  describe('findSimilarDocuments', () => {
    it('throws when source document is not found in vector DB', async () => {
      zerodbService.listVectors.mockResolvedValue([
        { vector_metadata: { document_id: 'different-doc' }, vector_embedding: [] }
      ]);

      await expect(
        vectorService.findSimilarDocuments('non-existent-doc', 5)
      ).rejects.toThrow('not found in vector database');
    });

    it('returns similar documents excluding the source document', async () => {
      const sourceEmbedding = [0.1, 0.2, 0.3];
      zerodbService.listVectors.mockResolvedValue([
        { vector_metadata: { document_id: 'source-doc' }, vector_embedding: sourceEmbedding }
      ]);
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'source-doc' }, similarity_score: 1.0 },
          { vector_metadata: { document_id: 'similar-doc-1' }, similarity_score: 0.85 },
          { vector_metadata: { document_id: 'similar-doc-2' }, similarity_score: 0.75 }
        ]
      });

      const result = await vectorService.findSimilarDocuments('source-doc', 5);

      expect(result.source_document_id).toBe('source-doc');
      expect(result.similar_documents.every(d => d.vector_metadata.document_id !== 'source-doc')).toBe(true);
      expect(result.similar_documents).toHaveLength(2);
    });

    it('limits results to the specified limit', async () => {
      zerodbService.listVectors.mockResolvedValue([
        { vector_metadata: { document_id: 'src' }, vector_embedding: [0.1] }
      ]);
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'a' } },
          { vector_metadata: { document_id: 'b' } },
          { vector_metadata: { document_id: 'c' } },
          { vector_metadata: { document_id: 'd' } }
        ]
      });

      const result = await vectorService.findSimilarDocuments('src', 2);

      expect(result.similar_documents.length).toBeLessThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateComplianceScore
  // ---------------------------------------------------------------------------
  describe('calculateComplianceScore', () => {
    it('returns 0 for empty results array', () => {
      expect(vectorService.calculateComplianceScore([])).toBe(0);
    });

    it('averages similarity_score from results', () => {
      const results = [
        { similarity_score: 0.8 },
        { similarity_score: 0.6 }
      ];
      const score = vectorService.calculateComplianceScore(results);
      expect(score).toBeCloseTo(0.7, 5);
    });

    it('caps score at 1', () => {
      const results = [
        { similarity_score: 0.9 },
        { similarity_score: 0.95 }
      ];
      const score = vectorService.calculateComplianceScore(results);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('uses 0.5 as default when similarity_score is absent', () => {
      const results = [{ noScore: true }, { noScore: true }];
      const score = vectorService.calculateComplianceScore(results);
      expect(score).toBeCloseTo(0.5, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // calculateOverallComplianceScore
  // ---------------------------------------------------------------------------
  describe('calculateOverallComplianceScore', () => {
    it('returns 0 for empty compliance results', () => {
      expect(vectorService.calculateOverallComplianceScore([])).toBe(0);
    });

    it('averages compliance scores from all results', () => {
      const results = [
        { compliance_score: 0.8 },
        { compliance_score: 0.6 }
      ];
      const score = vectorService.calculateOverallComplianceScore(results);
      expect(score).toBeCloseTo(0.7, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // checkCompliance
  // ---------------------------------------------------------------------------
  describe('checkCompliance', () => {
    it('returns compliance_checks array with one entry per rule', async () => {
      zerodbService.searchVectors.mockResolvedValue({ vectors: [], search_time_ms: 1 });

      const rules = [
        { id: 'rule-1', name: 'Rule One', query: 'GDPR requirements', type: 'gdpr' },
        { id: 'rule-2', name: 'Rule Two', query: 'SOX requirements', type: 'sox' }
      ];
      const result = await vectorService.checkCompliance('Document content here', rules);

      expect(result.compliance_checks).toHaveLength(2);
      expect(result.compliance_checks[0].rule_id).toBe('rule-1');
      expect(result.compliance_checks[1].rule_id).toBe('rule-2');
    });

    it('truncates document_content in the response', async () => {
      zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

      const longContent = 'a'.repeat(500);
      const result = await vectorService.checkCompliance(longContent, []);

      expect(result.document_content.length).toBeLessThanOrEqual(205); // 200 + '...'
    });

    it('calculates overall_compliance_score from individual rule scores', async () => {
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [{ similarity_score: 0.9 }]
      });

      const rules = [{ id: 'r1', name: 'R1', query: 'query', type: 'type1' }];
      const result = await vectorService.checkCompliance('content', rules);

      expect(typeof result.overall_compliance_score).toBe('number');
      expect(result.overall_compliance_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_compliance_score).toBeLessThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getDocumentAnalytics
  // ---------------------------------------------------------------------------
  describe('getDocumentAnalytics', () => {
    it('returns analytics with total_documents count', async () => {
      zerodbService.listVectors.mockResolvedValue([
        {
          vector_metadata: { type: 'financial_report' },
          created_at: '2024-01-15T10:00:00Z',
          vector_embedding: new Array(768).fill(0)
        },
        {
          vector_metadata: { type: 'compliance_document' },
          created_at: '2024-02-20T10:00:00Z',
          vector_embedding: new Array(768).fill(0)
        }
      ]);

      const analytics = await vectorService.getDocumentAnalytics('documents');

      expect(analytics.total_documents).toBe(2);
      expect(analytics.document_types['financial_report']).toBe(1);
      expect(analytics.document_types['compliance_document']).toBe(1);
    });

    it('uses documentNamespace as default namespace', async () => {
      zerodbService.listVectors.mockResolvedValue([]);

      await vectorService.getDocumentAnalytics();

      expect(zerodbService.listVectors).toHaveBeenCalledWith('documents', 0, 1000);
    });

    it('tracks indexed_over_time by date', async () => {
      zerodbService.listVectors.mockResolvedValue([
        { vector_metadata: {}, created_at: '2024-01-01T00:00:00Z', vector_embedding: [] }
      ]);

      const analytics = await vectorService.getDocumentAnalytics('documents');

      expect(analytics.indexed_over_time['2024-01-01']).toBe(1);
    });

    it('labels documents without a type as "unknown"', async () => {
      zerodbService.listVectors.mockResolvedValue([
        { vector_metadata: {}, created_at: '2024-01-01T00:00:00Z', vector_embedding: [] }
      ]);

      const analytics = await vectorService.getDocumentAnalytics('documents');

      expect(analytics.document_types['unknown']).toBe(1);
    });

    it('rethrows errors from listVectors', async () => {
      zerodbService.listVectors.mockRejectedValue(new Error('List error'));

      await expect(vectorService.getDocumentAnalytics()).rejects.toThrow('List error');
    });
  });

  // ---------------------------------------------------------------------------
  // deleteDocument
  // ---------------------------------------------------------------------------
  describe('deleteDocument', () => {
    it('returns false (not implemented in ZeroDB)', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await vectorService.deleteDocument('doc-1');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });
});
