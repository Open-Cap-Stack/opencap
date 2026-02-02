# ZeroDB Service Documentation

## Overview

The ZeroDB Service (`services/zerodbService.js`) is the primary interface for interacting with ZeroDB, providing a unified API for table operations, vector search, memory management, event streaming, and file storage.

## Core Functionality

### Initialization

```javascript
const zerodbService = require('./services/zerodbService');

// Initialize with API token
await zerodbService.initialize(apiToken);
```

### Table Operations

#### Create Table

```javascript
await zerodbService.createTable('companies', {
  id: 'uuid',
  name: 'string',
  type: 'string',
  founded_date: 'timestamp',
  valuation: 'number'
});
```

#### Insert Data

```javascript
await zerodbService.insertRow('companies', {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Acme Corp',
  type: 'C-Corp',
  founded_date: new Date().toISOString(),
  valuation: 5000000
});
```

#### Query Data

```javascript
const results = await zerodbService.queryTable('companies', {
  filter: { type: 'C-Corp' },
  limit: 10
});
```

#### Update Data

```javascript
await zerodbService.updateRow('companies', rowId, {
  valuation: 10000000
});
```

#### Delete Data

```javascript
await zerodbService.deleteRow('companies', rowId);
```

### Vector Search

```javascript
// Upsert vector embeddings
await zerodbService.upsertVector({
  id: 'doc123',
  vector: [0.1, 0.2, 0.3, /* ... */],
  metadata: {
    documentType: 'financial_report',
    companyId: 'company123'
  }
});

// Search for similar vectors
const results = await zerodbService.searchVectors({
  vector: [0.1, 0.2, 0.3, /* ... */],
  topK: 10,
  filter: { documentType: 'financial_report' }
});
```

### Memory Management

```javascript
// Store agent memory
await zerodbService.storeMemory({
  sessionId: 'session123',
  content: 'User discussed Q3 financial projections',
  context: { userId: 'user123', timestamp: Date.now() }
});

// Retrieve memory
const memories = await zerodbService.searchMemory('financial projections', {
  sessionId: 'session123',
  limit: 5
});
```

### Event Streaming

```javascript
// Publish event
await zerodbService.publishEvent('financial.report.generated', {
  reportId: 'report123',
  companyId: 'company123',
  timestamp: Date.now()
});

// List events
const events = await zerodbService.listEvents({
  eventType: 'financial.report.generated',
  startTime: Date.now() - 86400000 // Last 24 hours
});
```

### File Storage

```javascript
// Upload file
const fileResult = await zerodbService.uploadFile({
  filename: 'report.pdf',
  content: fileBuffer,
  contentType: 'application/pdf',
  metadata: { companyId: 'company123' }
});

// Get file URL
const fileUrl = await zerodbService.getFileUrl(fileResult.fileId);

// Download file
const fileContent = await zerodbService.downloadFile(fileResult.fileId);
```

## Error Handling

The ZeroDB Service throws structured errors that can be caught and handled:

```javascript
try {
  await zerodbService.queryTable('companies', {});
} catch (error) {
  if (error.statusCode === 401) {
    console.error('Authentication failed');
  } else if (error.statusCode === 404) {
    console.error('Table not found');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Best Practices

### Connection Management

- Initialize the service once at application startup
- Reuse the same service instance throughout your application
- The service handles connection pooling automatically

### Performance Optimization

- Use batch operations when inserting multiple records
- Implement caching for frequently accessed data
- Use pagination for large result sets
- Create indexes on frequently queried fields

### Security

- Never expose API keys in client-side code
- Use environment variables for sensitive configuration
- Implement rate limiting for public APIs
- Validate and sanitize all user input

### Error Recovery

- Implement retry logic for transient failures
- Use circuit breakers for external dependencies
- Log errors with sufficient context for debugging
- Monitor error rates and set up alerts

## Configuration

The service is configured via environment variables:

```bash
ZERODB_API_KEY=your_api_key
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
ZERODB_PROJECT_ID=your_project_id
```

## Integration with Other Services

### Database Adapter

The ZeroDB Service works with the Database Adapter to provide unified access to both ZeroDB and MongoDB during migration:

```javascript
const databaseAdapter = require('./services/databaseAdapter');

// Adapter automatically routes to appropriate database
const companies = await databaseAdapter.query('companies', {});
```

### Sync Orchestrator

During bidirectional sync, the Sync Orchestrator uses ZeroDB Service for all write operations:

```javascript
const syncOrchestrator = require('./services/syncOrchestrator');

// Sync automatically uses zerodbService
await syncOrchestrator.startSync();
```

## Troubleshooting

See [Troubleshooting Guide](./troubleshooting.md) for common issues and solutions.

## Additional Resources

- [ZeroDB API Reference](./zerodb-api-reference.md)
- [Migration Guide](./zerodb-migration-guide.md)
- [Performance Tuning](./performance-tuning.md)
- [MongoDB-ZeroDB Sync](./mongodb-zerodb-sync.md)
