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
    mockReq = { body: {}, params: {}, query: {}, user: { id: mockUserId } };
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
    });

    it('should return 400 if content is missing', async () => {
      mockReq.body = { agentId: mockAgentId };
      await agentMemoryController.storeMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMemories', () => {
    it('should return memories with 200', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemories.mockResolvedValue({ memories: [], totalCount: 0 });
      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if agentId is missing', async () => {
      mockReq.query = {};
      await agentMemoryController.getMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('searchMemories', () => {
    it('should search and return 200', async () => {
      mockReq.body = { query: 'test', agentId: mockAgentId };
      agentMemoryService.searchMemories.mockResolvedValue({ memories: [], searchTimeMs: 45 });
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 if query is missing', async () => {
      mockReq.body = { agentId: mockAgentId };
      await agentMemoryController.searchMemories(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
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
  });

  describe('unpinMemory', () => {
    it('should unpin and return 200', async () => {
      mockReq.params = { memoryId: 'mem-123' };
      agentMemoryService.unpinMemory.mockResolvedValue({ id: 'mem-123', pinned: false });
      await agentMemoryController.unpinMemory(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
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
  });

  describe('getMemoryAnalytics', () => {
    it('should return analytics with 200', async () => {
      mockReq.query = { agentId: mockAgentId };
      agentMemoryService.getMemoryAnalytics.mockResolvedValue({ totalMemories: 10 });
      await agentMemoryController.getMemoryAnalytics(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
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
  });
});
