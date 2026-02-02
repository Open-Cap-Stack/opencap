# OpenCap Stack - Claude Code Context

## Project Overview

**OpenCap Stack** is a comprehensive MERN stack application for managing stakeholders, share classes, documents, activities, notifications, equity simulations, tax calculations, and financial reporting. Aligned with Open Cap Table Alliance (OCTA) schema.

**Repository**: https://github.com/Open-Cap-Stack/opencapstack

---

## CURRENT PRIORITIES (89 Open Issues)

### Active Workstreams
1. **ZeroDB Migration** (Issues #4-#38) - Migrating from MongoDB to ZeroDB
2. **Test Coverage** (Issues #39-#43) - Achieving 80%+ coverage
3. **Compliance Features** (Issues #59-#74) - 409A, SAFE, Tax compliance

### Critical Issues (Fix First)
| Issue | Title | Type |
|-------|-------|------|
| #125 | Fix Data Model Enum Mismatches with Frontend | Bug |
| #39 | Achieve 80%+ Controller Test Coverage | Test |
| #40 | Achieve 80%+ Model Test Coverage | Test |
| #4 | Setup ZeroDB project and environment | Migration |

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

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB (migrating to ZeroDB) + PostgreSQL + Neo4j
- **Frontend**: React (in `/frontend` submodule)
- **Testing**: Jest (unit) + Playwright (E2E)
- **AI**: LangChain + Anthropic + OpenAI
- **Storage**: MinIO (S3-compatible) + ZeroDB File Storage
- **Real-time**: Socket.IO + WebSockets

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
├── models/            # Mongoose models
├── routes/            # API routes
├── services/          # Business logic + ZeroDB service
├── middleware/        # Express middleware
├── config/            # Configuration files
├── tests/             # Jest test files
├── e2e/               # Playwright E2E tests
├── scripts/           # Utility scripts
├── docs/              # Documentation (50+ files)
├── frontend/          # React frontend (submodule)
├── .claude/           # Claude Code skills & commands
└── .ainative/         # AI agent configuration
```

---

## ZeroDB Migration (Current Focus)

### Phase Status
| Phase | Issues | Status |
|-------|--------|--------|
| Phase 1: Foundation | #4-#8 | Not Started |
| Phase 2: Data Migration | #9-#14 | Blocked by Phase 1 |
| Phase 3: Code Migration | #15-#21 | Blocked |
| Phase 4: Vector Operations | #22-#26 | Blocked |
| Phase 5: Advanced Features | #27-#31 | Blocked |
| Phase 6: MongoDB Removal | #32-#37 | Blocked |

### ZeroDB Configuration
```bash
ZERODB_API_KEY=<configured in .env>
ZERODB_API_URL=https://api.ainative.studio
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
- `chore/issue-39-controller-tests`

---

## Key Documentation

| Document | Location |
|----------|----------|
| Project Context | `.ainative/PROJECT_CONTEXT.md` |
| ZeroDB Migration Plan | `docs/ZERODB_MIGRATION_PLAN.md` |
| Backend Gap Analysis | `docs/BACKEND_GAP_ANALYSIS.md` |
| API Documentation | `docs/API_Documentation_Sprint1.md` |
| Data Models | `docs/DataModels.md` |
| Carta Comparison | `docs/OPENCAP_VS_CARTA_GAP_ANALYSIS.md` |

---

## Feature Areas

### Compliance & Tax (Critical)
- 409A Valuation (#59, #61, #63)
- Form 3921 Generation (#71)
- Tax Withholding (#72)
- ASC 718 Reporting (#73)
- Rule 701 Disclosures (#74)

### Fundraising (SAFE)
- SAFE Data Model (#64)
- Digital Signatures (#66)
- SAFE Conversion (#68)

### Equity Management
- Equity Grants (#77)
- Vesting Schedules (#78)
- Exercise Management (#79)
- Termination Workflow (#81)

---

## Environment Variables

Required in `.env`:
```bash
# ZeroDB (configured)
ZERODB_API_KEY=<your-key>
ZERODB_API_URL=https://api.ainative.studio

# MongoDB (current)
MONGODB_URI=mongodb://localhost:27017/opencap

# Server
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

---

## Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Coverage >= 80%
- [ ] No AI attribution in commits
- [ ] Linting passes (`npm run lint`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Issue referenced in PR (`Fixes #123`)
- [ ] Documentation updated if needed

---

**Last Updated**: 2026-02-02
**Open Issues**: 89 | **Critical**: 20
**Current Focus**: ZeroDB Migration + Test Coverage
