/**
 * Tests for gracefulShutdown utility
 * Issue #388: Create graceful shutdown handler
 */

const { registerCleanupHandler } = require('../../../utils/gracefulShutdown');

describe('gracefulShutdown utility', () => {
  describe('registerCleanupHandler', () => {
    it('should register a cleanup handler', () => {
      const handler = jest.fn();
      expect(() => {
        registerCleanupHandler(handler, 'Test Handler');
      }).not.toThrow();
    });

    it('should throw error for non-function handler', () => {
      expect(() => {
        registerCleanupHandler('not a function', 'Test');
      }).toThrow('Cleanup handler must be a function');
    });

    it('should allow handler without name', () => {
      const handler = jest.fn();
      expect(() => {
        registerCleanupHandler(handler);
      }).not.toThrow();
    });
  });
});
