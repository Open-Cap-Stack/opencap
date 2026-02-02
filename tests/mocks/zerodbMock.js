/**
 * ZeroDB Mock for Testing
 *
 * Provides mock implementations of ZeroDB service methods for unit testing
 */

const zerodbMock = {
  // Table operations
  query: jest.fn().mockResolvedValue({
    success: true,
    data: [],
    metadata: {
      count: 0,
      page: 1,
      pageSize: 10,
    },
  }),

  insert: jest.fn().mockResolvedValue({
    success: true,
    data: { id: 'mock-id-123', createdAt: new Date().toISOString() },
  }),

  update: jest.fn().mockResolvedValue({
    success: true,
    data: { id: 'mock-id-123', updatedAt: new Date().toISOString() },
  }),

  delete: jest.fn().mockResolvedValue({
    success: true,
    data: { deleted: 1 },
  }),

  // Vector operations
  vectorUpsert: jest.fn().mockResolvedValue({
    success: true,
    data: { vectorId: 'mock-vector-id' },
  }),

  vectorSearch: jest.fn().mockResolvedValue({
    success: true,
    data: [],
    metadata: {
      count: 0,
      similarity_threshold: 0.7,
    },
  }),

  // Event streaming
  createEvent: jest.fn().mockResolvedValue({
    success: true,
    data: { eventId: 'mock-event-id' },
  }),

  listEvents: jest.fn().mockResolvedValue({
    success: true,
    data: [],
    metadata: {
      count: 0,
      page: 1,
    },
  }),

  // File storage
  uploadFile: jest.fn().mockResolvedValue({
    success: true,
    data: {
      fileId: 'mock-file-id',
      url: 'https://mock-storage.com/file.pdf',
    },
  }),

  downloadFile: jest.fn().mockResolvedValue({
    success: true,
    data: Buffer.from('mock file content'),
  }),

  // Memory operations
  storeMemory: jest.fn().mockResolvedValue({
    success: true,
    data: { memoryId: 'mock-memory-id' },
  }),

  searchMemory: jest.fn().mockResolvedValue({
    success: true,
    data: [],
    metadata: {
      count: 0,
    },
  }),

  // Analytics
  getAnalytics: jest.fn().mockResolvedValue({
    success: true,
    data: {
      metrics: {},
      period: 'day',
    },
  }),

  // Project info
  getProjectInfo: jest.fn().mockResolvedValue({
    success: true,
    data: {
      projectId: 'mock-project-id',
      name: 'Test Project',
    },
  }),

  // Reset all mocks
  reset: function () {
    Object.keys(this).forEach((key) => {
      if (typeof this[key] === 'function' && this[key].mockReset) {
        this[key].mockReset();
      }
    });
  },

  // Clear all mocks
  clear: function () {
    Object.keys(this).forEach((key) => {
      if (typeof this[key] === 'function' && this[key].mockClear) {
        this[key].mockClear();
      }
    });
  },
};

module.exports = zerodbMock;
