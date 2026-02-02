# OpenCap Stack - Claude Code Context

## Project Overview

**OpenCap Stack** is a comprehensive MERN stack application for managing stakeholders, share classes, documents, activities, notifications, equity simulations, tax calculations, and financial reporting. Aligned with Open Cap Table Alliance (OCTA) schema.

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose ODM) + PostgreSQL (pg) + Neo4j (graph)
- **Frontend**: React (in `/frontend` submodule)
- **Testing**: Jest (unit) + Playwright (E2E)
- **AI**: LangChain + Anthropic + OpenAI
- **Storage**: MinIO (S3-compatible)
- **Real-time**: Socket.IO + WebSockets

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

## Project Structure

```
opencapstack/
├── app.js              # Express app entry point
├── controllers/        # Route controllers
├── models/            # Mongoose models
├── routes/            # API routes
├── services/          # Business logic
├── middleware/        # Express middleware
├── config/            # Configuration files
├── tests/             # Jest test files
├── e2e/               # Playwright E2E tests
├── scripts/           # Utility scripts
├── docs/              # Documentation
├── frontend/          # React frontend (submodule)
└── .claude/           # Claude Code skills & commands
```

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

# Frontend
npm run frontend:dev     # Start frontend dev
npm run frontend:build   # Build frontend
```

## API Structure

- **Base URL**: `http://localhost:5000`
- **API Docs**: `/api-docs` (Swagger UI)
- **Health**: `/health`

### Authentication
- JWT tokens (access + refresh)
- API keys for service-to-service

## Database Connections

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/opencap

# PostgreSQL (analytics)
DATABASE_URL=postgresql://user:pass@localhost:5432/opencap

# Neo4j (graph relationships)
NEO4J_URI=bolt://localhost:7687
```

## Branch Naming Convention

- `feature/OCAE-XXX-description`
- `bug/OCAE-XXX-description`
- `chore/OCAE-XXX-description`

## Story ID Prefixes

- **OCAE**: OpenCap API Enhancement
- **OCDI**: OpenCap Data Infrastructure
- **OCSIS**: OpenCap System Integration

## Skills Available

Use `/skill-name` to invoke:
- `/mandatory-tdd` - TDD enforcement
- `/git-workflow` - Git standards
- `/file-placement` - File organization rules
- `/code-quality` - Coding standards
- `/story-workflow` - Backlog management
- `/delivery-checklist` - Pre-delivery verification

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run tests | `npm test` |
| Coverage report | `npm run test:coverage` |
| E2E tests | `npm run test:e2e` |
| Lint code | `npm run lint` |
| Format code | `npm run format` |

## Environment Variables

Required in `.env`:
```bash
MONGODB_URI=mongodb://localhost:27017/opencap
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Coverage >= 80%
- [ ] No AI attribution in commits
- [ ] Linting passes (`npm run lint`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Environment variables documented
- [ ] API docs updated

---

**Last Updated**: 2026-02-02
**Framework**: MERN Stack (MongoDB, Express, React, Node.js)
