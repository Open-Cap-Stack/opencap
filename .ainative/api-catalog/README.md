# AINative Studio API Catalog for AI Agents

This directory contains auto-generated API documentation organized by category to help AI agents discover and use AINative Studio APIs.

## 📊 Stats

- **Total Endpoints:** 1,968
- **Categories:** 49
- **API Version:** 1.0.0
- **Source:** `https://api.ainative.studio/v1/openapi.json`

## 🚀 Quick Start

### For AI Agents

1. **Browse by category** - Open `INDEX.md` to see all categories
2. **Find your endpoint** - Navigate to the relevant category file
3. **Use the documentation** - Each endpoint includes:
   - HTTP method and path
   - Parameters and request body
   - Response format
   - Examples

### For Developers

**Sync the catalog:**
```bash
# Using slash command (recommended)
/api-catalog-sync

# Or manually
python3 scripts/catalog_apis.py
```

**Search for endpoints:**
```bash
# Find all authentication endpoints
grep -r "POST.*auth" .

# Search for specific functionality
grep -r "vector.*search" .
```

## 📁 Directory Structure

```
.ainative/api-catalog/
├── README.md                 # This file
├── INDEX.md                  # Quick navigation to all categories
│
├── Core Categories:
├── authentication.md         # Login, OAuth, tokens (26 endpoints)
├── zerodb.md                 # Database, vectors (457 endpoints)
├── agents.md                 # Agent swarms, memory (265 endpoints)
├── ai.md                     # Chat, prompts (50 endpoints)
├── admin.md                  # Admin operations (438 endpoints)
├── public.md                 # Public APIs (337 endpoints)
├── analytics.md              # Metrics (110 endpoints)
│
├── Development Tools:
├── code-context-engine.md    # Code analysis
├── debugging.md              # Debug tools
├── git-context.md            # Git operations
│
├── Content & Media:
├── content.md                # Blog, media
├── storage.md                # File operations
│
└── ... (41 more categories)
```

## 🎯 Common Use Cases

### Building Authentication

```
1. Open: authentication.md
2. Find: POST /v1/public/auth/login-json
3. Use the schema to implement login
```

### Storing Data in ZeroDB

```
1. Open: zerodb.md
2. Find: POST /v1/projects/{project_id}/tables/{table}/rows
3. Insert data using the documented format
```

### Using Chat Completion

```
1. Open: ai.md
2. Find: POST /v1/chat/completions
3. Send messages to get AI responses
```

### Vector Search

```
1. Open: zerodb.md
2. Find: POST /v1/projects/{project_id}/vectors/search
3. Search for similar vectors
```

## 🔄 Keeping Up-to-Date

### Automatic Updates (Recommended)

A git hook is installed that detects API changes and reminds you to sync:

```bash
# When you commit changes to API files, you'll see:
🔔 API files were modified in this commit!
   Consider updating the API catalog for agents:

   Run: /api-catalog-sync
```

### Manual Updates

Run whenever APIs change:

```bash
python3 scripts/catalog_apis.py
```

## 📖 Documentation Format

Each endpoint is documented with:

### Endpoint Header
```markdown
### `GET /v1/endpoint/path`

**Summary:** Brief description
```

### Parameters
```markdown
**Parameters:**
- `param_name` (query) *(required)*: Description
```

### Request Body
```markdown
**Request Body:** JSON

{
  "field": "value"
}
```

### Response
```markdown
**Success Response (200):** Description

{
  "result": "data"
}
```

## 🔍 Searching the Catalog

### By Category
Navigate to specific category files based on your task.

### By Keyword
```bash
# Search all files
grep -r "keyword" .ainative/api-catalog/

# Search specific category
grep "POST" .ainative/api-catalog/authentication.md
```

### By HTTP Method
```bash
# Find all POST endpoints
grep -h "^### \`POST" .ainative/api-catalog/*.md

# Find all GET endpoints
grep -h "^### \`GET" .ainative/api-catalog/*.md
```

## 🛠️ Customization

### Adding Categories

The catalog generator automatically categorizes endpoints. To customize:

1. Edit `scripts/catalog_apis.py`
2. Update the `CATEGORY_MAPPING` dictionary
3. Re-run the catalog generator

### Filtering Endpoints

To include only specific endpoints:

1. Modify the `parse_endpoints()` method
2. Add filtering logic
3. Regenerate the catalog

## 📝 Contributing

When adding new API endpoints:

1. Ensure they have proper OpenAPI documentation
2. Use descriptive `summary` and `description` fields
3. Add appropriate `tags` for categorization
4. Run `/api-catalog-sync` after deployment

## 🔗 Related Resources

- **Live API Docs:** `https://api.ainative.studio/docs`
- **OpenAPI Spec:** `https://api.ainative.studio/v1/openapi.json`
- **Slash Command:** `/api-catalog-sync`
- **Skill:** See `.claude/skills/api-catalog.md`

## 💡 Tips for AI Agents

1. **Start with INDEX.md** - Get an overview of all categories
2. **Check authentication first** - Most endpoints require auth
3. **Use category files** - Organized by functionality
4. **Copy exact paths** - Include method (GET, POST, etc.)
5. **Check for deprecation** - Marked with 🚫 in docs
6. **Sync regularly** - APIs change, keep docs fresh

## 🐛 Troubleshooting

**Q: Endpoint not found?**
- Check INDEX.md for all categories
- Try searching with grep
- Run `/api-catalog-sync` to refresh

**Q: Documentation incomplete?**
- Check the live API docs at `/docs`
- Endpoint might be new or undocumented
- Update the OpenAPI spec in the backend

**Q: Category missing?**
- Endpoint might be in "uncategorized.md"
- Add appropriate tags to the endpoint
- Re-run the catalog generator

---

**Generated by:** `scripts/catalog_apis.py`
**Last Sync:** Auto-generated from OpenAPI spec
**Maintained by:** AI Native Studio Core Team
