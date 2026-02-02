---
description: Provision a dedicated PostgreSQL instance for your project
---

The ZeroDB MCP server provides dedicated PostgreSQL instance provisioning with:

**Available Instance Sizes:**
- **micro-1**: $5/month - 0.25 CPU, 0.25GB RAM, 1GB storage
- **standard-2**: $10/month - 0.5 CPU, 0.5GB RAM, 5GB storage
- **standard-4**: $25/month - 1 CPU, 1GB RAM, 20GB storage
- **performance-8**: $50/month - 2 CPU, 2GB RAM, 50GB storage
- **performance-16**: $100/month - 4 CPU, 4GB RAM, 100GB storage

**MCP Tool:**
```
zerodb_provision_postgres
```

**Parameters:**
- `project_id` (required): Your ZeroDB project ID
- `instance_size` (required): Instance size (see above)
- `postgres_version` (optional): PostgreSQL version (13, 14, 15) - defaults to 15
- `tags` (optional): Array of tags for organization

**Example:**
```javascript
{
  "project_id": "your-project-id",
  "instance_size": "standard-2",
  "postgres_version": "15"
}
```

**Note:** Provisioning typically takes 2-3 minutes. You can check status with `/zerodb-postgres-status`.
