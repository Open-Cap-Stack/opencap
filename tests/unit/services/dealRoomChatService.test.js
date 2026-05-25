/**
 * Tests for dealRoomChatService
 * Issue #659: AI deal room / investor Q&A (RAG-based)
 */

jest.mock('../../../services/ainativeAgentService');
jest.mock('../../../services/zerodbService');

const { ainativeChatWithRetry } = require('../../../services/ainativeAgentService');
const zerodbService = require('../../../services/zerodbService');
const dealRoomChatService = require('../../../services/dealRoomChatService');

describe('dealRoomChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should return answer, sources, and confidence', async () => {
      // Mock vector search returning relevant docs
      zerodbService.vectorSearch = jest.fn().mockResolvedValue([
        {
          score: 0.92,
          metadata: { documentId: 'doc-1', dataRoomId: 'dr-123', text: 'The Series A round closed at $25M post-money valuation.' }
        }
      ]);

      ainativeChatWithRetry.mockResolvedValue(
        JSON.stringify({
          answer: 'The Series A valuation was $25M post-money.',
          confidence: 0.9,
          citations: ['doc-1']
        })
      );

      const result = await dealRoomChatService.chat({
        dataRoomId: 'dr-123',
        question: 'What was the Series A valuation?',
        userId: 'user-1'
      });

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
      expect(result.confidence).toBeDefined();
    });

    it('should call ainativeChatWithRetry with retrieved context', async () => {
      zerodbService.vectorSearch = jest.fn().mockResolvedValue([
        {
          score: 0.88,
          metadata: { documentId: 'doc-2', dataRoomId: 'dr-123', text: 'Revenue in 2023 was $5M ARR.' }
        }
      ]);

      ainativeChatWithRetry.mockResolvedValue(
        JSON.stringify({
          answer: 'Revenue was $5M ARR in 2023.',
          confidence: 0.85,
          citations: ['doc-2']
        })
      );

      await dealRoomChatService.chat({
        dataRoomId: 'dr-123',
        question: 'What is the ARR?',
        userId: 'user-1'
      });

      expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
      const callArgs = ainativeChatWithRetry.mock.calls[0];
      const messages = callArgs[0];
      // Should include context from retrieved docs in the messages
      const messageContent = messages.map(m => m.content).join(' ');
      expect(messageContent).toContain('Revenue in 2023');
    });

    it('should require dataRoomId', async () => {
      await expect(
        dealRoomChatService.chat({ question: 'test', userId: 'u-1' })
      ).rejects.toThrow();
    });

    it('should require question', async () => {
      await expect(
        dealRoomChatService.chat({ dataRoomId: 'dr-123', userId: 'u-1' })
      ).rejects.toThrow();
    });

    it('should handle when no relevant documents found', async () => {
      zerodbService.vectorSearch = jest.fn().mockResolvedValue([]);

      ainativeChatWithRetry.mockResolvedValue(
        JSON.stringify({
          answer: 'No relevant documents found for this question.',
          confidence: 0.1,
          citations: []
        })
      );

      const result = await dealRoomChatService.chat({
        dataRoomId: 'dr-123',
        question: 'What is the revenue?',
        userId: 'user-1'
      });

      expect(result.answer).toBeDefined();
      expect(result.sources).toHaveLength(0);
    });

    it('should handle LLM returning plain text instead of JSON gracefully', async () => {
      zerodbService.vectorSearch = jest.fn().mockResolvedValue([
        {
          score: 0.75,
          metadata: { documentId: 'doc-3', text: 'Founded in 2020.' }
        }
      ]);

      ainativeChatWithRetry.mockResolvedValue('The company was founded in 2020.');

      const result = await dealRoomChatService.chat({
        dataRoomId: 'dr-123',
        question: 'When was the company founded?',
        userId: 'user-1'
      });

      expect(result.answer).toBeDefined();
      expect(typeof result.answer).toBe('string');
    });

    it('should scope vector search to the specific data room', async () => {
      zerodbService.vectorSearch = jest.fn().mockResolvedValue([]);
      ainativeChatWithRetry.mockResolvedValue(
        JSON.stringify({ answer: 'Not found', confidence: 0, citations: [] })
      );

      await dealRoomChatService.chat({
        dataRoomId: 'dr-specific',
        question: 'Revenue?',
        userId: 'u-1'
      });

      // vectorSearch should be called with dataRoomId filter
      expect(zerodbService.vectorSearch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ dataRoomId: 'dr-specific' }),
        expect.any(Number)
      );
    });
  });
});
