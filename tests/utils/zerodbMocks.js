/**
 * ZeroDB Mock Utilities for Testing
 *
 * Provides mock implementations of ZeroDB operations for unit testing
 * without requiring actual database connections.
 */

// In-memory storage for mock data
let mockStorage = {
  tables: {},
  vectors: {},
  memory: {},
  events: [],
  files: {},
  rlhf: [],
  agentLogs: []
};

// Counter for generating unique IDs
let idCounter = 0;

function generateId() {
  idCounter++;
  return `mock-id-${Date.now()}-${idCounter}`;
}

function resetIdCounter() {
  idCounter = 0;
}

function createZeroDBMocks() {
  return {
    initialize: jest.fn().mockResolvedValue({ success: true }),
    isInitialized: jest.fn().mockReturnValue(true),
    getProjectId: jest.fn().mockReturnValue('test-project-id'),

    createTable: jest.fn().mockImplementation(async (tableName, schema) => {
      mockStorage.tables[tableName] = { schema, rows: [] };
      return { success: true, tableName };
    }),

    listTables: jest.fn().mockImplementation(async () => {
      return { success: true, tables: Object.keys(mockStorage.tables) };
    }),

    insertRow: jest.fn().mockImplementation(async (tableName, data) => {
      if (!mockStorage.tables[tableName]) {
        mockStorage.tables[tableName] = { schema: {}, rows: [] };
      }
      const row = { id: generateId(), ...data, createdAt: new Date().toISOString() };
      mockStorage.tables[tableName].rows.push(row);
      return { success: true, row };
    }),

    insertRows: jest.fn().mockImplementation(async (tableName, dataArray) => {
      if (!mockStorage.tables[tableName]) {
        mockStorage.tables[tableName] = { schema: {}, rows: [] };
      }
      const rows = dataArray.map(data => ({
        id: generateId(),
        ...data,
        createdAt: new Date().toISOString()
      }));
      mockStorage.tables[tableName].rows.push(...rows);
      return { success: true, rows };
    }),

    queryRows: jest.fn().mockImplementation(async (tableName, query = {}) => {
      if (!mockStorage.tables[tableName]) {
        return { success: true, rows: [] };
      }
      let rows = [...mockStorage.tables[tableName].rows];

      if (query.filter) {
        rows = rows.filter(row => matchesFilter(row, query.filter));
      }

      if (query.orderBy) {
        const { field, direction = 'asc' } = query.orderBy;
        rows.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          const comp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return direction === 'desc' ? -comp : comp;
        });
      }

      if (query.limit) {
        const offset = query.offset || 0;
        rows = rows.slice(offset, offset + query.limit);
      }

      return { success: true, rows };
    }),

    updateRow: jest.fn().mockImplementation(async (tableName, rowId, updates) => {
      if (!mockStorage.tables[tableName]) {
        return { success: false, error: 'Table not found' };
      }
      const index = mockStorage.tables[tableName].rows.findIndex(r => r.id === rowId);
      if (index === -1) {
        return { success: false, error: 'Row not found' };
      }
      mockStorage.tables[tableName].rows[index] = {
        ...mockStorage.tables[tableName].rows[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return { success: true, row: mockStorage.tables[tableName].rows[index] };
    }),

    updateRows: jest.fn().mockImplementation(async (tableName, filter, updates) => {
      if (!mockStorage.tables[tableName]) {
        return { success: false, error: 'Table not found' };
      }
      let updatedCount = 0;
      mockStorage.tables[tableName].rows = mockStorage.tables[tableName].rows.map(row => {
        if (matchesFilter(row, filter)) {
          updatedCount++;
          return { ...row, ...updates, updatedAt: new Date().toISOString() };
        }
        return row;
      });
      return { success: true, updatedCount };
    }),

    deleteRow: jest.fn().mockImplementation(async (tableName, rowId) => {
      if (!mockStorage.tables[tableName]) {
        return { success: false, error: 'Table not found' };
      }
      const initialLength = mockStorage.tables[tableName].rows.length;
      mockStorage.tables[tableName].rows = mockStorage.tables[tableName].rows.filter(r => r.id !== rowId);
      return { success: true, deleted: initialLength !== mockStorage.tables[tableName].rows.length };
    }),

    deleteRows: jest.fn().mockImplementation(async (tableName, filter) => {
      if (!mockStorage.tables[tableName]) {
        return { success: false, error: 'Table not found' };
      }
      const initialLength = mockStorage.tables[tableName].rows.length;
      mockStorage.tables[tableName].rows = mockStorage.tables[tableName].rows.filter(row => !matchesFilter(row, filter));
      return { success: true, deletedCount: initialLength - mockStorage.tables[tableName].rows.length };
    }),

    upsertVector: jest.fn().mockImplementation(async (vectorId, embedding, metadata = {}) => {
      mockStorage.vectors[vectorId] = { id: vectorId, embedding, metadata, createdAt: new Date().toISOString() };
      return { success: true, vectorId };
    }),

    searchVectors: jest.fn().mockImplementation(async (queryEmbedding, options = {}) => {
      const { topK = 10, filter } = options;
      let vectors = Object.values(mockStorage.vectors);
      if (filter) {
        vectors = vectors.filter(v => matchesFilter(v.metadata, filter));
      }
      const results = vectors.slice(0, topK).map((v, i) => ({ id: v.id, score: 1 - (i * 0.1), metadata: v.metadata }));
      return { success: true, results };
    }),

    deleteVector: jest.fn().mockImplementation(async (vectorId) => {
      const exists = !!mockStorage.vectors[vectorId];
      delete mockStorage.vectors[vectorId];
      return { success: true, deleted: exists };
    }),

    listVectors: jest.fn().mockImplementation(async (options = {}) => {
      const { limit = 100, offset = 0 } = options;
      const vectors = Object.values(mockStorage.vectors).slice(offset, offset + limit);
      return { success: true, vectors };
    }),

    storeMemory: jest.fn().mockImplementation(async (key, content, metadata = {}) => {
      mockStorage.memory[key] = { key, content, metadata, createdAt: new Date().toISOString() };
      return { success: true, key };
    }),

    searchMemory: jest.fn().mockImplementation(async (query, options = {}) => {
      const { limit = 10 } = options;
      const results = Object.values(mockStorage.memory)
        .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map(m => ({ ...m, score: 0.9 }));
      return { success: true, results };
    }),

    getMemoryContext: jest.fn().mockImplementation(async (sessionId) => {
      const memories = Object.values(mockStorage.memory).filter(m => m.metadata.sessionId === sessionId);
      return { success: true, context: memories };
    }),

    createEvent: jest.fn().mockImplementation(async (eventType, payload, metadata = {}) => {
      const event = { id: generateId(), eventType, payload, metadata, timestamp: new Date().toISOString() };
      mockStorage.events.push(event);
      return { success: true, event };
    }),

    listEvents: jest.fn().mockImplementation(async (options = {}) => {
      const { eventType, limit = 100, offset = 0 } = options;
      let events = [...mockStorage.events];
      if (eventType) {
        events = events.filter(e => e.eventType === eventType);
      }
      events = events.slice(offset, offset + limit);
      return { success: true, events };
    }),

    uploadFile: jest.fn().mockImplementation(async (filePath, fileContent, metadata = {}) => {
      const fileId = generateId();
      mockStorage.files[fileId] = { id: fileId, path: filePath, content: fileContent, metadata, size: fileContent.length, uploadedAt: new Date().toISOString() };
      return { success: true, fileId, path: filePath };
    }),

    downloadFile: jest.fn().mockImplementation(async (fileId) => {
      const file = mockStorage.files[fileId];
      if (!file) return { success: false, error: 'File not found' };
      return { success: true, content: file.content, metadata: file.metadata };
    }),

    deleteFile: jest.fn().mockImplementation(async (fileId) => {
      const exists = !!mockStorage.files[fileId];
      delete mockStorage.files[fileId];
      return { success: true, deleted: exists };
    }),

    listFiles: jest.fn().mockImplementation(async (options = {}) => {
      const { prefix, limit = 100, offset = 0 } = options;
      let files = Object.values(mockStorage.files);
      if (prefix) {
        files = files.filter(f => f.path.startsWith(prefix));
      }
      files = files.slice(offset, offset + limit);
      return { success: true, files };
    }),

    getFileUrl: jest.fn().mockImplementation(async (fileId, expiresIn = 3600) => {
      const file = mockStorage.files[fileId];
      if (!file) return { success: false, error: 'File not found' };
      return { success: true, url: `https://mock-storage.test/${fileId}?expires=${expiresIn}` };
    }),

    submitFeedback: jest.fn().mockImplementation(async (responseId, feedback) => {
      const entry = { id: generateId(), responseId, feedback, createdAt: new Date().toISOString() };
      mockStorage.rlhf.push(entry);
      return { success: true, feedbackId: entry.id };
    }),

    logAgentAction: jest.fn().mockImplementation(async (agentId, action, metadata = {}) => {
      const log = { id: generateId(), agentId, action, metadata, timestamp: new Date().toISOString() };
      mockStorage.agentLogs.push(log);
      return { success: true, logId: log.id };
    }),

    getProjectStats: jest.fn().mockImplementation(async () => {
      return {
        success: true,
        stats: {
          tables: Object.keys(mockStorage.tables).length,
          totalRows: Object.values(mockStorage.tables).reduce((sum, t) => sum + t.rows.length, 0),
          vectors: Object.keys(mockStorage.vectors).length,
          files: Object.keys(mockStorage.files).length,
          events: mockStorage.events.length
        }
      };
    }),

    getVectorStats: jest.fn().mockImplementation(async () => {
      return { success: true, stats: { totalVectors: Object.keys(mockStorage.vectors).length, dimensions: 1536 } };
    })
  };
}

