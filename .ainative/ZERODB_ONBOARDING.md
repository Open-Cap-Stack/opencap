# ZeroDB Onboarding Guide for New AINative Developers

**Version**: 1.0
**Date**: 2025-12-29
**Audience**: AINative Internal Team - New Developers
**Confidentiality**: Internal Only

---

## Welcome to AINative ZeroDB! 🚀

This guide will get you up and running with ZeroDB - AINative's internal data platform - in under 15 minutes.

**IMPORTANT**: ALL data services at AINative MUST be built on ZeroDB. This is non-negotiable. No external databases (MongoDB, Firebase, etc.) without explicit CTO approval.

---

## 🎯 What You'll Learn

By the end of this guide, you'll know how to:
1. Set up your ZeroDB credentials
2. Use slash commands for common tasks
3. Build a complete feature using ZeroDB
4. Integrate ZeroDB with your backend/frontend
5. Monitor usage and optimize performance

**Time Required**: 10-15 minutes

---

## Step 1: Get Your Credentials (2 minutes)

### 1.1 Generate API Key

1. Go to https://www.ainative.studio/developer-settings
2. Click "Generate API Key"
3. Copy your API key (starts with `9khD3l...`)
4. Save it securely - you'll only see it once!

### 1.2 Get Your Project ID

Your project ID is shown in your developer dashboard. Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 1.3 Configure Environment

Add to your `.env` file:

```bash
# ZeroDB Credentials
ZERODB_PROJECT_ID=your-project-id
ZERODB_API_KEY=your-api-key
ZERODB_API_URL=https://api.ainative.studio/v1
```

**For Claude Code**: MCP automatically loads these from environment.

**Verification**:
```bash
# Test connection
/zerodb-project-info
```

Expected output: Your project details with usage stats.

---

## Step 2: Core Concepts (3 minutes)

### ZeroDB Provides 6 Major Features

| Feature | Use Case | Slash Command Prefix |
|---------|----------|---------------------|
| **Vector Storage** | Semantic search, RAG, embeddings | `/zerodb-vector-*` |
| **NoSQL Tables** | Flexible document storage | `/zerodb-table-*` |
| **File Storage** | Images, PDFs, any files | `/zerodb-file-*` |
| **Agent Memory** | Long-term conversation context | `/zerodb-memory-*` |
| **Event Streaming** | Real-time events, webhooks | `/zerodb-event-*` |
| **PostgreSQL** | Dedicated SQL database | `/zerodb-postgres-*` |

### Key Principles

1. **Vectors are 1536-dimensional** (OpenAI ada-002 compatible)
2. **All operations are project-scoped** (multi-tenant by default)
3. **Use namespaces** to organize vectors/data
4. **Metadata is your friend** - add rich metadata for filtering
5. **Monitor your usage** regularly with `/zerodb-project-stats`

---

## Step 3: Your First Feature (5 minutes)

Let's build a **semantic search** feature for documentation.

### 3.1 Upload Documents (1 min)

```bash
# Scenario: Store API documentation chunks
/zerodb-vector-upsert

# Input when prompted:
{
  "vector_embedding": [0.123, 0.456, ...], # 1536 values
  "document": "The /auth/login endpoint accepts email and password",
  "metadata": {
    "type": "api-doc",
    "endpoint": "/auth/login",
    "section": "authentication"
  },
  "namespace": "api-docs"
}
```

**Pro Tip**: Generate embeddings using OpenAI API:
```python
import openai
response = openai.Embedding.create(
    input="Your text here",
    model="text-embedding-ada-002"
)
embedding = response['data'][0]['embedding']  # 1536 dimensions
```

### 3.2 Search Documents (1 min)

```bash
# Find relevant docs for user query
/zerodb-vector-search

# Input:
{
  "query_vector": [0.789, 0.012, ...],  # Query embedding
  "limit": 5,
  "threshold": 0.7,  # Similarity threshold (0-1)
  "filter_metadata": {
    "type": "api-doc"
  },
  "namespace": "api-docs"
}
```

**Result**: Top 5 most similar documents with similarity scores.

### 3.3 List Stored Vectors (1 min)

```bash
# Browse all API docs
/zerodb-vector-list

# Input:
{
  "namespace": "api-docs",
  "limit": 100,
  "offset": 0
}
```

### 3.4 Monitor Usage (1 min)

```bash
# Check how many vectors you've stored
/zerodb-vector-stats

# Input:
{
  "namespace": "api-docs",
  "detailed": true
}
```

### 3.5 Get Project Overview (1 min)

