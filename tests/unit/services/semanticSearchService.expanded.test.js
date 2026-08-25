/**
 * Semantic Search Service - Expanded Test Suite
 *
 * Covers additional branches not in the original test file:
 * - findSimilar (success, not found, error paths, filters, minSimilarity)
 * - rankResults (all weight/boost/decay combinations)
 * - calculateRecencyScore (custom decay, default decay)
 * - highlightMatches (all options, edge cases)
 * - escapeRegex
 * - searchAcrossNamespaces (multiple namespaces, error handling)
 * - getRelatedTerms
 * - applyFilters (status, tags, multiple categories)
 * - normalizeScore edge cases
 * - hasSignificantOverlap edge cases
 */

jest.mock('../../../services/vectorService');
jest.mock('../../../services/zerodbService');

const vectorService = require('../../../services/vectorService');
const zerodbService = require('../../../services/zerodbService');

const semanticSearchService = require('../../../services/semanticSearchService');

describe('SemanticSearchService (Expanded)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── findSimilar ──
  describe('findSimilar', () => {
    it('should throw when documentId is missing', async () => {
      await expect(semanticSearchService.findSimilar(null))
        .rejects.toThrow('Document ID is required');
    });

    it('should throw when documentId is empty string', async () => {
      await expect(semanticSearchService.findSimilar(''))
        .rejects.toThrow('Document ID is required');
    });

    it('should throw when source document not found in vector DB', async () => {
      zerodbService.getVector = jest.fn().mockResolvedValue(null);

      await expect(semanticSearchService.findSimilar('doc_999'))
        .rejects.toThrow('Document doc_999 not found in vector database');
    });

    it('should throw when source document has no vector_embedding', async () => {
      zerodbService.getVector = jest.fn().mockResolvedValue({ vector_metadata: {} });

      await expect(semanticSearchService.findSimilar('doc_999'))
        .rejects.toThrow('Document doc_999 not found in vector database');
    });

    it('should find similar documents and exclude the source document', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      zerodbService.getVector = jest.fn().mockResolvedValue({
        vector_embedding: mockEmbedding,
        vector_metadata: { document_id: 'doc_1' }
      });
      zerodbService.searchVectors = jest.fn().mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'doc_1', title: 'Source', type: 'a', company_id: 'c1' }, similarity_score: 1.0 },
          { vector_metadata: { document_id: 'doc_2', title: 'Similar', type: 'b', company_id: 'c1' }, similarity_score: 0.9 },
          { vector_metadata: { document_id: 'doc_3', title: 'Another', type: 'a', company_id: 'c2' }, similarity_score: 0.7 }
        ],
        search_time_ms: 25
      });

      const result = await semanticSearchService.findSimilar('doc_1');

      expect(result.sourceDocumentId).toBe('doc_1');
      expect(result.similarDocuments).toHaveLength(2);
      expect(result.similarDocuments.every(d => d.documentId !== 'doc_1')).toBe(true);
      expect(result.searchTimeMs).toBe(25);
    });

    it('should apply minSimilarity threshold', async () => {
      zerodbService.getVector = jest.fn().mockResolvedValue({
        vector_embedding: [0.1],
        vector_metadata: { document_id: 'doc_1' }
      });
      zerodbService.searchVectors = jest.fn().mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'doc_2' }, similarity_score: 0.9 },
          { vector_metadata: { document_id: 'doc_3' }, similarity_score: 0.3 }
        ],
        search_time_ms: 10
      });

      const result = await semanticSearchService.findSimilar('doc_1', { minSimilarity: 0.5 });

      expect(result.similarDocuments).toHaveLength(1);
      expect(result.similarDocuments[0].documentId).toBe('doc_2');
    });

    it('should apply filters to similar documents', async () => {
      zerodbService.getVector = jest.fn().mockResolvedValue({
        vector_embedding: [0.1],
        vector_metadata: { document_id: 'doc_1' }
      });
      zerodbService.searchVectors = jest.fn().mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'doc_2', type: 'financial', company_id: 'c1' }, similarity_score: 0.9 },
          { vector_metadata: { document_id: 'doc_3', type: 'legal', company_id: 'c2' }, similarity_score: 0.8 }
        ],
        search_time_ms: 10
      });

      const result = await semanticSearchService.findSimilar('doc_1', {
        filters: { companyId: 'c1' }
      });

      expect(result.similarDocuments).toHaveLength(1);
      expect(result.similarDocuments[0].companyId).toBe('c1');
    });

    it('should respect custom limit', async () => {
      zerodbService.getVector = jest.fn().mockResolvedValue({
        vector_embedding: [0.1],
        vector_metadata: { document_id: 'doc_1' }
      });
      zerodbService.searchVectors = jest.fn().mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'doc_2' }, similarity_score: 0.9 },
          { vector_metadata: { document_id: 'doc_3' }, similarity_score: 0.8 },
          { vector_metadata: { document_id: 'doc_4' }, similarity_score: 0.7 }
        ],
        search_time_ms: 10
      });

      const result = await semanticSearchService.findSimilar('doc_1', { limit: 2 });
      expect(result.similarDocuments.length).toBeLessThanOrEqual(2);
    });

    it('should use custom namespace', async () => {
      zerodbService.getVector = jest.fn().mockResolvedValue({
        vector_embedding: [0.1],
        vector_metadata: { document_id: 'doc_1' }
      });
      zerodbService.searchVectors = jest.fn().mockResolvedValue({ vectors: [], search_time_ms: 5 });

      await semanticSearchService.findSimilar('doc_1', { namespace: 'custom_ns' });

      expect(zerodbService.getVector).toHaveBeenCalledWith('document:doc_1', 'custom_ns');
      expect(zerodbService.searchVectors).toHaveBeenCalledWith([0.1], 11, 'custom_ns');
    });

    it('should throw generic error for non-not-found errors', async () => {
      zerodbService.getVector = jest.fn().mockRejectedValue(new Error('API unavailable'));

      await expect(semanticSearchService.findSimilar('doc_1'))
        .rejects.toThrow('Failed to find similar documents');
    });
  });

  // ── rankResults ──
  describe('rankResults', () => {
    it('should return empty array for null input', () => {
      expect(semanticSearchService.rankResults(null)).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(semanticSearchService.rankResults([])).toEqual([]);
    });

    it('should sort by composite score descending', () => {
      const results = [
        { relevanceScore: 0.5, indexedAt: new Date().toISOString() },
        { relevanceScore: 0.9, indexedAt: new Date().toISOString() }
      ];

      const ranked = semanticSearchService.rankResults(results);
      expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore);
    });

    it('should apply category boost', () => {
      const results = [
        { relevanceScore: 0.8, category: 'financial' },
        { relevanceScore: 0.8, category: 'legal' }
      ];

      const ranked = semanticSearchService.rankResults(results, {
        boosts: { category: 'financial', categoryMultiplier: 1.5 }
      });

      const financial = ranked.find(r => r.category === 'financial');
      const legal = ranked.find(r => r.category === 'legal');
      expect(financial.compositeScore).toBeGreaterThan(legal.compositeScore);
    });

    it('should apply company boost', () => {
      const results = [
        { relevanceScore: 0.8, companyId: 'c1' },
        { relevanceScore: 0.8, companyId: 'c2' }
      ];

      const ranked = semanticSearchService.rankResults(results, {
        boosts: { companyId: 'c1', companyMultiplier: 1.3 }
      });

      const c1 = ranked.find(r => r.companyId === 'c1');
      const c2 = ranked.find(r => r.companyId === 'c2');
      expect(c1.compositeScore).toBeGreaterThan(c2.compositeScore);
    });

    it('should use default category multiplier when not specified', () => {
      const results = [
        { relevanceScore: 0.8, category: 'financial' }
      ];

      const ranked = semanticSearchService.rankResults(results, {
        boosts: { category: 'financial' }
      });

      // Default multiplier is 1.2
      expect(ranked[0].compositeScore).toBeGreaterThan(0);
    });

    it('should include rankingFactors in output', () => {
      const results = [
        { relevanceScore: 0.9, indexedAt: new Date().toISOString(), viewCount: 500 }
      ];

      const ranked = semanticSearchService.rankResults(results);

      expect(ranked[0]).toHaveProperty('rankingFactors');
      expect(ranked[0].rankingFactors).toHaveProperty('relevance');
      expect(ranked[0].rankingFactors).toHaveProperty('recency');
      expect(ranked[0].rankingFactors).toHaveProperty('popularity');
    });

    it('should handle results without viewCount', () => {
      const results = [{ relevanceScore: 0.9 }];
      const ranked = semanticSearchService.rankResults(results);
      expect(ranked[0].rankingFactors.popularity).toBe(0);
    });

    it('should cap popularity score at 1', () => {
      const results = [{ relevanceScore: 0.9, viewCount: 5000 }];
      const ranked = semanticSearchService.rankResults(results, { weights: { popularity: 1.0 } });
      expect(ranked[0].rankingFactors.popularity).toBeLessThanOrEqual(1.0);
    });

    it('should add titleMatch weight when result has titleMatch', () => {
      const results = [
        { relevanceScore: 0.5, titleMatch: true },
        { relevanceScore: 0.5, titleMatch: false }
      ];

      const ranked = semanticSearchService.rankResults(results);
      expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore);
    });

    it('should accept custom weights', () => {
      const results = [
        { relevanceScore: 0.5, indexedAt: new Date().toISOString() }
      ];

      const ranked = semanticSearchService.rankResults(results, {
        weights: { relevanceScore: 1.0, recency: 0, popularity: 0, titleMatch: 0 }
      });

      expect(ranked[0].compositeScore).toBeCloseTo(0.5, 1);
    });

    it('should use custom decay function when provided', () => {
      const oldDate = new Date(Date.now() - 86400000 * 60).toISOString();
      const results = [
        { relevanceScore: 0.8, indexedAt: oldDate }
      ];

      // Custom decay returns 0 for docs older than 30 days
      const customDecay = (days) => days < 30 ? 1 : 0;

      const rankedWithCustom = semanticSearchService.rankResults(results, {
        decayFunction: customDecay,
        weights: { relevanceScore: 0, recency: 1.0, popularity: 0, titleMatch: 0 }
      });

      const rankedWithDefault = semanticSearchService.rankResults(results, {
        weights: { relevanceScore: 0, recency: 1.0, popularity: 0, titleMatch: 0 }
      });

      // With custom decay, the composite score should be 0 (decay returns 0 for 60 days)
      // With default decay, the composite score should be > 0
      expect(rankedWithCustom[0].compositeScore).toBe(0);
      expect(rankedWithDefault[0].compositeScore).toBeGreaterThan(0);
    });
  });

  // ── calculateRecencyScore ──
  describe('calculateRecencyScore', () => {
    it('should return high score for recent documents', () => {
      const score = semanticSearchService.calculateRecencyScore(new Date());
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return lower score for older documents', () => {
      const oldDate = new Date(Date.now() - 86400000 * 60); // 60 days ago
      const score = semanticSearchService.calculateRecencyScore(oldDate);
      expect(score).toBeLessThan(0.3);
    });

    it('should use custom decay function when provided', () => {
      const customDecay = (days) => days > 10 ? 0 : 1;
      const oldDate = new Date(Date.now() - 86400000 * 30);

      const score = semanticSearchService.calculateRecencyScore(oldDate, customDecay);
      expect(score).toBe(0);
    });

    it('should handle string date input', () => {
      const score = semanticSearchService.calculateRecencyScore('2024-06-15T10:00:00Z');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // ── highlightMatches ──
  describe('highlightMatches', () => {
    it('should return empty result when content is null', () => {
      const result = semanticSearchService.highlightMatches(null, 'query');
      expect(result.highlightedContent).toBe('');
      expect(result.matches).toEqual([]);
      expect(result.matchCount).toBe(0);
    });

    it('should return empty result when query is null', () => {
      const result = semanticSearchService.highlightMatches('content', null);
      expect(result.highlightedContent).toBe('content');
      expect(result.matches).toEqual([]);
    });

    it('should highlight matching words with default tag', () => {
      const content = 'This is a test document about equity compensation plans.';
      const result = semanticSearchService.highlightMatches(content, 'equity plans');

      expect(result.highlightedContent).toContain('<mark>equity</mark>');
      expect(result.highlightedContent).toContain('<mark>plans</mark>');
      expect(result.matchCount).toBeGreaterThan(0);
    });

    it('should use custom highlight tag', () => {
      const content = 'Test the equity in this document.';
      const result = semanticSearchService.highlightMatches(content, 'equity', { highlightTag: 'em' });

      expect(result.highlightedContent).toContain('<em>equity</em>');
    });

    it('should respect maxMatches option', () => {
      const content = 'test test test test test test test test test test test';
      const result = semanticSearchService.highlightMatches(content, 'test', { maxMatches: 3 });

      expect(result.matches.length).toBeLessThanOrEqual(3);
    });

    it('should skip words shorter than 3 chars', () => {
      const content = 'The a is at in the big document about testing.';
      const result = semanticSearchService.highlightMatches(content, 'a is at');

      // These words are 1-2 chars and should be filtered out
      expect(result.matchCount).toBe(0);
    });

    it('should be case insensitive by default', () => {
      const content = 'EQUITY Equity equity';
      const result = semanticSearchService.highlightMatches(content, 'equity');

      expect(result.matchCount).toBe(3);
    });

    it('should be case sensitive when option is set', () => {
      const content = 'EQUITY Equity equity';
      const result = semanticSearchService.highlightMatches(content, 'equity', { caseSensitive: true });

      // Only the lowercase 'equity' should match
      expect(result.matches.every(m => m.word === 'equity')).toBe(true);
    });

    it('should include context around matches', () => {
      const content = 'A'.repeat(100) + ' equity ' + 'B'.repeat(100);
      const result = semanticSearchService.highlightMatches(content, 'equity', { contextLength: 10 });

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0]).toHaveProperty('context');
      expect(result.matches[0]).toHaveProperty('startInContext');
      expect(result.matches[0]).toHaveProperty('endInContext');
    });

    it('should return queryWords in result', () => {
      const result = semanticSearchService.highlightMatches('test content', 'test query');
      expect(result.queryWords).toEqual(['test', 'query']);
    });
  });

  // ── escapeRegex ──
  describe('escapeRegex', () => {
    it('should escape special regex characters', () => {
      const escaped = semanticSearchService.escapeRegex('hello.*+?^${}()|[]\\world');
      expect(escaped).toBe('hello\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\world');
    });

    it('should return normal string unchanged', () => {
      expect(semanticSearchService.escapeRegex('hello')).toBe('hello');
    });
  });

  // ── normalizeScore ──
  describe('normalizeScore', () => {
    it('should clamp negative scores to 0', () => {
      expect(semanticSearchService.normalizeScore(-0.5)).toBe(0);
    });

    it('should clamp scores above 1 to 1', () => {
      expect(semanticSearchService.normalizeScore(1.5)).toBe(1);
    });

    it('should pass through valid scores', () => {
      expect(semanticSearchService.normalizeScore(0.5)).toBe(0.5);
    });

    it('should pass 0 through', () => {
      expect(semanticSearchService.normalizeScore(0)).toBe(0);
    });

    it('should pass 1 through', () => {
      expect(semanticSearchService.normalizeScore(1)).toBe(1);
    });
  });

  // ── hasSignificantOverlap ──
  describe('hasSignificantOverlap', () => {
    it('should return true for significant word overlap', () => {
      expect(semanticSearchService.hasSignificantOverlap('stock option plan', 'stock option')).toBe(true);
    });

    it('should return false when no overlap', () => {
      expect(semanticSearchService.hasSignificantOverlap('employee handbook', 'financial report')).toBe(false);
    });

    it('should return false for empty query words (short words only)', () => {
      expect(semanticSearchService.hasSignificantOverlap('a b c', 'x y')).toBe(false);
    });

    it('should handle partial word matches', () => {
      expect(semanticSearchService.hasSignificantOverlap('investing strategies', 'invest')).toBe(true);
    });
  });

  // ── applyFilters (expanded) ──
  describe('applyFilters (expanded)', () => {
    const results = [
      { documentId: 'd1', companyId: 'c1', category: 'financial', status: 'active', tags: ['tax', 'equity'], indexedAt: '2024-06-15' },
      { documentId: 'd2', companyId: 'c2', category: 'legal', status: 'archived', tags: ['contract'], indexedAt: '2024-03-01' },
      { documentId: 'd3', companyId: 'c1', category: 'hr', status: 'active', tags: ['employee'], indexedAt: '2024-09-01' }
    ];

    it('should filter by status', () => {
      const filtered = semanticSearchService.applyFilters(results, { status: 'active' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.status === 'active')).toBe(true);
    });

    it('should filter by tags', () => {
      const filtered = semanticSearchService.applyFilters(results, { tags: ['tax'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].documentId).toBe('d1');
    });

    it('should filter by multiple categories', () => {
      const filtered = semanticSearchService.applyFilters(results, { categories: ['financial', 'hr'] });
      expect(filtered).toHaveLength(2);
    });

    it('should filter by date range', () => {
      const filtered = semanticSearchService.applyFilters(results, {
        dateRange: { start: '2024-06-01', end: '2024-12-31' }
      });
      expect(filtered).toHaveLength(2);
    });

    it('should not filter results without indexedAt when date range is set', () => {
      const resultsNoDate = [{ documentId: 'd4', category: 'misc' }];
      const filtered = semanticSearchService.applyFilters(resultsNoDate, {
        dateRange: { start: '2024-01-01', end: '2024-12-31' }
      });
      expect(filtered).toHaveLength(1);
    });

    it('should combine multiple filters', () => {
      const filtered = semanticSearchService.applyFilters(results, {
        companyId: 'c1',
        status: 'active'
      });
      expect(filtered).toHaveLength(2);
    });

    it('should return original array when no filters are applied', () => {
      const filtered = semanticSearchService.applyFilters(results, {});
      expect(filtered).toHaveLength(3);
    });
  });

  // ── searchAcrossNamespaces ──
  describe('searchAcrossNamespaces', () => {
    beforeEach(() => {
      vectorService.generateEmbedding = jest.fn().mockResolvedValue(new Array(768).fill(0));
    });

    it('should search across multiple namespaces and combine results', async () => {
      zerodbService.searchVectors = jest.fn()
        .mockResolvedValueOnce({
          vectors: [{ vector_metadata: { document_id: 'doc_ns1', title: 'NS1 Doc', type: 'a' }, similarity_score: 0.9 }],
          search_time_ms: 10
        })
        .mockResolvedValueOnce({
          vectors: [{ vector_metadata: { document_id: 'doc_ns2', title: 'NS2 Doc', type: 'b' }, similarity_score: 0.8 }],
          search_time_ms: 15
        });

      const result = await semanticSearchService.searchAcrossNamespaces('query', ['ns1', 'ns2']);

      expect(result.totalCount).toBe(2);
      expect(result.namespaces).toEqual(['ns1', 'ns2']);
      expect(result.searchTimeMs).toBe(25);
    });

    it('should use default namespace when namespaces is empty', async () => {
      zerodbService.searchVectors = jest.fn().mockResolvedValue({ vectors: [], search_time_ms: 5 });

      const result = await semanticSearchService.searchAcrossNamespaces('query', []);

      expect(result.namespaces).toEqual(['documents']);
    });

    it('should use default namespace when namespaces is null', async () => {
      zerodbService.searchVectors = jest.fn().mockResolvedValue({ vectors: [], search_time_ms: 5 });

      const result = await semanticSearchService.searchAcrossNamespaces('query', null);

      expect(result.namespaces).toEqual(['documents']);
    });

    it('should continue when one namespace search fails', async () => {
      zerodbService.searchVectors = jest.fn()
        .mockRejectedValueOnce(new Error('ns1 failed'))
        .mockResolvedValueOnce({
          vectors: [{ vector_metadata: { document_id: 'd1', title: 'T', type: 't' }, similarity_score: 0.8 }],
          search_time_ms: 10
        });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await semanticSearchService.searchAcrossNamespaces('query', ['ns1', 'ns2']);

      expect(result.totalCount).toBe(1);
      consoleSpy.mockRestore();
    });

    it('should add namespace to each result', async () => {
      zerodbService.searchVectors = jest.fn().mockResolvedValue({
        vectors: [{ vector_metadata: { document_id: 'd1', title: 'T', type: 't' }, similarity_score: 0.8 }],
        search_time_ms: 5
      });

      const result = await semanticSearchService.searchAcrossNamespaces('query', ['my_ns']);

      expect(result.results[0].namespace).toBe('my_ns');
    });

    it('should apply pagination to combined results', async () => {
      // Return 6 vectors so that after pagination in searchAcrossNamespaces,
      // we get proper page splitting
      const vectors = Array.from({ length: 6 }, (_, i) => ({
        vector_metadata: { document_id: `d${i}`, title: `T${i}`, type: 't' },
        similarity_score: 0.9 - i * 0.01
      }));
      zerodbService.searchVectors = jest.fn().mockResolvedValue({ vectors, search_time_ms: 10 });

      const result = await semanticSearchService.searchAcrossNamespaces('query', ['ns1'], {
        pagination: { page: 1, pageSize: 3 }
      });

      // Should get at most pageSize results
      expect(result.results.length).toBeLessThanOrEqual(3);
      expect(result.pageSize).toBe(3);
      // Total pages should be calculated from total results
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  // ── getRelatedTerms ──
  describe('getRelatedTerms', () => {
    it('should return related terms from analytics store', async () => {
      // Prime the analytics store
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors = jest.fn().mockResolvedValue({ vectors: [], search_time_ms: 5 });

      await semanticSearchService.search('equity compensation');
      await semanticSearchService.search('equity plan');

      const related = await semanticSearchService.getRelatedTerms('equity');

      expect(Array.isArray(related)).toBe(true);
      related.forEach(r => {
        expect(r).toHaveProperty('term');
        expect(r).toHaveProperty('frequency');
      });
    });

    it('should respect limit option', async () => {
      const related = await semanticSearchService.getRelatedTerms('test', { limit: 2 });
      expect(related.length).toBeLessThanOrEqual(2);
    });

    it('should use default limit of 5', async () => {
      const related = await semanticSearchService.getRelatedTerms('test');
      expect(related.length).toBeLessThanOrEqual(5);
    });
  });

  // ── generateSnippet edge cases ──
  describe('generateSnippet edge cases', () => {
    it('should return empty string for null content', () => {
      const snippet = semanticSearchService.generateSnippet(null, 'query');
      expect(snippet).toBe('');
    });

    it('should return empty string for undefined content', () => {
      const snippet = semanticSearchService.generateSnippet(undefined, 'query');
      expect(snippet).toBe('');
    });

    it('should handle short content without truncation', () => {
      const content = 'Short equity doc.';
      const snippet = semanticSearchService.generateSnippet(content, 'equity');
      expect(snippet).toBeTruthy();
    });

    it('should center snippet around the first query word match', () => {
      const content = 'A'.repeat(200) + ' equity ' + 'B'.repeat(200);
      const snippet = semanticSearchService.generateSnippet(content, 'equity');
      expect(snippet).toContain('equity');
    });
  });

  // ── generateHighlights ──
  describe('generateHighlights', () => {
    it('should return highlights for matching query words', () => {
      const content = 'This document discusses equity compensation for employees. Equity is important.';
      const highlights = semanticSearchService.generateHighlights(content, 'equity compensation');

      expect(highlights.length).toBeGreaterThan(0);
      highlights.forEach(h => {
        expect(h).toHaveProperty('text');
        expect(h).toHaveProperty('matchStart');
        expect(h).toHaveProperty('matchEnd');
      });
    });

    it('should limit to 3 highlights per word', () => {
      const content = ('equity ' .repeat(10));
      const highlights = semanticSearchService.generateHighlights(content, 'equity');
      expect(highlights.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for no content', () => {
      const highlights = semanticSearchService.generateHighlights('', 'query');
      expect(highlights).toEqual([]);
    });
  });

  // ── validatePaginationParams ──
  describe('validatePaginationParams', () => {
    it('should pass with no pagination', () => {
      expect(() => semanticSearchService.validatePaginationParams(undefined)).not.toThrow();
      expect(() => semanticSearchService.validatePaginationParams(null)).not.toThrow();
    });

    it('should throw for non-integer page', () => {
      expect(() => semanticSearchService.validatePaginationParams({ page: 1.5 }))
        .toThrow('page must be a positive integer');
    });

    it('should throw for non-integer pageSize', () => {
      expect(() => semanticSearchService.validatePaginationParams({ pageSize: 2.5 }))
        .toThrow('pageSize must be a positive integer');
    });

    it('should throw for zero page', () => {
      expect(() => semanticSearchService.validatePaginationParams({ page: 0 }))
        .toThrow('page must be a positive integer');
    });

    it('should throw for zero pageSize', () => {
      expect(() => semanticSearchService.validatePaginationParams({ pageSize: 0 }))
        .toThrow('pageSize must be a positive integer');
    });

    it('should throw for non-number page', () => {
      expect(() => semanticSearchService.validatePaginationParams({ page: 'abc' }))
        .toThrow('page must be a positive integer');
    });

    it('should pass for valid pagination', () => {
      expect(() => semanticSearchService.validatePaginationParams({ page: 1, pageSize: 10 })).not.toThrow();
    });
  });

  // ── search with minRelevance ──
  describe('search with minRelevance', () => {
    it('should filter out results below minRelevance', async () => {
      vectorService.generateEmbedding = jest.fn().mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors = jest.fn().mockResolvedValue({
        vectors: [
          { vector_metadata: { document_id: 'd1', title: 'T1', type: 't' }, similarity_score: 0.9 },
          { vector_metadata: { document_id: 'd2', title: 'T2', type: 't' }, similarity_score: 0.1 }
        ],
        search_time_ms: 10
      });

      const result = await semanticSearchService.search('query', { minRelevance: 0.5 });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].documentId).toBe('d1');
    });
  });
});