function matchesFilter(obj, filter) {
  for (const key of Object.keys(filter)) {
    const value = filter[key];
    const objValue = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const op of Object.keys(value)) {
        const opValue = value[op];
        switch (op) {
          case '$eq': if (objValue !== opValue) return false; break;
          case '$ne': if (objValue === opValue) return false; break;
          case '$gt': if (!(objValue > opValue)) return false; break;
          case '$gte': if (!(objValue >= opValue)) return false; break;
          case '$lt': if (!(objValue < opValue)) return false; break;
          case '$lte': if (!(objValue <= opValue)) return false; break;
          case '$in': if (!Array.isArray(opValue) || !opValue.includes(objValue)) return false; break;
          case '$nin': if (!Array.isArray(opValue) || opValue.includes(objValue)) return false; break;
          case '$regex':
            const regex = new RegExp(opValue, value.$options || '');
            if (!regex.test(objValue)) return false;
            break;
          case '$exists':
            if (opValue && objValue === undefined) return false;
            if (!opValue && objValue !== undefined) return false;
            break;
          default:
            if (!matchesFilter(objValue || {}, { [op]: opValue })) return false;
        }
      }
    } else {
      if (objValue !== value) return false;
    }
  }
  return true;
}

function resetZeroDBMocks() {
  mockStorage = { tables: {}, vectors: {}, memory: {}, events: [], files: {}, rlhf: [], agentLogs: [] };
  resetIdCounter();
}

