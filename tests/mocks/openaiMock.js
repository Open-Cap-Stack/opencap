/**
 * OpenAI API Mock for Testing
 *
 * Provides mock implementations of OpenAI API for unit testing
 */

const openaiMock = {
  embeddings: {
    create: jest.fn().mockResolvedValue({
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: Array(1536).fill(0).map(() => Math.random()),
          index: 0,
        },
      ],
      model: 'text-embedding-ada-002',
      usage: {
        prompt_tokens: 8,
        total_tokens: 8,
      },
    }),
  },

  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        id: 'chatcmpl-mock123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a mock response from GPT.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }),
    },
  },

  // Reset all mocks
  reset: function () {
    this.embeddings.create.mockReset();
    this.chat.completions.create.mockReset();
  },

  // Clear all mocks
  clear: function () {
    this.embeddings.create.mockClear();
    this.chat.completions.create.mockClear();
  },
};

module.exports = openaiMock;
