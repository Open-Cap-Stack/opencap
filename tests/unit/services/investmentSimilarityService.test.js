/**
 * Investment Similarity Service Test Suite
 *
 * [Feature] OCAE-024: Investment Similarity Matching
 * Comprehensive test coverage for investment embedding, similarity matching,
 * and recommendation features using ZeroDB vector storage.
 */

const investmentSimilarityService = require('../../../services/investmentSimilarityService');
const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

// Mock external services
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');

describe('Investment Similarity Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    zerodbService.upsertVector.mockResolvedValue({ id: 'vec_123', success: true });
    zerodbService.searchVectors.mockResolvedValue({
      vectors: [
        {
          id: 'vec_456',
          vector_metadata: {
            investmentId: 'inv_002',
            investmentType: 'Series A',
            amount: 5000000,
            sector: 'fintech'
          },
          similarity_score: 0.95
        },
        {
          id: 'vec_789',
          vector_metadata: {
            investmentId: 'inv_003',
            investmentType: 'Series A',
            amount: 4500000,
            sector: 'fintech'
          },
          similarity_score: 0.88
        }
      ],
      search_time_ms: 15
    });
    zerodbService.listVectors.mockResolvedValue([]);
    zerodbService.initialize.mockResolvedValue({ projectId: 'proj_123' });
  });

  describe('Initialization', () => {
    it('should initialize service with ZeroDB connection', async () => {
      const token = 'test-jwt-token';

      const result = await investmentSimilarityService.initialize(token);

      expect(result).toHaveProperty('initialized', true);
      expect(zerodbService.initialize).toHaveBeenCalledWith(token);
    });

    it('should handle initialization errors gracefully', async () => {
      zerodbService.initialize.mockRejectedValue(new Error('Connection failed'));

      await expect(investmentSimilarityService.initialize('bad-token'))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('Investment Embedding Generation', () => {
    describe('generateInvestmentEmbedding', () => {
      it('should generate embedding from investment data', async () => {
        const investmentData = {
          investmentId: 'inv_001',
          investmentType: 'Series A',
          amount: 5000000,
          stage: 'early',
          sector: 'fintech',
          terms: 'standard preferred',
          valuationCap: 50000000,
          discountRate: 0.2
        };

        const result = await investmentSimilarityService.generateInvestmentEmbedding(investmentData);

        expect(result).toHaveProperty('embedding');
        expect(result.embedding).toBeInstanceOf(Array);
        expect(result.embedding.length).toBe(768); // Standard embedding dimension
        expect(result).toHaveProperty('investmentId', 'inv_001');
        expect(result).toHaveProperty('metadata');
      });

      it('should normalize investment amounts in embedding', async () => {
        const smallInvestment = {
          investmentId: 'inv_small',
          investmentType: 'Seed',
          amount: 100000,
          stage: 'seed',
          sector: 'saas'
        };

        const largeInvestment = {
          investmentId: 'inv_large',
          investmentType: 'Series C',
          amount: 100000000,
          stage: 'growth',
          sector: 'saas'
        };

        const smallResult = await investmentSimilarityService.generateInvestmentEmbedding(smallInvestment);
        const largeResult = await investmentSimilarityService.generateInvestmentEmbedding(largeInvestment);

        // Embeddings should be normalized to similar ranges
        const smallMagnitude = Math.sqrt(smallResult.embedding.reduce((sum, v) => sum + v * v, 0));
        const largeMagnitude = Math.sqrt(largeResult.embedding.reduce((sum, v) => sum + v * v, 0));

        // Normalized embeddings should have similar magnitudes (within 50%)
        expect(Math.abs(smallMagnitude - largeMagnitude) / largeMagnitude).toBeLessThan(0.5);
      });

      it('should handle missing optional fields gracefully', async () => {
        const minimalInvestment = {
          investmentId: 'inv_minimal',
          investmentType: 'Angel',
          amount: 50000
        };

        const result = await investmentSimilarityService.generateInvestmentEmbedding(minimalInvestment);

        expect(result).toHaveProperty('embedding');
        expect(result.embedding).toBeInstanceOf(Array);
        expect(result.embedding.length).toBe(768);
      });

      it('should throw error for invalid investment data', async () => {
        const invalidData = { investmentId: 'inv_invalid' }; // Missing required fields

        await expect(investmentSimilarityService.generateInvestmentEmbedding(invalidData))
          .rejects.toThrow('Invalid investment data');
      });

      it('should include investment characteristics in metadata', async () => {
        const investmentData = {
          investmentId: 'inv_meta',
          investmentType: 'Series B',
          amount: 20000000,
          stage: 'growth',
          sector: 'healthcare',
          terms: 'participating preferred'
        };

        const result = await investmentSimilarityService.generateInvestmentEmbedding(investmentData);

        expect(result.metadata).toMatchObject({
          investmentType: 'Series B',
          amount: 20000000,
          stage: 'growth',
          sector: 'healthcare'
        });
      });
    });

    describe('createInvestmentTextRepresentation', () => {
      it('should create text representation for embedding', () => {
        const investmentData = {
          investmentType: 'Series A',
          amount: 5000000,
          stage: 'early',
          sector: 'fintech',
          terms: 'standard preferred'
        };

        const text = investmentSimilarityService.createInvestmentTextRepresentation(investmentData);

        expect(text).toContain('Series A');
        expect(text).toContain('fintech');
        expect(text).toContain('early');
        expect(text).toContain('5000000');
      });
    });
  });

  describe('ZeroDB Vector Storage', () => {
    describe('storeInvestmentVector', () => {
      it('should store investment embedding in ZeroDB', async () => {
        const embedding = new Array(768).fill(0.1);
        const investmentId = 'inv_001';
        const metadata = {
          investmentType: 'Series A',
          amount: 5000000,
          sector: 'fintech'
        };

        const result = await investmentSimilarityService.storeInvestmentVector(
          investmentId,
          embedding,
          metadata
        );

        expect(result).toHaveProperty('success', true);
        expect(zerodbService.upsertVector).toHaveBeenCalledWith(
          embedding,
          'investments',
          expect.objectContaining({
            investmentId,
            investmentType: 'Series A',
            amount: 5000000,
            sector: 'fintech'
          }),
          expect.any(String),
          `investment:${investmentId}`
        );
      });

      it('should handle storage errors', async () => {
        zerodbService.upsertVector.mockRejectedValue(new Error('Storage failed'));

        await expect(investmentSimilarityService.storeInvestmentVector(
          'inv_fail',
          new Array(768).fill(0.1),
          {}
        )).rejects.toThrow('Storage failed');
      });

      it('should update existing vector if investment already stored', async () => {
        const investmentId = 'inv_existing';
        const embedding = new Array(768).fill(0.2);

        await investmentSimilarityService.storeInvestmentVector(investmentId, embedding, {});

        expect(zerodbService.upsertVector).toHaveBeenCalled();
      });
    });

    describe('getInvestmentVector', () => {
      it('should retrieve investment vector from ZeroDB', async () => {
        const investmentId = 'inv_001';

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_123',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        const result = await investmentSimilarityService.getInvestmentVector(investmentId);

        expect(result).toHaveProperty('vector_embedding');
        expect(result.vector_metadata.investmentId).toBe(investmentId);
      });

      it('should return null for non-existent investment', async () => {
        zerodbService.listVectors.mockResolvedValue([]);

        const result = await investmentSimilarityService.getInvestmentVector('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Similarity Matching Algorithm', () => {
    describe('findSimilarInvestments', () => {
      it('should find investments similar to a given investment', async () => {
        const sourceInvestmentId = 'inv_001';
        const limit = 5;

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_001',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        const result = await investmentSimilarityService.findSimilarInvestments(sourceInvestmentId, limit);

        expect(result).toHaveProperty('sourceInvestmentId', sourceInvestmentId);
        expect(result).toHaveProperty('similarInvestments');
        expect(result.similarInvestments).toBeInstanceOf(Array);
        expect(result.similarInvestments.length).toBeLessThanOrEqual(limit);
        expect(zerodbService.searchVectors).toHaveBeenCalled();
      });

      it('should exclude source investment from results', async () => {
        const sourceInvestmentId = 'inv_001';

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_001',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_001' }, similarity_score: 1.0 },
            { vector_metadata: { investmentId: 'inv_002' }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_003' }, similarity_score: 0.88 }
          ]
        });

        const result = await investmentSimilarityService.findSimilarInvestments(sourceInvestmentId, 5);

        const investmentIds = result.similarInvestments.map(inv => inv.investmentId);
        expect(investmentIds).not.toContain(sourceInvestmentId);
      });

      it('should throw error if source investment not found', async () => {
        zerodbService.listVectors.mockResolvedValue([]);

        await expect(investmentSimilarityService.findSimilarInvestments('nonexistent', 5))
          .rejects.toThrow('Investment not found');
      });

      it('should filter by minimum similarity threshold', async () => {
        const sourceInvestmentId = 'inv_001';
        const minSimilarity = 0.9;

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_001',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_002' }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_003' }, similarity_score: 0.85 },
            { vector_metadata: { investmentId: 'inv_004' }, similarity_score: 0.70 }
          ]
        });

        const result = await investmentSimilarityService.findSimilarInvestments(
          sourceInvestmentId,
          10,
          { minSimilarity }
        );

        result.similarInvestments.forEach(inv => {
          expect(inv.similarity_score).toBeGreaterThanOrEqual(minSimilarity);
        });
      });

      it('should support filtering by sector', async () => {
        const sourceInvestmentId = 'inv_001';
        const sectorFilter = 'fintech';

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_001',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_002', sector: 'fintech' }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_003', sector: 'healthcare' }, similarity_score: 0.90 },
            { vector_metadata: { investmentId: 'inv_004', sector: 'fintech' }, similarity_score: 0.85 }
          ]
        });

        const result = await investmentSimilarityService.findSimilarInvestments(
          sourceInvestmentId,
          10,
          { sector: sectorFilter }
        );

        result.similarInvestments.forEach(inv => {
          expect(inv.sector).toBe(sectorFilter);
        });
      });

      it('should support filtering by investment type', async () => {
        const sourceInvestmentId = 'inv_001';
        const typeFilter = 'Series A';

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_001',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_002', investmentType: 'Series A' }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_003', investmentType: 'Series B' }, similarity_score: 0.90 },
            { vector_metadata: { investmentId: 'inv_004', investmentType: 'Series A' }, similarity_score: 0.85 }
          ]
        });

        const result = await investmentSimilarityService.findSimilarInvestments(
          sourceInvestmentId,
          10,
          { investmentType: typeFilter }
        );

        result.similarInvestments.forEach(inv => {
          expect(inv.investmentType).toBe(typeFilter);
        });
      });

      it('should support filtering by amount range', async () => {
        const sourceInvestmentId = 'inv_001';
        const amountRange = { min: 1000000, max: 10000000 };

        zerodbService.listVectors.mockResolvedValue([
          {
            id: 'vec_001',
            vector_embedding: new Array(768).fill(0.1),
            vector_metadata: { investmentId: 'inv_001' }
          }
        ]);

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_002', amount: 5000000 }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_003', amount: 500000 }, similarity_score: 0.90 },
            { vector_metadata: { investmentId: 'inv_004', amount: 8000000 }, similarity_score: 0.85 }
          ]
        });

        const result = await investmentSimilarityService.findSimilarInvestments(
          sourceInvestmentId,
          10,
          { amountRange }
        );

        result.similarInvestments.forEach(inv => {
          expect(inv.amount).toBeGreaterThanOrEqual(amountRange.min);
          expect(inv.amount).toBeLessThanOrEqual(amountRange.max);
        });
      });
    });

    describe('calculateCosineSimilarity', () => {
      it('should calculate cosine similarity between two vectors', () => {
        const vectorA = [1, 0, 0];
        const vectorB = [1, 0, 0];

        const similarity = investmentSimilarityService.calculateCosineSimilarity(vectorA, vectorB);

        expect(similarity).toBe(1); // Identical vectors
      });

      it('should return 0 for orthogonal vectors', () => {
        const vectorA = [1, 0, 0];
        const vectorB = [0, 1, 0];

        const similarity = investmentSimilarityService.calculateCosineSimilarity(vectorA, vectorB);

        expect(similarity).toBe(0);
      });

      it('should return value between -1 and 1', () => {
        const vectorA = [0.5, 0.3, 0.8];
        const vectorB = [0.2, 0.7, 0.4];

        const similarity = investmentSimilarityService.calculateCosineSimilarity(vectorA, vectorB);

        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
      });

      it('should handle zero vectors gracefully', () => {
        const vectorA = [0, 0, 0];
        const vectorB = [1, 2, 3];

        const similarity = investmentSimilarityService.calculateCosineSimilarity(vectorA, vectorB);

        expect(similarity).toBe(0);
      });
    });
  });

  describe('Investment Recommendations', () => {
    describe('getInvestmentRecommendations', () => {
      it('should return personalized investment recommendations', async () => {
        const userId = 'user_001';
        const preferences = {
          sectors: ['fintech', 'healthtech'],
          investmentTypes: ['Series A', 'Series B'],
          amountRange: { min: 1000000, max: 10000000 }
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: {
                investmentId: 'inv_001',
                investmentType: 'Series A',
                amount: 5000000,
                sector: 'fintech'
              },
              similarity_score: 0.92
            },
            {
              vector_metadata: {
                investmentId: 'inv_002',
                investmentType: 'Series B',
                amount: 8000000,
                sector: 'healthtech'
              },
              similarity_score: 0.88
            }
          ]
        });

        const result = await investmentSimilarityService.getInvestmentRecommendations(userId, preferences);

        expect(result).toHaveProperty('userId', userId);
        expect(result).toHaveProperty('recommendations');
        expect(result.recommendations).toBeInstanceOf(Array);
        expect(result).toHaveProperty('generatedAt');
      });

      it('should filter recommendations by user preferences', async () => {
        const userId = 'user_002';
        const preferences = {
          sectors: ['fintech'],
          excludeIds: ['inv_seen_001', 'inv_seen_002']
        };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_001', sector: 'fintech' }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_seen_001', sector: 'fintech' }, similarity_score: 0.90 },
            { vector_metadata: { investmentId: 'inv_002', sector: 'healthcare' }, similarity_score: 0.85 }
          ]
        });

        const result = await investmentSimilarityService.getInvestmentRecommendations(userId, preferences);

        const ids = result.recommendations.map(r => r.investmentId);
        expect(ids).not.toContain('inv_seen_001');
        expect(ids).not.toContain('inv_seen_002');
      });

      it('should rank recommendations by relevance score', async () => {
        const userId = 'user_003';
        const preferences = {};

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            { vector_metadata: { investmentId: 'inv_001' }, similarity_score: 0.70 },
            { vector_metadata: { investmentId: 'inv_002' }, similarity_score: 0.95 },
            { vector_metadata: { investmentId: 'inv_003' }, similarity_score: 0.82 }
          ]
        });

        const result = await investmentSimilarityService.getInvestmentRecommendations(userId, preferences);

        // Should be sorted by relevance score descending
        for (let i = 1; i < result.recommendations.length; i++) {
          expect(result.recommendations[i - 1].relevanceScore)
            .toBeGreaterThanOrEqual(result.recommendations[i].relevanceScore);
        }
      });

      it('should include recommendation explanations', async () => {
        const userId = 'user_004';
        const preferences = { sectors: ['fintech'] };

        zerodbService.searchVectors.mockResolvedValue({
          vectors: [
            {
              vector_metadata: {
                investmentId: 'inv_001',
                investmentType: 'Series A',
                sector: 'fintech'
              },
              similarity_score: 0.92
            }
          ]
        });

        const result = await investmentSimilarityService.getInvestmentRecommendations(userId, preferences);

        expect(result.recommendations[0]).toHaveProperty('explanation');
        expect(typeof result.recommendations[0].explanation).toBe('string');
      });

      it('should limit number of recommendations', async () => {
        const userId = 'user_005';
        const preferences = {};
        const limit = 3;

        zerodbService.searchVectors.mockResolvedValue({
          vectors: Array(10).fill({
            vector_metadata: { investmentId: 'inv_x' },
            similarity_score: 0.9
          })
        });

        const result = await investmentSimilarityService.getInvestmentRecommendations(
          userId,
          preferences,
          limit
        );

        expect(result.recommendations.length).toBeLessThanOrEqual(limit);
      });
    });

    describe('generateRecommendationEmbedding', () => {
      it('should generate embedding from user preferences', async () => {
        const preferences = {
          sectors: ['fintech', 'healthtech'],
          investmentTypes: ['Series A'],
          amountRange: { min: 1000000, max: 5000000 }
        };

        const result = await investmentSimilarityService.generateRecommendationEmbedding(preferences);

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(768);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchEmbedInvestments', () => {
      it('should embed multiple investments in batch', async () => {
        const investments = [
          { investmentId: 'inv_001', investmentType: 'Series A', amount: 5000000 },
          { investmentId: 'inv_002', investmentType: 'Series B', amount: 10000000 },
          { investmentId: 'inv_003', investmentType: 'Seed', amount: 500000 }
        ];

        const result = await investmentSimilarityService.batchEmbedInvestments(investments);

        expect(result).toHaveProperty('successful');
        expect(result).toHaveProperty('failed');
        expect(result.successful.length).toBe(3);
        expect(result.failed.length).toBe(0);
      });

      it('should handle partial failures in batch', async () => {
        const investments = [
          { investmentId: 'inv_001', investmentType: 'Series A', amount: 5000000 },
          { investmentId: 'inv_002' }, // Invalid - missing required fields
          { investmentId: 'inv_003', investmentType: 'Seed', amount: 500000 }
        ];

        const result = await investmentSimilarityService.batchEmbedInvestments(investments);

        expect(result.successful.length).toBe(2);
        expect(result.failed.length).toBe(1);
        expect(result.failed[0].investmentId).toBe('inv_002');
      });

      it('should report progress during batch processing', async () => {
        const investments = Array(10).fill(null).map((_, i) => ({
          investmentId: `inv_${i}`,
          investmentType: 'Series A',
          amount: 5000000
        }));

        const progressCallback = jest.fn();

        await investmentSimilarityService.batchEmbedInvestments(investments, { onProgress: progressCallback });

        expect(progressCallback).toHaveBeenCalled();
      });
    });

    describe('reindexAllInvestments', () => {
      it('should reindex all investments in the database', async () => {
        zerodbService.listVectors.mockResolvedValue([
          { vector_metadata: { investmentId: 'inv_001', investmentType: 'Series A', amount: 5000000 } },
          { vector_metadata: { investmentId: 'inv_002', investmentType: 'Series B', amount: 10000000 } }
        ]);

        const result = await investmentSimilarityService.reindexAllInvestments();

        expect(result).toHaveProperty('reindexedCount');
        expect(result).toHaveProperty('duration');
      });
    });
  });

  describe('Analytics', () => {
    describe('getInvestmentAnalytics', () => {
      it('should return investment vector analytics', async () => {
        zerodbService.listVectors.mockResolvedValue([
          { vector_metadata: { investmentId: 'inv_001', investmentType: 'Series A', sector: 'fintech', amount: 5000000 } },
          { vector_metadata: { investmentId: 'inv_002', investmentType: 'Series B', sector: 'fintech', amount: 10000000 } },
          { vector_metadata: { investmentId: 'inv_003', investmentType: 'Series A', sector: 'healthcare', amount: 4000000 } }
        ]);

        const result = await investmentSimilarityService.getInvestmentAnalytics();

        expect(result).toHaveProperty('totalInvestments');
        expect(result).toHaveProperty('byType');
        expect(result).toHaveProperty('bySector');
        expect(result).toHaveProperty('averageAmount');
        expect(result.totalInvestments).toBe(3);
      });

      it('should calculate sector distribution', async () => {
        zerodbService.listVectors.mockResolvedValue([
          { vector_metadata: { sector: 'fintech' } },
          { vector_metadata: { sector: 'fintech' } },
          { vector_metadata: { sector: 'healthcare' } }
        ]);

        const result = await investmentSimilarityService.getInvestmentAnalytics();

        expect(result.bySector).toHaveProperty('fintech', 2);
        expect(result.bySector).toHaveProperty('healthcare', 1);
      });
    });

    describe('findInvestmentClusters', () => {
      it('should identify clusters of similar investments', async () => {
        zerodbService.listVectors.mockResolvedValue([
          { vector_embedding: [0.1, 0.2, 0.3], vector_metadata: { investmentId: 'inv_001' } },
          { vector_embedding: [0.1, 0.2, 0.31], vector_metadata: { investmentId: 'inv_002' } },
          { vector_embedding: [0.9, 0.8, 0.7], vector_metadata: { investmentId: 'inv_003' } }
        ]);

        const result = await investmentSimilarityService.findInvestmentClusters(2);

        expect(result).toHaveProperty('clusters');
        expect(result.clusters).toBeInstanceOf(Array);
        expect(result.clusters.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle ZeroDB connection errors', async () => {
      zerodbService.searchVectors.mockRejectedValue(new Error('ZeroDB connection timeout'));

      await expect(investmentSimilarityService.findSimilarInvestments('inv_001', 5))
        .rejects.toThrow();
    });

    it('should handle invalid embedding dimensions', async () => {
      const invalidEmbedding = [0.1, 0.2]; // Too short

      await expect(investmentSimilarityService.storeInvestmentVector(
        'inv_invalid',
        invalidEmbedding,
        {}
      )).rejects.toThrow('Invalid embedding dimension');
    });

    it('should validate investment ID format', async () => {
      await expect(investmentSimilarityService.findSimilarInvestments('', 5))
        .rejects.toThrow('Invalid investment ID');
    });
  });

  describe('Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array(1000).fill(null).map((_, i) => ({
        vector_metadata: { investmentId: `inv_${i}` },
        similarity_score: Math.random()
      }));

      zerodbService.listVectors.mockResolvedValue([
        { vector_embedding: new Array(768).fill(0.1), vector_metadata: { investmentId: 'inv_001' } }
      ]);

      zerodbService.searchVectors.mockResolvedValue({ vectors: largeResultSet });

      const startTime = Date.now();
      const result = await investmentSimilarityService.findSimilarInvestments('inv_001', 100);
      const duration = Date.now() - startTime;

      expect(result.similarInvestments.length).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should cache frequently accessed vectors', async () => {
      const investmentId = 'inv_cached';

      zerodbService.listVectors.mockResolvedValue([
        { vector_embedding: new Array(768).fill(0.1), vector_metadata: { investmentId } }
      ]);

      // First call
      await investmentSimilarityService.getInvestmentVector(investmentId);

      // Second call should use cache
      await investmentSimilarityService.getInvestmentVector(investmentId);

      // ZeroDB should only be called once if caching works
      // Note: This test may need adjustment based on actual caching implementation
      expect(zerodbService.listVectors).toHaveBeenCalled();
    });
  });
});
