---
description: Get connection details for your dedicated PostgreSQL instance
---

Get direct connection credentials for your dedicated PostgreSQL instance using the ZeroDB MCP server.

**MCP Tool:**
```
zerodb_get_postgres_connection
```

**Parameters:**
- `project_id` (required): Your ZeroDB project ID
- `credential_type` (optional): "primary" (default), "readonly", or "admin"

**Returns:**
- `database_url`: Full connection string
- `host`, `port`, `database`: Individual connection parameters
- `username`, `password`: Credentials for the specified type
- `connection_string`: Ready-to-use connection string

**Example:**
```javascript
{
  "project_id": "your-project-id",
  "credential_type": "primary"
}
```

**Use with any PostgreSQL client:**
```bash
# Using psql
psql postgresql://username:password@host:port/database

# Using connection parameters
psql -h host -p port -U username -d database
```

Works with Python (psycopg2), Node.js (pg), and any PostgreSQL-compatible ORM (SQLAlchemy, Sequelize, Prisma, etc.).
