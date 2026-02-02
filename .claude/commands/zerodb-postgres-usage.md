---
description: Get usage statistics and billing for your PostgreSQL instance
---

View comprehensive usage metrics and billing information using the ZeroDB MCP server.

**MCP Tool:**
```
zerodb_get_postgres_usage
```

**Parameters:**
- `project_id` (required): Your ZeroDB project ID
- `hours` (optional): Time range in hours (default: 24)

**Returns:**
- Total queries executed in time period
- Total credits consumed
- Average query execution time (milliseconds)
- Top query types and patterns (SELECT, INSERT, UPDATE, DELETE)
- Connection utilization metrics
- Storage usage (GB)
- Estimated monthly cost (USD)

**Example:**
```javascript
{
  "project_id": "your-project-id",
  "hours": 24
}
```

**Credit Billing:**
Queries are billed based on complexity and execution time. Usage is tracked in real-time and billed monthly.
