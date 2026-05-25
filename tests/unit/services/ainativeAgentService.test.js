/**
 * AINative Agent Service Tests
 * Issue #625: Shared AINative chat completion service
 */

jest.mock('axios');

const axios = require('axios');

describe('ainativeAgentService', () => {
  let ainativeChat, parseJsonFromResponse, ainativeChatWithRetry;

  beforeAll(() => {
    process.env.AINATIVE_API_TOKEN = 'test-token-abc';
    ({ ainativeChat, parseJsonFromResponse, ainativeChatWithRetry } = require('../../../services/ainativeAgentService'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.AINATIVE_API_TOKEN = 'test-token-abc';
  });

  // ─── ainativeChat() ───────────────────────────────────────────────────────

  describe('ainativeChat()', () => {
    const messages = [{ role: 'user', content: 'Hello' }];

    function mockSuccess(content = 'Test response') {
      axios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content } }]
        }
      });
    }

    it('returns the assistant message content on success', async () => {
      mockSuccess('Hello from the model');
      const result = await ainativeChat(messages);
      expect(result).toBe('Hello from the model');
    });

    it('calls the correct AINative endpoint', async () => {
      mockSuccess();
      await ainativeChat(messages);
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.ainative.studio/v1/chat/completions',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('sends Authorization Bearer header', async () => {
      mockSuccess();
      await ainativeChat(messages);
      const [, , config] = axios.post.mock.calls[0];
      expect(config.headers.Authorization).toBe('Bearer test-token-abc');
    });

    it('defaults to llama-3.1-8b model', async () => {
      mockSuccess();
      await ainativeChat(messages);
      const [, body] = axios.post.mock.calls[0];
      expect(body.model).toBe('llama-3.1-8b');
    });

    it('uses an override model when specified', async () => {
      mockSuccess();
      await ainativeChat(messages, { model: 'deepseek-v3' });
      const [, body] = axios.post.mock.calls[0];
      expect(body.model).toBe('deepseek-v3');
    });

    it('sets default temperature to 0.3', async () => {
      mockSuccess();
      await ainativeChat(messages);
      const [, body] = axios.post.mock.calls[0];
      expect(body.temperature).toBe(0.3);
    });

    it('sets default max_tokens to 8192', async () => {
      mockSuccess();
      await ainativeChat(messages);
      const [, body] = axios.post.mock.calls[0];
      expect(body.max_tokens).toBe(8192);
    });

    it('respects temperature override', async () => {
      mockSuccess();
      await ainativeChat(messages, { temperature: 0.7 });
      const [, body] = axios.post.mock.calls[0];
      expect(body.temperature).toBe(0.7);
    });

    it('respects max_tokens override', async () => {
      mockSuccess();
      await ainativeChat(messages, { max_tokens: 2048 });
      const [, body] = axios.post.mock.calls[0];
      expect(body.max_tokens).toBe(2048);
    });

    it('injects system prompt as leading message when provided', async () => {
      mockSuccess();
      await ainativeChat(messages, { system: 'You are a financial expert.' });
      const [, body] = axios.post.mock.calls[0];
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a financial expert.' });
      expect(body.messages[1]).toEqual(messages[0]);
    });

    it('sets a 120-second timeout', async () => {
      mockSuccess();
      await ainativeChat(messages);
      const [, , config] = axios.post.mock.calls[0];
      expect(config.timeout).toBe(120000);
    });

    it('throws when AINATIVE_API_TOKEN is not set', async () => {
      delete process.env.AINATIVE_API_TOKEN;
      // Re-require to pick up missing env (module is cached, so test the guard directly)
      jest.resetModules();
      process.env.AINATIVE_API_TOKEN = '';
      const { ainativeChat: chat } = require('../../../services/ainativeAgentService');
      await expect(chat(messages)).rejects.toThrow('AINATIVE_API_TOKEN');
      process.env.AINATIVE_API_TOKEN = 'test-token-abc';
    });

    it('throws on empty choices response', async () => {
      axios.post.mockResolvedValueOnce({ data: { choices: [] } });
      await expect(ainativeChat(messages)).rejects.toThrow('Empty response');
    });

    describe('fallback chain', () => {
      it('falls back to deepseek-v3 when primary returns 429', async () => {
        const rateLimitErr = Object.assign(new Error('Rate limited'), {
          response: { status: 429 }
        });
        axios.post
          .mockRejectedValueOnce(rateLimitErr)   // llama-3.1-8b → 429
          .mockResolvedValueOnce({               // deepseek-v3 → success
            data: { choices: [{ message: { content: 'Fallback response' } }] }
          });

        const result = await ainativeChat(messages);
        expect(result).toBe('Fallback response');
        expect(axios.post).toHaveBeenCalledTimes(2);
      });

      it('falls back on 503', async () => {
        const overloadErr = Object.assign(new Error('Service unavailable'), {
          response: { status: 503 }
        });
        axios.post
          .mockRejectedValueOnce(overloadErr)
          .mockResolvedValueOnce({
            data: { choices: [{ message: { content: 'OK' } }] }
          });

        const result = await ainativeChat(messages);
        expect(result).toBe('OK');
      });

      it('throws immediately on non-retriable errors (e.g. 400)', async () => {
        const badRequest = Object.assign(new Error('Bad request'), {
          response: { status: 400 }
        });
        axios.post.mockRejectedValueOnce(badRequest);
        await expect(ainativeChat(messages)).rejects.toThrow('Bad request');
        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      it('throws after exhausting all fallbacks', async () => {
        const err = Object.assign(new Error('Overloaded'), { response: { status: 529 } });
        axios.post.mockRejectedValue(err); // all attempts fail
        await expect(ainativeChat(messages)).rejects.toThrow();
      });
    });
  });

  // ─── parseJsonFromResponse() ──────────────────────────────────────────────

  describe('ainativeChatWithRetry()', () => {

    function mockSuccessJson(json) {
      const content = JSON.stringify(json);
      axios.post.mockResolvedValueOnce({
        data: { choices: [{ message: { content } }] }
      });
    }

    it('returns { content, parsed } on first success', async () => {
      mockSuccessJson({ score: 42 });
      const messages = [{ role: 'user', content: 'Give me JSON' }];
      const result = await ainativeChatWithRetry(messages);
      expect(result.parsed).toEqual({ score: 42 });
      expect(typeof result.content).toBe('string');
    });

    it('retries when LLM returns unparseable response, injecting error context', async () => {
      // First call: returns prose (not JSON)
      axios.post
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Here is your answer: not json at all' } }] }
        })
        // Second call: returns valid JSON
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: '{"result":"ok"}' } }] }
        });

      const messages = [{ role: 'user', content: 'Give me JSON' }];
      const result = await ainativeChatWithRetry(messages, {}, 3);

      expect(result.parsed).toEqual({ result: 'ok' });
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('injects the bad response and error message into context on retry', async () => {
      axios.post
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'not json' } }] }
        })
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: '{"fixed":true}' } }] }
        });

      const messages = [{ role: 'user', content: 'Give me JSON' }];
      await ainativeChatWithRetry(messages, {}, 3);

      // Second call should have more messages (original + assistant bad response + user error correction)
      const secondCallBody = axios.post.mock.calls[1][1];
      expect(secondCallBody.messages.length).toBeGreaterThan(messages.length);
      const errorCorrectionMsg = secondCallBody.messages[secondCallBody.messages.length - 1];
      expect(errorCorrectionMsg.role).toBe('user');
      expect(errorCorrectionMsg.content).toMatch(/could not be parsed as JSON/);
    });

    it('throws after exhausting maxRetries', async () => {
      // All calls return unparseable content
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: 'not valid json at all, period' } }] }
      });

      const messages = [{ role: 'user', content: 'Give me JSON' }];
      await expect(ainativeChatWithRetry(messages, {}, 3)).rejects.toThrow();
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    it('attaches rawContent to error thrown from parseJsonFromResponse', () => {
      const { parseJsonFromResponse } = require('../../../services/ainativeAgentService');
      let thrownError;
      try {
        parseJsonFromResponse('this is not json');
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).toBeDefined();
      expect(thrownError.rawContent).toBe('this is not json');
    });
  });

  describe('parseJsonFromResponse()', () => {
    it('parses raw JSON', () => {
      const result = parseJsonFromResponse('{"key":"value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('strips ```json fences', () => {
      const result = parseJsonFromResponse('```json\n{"key":"value"}\n```');
      expect(result).toEqual({ key: 'value' });
    });

    it('strips plain ``` fences', () => {
      const result = parseJsonFromResponse('```\n{"key":"value"}\n```');
      expect(result).toEqual({ key: 'value' });
    });

    it('removes <thinking> blocks before parsing', () => {
      const result = parseJsonFromResponse(
        '<thinking>step by step</thinking>\n{"answer":42}'
      );
      expect(result).toEqual({ answer: 42 });
    });

    it('extracts JSON embedded in prose', () => {
      const result = parseJsonFromResponse('Sure! Here is the data: {"score":99} Hope that helps.');
      expect(result).toEqual({ score: 99 });
    });

    it('parses JSON arrays', () => {
      const result = parseJsonFromResponse('[1,2,3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('throws on non-string input', () => {
      expect(() => parseJsonFromResponse(null)).toThrow('string');
    });

    it('throws when no JSON can be extracted', () => {
      expect(() => parseJsonFromResponse('This is plain text with no JSON')).toThrow(
        'parseJsonFromResponse'
      );
    });

    it('handles nested JSON objects', () => {
      const input = '{"a":{"b":{"c":42}}}';
      expect(parseJsonFromResponse(input)).toEqual({ a: { b: { c: 42 } } });
    });

    it('parses a complex realistic response', () => {
      const input = `
Here is the structured output you requested:
\`\`\`json
{
  "investorReadinessScore": 74,
  "criticalGaps": ["409A Valuation", "Cap Table"],
  "dueDiligenceRisk": "medium"
}
\`\`\`
      `.trim();
      const result = parseJsonFromResponse(input);
      expect(result.investorReadinessScore).toBe(74);
      expect(result.criticalGaps).toHaveLength(2);
    });
  });
});
