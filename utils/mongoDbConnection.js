/**
 * MongoDB Connection Stub
 *
 * This file exists for backward compatibility with legacy test files.
 * MongoDB has been removed from the project - all data operations use ZeroDB.
 *
 * @deprecated This module is deprecated. Use ZeroDB service instead.
 */

// No-op connection stub
module.exports = {
  // Legacy connection state for compatibility
  isConnected: false,

  // No-op connect function
  connect: async () => {
    console.warn('mongoDbConnection.connect() is deprecated. MongoDB has been removed.');
    return null;
  },

  // No-op disconnect function
  disconnect: async () => {
    console.warn('mongoDbConnection.disconnect() is deprecated. MongoDB has been removed.');
    return null;
  },

  // No-op getConnection function
  getConnection: () => {
    console.warn('mongoDbConnection.getConnection() is deprecated. MongoDB has been removed.');
    return null;
  }
};
