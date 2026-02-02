/**
 * Centralized Mock Exports
 *
 * Provides a single import point for all test mocks
 */

const zerodbMock = require('./zerodbMock');
const anthropicMock = require('./anthropicMock');
const openaiMock = require('./openaiMock');

/**
 * Reset all mocks to their initial state
 */
function resetAllMocks() {
  zerodbMock.reset();
  anthropicMock.reset();
  openaiMock.reset();
}

/**
 * Clear all mock call history
 */
function clearAllMocks() {
  zerodbMock.clear();
  anthropicMock.clear();
  openaiMock.clear();
}

module.exports = {
  zerodbMock,
  anthropicMock,
  openaiMock,
  resetAllMocks,
  clearAllMocks,
};
