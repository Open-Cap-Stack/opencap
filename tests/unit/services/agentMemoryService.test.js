/**
 * Agent Memory Service Test Suite
 * [Feature] Issue #27: Implement agent memory for AI features
 */

const generateObjectId = () => { const hex = '0123456789abcdef'; let id = ''; for(let i=0;i<24;i++) id += hex[Math.floor(Math.random()*16)]; return id; };
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/vectorService');

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

describe('AgentMemoryService', () => {
  let AgentMemoryService;
  let mockCompanyId, mockUserId, mockAgentId;

  beforeAll(async () => {
    AgentMemoryService = require('../../../services/agentMemoryService');
    mockCompanyId = generateObjectId();
    mockUserId = generateObjectId();
    mockAgentId = 'agent-opencap-001';
  });

  beforeEach(() => { jest.clearAllMocks(); });

  describe('Memory Storage', () => {
    it('should store a memory item', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.upsertVector.mockResolvedValue({ id: 'vec-123' });
      zerodbService.storeMemory.mockResolvedValue({ id: 'mem-123' });

      const result = await AgentMemoryService.storeMemory({
        agentId: mockAgentId, content: 'Test content', type: 'user_preference'
      });
      expect(result).toHaveProperty('id');
      expect(zerodbService.storeMemory).toHaveBeenCalled();
    });

    it('should require agentId', async () => {
      await expect(AgentMemoryService.storeMemory({ content: 'Test' }))
        .rejects.toThrow('Agent ID is required');
    });

    it('should require content', async () => {
      await expect(AgentMemoryService.storeMemory({ agentId: mockAgentId }))
        .rejects.toThrow('Content is required');
    });
  });

  describe('Memory Retrieval', () => {
    const getMockMemories = () => [{
      id: 'mem-1',
      content: JSON.stringify({ content: 'Test', type: 'user_preference' }),
      memory_metadata: { agent_id: mockAgentId, user_id: mockUserId, type: 'user_preference' },
      created_at: new Date().toISOString()
    }];

    it('should retrieve memories by agent ID', async () => {
      zerodbService.listMemory.mockResolvedValue(getMockMemories());
      const result = await AgentMemoryService.getMemories({ agentId: mockAgentId });
      expect(result).toHaveProperty('memories');
      expect(result.memories).toHaveLength(1);
    });

    it('should filter by type', async () => {
      zerodbService.listMemory.mockResolvedValue(getMockMemories());
      const result = await AgentMemoryService.getMemories({ agentId: mockAgentId, type: 'user_preference' });
      expect(result.memories.every(m => m.type === 'user_preference')).toBe(true);
    });
  });

  describe('Semantic Search', () => {
    it('should search memories', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.searchVectors.mockResolvedValue({
        vectors: [{ vector_metadata: { memory_id: 'mem-1', type: 'ai_insight' }, similarity_score: 0.9, document: 'Test' }],
        search_time_ms: 45
      });

      const result = await AgentMemoryService.searchMemories('test query', { agentId: mockAgentId });
      expect(result).toHaveProperty('memories');
      expect(result).toHaveProperty('searchTimeMs');
    });

    it('should reject empty query', async () => {
      await expect(AgentMemoryService.searchMemories('', { agentId: mockAgentId }))
        .rejects.toThrow('Query cannot be empty');
    });
  });

  describe('Memory Pinning', () => {
    it('should pin a memory', async () => {
      zerodbService.listMemory.mockResolvedValue([{
        id: 'mem-1', content: JSON.stringify({ content: 'Test' }),
        memory_metadata: { pinned: false, agent_id: mockAgentId }
      }]);
      zerodbService.storeMemory.mockResolvedValue({ id: 'mem-1' });

      const result = await AgentMemoryService.pinMemory('mem-1');
      expect(result.pinned).toBe(true);
    });

    it('should throw if memory not found', async () => {
      zerodbService.listMemory.mockResolvedValue([]);
      await expect(AgentMemoryService.pinMemory('non-existent')).rejects.toThrow('Memory not found');
    });
  });

  describe('Memory Tags', () => {
    it('should add tags', async () => {
      zerodbService.listMemory.mockResolvedValue([{
        id: 'mem-1', content: JSON.stringify({ content: 'Test', tags: ['old'] }),
        memory_metadata: { tags: ['old'], agent_id: mockAgentId }
      }]);
      zerodbService.storeMemory.mockResolvedValue({ id: 'mem-1' });

      const result = await AgentMemoryService.addTags('mem-1', ['new']);
      expect(result.tags).toContain('new');
    });

    it('should remove tags', async () => {
      zerodbService.listMemory.mockResolvedValue([{
        id: 'mem-1', content: JSON.stringify({ content: 'Test', tags: ['tag1', 'tag2'] }),
        memory_metadata: { tags: ['tag1', 'tag2'], agent_id: mockAgentId }
      }]);
      zerodbService.storeMemory.mockResolvedValue({ id: 'mem-1' });

      const result = await AgentMemoryService.removeTags('mem-1', ['tag2']);
      expect(result.tags).not.toContain('tag2');
    });
  });

  describe('Analytics', () => {
    it('should get memory analytics', async () => {
      zerodbService.listMemory.mockResolvedValue([
        { memory_metadata: { type: 'ai_insight', created_at: '2024-01-15T10:00:00Z' } },
        { memory_metadata: { type: 'ai_insight', created_at: '2024-02-01T10:00:00Z' } }
      ]);

      const analytics = await AgentMemoryService.getMemoryAnalytics({ agentId: mockAgentId });
      expect(analytics).toHaveProperty('totalMemories');
      expect(analytics).toHaveProperty('memoriesByType');
    });
  });

  describe('Batch Operations', () => {
    it('should store multiple memories', async () => {
      vectorService.generateEmbedding.mockResolvedValue(new Array(768).fill(0));
      zerodbService.upsertVector.mockResolvedValue({ id: 'vec-123' });
      zerodbService.storeMemory.mockResolvedValue({ id: 'mem-123' });

      const results = await AgentMemoryService.storeMemoriesBatch([
        { agentId: mockAgentId, content: 'Memory 1' },
        { agentId: mockAgentId, content: 'Memory 2' }
      ]);
      expect(results).toHaveLength(2);
    });
  });
});