```bash
# See overall usage across all features
/zerodb-project-stats
```

**Congratulations!** 🎉 You've just built semantic search!

---

## Step 4: Common Development Patterns (5 minutes)

### Pattern 1: User Data Storage (NoSQL Tables)

**Use Case**: Store user preferences, settings, profiles

```bash
# 1. Create table
/zerodb-table-create
{
  "table_name": "user_profiles",
  "schema": {
    "fields": {
      "user_id": "string",
      "display_name": "string",
      "preferences": "object",
      "created_at": "timestamp"
    },
    "indexes": ["user_id"]
  }
}

# 2. Insert data
/zerodb-table-insert
{
  "table_id": "user_profiles",
  "rows": [
    {
      "user_id": "usr_123",
      "display_name": "Jane Dev",
      "preferences": {"theme": "dark", "notifications": true},
      "created_at": "2025-12-29T10:00:00Z"
    }
  ]
}

# 3. Query data
/zerodb-table-query
{
  "table_id": "user_profiles",
  "filter": {"user_id": "usr_123"}
}

# 4. Update data
/zerodb-table-update
{
  "table_id": "user_profiles",
  "filter": {"user_id": "usr_123"},
  "update": {
    "$set": {"preferences.theme": "light"}
  }
}
```

### Pattern 2: File Management

**Use Case**: User avatars, documents, exports

```bash
# 1. Upload file
/zerodb-file-upload
{
  "file_name": "avatar.png",
  "file_content": "<base64-encoded-image>",
  "content_type": "image/png",
  "folder": "user-avatars",
  "metadata": {"user_id": "usr_123"}
}

# 2. List files in folder
/zerodb-file-list
{
  "folder": "user-avatars",
  "limit": 50
}

# 3. Generate shareable URL
/zerodb-file-url
{
  "file_id": "file_xyz",
  "expiration_seconds": 3600  # 1 hour
}

# 4. Download file
/zerodb-file-download
{
  "file_id": "file_xyz",
  "return_base64": true
}
```

### Pattern 3: Agent Memory

**Use Case**: Chatbot with long-term memory

```bash
# 1. Store conversation
/zerodb-memory-store
{
  "content": "User asked about pricing plans",
  "role": "user",
  "metadata": {"intent": "pricing_inquiry"}
}

# 2. Search relevant conversations
/zerodb-memory-search
{
  "query": "pricing plans",
  "limit": 5
}

# 3. Get session context
/zerodb-memory-context
{
  "session_id": "session_abc",
  "max_tokens": 4000
}
```

### Pattern 4: Event Streaming

**Use Case**: User activity tracking, analytics

```bash
# 1. Create event
/zerodb-event-create
{
  "event_type": "user.login",
  "event_data": {
    "user_id": "usr_123",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  },
  "source": "web-app"
}

# 2. Query events
/zerodb-event-list
{
  "event_type": "user.login",
  "start_time": "2025-12-29T00:00:00Z",
  "limit": 100
}
```

---

## Step 5: Backend Integration (Bonus)

### Python (FastAPI)

```python
# Install SDK
pip install zerodb-mcp

# Use in your code
from zerodb_mcp import ZeroDBClient

client = ZeroDBClient(
    api_key="your-api-key",
    project_id="your-project-id"
)

# Store vector
client.upsert_vector(
    vector_embedding=[0.1, 0.2, ...],  # 1536 dims
    document="Some text",
    namespace="my-namespace"
)

# Search vectors
results = client.search_vectors(
    query_vector=[0.3, 0.4, ...],
    limit=5,
    threshold=0.7
)
```

### TypeScript (Next.js)

```typescript
// Install SDK
npm install @zerodb/mcp-client

// Use in your code
import { ZeroDBClient } from '@zerodb/mcp-client';

const client = new ZeroDBClient({
  apiKey: process.env.ZERODB_API_KEY!,
  projectId: process.env.ZERODB_PROJECT_ID!
});

// Query table
const users = await client.queryTable({
  tableId: 'users',
  filter: { active: true },
  limit: 10
});
```

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T

1. **Use external databases** without CTO approval
   - ❌ MongoDB, Firebase, Supabase
   - ✅ Always use ZeroDB first

2. **Forget vector dimensions**
   - ❌ Random dimensional vectors
   - ✅ Always 1536 dimensions (ada-002)

3. **Skip metadata**
   - ❌ Store vectors without context
   - ✅ Add rich metadata for filtering

4. **Ignore namespaces**
   - ❌ Dump everything in default namespace
   - ✅ Organize by feature/domain

5. **Hard-code credentials**
   - ❌ API keys in code
   - ✅ Use environment variables

