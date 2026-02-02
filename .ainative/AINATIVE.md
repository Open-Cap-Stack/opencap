# OpenCap Stack - Project Context

**Project**: OpenCap Stack - MERN Application for Equity Management
**Last Updated**: 2026-02-02
**Compatible With**: Gemini CLI, Claude Code, Cursor, Windsurf, and other AI coding assistants

---

## Project Overview

**OpenCap Stack** is a comprehensive MERN stack application designed to manage stakeholders, share classes, documents, activities, notifications, equity simulations, tax calculations, and financial reporting. The project follows Test-Driven Development (TDD) and is fully aligned with the Open Cap Table Alliance (OCTA) schema.

---

## Repository Path

**Path**: `/Users/juweriya/Desktop/opencapstack`
**Framework**: MERN (MongoDB, Express, React, Node.js)
**Status**: Active Development

---

## Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **ODM**: Mongoose 6.x
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Express middleware

### Databases
- **Primary**: MongoDB (document store)
- **Analytics**: PostgreSQL (relational)
- **Graph**: Neo4j (relationships)
- **Cache**: Redis (optional)

### AI/ML Integration
- **LangChain**: Anthropic + OpenAI providers
- **LangGraph**: Workflow orchestration

### Storage & Files
- **Object Storage**: MinIO (S3-compatible)
- **Document Processing**: PDF.js, Mammoth, Tesseract.js

### Real-time
- **WebSockets**: Socket.IO + ws

### Testing
- **Unit/Integration**: Jest
- **E2E**: Playwright
- **In-memory DB**: mongodb-memory-server

### Frontend
- **Framework**: React (submodule in `/frontend`)
- **Build Tool**: Vite

---

## Architecture

### Project Structure
```
opencapstack/
├── app.js                    # Express app entry point
├── db.js                     # Database connections
├── controllers/              # Route controllers (30+ files)
│   ├── stakeholderController.js
│   ├── shareClassController.js
│   ├── documentController.js
│   └── ...
├── models/                   # Mongoose schemas
├── routes/                   # Express routes
├── services/                 # Business logic services
├── middleware/               # Auth, validation, error handling
├── config/                   # Jest, Playwright, app config
├── tests/                    # Jest test files
├── e2e/                      # Playwright E2E tests
├── scripts/                  # Utility scripts
├── docs/                     # Documentation (50+ files)
├── frontend/                 # React frontend (git submodule)
├── .claude/                  # Claude Code configuration
└── .ainative/                # AI agent configuration
```

### API Structure
- **Port**: 5000 (configurable)
- **Docs**: `/api-docs` (Swagger UI)
- **Health**: `/health`
- **API Prefix**: `/api/v1`

---

## Development Workflow

### Semantic Seed Venture Studio Coding Standards (SSCS)

This project follows SSCS which emphasizes:
- **Structured Backlog Management** with story IDs (OCAE-XXX, OCDI-XXX)
- **Test-Driven Development (TDD)** with Red-Green-Refactor
- **Consistent Branch Naming** (`feature/OCAE-XXX`, `bug/OCAE-XXX`)
- **Daily Commits** with proper prefixes (including "WIP:")
- **Pull Request Process** with traceability to backlog items

### Branch Naming
- `feature/{story-id}-{slug}` - New features
- `bug/{story-id}-{slug}` - Bug fixes
- `chore/{story-id}-{slug}` - Maintenance tasks

### Story ID Prefixes
- **OCAE**: OpenCap API Enhancement
- **OCDI**: OpenCap Data Infrastructure
- **OCSIS**: OpenCap System Integration

---

## Testing Strategy

### Test Commands
```bash
# Unit/Integration tests
npm test

# With coverage (80%+ required)
npm run test:coverage

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

### TDD Workflow
1. **Red**: Write failing tests first (commit: `WIP: red tests for {story}`)
2. **Green**: Minimal code to pass (commit: `green: {behavior}`)
3. **Refactor**: Improve design (commit: `refactor: {area}`)

### Coverage Requirements
- Minimum 80% for new features
- Include test output in PRs
- Execute tests before ANY commit

---

## Git Workflow

### ZERO TOLERANCE: AI Attribution
**NEVER include in commits, PRs, or issues:**
- ❌ "Claude", "Anthropic", "claude.com"
- ❌ "Generated with [AI Tool]"
- ❌ "Co-Authored-By: [AI]"
- ❌ Any AI tool attribution

### Commit Style
```
feat: Add stakeholder CRUD endpoints
fix: Resolve share class validation error
docs: Update API documentation
test: Add unit tests for equity simulation
chore: Update dependencies
refactor: Simplify authentication flow
```

### Pre-Commit Checklist
1. ✅ `npm run lint` - must pass
2. ✅ `npm test` - must pass
3. ✅ Coverage >= 80% for new code
4. ✅ No AI attribution in message

---

## Environment Variables

### Required
```bash
MONGODB_URI=mongodb://localhost:27017/opencap
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Optional
```bash
# PostgreSQL (analytics)
DATABASE_URL=postgresql://user:pass@localhost:5432/opencap

# Neo4j (graph)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# MinIO (storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# AI Services
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

---

## Common Tasks

### Start Development
```bash
npm run dev              # Backend with nodemon
npm run frontend:dev     # Frontend dev server
npm run dev:full         # Both concurrently
```

### Run Tests
```bash
npm test                 # Unit tests
npm run test:coverage    # With coverage
npm run test:e2e         # E2E tests
```

### Code Quality
```bash
npm run lint             # ESLint
npm run format           # Prettier
```

### Database
```bash
# MongoDB should be running
mongod --dbpath /data/db

# Or with Docker
docker-compose up -d mongo
```

---

## AI Agent Configuration

### Claude Code
- Primary context: `CLAUDE.md` (root)
- Skills: `.claude/skills/`
- Commands: `.claude/commands/`

### Gemini CLI (This Directory)
- Project context: `.ainative/AINATIVE.md` (this file)
- Settings: `.ainative/settings.json`
- Rules: `.ainative/rules/`

---

## MCP Servers Available

1. **ZeroDB** - Vector database, embeddings, agent memory
2. **GitHub** - GitHub API integration, issues, PRs
3. **Google Analytics** - Analytics data queries

See `.claude/mcp.json.example` for MCP configuration.

---

## Key Documentation

| Document | Location |
|----------|----------|
| API Documentation | `docs/API_Documentation_Sprint1.md` |
| Data Models | `docs/DataModels.md` |
| Backend Plan | `docs/Backend_Completion_Plan.md` |
| Sprint Plans | `docs/OCSIS_Sprint_Plan.md` |
| MCP Protocol | `docs/MCP_PROTOCOL.md` |
| Workflow Guide | `docs/SSCS_Workflow_Guide.md` |

---

## Quick Reference

| What | Where |
|------|-------|
| Project context | `.ainative/AINATIVE.md` |
| Claude context | `CLAUDE.md` |
| Settings | `.ainative/settings.json` |
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
- Issues: GitHub Issues (OCAE-XXX format)

---

**Last Updated**: 2026-02-02
**Maintained By**: OpenCap Stack Team
