/**
 * Agent Memory Controller Test Suite
 * [Feature] Issue #27: Implement agent memory for AI features
 */

// Generate a 24-char hex string to simulate ObjectId
function generateObjectId() {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 24; i++) id += hex[Math.floor(Math.random() * 16)];
  return id;
}

jest.mock('../../../services/agentMemoryService');
const agentMemoryService = require('../../../services/agentMemoryService');

describe('AgentMemoryController', () => {
  let agentMemoryController, mockReq, mockRes;
  let mockCompanyId, mockUserId, mockAgentId;

  beforeAll(() => {
    agentMemoryController = require('../../../controllers/agentMemoryController');
    mockCompanyId = generateObjectId();
    mockUserId = generateObjectId();
    mockAgentId = 'agent-opencap-001';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
    mockReq = { body: {}, params: {}, query: {}, user: { id: mockUserId, userId: mockUserId } };
  });

  describe('storeMemory', () => {
    it('should store a memory and return 201', async () => {
      mockReq.body = { agentId: mockAgentId, content: 'Test content' };
      agentMemoryService.storeMemory.mockResolvedValue({ id: 'mem-123' });
      await agentMemoryController.storeMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if agentId is missing', async () => {
      mockReq.body = { content: 'Test' };
      await agentMemoryController.storeMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Agent ID is required' }));
    });

    it('should return 400 if content is missing', async () => {
      mockReq.body = { agentId: mockAgentId };
      await agentMemoryController.storeMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Content is required' }));
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { agentId: mockAgentId, content: 'Test' };
      agentMemoryService.storeMemory.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.storeMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Failed to store memory')
      }));
    });

    it('should pass all body fields to service', async () => {
      mockReq.body = {
        agentId: mockAgentId,
        content: 'Test content',
        type: 'conversation',
        tags: ['test'],
        companyId: mockCompanyId,
        ttl: 3600,
        sessionId: 'sess_1',
        category: 'general'
      };
      agentMemoryService.storeMemory.mockResolvedValue({ id: 'mem-123' });

      await agentMemoryController.storeMemory(mockReq, mockRes);
      expect(agentMemoryService.storeMemory).toHaveBeenCalledWith(expect.objectContaining({
        agentId: mockAgentId,
        content: 'Test content',
        type: 'conversation',
        tags: ['test'],
        companyId: mockCompanyId,
        ttl: 3600,
        sessionId: 'sess_1',
        category: 'general',
        userId: mockUserId
      }));
    });
  });

  describe('getMemories', () => {
    it('should return memories with 200', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemories.mockResolvedValue({ memories: [], totalCount: 0 });
      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.set).toHaveBeenCalledWith('X-Total-Count', '0');
    });

    it('should return 400 if agentId is missing', async () => {
      mockReq.query = {};
      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should parse pagination and tags', async () => {
      mockReq.query = {
        agentId: mockAgentId,
        page: '2',
        pageSize: '10',
        pinnedFirst: 'true',
        tags: 'tag1, tag2'
      };
      agentMemoryService.getMemories.mockResolvedValue({ memories: [], totalCount: 0 });

      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(agentMemoryService.getMemories).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
        pageSize: 10,
        pinnedFirst: true,
        tags: ['tag1', 'tag2']
      }));
    });

    it('should use default page and pageSize', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemories.mockResolvedValue({ memories: [], totalCount: 0 });

      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(agentMemoryService.getMemories).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        pageSize: 20,
        pinnedFirst: false
      }));
    });

    it('should return 500 on service error', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemories.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchMemories', () => {
    it('should search and return 200', async () => {
      mockReq.body = { query: 'test', agentId: mockAgentId };
      agentMemoryService.searchMemories.mockResolvedValue({ memories: [], searchTimeMs: 45 });
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.set).toHaveBeenCalledWith('X-Search-Time-Ms', '45');
    });

    it('should return 400 if query is missing', async () => {
      mockReq.body = { agentId: mockAgentId };
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if query is empty string', async () => {
      mockReq.body = { query: '   ', agentId: mockAgentId };
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if agentId is missing', async () => {
      mockReq.body = { query: 'test' };
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Agent ID is required' }));
    });

    it('should pass search options to service', async () => {
      mockReq.body = { query: 'test', agentId: mockAgentId, type: 'conversation', limit: '5', minRelevance: 0.7 };
      agentMemoryService.searchMemories.mockResolvedValue({ memories: [], searchTimeMs: 10 });

      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(agentMemoryService.searchMemories).toHaveBeenCalledWith('test', expect.objectContaining({
        agentId: mockAgentId,
        type: 'conversation',
        limit: 5,
        minRelevance: 0.7
      }));
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { query: 'test', agentId: mockAgentId };
      agentMemoryService.searchMemories.mockRejectedValue(new Error('Search failed'));
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('pinMemory', () => {
    it('should pin and return 200', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      agentMemoryService.pinMemory.mockResolvedValue({ id: 'mem-123', pinned: true });
      await agentMemoryController.pinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if not found', async () => {
      mockReq.params = { memoryId: 'non-existent' };
      agentMemoryService.pinMemory.mockRejectedValue(new Error('Memory not found'));
      await agentMemoryController.pinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      agentMemoryService.pinMemory.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.pinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('unpinMemory', () => {
    it('should unpin and return 200', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      agentMemoryService.unpinMemory.mockResolvedValue({ id: 'mem-123', pinned: false });
      await agentMemoryController.unpinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if not found', async () => {
      mockReq.params = { memoryId: 'non-existent' };
      agentMemoryService.unpinMemory.mockRejectedValue(new Error('Memory not found'));
      await agentMemoryController.unpinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      agentMemoryService.unpinMemory.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.unpinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('addTags', () => {
    it('should add tags and return 200', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: ['new-tag'] };
      agentMemoryService.addTags.mockResolvedValue({ id: 'mem-123', tags: ['new-tag'] });
      await agentMemoryController.addTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if tags is not an array', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: 'not-array' };
      await agentMemoryController.addTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if tags array is empty', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: [] };
      await agentMemoryController.addTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'At least one tag is required' }));
    });

    it('should return 404 if memory not found', async () => {
      mockReq.params = { memoryId: 'non-existent' };
      mockReq.body = { tags: ['tag1'] };
      agentMemoryService.addTags.mockRejectedValue(new Error('Memory not found'));
      await agentMemoryController.addTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: ['tag1'] };
      agentMemoryService.addTags.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.addTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('removeTags', () => {
    it('should remove tags and return 200', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: ['old-tag'] };
      agentMemoryService.removeTags.mockResolvedValue({ id: 'mem-123', tags: [] });
      await agentMemoryController.removeTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if tags is not an array or is empty', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: [] };
      await agentMemoryController.removeTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if tags is not an array', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: 'not-array' };
      await agentMemoryController.removeTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if memory not found', async () => {
      mockReq.params = { memoryId: 'non-existent' };
      mockReq.body = { tags: ['tag1'] };
      agentMemoryService.removeTags.mockRejectedValue(new Error('Memory not found'));
      await agentMemoryController.removeTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { tags: ['tag1'] };
      agentMemoryService.removeTags.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.removeTags(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMemoryAnalytics', () => {
    it('should return analytics with 200', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemoryAnalytics.mockResolvedValue({ totalMemories: 10 });
      await agentMemoryController.getMemoryAnalytics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should pass date range when provided', async () => {
      mockReq.query = { agentId: mockAgentId, startDate: '2024-01-01', endDate: '2024-12-31' };
      agentMemoryService.getMemoryAnalytics.mockResolvedValue({ totalMemories: 5 });

      await agentMemoryController.getMemoryAnalytics(mockReq, mockRes);
      expect(agentMemoryService.getMemoryAnalytics).toHaveBeenCalledWith(expect.objectContaining({
        agentId: mockAgentId,
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        })
      }));
    });

    it('should not include dateRange when dates are not provided', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemoryAnalytics.mockResolvedValue({ totalMemories: 10 });

      await agentMemoryController.getMemoryAnalytics(mockReq, mockRes);
      expect(agentMemoryService.getMemoryAnalytics).toHaveBeenCalledWith({ agentId: mockAgentId });
    });

    it('should return 500 on service error', async () => {
      mockReq.query = {};
      agentMemoryService.getMemoryAnalytics.mockRejectedValue(new Error('Error'));
      await agentMemoryController.getMemoryAnalytics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCorpusMemories', () => {
    it('should return corpus memories', async () => {
      mockReq.params = { companyId: mockCompanyId };
      agentMemoryService.getCorpusMemories.mockResolvedValue({ companyId: mockCompanyId, memories: [] });
      await agentMemoryController.getCorpusMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid companyId', async () => {
      mockReq.params = { companyId: 'invalid' };
      await agentMemoryController.getCorpusMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params = { companyId: mockCompanyId };
      agentMemoryService.getCorpusMemories.mockRejectedValue(new Error('Error'));
      await agentMemoryController.getCorpusMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCorpusStats', () => {
    it('should return corpus stats', async () => {
      mockReq.params = { companyId: mockCompanyId };
      agentMemoryService.getCorpusStats.mockResolvedValue({ totalMemories: 10 });
      await agentMemoryController.getCorpusStats(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid companyId', async () => {
      mockReq.params = { companyId: 'invalid' };
      await agentMemoryController.getCorpusStats(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.params = { companyId: mockCompanyId };
      agentMemoryService.getCorpusStats.mockRejectedValue(new Error('Error'));
      await agentMemoryController.getCorpusStats(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPinnedMemories', () => {
    it('should return pinned memories', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getPinnedMemories.mockResolvedValue([{ id: 'mem-1', pinned: true }]);
      await agentMemoryController.getPinnedMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if agentId is missing', async () => {
      mockReq.query = {};
      await agentMemoryController.getPinnedMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getPinnedMemories.mockRejectedValue(new Error('Error'));
      await agentMemoryController.getPinnedMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateMemory', () => {
    it('should update memory content and return 200', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { content: 'Updated content' };
      agentMemoryService.updateMemory.mockResolvedValue({ id: 'mem-123', content: 'Updated content' });
      await agentMemoryController.updateMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(agentMemoryService.updateMemory).toHaveBeenCalledWith('mem-123', { content: 'Updated content' });
    });

    it('should update metadata only', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { metadata: { key: 'value' } };
      agentMemoryService.updateMemory.mockResolvedValue({ id: 'mem-123' });
      await agentMemoryController.updateMemory(mockReq, mockRes);
      expect(agentMemoryService.updateMemory).toHaveBeenCalledWith('mem-123', { metadata: { key: 'value' } });
    });

    it('should return 400 if neither content nor metadata is provided', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = {};
      await agentMemoryController.updateMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'At least content or metadata must be provided'
      }));
    });

    it('should return 404 if memory not found', async () => {
      mockReq.params = { memoryId: 'non-existent' };
      mockReq.body = { content: 'Updated' };
      agentMemoryService.updateMemory.mockRejectedValue(new Error('Memory not found'));
      await agentMemoryController.updateMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      mockReq.body = { content: 'Updated' };
      agentMemoryService.updateMemory.mockRejectedValue(new Error('DB error'));
      await agentMemoryController.updateMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('storeMemoriesBatch', () => {
    it('should store batch and return 201', async () => {
      mockReq.body = { memories: [{ agentId: mockAgentId, content: 'Test' }] };
      agentMemoryService.storeMemoriesBatch.mockResolvedValue([{ id: 'mem-1' }]);
      await agentMemoryController.storeMemoriesBatch(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if memories is not an array', async () => {
      mockReq.body = { memories: 'not-array' };
      await agentMemoryController.storeMemoriesBatch(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if memories array is empty', async () => {
      mockReq.body = { memories: [] };
      await agentMemoryController.storeMemoriesBatch(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'At least one memory is required'
      }));
    });

    it('should add userId to each memory', async () => {
      mockReq.body = { memories: [{ agentId: mockAgentId, content: 'Test1' }, { agentId: mockAgentId, content: 'Test2' }] };
      agentMemoryService.storeMemoriesBatch.mockResolvedValue([{ id: 'mem-1' }, { id: 'mem-2' }]);

      await agentMemoryController.storeMemoriesBatch(mockReq, mockRes);
      const passedMemories = agentMemoryService.storeMemoriesBatch.mock.calls[0][0];
      expect(passedMemories[0].userId).toBe(mockUserId);
      expect(passedMemories[1].userId).toBe(mockUserId);
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { memories: [{ agentId: mockAgentId, content: 'Test' }] };
      agentMemoryService.storeMemoriesBatch.mockRejectedValue(new Error('Error'));
      await agentMemoryController.storeMemoriesBatch(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteMemories', () => {
    it('should delete and return 200', async () => {
      mockReq.body = { agentId: mockAgentId };
      agentMemoryService.deleteMemories.mockResolvedValue({ deletedCount: 5 });
      await agentMemoryController.deleteMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if no filter', async () => {
      mockReq.body = {};
      await agentMemoryController.deleteMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should accept type filter only', async () => {
      mockReq.body = { type: 'conversation' };
      agentMemoryService.deleteMemories.mockResolvedValue({ deletedCount: 3 });
      await agentMemoryController.deleteMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(agentMemoryService.deleteMemories).toHaveBeenCalledWith({ type: 'conversation' });
    });

    it('should accept both agentId and type filter', async () => {
      mockReq.body = { agentId: mockAgentId, type: 'conversation' };
      agentMemoryService.deleteMemories.mockResolvedValue({ deletedCount: 2 });
      await agentMemoryController.deleteMemories(mockReq, mockRes);
      expect(agentMemoryService.deleteMemories).toHaveBeenCalledWith({
        agentId: mockAgentId,
        type: 'conversation'
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.body = { agentId: mockAgentId };
      agentMemoryService.deleteMemories.mockRejectedValue(new Error('Error'));
      await agentMemoryController.deleteMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