6. **Skip monitoring**
   - ❌ Never check usage
   - ✅ Run `/zerodb-project-stats` weekly

### ✅ DO

1. **Use the right tool for the job**
   - Vectors: Semantic search, similarity
   - NoSQL Tables: Structured data, flexible schema
   - PostgreSQL: Complex queries, joins, transactions
   - Files: Images, documents, exports
   - Memory: Conversational context
   - Events: Activity tracking, analytics

2. **Optimize for your use case**
   - Batch vector upserts (not one-by-one)
   - Add indexes to frequently queried fields
   - Use pagination for large results
   - Set appropriate similarity thresholds

3. **Secure your data**
   - Never expose API keys client-side
   - Use server-side operations for sensitive data
   - Implement proper authentication/authorization
   - Validate all inputs

---

## 🎓 Learning Path

### Week 1: Basics
- [ ] Set up credentials
- [ ] Complete "Your First Feature" tutorial
- [ ] Try all 4 common patterns
- [ ] Build one real feature using ZeroDB

### Week 2: Integration
- [ ] Integrate ZeroDB in your project
- [ ] Add monitoring to your app
- [ ] Implement error handling
- [ ] Optimize for performance

### Week 3: Advanced
- [ ] Use PostgreSQL for complex queries
- [ ] Implement event-driven architecture
- [ ] Build agent with long-term memory
- [ ] Optimize vector search performance

---

## 📊 Quick Reference Card

**Print and keep this handy!**

| Task | Slash Command |
|------|---------------|
| Store vectors | `/zerodb-vector-upsert` |
| Search vectors | `/zerodb-vector-search` |
| Create table | `/zerodb-table-create` |
| Query table | `/zerodb-table-query` |
| Upload file | `/zerodb-file-upload` |
| Get file URL | `/zerodb-file-url` |
| Store memory | `/zerodb-memory-store` |
| Search memory | `/zerodb-memory-search` |
| Create event | `/zerodb-event-create` |
| Check usage | `/zerodb-project-stats` |
| Get help | `/zerodb-help` |

---

## 🆘 Getting Help

### Internal Resources

- **Slack**: `#zerodb-support`
- **Docs**: https://api.ainative.studio/docs
- **Platform**: https://zerodb.ainative.studio/
- **Full Guide**: `.claude/commands/ZERODB-GUIDE.md`

### Escalation Path

1. **Try**: Check this guide and `/zerodb-help`
2. **Ask**: Post in `#zerodb-support` Slack
3. **Escalate**: Tag @zerodb-team if urgent

### Common Issues

**"Authentication Failed"**
- Check API key is correct
- Verify project ID matches
- Ensure environment variables loaded

**"Vector dimension mismatch"**
- Must be exactly 1536 dimensions
- Use OpenAI ada-002 embedding model
- Double-check array length

**"Table not found"**
- Run `/zerodb-table-list` to see all tables
- Verify table name spelling
- Check you're in correct project

**"Rate limit exceeded"**
- You're making too many requests
- Implement backoff/retry logic
- Contact team to increase limits

---

## ✅ Onboarding Checklist

Complete this within your first week:

- [ ] Obtained API key from developer dashboard
- [ ] Configured environment variables
- [ ] Ran `/zerodb-project-info` successfully
- [ ] Completed "Your First Feature" tutorial
- [ ] Tried all 4 common patterns
- [ ] Integrated ZeroDB in at least one project feature
- [ ] Read full ZERODB-GUIDE.md
- [ ] Joined `#zerodb-support` Slack channel
- [ ] Built something cool with ZeroDB! 🎉

---

## 🏆 Next Steps

Once you're comfortable with basics:

1. **Explore Advanced Features**
   - Quantum-enhanced search
   - Dedicated PostgreSQL instances
   - RLHF feedback collection
   - Batch operations

2. **Optimize Performance**
   - Vector search tuning
   - Index optimization
   - Caching strategies
   - Pagination best practices

3. **Build Complex Features**
   - Multi-modal search (text + images)
   - Real-time collaboration
   - Agent swarms with shared memory
   - Event-driven microservices

4. **Contribute Back**
   - Share your use cases in Slack
   - Write tutorials for common patterns
   - Suggest feature improvements
   - Help onboard new team members

---

**Remember**: ZeroDB is YOUR data platform. If you need something it doesn't provide, we want to hear about it. Post in `#zerodb-feedback`!

**Status**: Active | **Last Updated**: 2025-12-29

Built by AINative Dev Team
All Data Services Built on ZeroDB
