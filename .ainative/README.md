# .ainative Directory

**Purpose**: Project context and configuration for AI coding assistants
**Compatible With**: Gemini CLI, Claude Code, Cursor, Windsurf, and other AI tools
**Last Updated**: 2026-02-02

---

## Quick Start

### For Gemini CLI Users

```bash
# Navigate to project
cd /Users/juweriya/Desktop/opencapstack

# Start Gemini CLI (automatically loads .ainative/settings.json)
gemini

# Verify context loaded
@memory What is this project?
```

### For Claude Code Users

```bash
# Open project (automatically reads CLAUDE.md and .ainative/)
claude /Users/juweriya/Desktop/opencapstack
```

### For Other AI Tools

1. Read `AINATIVE.md` for complete project context
2. Review `settings.json` for configuration details
3. Follow rules in `RULES.MD`

---

## Directory Structure

```
.ainative/
├── README.md                        # This file (quick reference)
├── AINATIVE.md                      # Complete project context
├── RULES.MD                         # Development rules and standards
├── settings.json                    # Gemini CLI-compatible settings
├── api-catalog/                     # API endpoint documentation
├── commands/                        # AI command definitions
├── hooks/                           # Git hooks
├── rules/                           # Additional rule files
└── skills -> ../.claude/skills      # Symlink to Claude skills
```

---

## File Descriptions

### AINATIVE.md
**Primary project context file** containing:
- Project overview and tech stack
- Repository paths
- Architecture and structure
- Development workflow (SSCS)
- Git rules (ZERO TOLERANCE for AI attribution)
- Testing strategy
- Environment variables
- Key file references

**When to read**: Always load first for project understanding

### settings.json
**Gemini CLI configuration** following their schema:
- Project metadata
- Path configurations
- Context file references
- Model settings
- Tool permissions
- Security policies
- MCP server integrations
- Development settings
- Testing configuration

**When to read**: For tool configuration and security settings

### RULES.MD
**Complete development rules** including:
- Backlog rules (Shortcut-first)
- Story types & estimation (Fibonacci)
- Coding style guidelines
- Testing strategy (TDD/BDD)
- CI/CD rules
- Git & PR etiquette
- File placement rules
- Database schema management

**When to read**: Before making any code changes

---

## Key Project Paths

### Repository Root
```
/Users/juweriya/Desktop/opencapstack
```

### Important Directories
| Directory | Purpose |
|-----------|---------|
| `controllers/` | Express route controllers |
| `models/` | Mongoose schemas |
| `routes/` | API route definitions |
| `services/` | Business logic |
| `tests/` | Jest test files |
| `e2e/` | Playwright E2E tests |
| `docs/` | Documentation |
| `scripts/` | Utility scripts |

---

## Important Rules

### ZERO TOLERANCE: AI Attribution
**NEVER include in commits, PRs, or issues:**
- ❌ "Claude", "Anthropic", "claude.com"
- ❌ "Gemini", "Google AI"
- ❌ "Generated with [AI Tool]"
- ❌ "Co-Authored-By: [AI Tool]"
- ❌ Any AI tool attribution

### Pre-Commit Checklist
1. ✅ `npm run lint` - must pass
2. ✅ `npm test` - must pass
3. ✅ Coverage >= 80% for new features
4. ✅ No AI attribution in commits

### Branch Naming
- `feature/OCAE-XXX-description`
- `bug/OCAE-XXX-description`
- `chore/OCAE-XXX-description`

---

## Context Loading Order

1. **Primary**: `.ainative/AINATIVE.md` (project fundamentals)
2. **Claude-specific**: `CLAUDE.md` (root directory)
3. **Rules**: `.ainative/RULES.MD` (development standards)
4. **Documentation**:
   - `docs/DataModels.md`
   - `docs/API_Documentation_Sprint1.md`
   - `docs/Backend_Completion_Plan.md`

---

## Common Tasks

### Start Development
```bash
npm run dev              # Start backend with nodemon
npm run frontend:dev     # Start frontend dev server
npm run dev:full         # Run both concurrently
```

### Verify Code Quality
```bash
npm run lint             # ESLint
npm test                 # Run Jest tests
npm run test:coverage    # With coverage report
npm run test:e2e         # Playwright E2E tests
```

### Database Operations
```bash
# Start MongoDB (Docker)
docker-compose up -d mongo

# Or locally
mongod --dbpath /data/db
```

---

## MCP Servers Available

1. **ZeroDB** - Vector database, embeddings, agent memory
2. **GitHub** - GitHub API integration, issues, PRs

See `.claude/mcp.json.example` for MCP configuration.

---

## Environment Setup

### Required Variables
```bash
MONGODB_URI=mongodb://localhost:27017/opencap
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Optional Variables
```bash
DATABASE_URL=postgresql://...   # PostgreSQL
NEO4J_URI=bolt://localhost:7687 # Neo4j
ANTHROPIC_API_KEY=sk-ant-...    # AI services
```

---

## Quick Reference

| What | Where |
|------|-------|
| Project context | `.ainative/AINATIVE.md` |
| Claude context | `CLAUDE.md` |
| Settings | `.ainative/settings.json` |
| Rules | `.ainative/RULES.MD` |
| Skills | `.claude/skills/` |
| Commands | `.claude/commands/` |
| Tests | `tests/` |
| E2E Tests | `e2e/` |
| Documentation | `docs/` |

---

## Support

### Documentation
- Express.js: https://expressjs.com/
- Mongoose: https://mongoosejs.com/
- Jest: https://jestjs.io/
- Playwright: https://playwright.dev/

### Project Resources
- GitHub: https://github.com/Open-Cap-Stack/opencap
- Issues: Use OCAE-XXX format

---

**Last Updated**: 2026-02-02
**Maintained By**: OpenCap Stack Team