function getMockStorage() {
  return mockStorage;
}

function seedMockData(tableName, data) {
  if (!mockStorage.tables[tableName]) {
    mockStorage.tables[tableName] = { schema: {}, rows: [] };
  }
  const rows = data.map(row => ({ id: row.id || generateId(), ...row, createdAt: row.createdAt || new Date().toISOString() }));
  mockStorage.tables[tableName].rows.push(...rows);
}

function clearMockTable(tableName) {
  if (mockStorage.tables[tableName]) {
    mockStorage.tables[tableName].rows = [];
  }
}

function clearAllMockTables() {
  for (const tableName of Object.keys(mockStorage.tables)) {
    mockStorage.tables[tableName].rows = [];
  }
}

function seedMockVectors(vectors) {
  for (const v of vectors) {
    mockStorage.vectors[v.id] = { id: v.id, embedding: v.embedding, metadata: v.metadata || {}, createdAt: v.createdAt || new Date().toISOString() };
  }
}

function seedMockMemory(memories) {
  for (const m of memories) {
    mockStorage.memory[m.key] = { key: m.key, content: m.content, metadata: m.metadata || {}, createdAt: m.createdAt || new Date().toISOString() };
  }
}

function seedMockFiles(files) {
  for (const f of files) {
    const fileId = f.id || generateId();
    mockStorage.files[fileId] = { id: fileId, path: f.path, content: f.content, metadata: f.metadata || {}, size: f.content ? f.content.length : 0, uploadedAt: f.uploadedAt || new Date().toISOString() };
  }
}

module.exports = {
  createZeroDBMocks,
  resetZeroDBMocks,
  getMockStorage,
  seedMockData,
  clearMockTable,
  clearAllMockTables,
  seedMockVectors,
  seedMockMemory,
  seedMockFiles,
  generateId,
  matchesFilter
};
