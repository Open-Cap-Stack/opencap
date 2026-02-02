---
description: Check the status of your dedicated PostgreSQL instance
---

Get detailed status and metrics for your PostgreSQL instance using the ZeroDB MCP server.

**MCP Tool:**
```
zerodb_get_postgres_status
```

**Parameters:**
- `project_id` (required): Your ZeroDB project ID

**Returns:**
- Status: provisioning, active, maintenance, error
- Resource usage: CPU, memory, storage
- Connection count and performance metrics
- Billing information and monthly cost
- Health check status
- Last health check timestamp

**Instance States:**
- **provisioning**: Instance is being created (typically 2-3 minutes)
- **active**: Instance is running and ready for connections
- **maintenance**: Scheduled maintenance in progress
- **error**: Issue with the instance (check error_message field)

**Example:**
```javascript
{
  "project_id": "your-project-id"
}
```
