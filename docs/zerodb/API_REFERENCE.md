# ZeroDB API Reference

**Complete API documentation for ZeroDB integration in OpenCap Stack**

Last Updated: 2026-02-02
API Version: v1
Base URL: `https://api.ainative.studio/api/v1`

## Table of Contents

1. [Authentication](#authentication)
2. [Project Management](#project-management)
3. [Database Operations](#database-operations)
4. [Vector Search](#vector-search)
5. [Memory Management](#memory-management)
6. [Event Streaming](#event-streaming)
7. [File Storage](#file-storage)
8. [Error Handling](#error-handling)
9. [Rate Limits](#rate-limits)
10. [OpenCap Service Integration](#opencap-service-integration)

---

## Authentication

All API requests require authentication using a Bearer token in the Authorization header.

### Obtaining an API Token

1. Sign up at https://api.ainative.studio/
2. Navigate to Account Settings
3. Click "Generate API Token"
4. Copy the token and use it in all API requests

### Request Format

```bash
curl -X GET "https://api.ainative.studio/api/v1/endpoint" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Environment Configuration

```bash
# Required environment variables
ZERODB_API_KEY=your_api_key_here
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
ZERODB_PROJECT_ID=your_project_id_here
```

---

## Project Management

### Create Project

**POST** `/projects/`

Creates a new ZeroDB project for your application.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenCap Production",
    "description": "Financial management system"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "OpenCap Production",
  "description": "Financial management system",
  "user_id": "user-uuid",
  "created_at": "2026-02-02T10:30:00.000Z",
  "updated_at": null
}
```

### List Projects

**GET** `/projects/`

Retrieves all projects for the authenticated user.

### Get Database Status

**GET** `/projects/{project_id}/database/status`

Check the status of your database and get usage statistics.

**Response:**
```json
{
  "enabled": true,
  "tables_count": 12,
  "vectors_count": 1500,
  "memory_records_count": 230,
  "events_count": 5400,
  "files_count": 87
}
```

---

## Database Operations

### Create Table

**POST** `/projects/{project_id}/database/tables`

Creates a new table in ZeroDB with specified schema.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/tables" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "table_name": "companies",
    "schema_definition": {
      "id": "uuid",
      "name": "string",
      "type": "string",
      "founded_date": "timestamp",
      "valuation": "number",
      "metadata": "json"
    }
  }'
```

**Supported Data Types:**
- `string` - Text data
- `number` - Numeric values (int or float)
- `boolean` - True/false values
- `timestamp` - Date/time values
- `uuid` - Unique identifiers
- `json` - Complex nested objects
- `array` - Lists of values

### List Tables

**GET** `/projects/{project_id}/database/tables`

Retrieves all tables in the project.

### Insert Row

**POST** `/projects/{project_id}/database/tables/{table_name}/rows`

Inserts a new row into the specified table.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/tables/companies/rows" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corp",
      "type": "C-Corp",
      "founded_date": "2020-01-15T00:00:00Z",
      "valuation": 5000000
    }
  }'
```

### Query Rows

**GET** `/projects/{project_id}/database/tables/{table_name}/rows`

Queries rows from a table with optional filtering.

**Query Parameters:**
- `limit` (integer, optional): Maximum rows to return (default: 100, max: 1000)
- `offset` (integer, optional): Number of rows to skip (default: 0)
- `filter` (json, optional): Filter criteria (e.g., `{"type": "C-Corp"}`)
- `sort` (string, optional): Sort field (e.g., `created_at`)
- `order` (string, optional): Sort order (`asc` or `desc`)

### Update Row

**PUT** `/projects/{project_id}/database/tables/{table_name}/rows/{row_id}`

Updates an existing row in the table.

### Delete Row

**DELETE** `/projects/{project_id}/database/tables/{table_name}/rows/{row_id}`

Deletes a row from the table.

---

## Vector Search

### Upsert Vector

**POST** `/projects/{project_id}/database/vectors/upsert`

Stores or updates a vector embedding with associated metadata.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/vectors/upsert" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vector_embedding": [0.1, 0.2, 0.3, ..., 0.768],
    "namespace": "documents",
    "vector_metadata": {
      "document_id": "doc-123",
      "type": "financial_report"
    },
    "document": "Full text of the document",
    "source": "document_upload"
  }'
```

### Search Vectors

**POST** `/projects/{project_id}/database/vectors/search`

Performs similarity search to find vectors closest to a query vector.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/vectors/search" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query_vector": [0.1, 0.2, 0.3, ..., 0.768],
    "limit": 10,
    "namespace": "documents",
    "filter": {
      "type": "financial_report"
    }
  }'
```

**Response:**
```json
{
  "vectors": [
    {
      "vector_id": "vector-uuid",
      "similarity_score": 0.95,
      "vector_metadata": { ... },
      "document": "Full text..."
    }
  ],
  "total_count": 10,
  "search_time_ms": 15.3
}
```

---

## Memory Management

### Store Memory

**POST** `/projects/{project_id}/database/memory/store`

Stores agent memory for context retention across sessions.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/memory/store" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-uuid",
    "session_id": "session-uuid",
    "role": "user",
    "content": "What is the current valuation of Acme Corp?",
    "memory_metadata": {
      "context": "financial_query"
    }
  }'
```

### List Memory

**GET** `/projects/{project_id}/database/memory`

Retrieves memory records with filtering options.

**Query Parameters:**
- `agent_id` (uuid, optional): Filter by agent
- `session_id` (uuid, optional): Filter by session
- `role` (string, optional): Filter by role
- `limit` (integer, optional): Maximum records (default: 100)

---

## Event Streaming

### Publish Event

**POST** `/projects/{project_id}/database/events/publish`

Publishes an event to the event stream.

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/events/publish" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "financial_transaction",
    "event_payload": {
      "transaction_id": "txn-123",
      "type": "investment",
      "amount": 100000
    }
  }'
```

### List Events

**GET** `/projects/{project_id}/database/events`

Retrieves events from the event stream.

**Query Parameters:**
- `topic` (string, optional): Filter by topic
- `limit` (integer, optional): Maximum events (default: 100)
- `start_time` (timestamp, optional): Filter by start time
- `end_time` (timestamp, optional): Filter by end time

---

## File Storage

### Upload File Metadata

**POST** `/projects/{project_id}/database/files/upload`

Registers file metadata (actual file storage uses S3-compatible storage).

**Request:**
```bash
curl -X POST "https://api.ainative.studio/api/v1/projects/PROJECT_ID/database/files/upload" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_key": "documents/2026/annual_report.pdf",
    "file_name": "annual_report_2025.pdf",
    "content_type": "application/pdf",
    "size_bytes": 2048576,
    "file_metadata": {
      "company_id": "company-123",
      "category": "annual_report"
    }
  }'
```

### List Files

**GET** `/projects/{project_id}/database/files`

Retrieves file metadata records.

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "vector_embedding",
      "reason": "Must be an array of floats"
    }
  }
}
```

---

## Rate Limits

### Current Limits

- **Requests per second**: 100
- **Requests per minute**: 5000
- **Concurrent connections**: 50

### Rate Limit Headers

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4850
X-RateLimit-Reset: 1643800000
```

---

## OpenCap Service Integration

OpenCap Stack includes a built-in ZeroDB service for seamless integration.

### Using the ZeroDB Service

```javascript
const zerodbService = require('./services/zerodbService');

// Initialize
await zerodbService.initialize();

// Create table
await zerodbService.createTable('companies', schema);

// Insert row
await zerodbService.insertRow('companies', data);

// Query rows
const results = await zerodbService.queryTable('companies', { type: 'C-Corp' });

// Vector search
const similar = await zerodbService.searchVectors(queryVector, 10, 'documents');

// Store memory
await zerodbService.storeMemory(agentId, sessionId, 'user', content, metadata);

// Publish event
await zerodbService.publishEvent('transactions', eventPayload);
```

### OpenCap Table Schemas

The following tables are automatically created by OpenCap:

| Table | Description |
|-------|-------------|
| users | User accounts and authentication |
| companies | Company/organization data |
| stakeholders | Shareholders and investors |
| transactions | Financial transactions |
| documents | Document metadata |
| share_classes | Equity share class definitions |
| financial_metrics | Company financial data |
| equity_plans | Equity compensation plans |
| vesting_schedules | Vesting schedule configurations |
| compliance_checks | Regulatory compliance records |
| tax_calculations | Tax calculation records |

---

## Best Practices

### Performance Optimization

1. **Batch Operations**: Group multiple inserts/updates when possible
2. **Use Pagination**: Always paginate large result sets
3. **Cache Results**: Cache frequently accessed data
4. **Index Fields**: Create indexes on frequently queried fields

### Security

1. **Never Expose API Keys**: Keep tokens secure, never commit to git
2. **Use Environment Variables**: Store credentials in .env files
3. **Implement Token Rotation**: Rotate API tokens regularly
4. **Monitor Access**: Track API usage and unusual patterns

### Data Integrity

1. **Validate Input**: Always validate data before sending
2. **Handle Errors**: Implement proper error handling
3. **Use Transactions**: Use atomic operations when possible
4. **Backup Data**: Maintain regular backups

---

## Support

- **Documentation**: https://docs.ainative.studio/
- **API Status**: https://status.ainative.studio/
- **Email**: support@ainative.studio
- **GitHub Issues**: https://github.com/Open-Cap-Stack/opencapstack/issues

---

**API Version**: 1.0
**Last Updated**: 2026-02-02
