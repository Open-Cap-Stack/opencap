---
description: View SQL query logs and performance data
---

Access detailed query logs with performance metrics using the ZeroDB MCP server.

**MCP Tool:**
```
zerodb_get_postgres_logs
```

**Parameters:**
- `project_id` (required): Your ZeroDB project ID
- `limit` (optional): Maximum number of log entries (default: 100)
- `query_type` (optional): Filter by query type (SELECT, INSERT, UPDATE, DELETE)

**Returns:**
For each query:
- SQL query text
- Execution time (milliseconds)
- Complexity score
- Credits consumed
- Rows affected
- Timestamp (ISO 8601)
- Query type
- Client/connection information

**Example:**
```javascript
{
  "project_id": "your-project-id",
  "limit": 50,
  "query_type": "SELECT"
}
```

**Use Cases:**
- Identify slow queries for optimization
- Debug query performance issues
- Monitor query patterns and trends
- Audit database activity
- Track credit consumption per query
