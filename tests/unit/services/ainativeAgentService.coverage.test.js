/**
 * AINative Agent Service - Coverage Gap Tests
 *
 * Covers uncovered lines:
 * - parseJsonFromResponse: lines 155-170 (brace-matching for first complete object)
 * - parseJsonFromResponse: lines 178-181 (array extraction)
 * - parseJsonFromResponse: lines 188-191 (object after array fallback)
 * - parseJsonFromResponse: lines 199-200, 203-204 (JSON5 fallback paths)
 */

jest.mock('axios');

const axios = require('axios');

describe('ainativeAgentService (Coverage Gaps)', () => {
  let parseJsonFromResponse, ainativeChat, ainativeChatWithRetry;

  beforeAll(() => {
    process.env.AINATIVE_API_TOKEN = 'test-token-abc';
    ({ parseJsonFromResponse, ainativeChat, ainativeChatWithRetry } = require('../../../services/ainativeAgentService'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.AINATIVE_API_TOKEN = 'test-token-abc';
  });

  describe('parseJsonFromResponse - brace-matching scanner', () => {
    it('should extract first complete JSON object when multiple objects follow', () => {
      // This hits the brace-matching scanner (lines 155-170)
      // Two JSON objects concatenated - should extract the first
      const input = 'Here is the data: {"a":1} {"b":2}';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual({ a: 1 });
    });

    it('should handle escaped quotes inside strings during brace matching', () => {
      // This exercises the escape character handling (line 158-159)
      const input = 'Result: {"key":"value with \\"escaped\\" quotes"} extra text';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual({ key: 'value with "escaped" quotes' });
    });

    it('should handle nested braces inside strings', () => {
      const input = 'Output: {"data":"has { } braces","count":5} trailing';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual({ data: 'has { } braces', count: 5 });
    });
  });

  describe('parseJsonFromResponse - array extraction fallback', () => {
    it('should extract array when it appears before any object', () => {
      // Hits lines 178-181 (array extraction when arrStart < objStart)
      const input = 'Here is the list: [1, 2, 3] and also {"key": "value"}';
      const result = parseJsonFromResponse(input);
      // Array appears first, so it should be extracted
      expect(result).toEqual([1, 2, 3]);
    });

    it('should extract array with nested objects', () => {
      const input = 'Data: [{"id":1},{"id":2}]';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should extract array embedded in prose', () => {
      const input = 'The top keywords are: ["seo", "marketing", "growth"] as shown.';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual(['seo', 'marketing', 'growth']);
    });
  });

  describe('parseJsonFromResponse - object after array fallback', () => {
    it('should fall back to object extraction when array parse fails but object exists after', () => {
      // Hits lines 188-191: hasObj && !objFirst path
      // Array brackets but invalid array content, followed by valid object
      const input = '[invalid array content {"valid": true}';
      // The [ appears first (arrStart=0), { appears at index 24
      // hasArr=true, hasObj=true, arrStart < objStart => NOT objFirst
      // First tries array extraction with lastIndexOf(']') which doesn't exist
      // Falls to the hasObj && !objFirst block
      const result = parseJsonFromResponse(input);
      expect(result).toEqual({ valid: true });
    });
  });

  describe('parseJsonFromResponse - JSON5 fallback', () => {
    it('should handle trailing commas via JSON5', () => {
      // Standard JSON.parse fails on trailing commas, JSON5 handles them
      const input = '{"key": "value", "list": [1, 2, 3,],}';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual({ key: 'value', list: [1, 2, 3] });
    });

    it('should handle single-quoted strings via JSON5', () => {
      // JSON5 supports single-quoted strings
      const input = "{'key': 'value'}";
      const result = parseJsonFromResponse(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle JSON5 array with trailing commas', () => {
      const input = 'Result: [1, 2, 3,]';
      const result = parseJsonFromResponse(input);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('ainativeChat - fallback on 402', () => {
    it('should fall back on 402 Payment Required', async () => {
      const paymentErr = Object.assign(new Error('Payment Required'), {
        response: { status: 402 }
      });
      axios.post
        .mockRejectedValueOnce(paymentErr)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Fallback OK' } }] }
        });

      const result = await ainativeChat([{ role: 'user', content: 'test' }]);
      expect(result).toBe('Fallback OK');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should fall back on 529', async () => {
      const overloadErr = Object.assign(new Error('Overloaded'), {
        response: { status: 529 }
      });
      axios.post
        .mockRejectedValueOnce(overloadErr)
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'OK after 529' } }] }
        });

      const result = await ainativeChat([{ role: 'user', content: 'test' }]);
      expect(result).toBe('OK after 529');
    });
  });

  describe('ainativeChat - model deduplication', () => {
    it('should not include primary model twice in fallback chain', async () => {
      // When primary model is already in the fallback chain, it should be deduplicated
      const err = Object.assign(new Error('Rate limited'), {
        response: { status: 429 }
      });
      axios.post
        .mockRejectedValueOnce(err) // llama-3.1-8b fails
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'deepseek response' } }] }
        });

      const result = await ainativeChat(
        [{ role: 'user', content: 'test' }],
        { model: 'llama-3.1-8b' }
      );
      expect(result).toBe('deepseek response');
    });
  });

  describe('ainativeChat - empty choices handling', () => {
    it('should throw when choices array has message with null content', async () => {
      axios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content: null } }] }
      });

      await expect(
        ainativeChat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Empty response');
    });

    it('should throw when response data has no choices', async () => {
      axios.post.mockResolvedValueOnce({
        data: {}
      });

      await expect(
        ainativeChat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Empty response');
    });
  });

  describe('ainativeChatWithRetry - retry with rawContent injection', () => {
    it('should inject empty rawContent when error has no rawContent', async () => {
      // First attempt: non-JSON response (parseJsonFromResponse sets rawContent)
      // Second attempt: valid JSON
      axios.post
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'just text no json' } }] }
        })
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: '{"success":true}' } }] }
        });

      const result = await ainativeChatWithRetry(
        [{ role: 'user', content: 'JSON please' }],
        {},
        2
      );
      expect(result.parsed).toEqual({ success: true });
    });
  });

  describe('ainativeChat - error without response object', () => {
    it('should throw non-retriable errors that lack response status', async () => {
      const networkErr = new Error('ECONNREFUSED');
      // No response property = not retriable
      axios.post.mockRejectedValueOnce(networkErr);

      await expect(
        ainativeChat([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('parseJsonFromResponse - edge cases', () => {
    it('should handle deeply nested objects', () => {
      const deep = JSON.stringify({ a: { b: { c: { d: { e: 42 } } } } });
      const result = parseJsonFromResponse(`Here: ${deep}`);
      expect(result.a.b.c.d.e).toBe(42);
    });

    it('should handle response with only whitespace around JSON', () => {
      const result = parseJsonFromResponse('   {"key": "value"}   ');
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle empty object', () => {
      const result = parseJsonFromResponse('{}');
      expect(result).toEqual({});
    });

    it('should handle empty array', () => {
      const result = parseJsonFromResponse('[]');
      expect(result).toEqual([]);
    });
  });
});
