/**
 * Anthropic API Mock for Testing
 *
 * Provides mock implementations of Anthropic/Claude API for unit testing
 */

const anthropicMock = {
  messages: {
    create: jest.fn().mockResolvedValue({
      id: 'msg_mock123',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mock response from Claude.',
        },
      ],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 20,
      },
    }),

    stream: jest.fn().mockImplementation(async function* () {
      yield {
        type: 'message_start',
        message: {
          id: 'msg_mock123',
          type: 'message',
          role: 'assistant',
          content: [],
          model: 'claude-3-sonnet-20240229',
        },
      };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Mock ' },
      };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'response.' },
      };
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
      };
    }),
  },

  // Reset all mocks
  reset: function () {
    this.messages.create.mockReset();
    this.messages.stream.mockReset();
  },

  // Clear all mocks
  clear: function () {
    this.messages.create.mockClear();
    this.messages.stream.mockClear();
  },
};

module.exports = anthropicMock;
