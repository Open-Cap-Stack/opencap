---
name: api-catalog
description: |
  AI Agent API Catalog Management - Browse, search, and use AINative Studio APIs.
  Use when (1) Building features that need API integration, (2) Searching for specific endpoints,
  (3) Understanding API capabilities, (4) Generating code that calls APIs, (5) Syncing API documentation.
location: project
---

# AINative Studio API Catalog for AI Agents

## Overview

The AINative Studio API catalog provides **1,968 endpoints** across **49 categories** for building AI-native applications.

## Quick Start for Agents

### 1. Browse by Category

The catalog is organized into these main categories:

**🗄️ Database & Storage (457 endpoints)**
- [ZeroDB](/.ainative/api-catalog/zerodb.md) - Vector database, PostgreSQL, embeddings
- [Storage](/.ainative/api-catalog/storage.md) - File upload, download, management

**🤖 AI & Agents (365 endpoints)**
- [Agents](/.ainative/api-catalog/agents.md) - Agent swarms, memory, RLHF
- [AI](/.ainative/api-catalog/ai.md) - Chat completion, prompt engineering

**👤 User & Admin (464 endpoints)**
- [Admin](/.ainative/api-catalog/admin.md) - Administrative operations
- [Public](/.ainative/api-catalog/public.md) - Public-facing APIs
- [Authentication](/.ainative/api-catalog/authentication.md) - Login, OAuth, tokens

**📊 Analytics & Monitoring (110 endpoints)**
- [Analytics](/.ainative/api-catalog/analytics.md) - Metrics, performance tracking

**💻 Development Tools**
- [Code Context Engine](/.ainative/api-catalog/code-context-engine.md) - Code analysis
- [Debugging](/.ainative/api-catalog/debugging.md) - Debug tools
- [Git Context](/.ainative/api-catalog/git-context.md) - Git operations

**🎨 Content & Media**
- [Content](/.ainative/api-catalog/content.md) - Blog, media management
- [Chapter Markers](/.ainative/api-catalog/chapter-markers.md) - Video chapters

### 2. Finding Endpoints

**By Task:**
- Need authentication? → `authentication.md`
- Building an agent? → `agents.md`
- Storing data? → `zerodb.md`
- Analytics? → `analytics.md`

**By HTTP Method:**
Each category file shows endpoints organized by method (GET, POST, PUT, DELETE, PATCH)

### 3. Using the Catalog

**Example: Building a login feature**

1. Open `.ainative/api-catalog/authentication.md`
2. Find `POST /v1/public/auth/login-json`
3. Review the endpoint documentation:
   - Parameters needed
   - Request body format
   - Success response
4. Generate code using the schema

**Example: Storing vectors**

1. Open `.ainative/api-catalog/zerodb.md`
2. Search for "vector" endpoints
3. Find vector upsert/search operations
4. Use the documented schemas

## Common Workflows

### For Building Features

```markdown
1. Identify the category (e.g., "authentication", "agents", "storage")
2. Open the category file: `.ainative/api-catalog/{category}.md`
3. Browse available endpoints
4. Use the request/response schemas to generate code
```

### For Debugging

```markdown
1. Check `.ainative/api-catalog/debugging.md` for debug endpoints
2. Use performance monitoring endpoints in `analytics.md`
3. Review error handling in endpoint documentation
```

### For Integration

```markdown
1. Start with authentication.md to implement login
2. Use public.md for public-facing features
3. Reference zerodb.md for data storage
4. Add analytics.md endpoints for tracking
```

## API Catalog Structure

```
.ainative/api-catalog/
├── INDEX.md                      # Main navigation index
├── authentication.md             # 26 auth endpoints
├── zerodb.md                     # 457 database endpoints
├── agents.md                     # 265 agent endpoints
├── ai.md                         # 50 AI/chat endpoints
├── admin.md                      # 438 admin endpoints
├── public.md                     # 337 public endpoints
├── analytics.md                  # 110 analytics endpoints
├── storage.md                    # 7 storage endpoints
└── ... (41 more categories)
```

## Syncing the Catalog

When APIs change, sync the catalog:

```bash
/api-catalog-sync
```

Or manually:

```bash
python3 scripts/catalog_apis.py
```

This fetches the latest OpenAPI spec and regenerates all documentation.

## Integration Examples

### Example 1: User Registration

```python
# From authentication.md
POST /v1/public/auth/register

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

### Example 2: Vector Search

```python
# From zerodb.md
POST /v1/projects/{project_id}/vectors/search

{
  "vector": [0.1, 0.2, 0.3, ...],
  "limit": 10,
  "filters": {}
}
```

### Example 3: Chat Completion

```python
# From ai.md
POST /v1/chat/completions

{
  "messages": [{"role": "user", "content": "Hello"}],
  "model": "claude-3-sonnet",
  "max_tokens": 1000
}
```

## Best Practices for Agents

1. **Always check authentication first** - Most endpoints require auth
2. **Use the INDEX.md** - Quick overview of all categories
3. **Reference the exact endpoint** - Include method and path in your code
4. **Handle errors** - Check response codes in documentation
5. **Sync regularly** - Run `/api-catalog-sync` when APIs change

## Troubleshooting

**Q: Can't find an endpoint?**
- Check INDEX.md for all categories
- Search within category files (Ctrl+F)
- Endpoint might be in "uncategorized.md"

**Q: Endpoint documentation missing details?**
- Run `/api-catalog-sync` to refresh
- Check the live API docs at `/docs`

**Q: Need authentication?**
- See `authentication.md` for login endpoints
- Use Bearer token in Authorization header

## Advanced Usage

### Searching Across All Endpoints

```bash
# Search for specific keyword across all categories
grep -r "vector" .ainative/api-catalog/

# Find all POST endpoints
grep -h "^### \`POST" .ainative/api-catalog/*.md
```

### Generating Client Code

The catalog provides schemas you can use to:
- Generate TypeScript types
- Create Python client libraries
- Build API wrappers for specific languages

## Quick Reference

| Category | File | Endpoints | Use For |
|----------|------|-----------|---------|
| ZeroDB | zerodb.md | 457 | Database, vectors, embeddings |
| Admin | admin.md | 438 | Admin operations |
| Public | public.md | 337 | Public-facing features |
| Agents | agents.md | 265 | Agent swarms, memory |
| Analytics | analytics.md | 110 | Metrics, monitoring |
| AI | ai.md | 50 | Chat, prompts, models |
| Auth | authentication.md | 26 | Login, OAuth, tokens |
| Content | content.md | 25 | Blog, media |
| Storage | storage.md | 7 | File operations |

---

**Total: 1,968 endpoints across 49 categories**

*For the latest updates, run `/api-catalog-sync`*
