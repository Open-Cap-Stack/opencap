# AI Agent API Catalog System

This guide explains the API catalog system for AI agents to discover and use AINative Studio APIs.

## 🎯 Purpose

The API catalog system provides:
- **1,968 endpoints** across **49 categories**
- Auto-generated markdown documentation
- Easy browsing by functionality
- Quick reference for AI agents
- Up-to-date API schemas

## 📚 Components

### 1. API Catalog Directory
**Location:** `.ainative/api-catalog/`

Contains:
- `INDEX.md` - Quick navigation index
- `README.md` - Comprehensive guide
- 49 category files (e.g., `authentication.md`, `zerodb.md`, `ai.md`)

### 2. Catalog Generator Script
**Location:** `scripts/catalog_apis.py`

**Features:**
- Fetches live OpenAPI spec from production
- Parses 1,968 endpoints
- Categorizes intelligently
- Generates markdown documentation

**Run manually:**
```bash
python3 scripts/catalog_apis.py
```

### 3. Slash Command
**Command:** `/api-catalog-sync`
**Location:** `.claude/commands/api-catalog-sync.md`

**Usage:**
```bash
/api-catalog-sync
```

This runs the catalog generator and reports results.

### 4. Skill for AI Agents
**Skill:** `api-catalog`
**Location:** `.claude/skills/api-catalog.md`

**Invoke with:**
```bash
/skill api-catalog
```

Provides comprehensive guide on:
- Browsing APIs by category
- Finding specific endpoints
- Integration examples
- Best practices

### 5. Git Hook (Auto-Reminder)
**Location:** `.ainative/hooks/post-commit-api-catalog`

Automatically detects when API files change and reminds you to sync the catalog.

## 🚀 Quick Start for AI Agents

### Step 1: Browse Categories
Open `.ainative/api-catalog/INDEX.md` to see all 49 categories sorted by endpoint count.

### Step 2: Navigate to Category
Find the category you need:
- **Authentication** → `authentication.md`
- **Database** → `zerodb.md`
- **AI/Chat** → `ai.md`
- **Agents** → `agents.md`
- **Storage** → `storage.md`

### Step 3: Find Endpoint
Each category file shows:
- HTTP method (GET, POST, etc.)
- Endpoint path
- Parameters
- Request/response format

### Step 4: Use in Code
Copy the exact endpoint path and use the documented schema.

## 📖 Example Workflows

### Workflow 1: Build Login Feature

```markdown
1. Open: .ainative/api-catalog/authentication.md
2. Find: POST /v1/public/auth/login-json
3. See schema:
   {
     "email": "user@example.com",  # or "username"
     "password": "securepassword"
   }
4. Implement login with this schema
```

### Workflow 2: Store Data in ZeroDB

```markdown
1. Open: .ainative/api-catalog/zerodb.md
2. Find: POST /v1/projects/{project_id}/tables/{table}/rows
3. Use the insert schema
4. Store your data
```

### Workflow 3: Chat Completion

```markdown
1. Open: .ainative/api-catalog/ai.md
2. Find: POST /v1/chat/completions
3. Send messages array
4. Get AI response
```

## 🔄 Keeping Updated

### When to Sync

Run `/api-catalog-sync` when:
- New APIs are deployed
- Endpoints are modified
- You need latest documentation

### Auto-Reminder

The git hook automatically reminds you after commits that modify API files.

## 🔍 Searching

### By Category
Navigate directly to category files.

### By Keyword
```bash
# Search all categories
grep -r "search term" .ainative/api-catalog/

# Search specific category
grep "vector" .ainative/api-catalog/zerodb.md
```

### By HTTP Method
```bash
# All POST endpoints
grep -h "^### \`POST" .ainative/api-catalog/*.md

# All authentication endpoints
cat .ainative/api-catalog/authentication.md
```

## 📊 Categories Overview

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| ZeroDB | 457 | Database, vectors, embeddings |
| Admin | 438 | Administrative operations |
| Public | 337 | Public-facing APIs |
| Agents | 265 | Agent swarms, memory, RLHF |
| Analytics | 110 | Metrics, monitoring |
| AI | 50 | Chat completion, prompts |
| Authentication | 26 | Login, OAuth, tokens |
| Content | 25 | Blog, media management |
| Code Context | 20 | Code analysis |
| Storage | 7 | File operations |
| **Total** | **1,968** | **49 categories** |

## 💡 Tips for Maximum Efficiency

1. **Start with INDEX.md** - Get the big picture
2. **Bookmark common categories** - Authentication, ZeroDB, AI
3. **Use grep for search** - Faster than browsing
4. **Check for deprecation** - Marked with 🚫
5. **Sync after deployments** - Keep docs fresh

## 🛠️ Advanced Usage

### Custom Categories

Edit `scripts/catalog_apis.py`:

```python
CATEGORY_MAPPING = {
    'your_category': ['Tag1', 'Tag2'],
    # ...
}
```

### Filtering Endpoints

Modify `parse_endpoints()` method to filter specific endpoints.

### Integration with CI/CD

Add to your deployment pipeline:

```bash
# In your deploy script
python3 scripts/catalog_apis.py
git add .ainative/api-catalog/
git commit -m "Update API catalog"
```

## 🔗 Related Files

- **Main catalog:** `.ainative/api-catalog/`
- **Generator script:** `scripts/catalog_apis.py`
- **Slash command:** `.claude/commands/api-catalog-sync.md`
- **Skill:** `.claude/skills/api-catalog.md`
- **Hook:** `.ainative/hooks/post-commit-api-catalog`

## 📝 Contributing

When adding new APIs:

1. Add proper OpenAPI documentation
2. Use descriptive tags
3. Run `/api-catalog-sync` after deployment
4. Commit the updated catalog

## 🐛 Troubleshooting

**Q: Catalog is outdated?**
```bash
/api-catalog-sync
```

**Q: Endpoint not found?**
- Check INDEX.md for all categories
- Try grep search
- Check uncategorized.md

**Q: Need more details?**
- See live docs: https://api.ainative.studio/docs
- Check OpenAPI spec directly

---

**Maintained by:** AI Native Studio Core Team
**Auto-generated from:** `https://api.ainative.studio/v1/openapi.json`
**Last updated:** Auto-sync from production
