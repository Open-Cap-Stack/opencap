# OpenCap Stack - Claude Code Context

## Project Overview

**OpenCap Stack** is a comprehensive financial management application for managing stakeholders, share classes, documents, activities, notifications, equity simulations, tax calculations, and financial reporting. Aligned with Open Cap Table Alliance (OCTA) schema.

**Repository**: https://github.com/Open-Cap-Stack/opencapstack

---

## Tech Stack

- **Backend**: Node.js + Express.js
- **Primary Database**: ZeroDB (via AINative API)
- **Frontend**: React (in `/frontend` submodule)
- **Testing**: Jest (unit) + Playwright (E2E)
- **AI**: LangChain + Anthropic + OpenAI
- **Storage**: MinIO (S3-compatible) + ZeroDB File Storage
- **Real-time**: Socket.IO + WebSockets

---

## ZeroDB Migration Status

### Phase Status (Updated 2026-02-02)
| Phase | Issues | Status |
|-------|--------|--------|
| Phase 1: Foundation | #4-#8 | Complete |
| Phase 2: Data Migration | #9-#14 | Complete |
| Phase 3: Code Migration | #15-#21 | Complete |
| Phase 4: Vector Operations | #22-#26 | Complete |
| Phase 5: Advanced Features | #27-#31 | Complete |
| Phase 6: MongoDB Removal | #32-#37 | **In Progress** |

### Phase 6 Progress
- [x] Issue #32: Remove MongoDB dependencies from code
- [x] Issue #33: Remove MongoDB from Docker configs
- [x] Issue #34: Remove PostgreSQL/Neo4j dependencies
- [x] Issue #35: Final validation and production readiness
- [x] Issue #36: Update documentation for ZeroDB
- [ ] Issue #37: Post-migration monitoring (in progress)

### ZeroDB Configuration
```bash
ENABLE_ZERODB=true
ZERODB_API_KEY=<configured in .env>
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
AINATIVE_API_TOKEN=<configured in .env>
```

---

## Current Priorities

### Active Workstreams
1. **ZeroDB Phase 6 Completion** (Issue #37 - Monitoring)
2. **Test Coverage** (Issues #39-#43) - Achieving 80%+ coverage
3. **Compliance Features** (Issues #59-#74) - 409A, SAFE, Tax compliance

### Issue Commands
```bash
# List all open issues
gh issue list --state open

# List critical issues
gh issue list --label critical

# View issue details
gh issue view {number}

# Work on an issue
git checkout -b feature/issue-{number}-{slug}
```

---

## Critical Rules

### 1. Git Commits - ZERO TOLERANCE
**NEVER include in commits, PRs, or issues:**
- "Claude", "Anthropic", "claude.com"
- "Generated with [AI Tool]"
- "Co-Authored-By: [AI]"
- Any AI tool attribution

### 2. File Placement
- Documentation → `docs/{category}/`
- Scripts → `scripts/`
- No `.md` files in root (except README.md, CLAUDE.md)
- No `.sh` scripts in root

### 3. Testing (MANDATORY)
```bash
# Run all tests
npm test

# Run with coverage (80%+ required)
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Validate production readiness
node scripts/validate-production-readiness.js
```
- Execute tests before ANY commit
- Include test output in PRs
- Minimum 80% coverage for new features

### 4. TDD Workflow
1. **Red**: Write failing tests first
2. **Green**: Minimal code to pass
3. **Refactor**: Improve with tests green

---

## Project Structure

```
opencapstack/
├── app.js              # Express app entry point
├── controllers/        # Route controllers (30+ files)
├── models/            # Data models (ZeroDB compatible)
├── routes/            # API routes
├── services/          # Business logic
│   ├── zerodbService.js      # ZeroDB API client
│   └── databaseAdapter.js    # Database abstraction
├── middleware/        # Express middleware
├── config/            # Configuration files
├── tests/             # Jest test files
├── e2e/               # Playwright E2E tests
├── scripts/           # Utility scripts
├── docs/              # Documentation (50+ files)
├── deployment/        # Kubernetes & Terraform
├── frontend/          # React frontend (submodule)
├── .claude/           # Claude Code skills & commands
└── .ainative/         # AI agent configuration
```

---

## Common Commands

```bash
# Development
npm run dev              # Start with nodemon
npm run dev:full         # Backend + Frontend

# Testing
npm test                 # Run Jest tests
npm run test:coverage    # With coverage report
npm run test:e2e         # Playwright E2E

# Validation
node scripts/validate-production-readiness.js

# Linting
npm run lint             # ESLint
npm run format           # Prettier

# GitHub Issues
gh issue list --state open
gh issue view {number}
```

---

## Branch Naming Convention

```
feature/issue-{number}-{slug}
bug/issue-{number}-{slug}
chore/issue-{number}-{slug}
```

**Examples:**
- `feature/issue-64-safe-data-model`
- `bug/issue-125-enum-mismatch`
- `chore/issue-37-monitoring`

---

## Key Documentation

| Document | Location |
|----------|----------|
| Production Readiness Report | `docs/reports/PHASE6_PRODUCTION_READINESS_REPORT.md` |
| ZeroDB Migration Guide | `docs/zerodb-migration-guide.md` |
| ZeroDB Service Docs | `docs/zerodb-service.md` |
| Security Audit | `docs/security/SECURITY_AUDIT_REPORT.md` |
| API Documentation | `docs/API_Documentation_Sprint1.md` |
| Deployment Guide | `deployment/README.md` |

---

## Environment Variables

Required in `.env`:
```bash
# ZeroDB (Primary Database - REQUIRED)
ENABLE_ZERODB=true
ZERODB_API_KEY=<your-key>
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
AINATIVE_API_TOKEN=<your-token>

# Server
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development

# MongoDB (Optional - for sync only)
# MONGODB_URI=mongodb://localhost:27017/opencap
# SYNC_ENABLED=false
```

---

## Deployment Checklist

- [x] ZeroDB production readiness validated
- [x] Docker configs updated (MongoDB removed)
- [x] Kubernetes configs updated
- [ ] All tests passing (`npm test`)
- [ ] Coverage >= 80%
- [ ] No AI attribution in commits
- [ ] Linting passes (`npm run lint`)
- [ ] Monitoring configured (Issue #37)

---

**Last Updated**: 2026-02-02
**ZeroDB Status**: Production Ready (100% validation)
**Current Focus**: Issue #37 (Monitoring) + Test Coverage
