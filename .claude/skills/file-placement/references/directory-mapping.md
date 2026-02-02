# Directory Mapping - Complete Reference

## Backend Documentation Mapping

| Filename Pattern | Required Location | Examples |
|-----------------|-------------------|----------|
| `ISSUE_*.md` | `docs/issues/` | `ISSUE_469_MIGRATION.md` |
| `BUG_*.md` | `docs/issues/` | `BUG_392_TEST_ENDPOINT_FIXES.md` |
| `ROOT_CAUSE_*.md` | `docs/issues/` | `ROOT_CAUSE_EMAIL_VERIFICATION.md` |
| `*_TEST*.md` | `docs/testing/` | `COMPREHENSIVE_TEST_SUITE.md` |
| `QA_*.md` | `docs/testing/` | `QA_CHECKLIST.md` |
| `AGENT_SWARM_*.md` | `docs/agent-swarm/` | `AGENT_SWARM_ARCHITECTURE.md` |
| `WORKFLOW_*.md` | `docs/agent-swarm/` | `WORKFLOW_STAGE_1.md` |
| `STAGE_*.md` | `docs/agent-swarm/` | `STAGE_2_IMPLEMENTATION.md` |
| `API_*.md` | `docs/api/` | `API_DOCUMENTATION.md` |
| `*_ENDPOINTS*.md` | `docs/api/` | `REST_ENDPOINTS_V1.md` |
| `*_IMPLEMENTATION*.md` | `docs/reports/` | `FEATURE_IMPLEMENTATION_SUMMARY.md` |
| `*_SUMMARY*.md` | `docs/reports/` | `PROJECT_SUMMARY.md` |
| `DEPLOYMENT_*.md` | `docs/deployment/` | `DEPLOYMENT_GUIDE.md` |
| `RAILWAY_*.md` | `docs/deployment/` | `RAILWAY_CONFIGURATION.md` |
| `*_QUICK_*.md` | `docs/quick-reference/` | `API_QUICK_REFERENCE.md` |
| `*_REFERENCE.md` | `docs/quick-reference/` | `MCP_QUERY_REFERENCE.md` |
| `STEPS_*.md` | `docs/quick-reference/` | `STEPS_DEPLOYMENT.md` |
| `RLHF_*.md` | `docs/backend/` | `RLHF_ARCHITECTURE.md` |
| `MEMORY_*.md` | `docs/backend/` | `MEMORY_MANAGEMENT.md` |
| `SECURITY_*.md` | `docs/backend/` | `SECURITY_GUIDELINES.md` |
| `CODING_*.md` | `docs/development-guides/` | `CODING_STANDARDS.md` |
| `*_GUIDE.md` | `docs/development-guides/` | `TESTING_GUIDE.md` |
| `*_INSTRUCTIONS.md` | `docs/guides/` | `SETUP_INSTRUCTIONS.md` |
| `PRD_*.md` | `docs/planning/` | `PRD_SSG_IMPLEMENTATION.md` |
| `BACKLOG*.md` | `docs/planning/` | `BACKLOG_2025_Q1.md` |

## Frontend Documentation Mapping

| Filename Pattern | Required Location | Examples |
|-----------------|-------------------|----------|
| Feature docs | `AINative-website/docs/features/` | `AI_KIT_INTEGRATION.md` |
| Frontend tests | `AINative-website/docs/testing/` | `COMPONENT_TEST_COVERAGE.md` |
| Implementation | `AINative-website/docs/implementation/` | `SSG_IMPLEMENTATION.md` |
| Frontend issues | `AINative-website/docs/issues/` | `ISSUE_UI_RENDER_BUG.md` |
| Deploy docs | `AINative-website/docs/deployment/` | `VERCEL_DEPLOYMENT.md` |
| Reports | `AINative-website/docs/reports/` | `PERFORMANCE_REPORT.md` |

## Scripts Mapping

| Script Pattern | Required Location | Examples |
|---------------|-------------------|----------|
| `test_*.sh` | `scripts/` | `test_api_endpoints.sh` |
| `test_*.py` | `scripts/` | `test_comprehensive.py` |
| `*_migration.sh` | `scripts/` | `database_migration.sh` |
| `monitor_*.sh` | `scripts/` | `monitor_performance.sh` |
| `sync_*.py` | `scripts/` | `sync-production-schema.py` |
| `*.sh` (general) | `scripts/` | `deploy.sh`, `build.sh` |

## Category Descriptions

### `docs/issues/`
For tracking bugs, issues, and root cause analyses. Use for any problem investigation or issue documentation.

### `docs/testing/`
For test plans, QA checklists, test coverage reports, and testing documentation.

### `docs/agent-swarm/`
For agent swarm architecture, workflow stages, and multi-agent coordination documentation.

### `docs/api/`
For API documentation, endpoint references, request/response schemas.

### `docs/reports/`
For implementation summaries, feature reports, progress updates, and status reports.

### `docs/deployment/`
For deployment guides, infrastructure documentation, Railway/Vercel configuration.

### `docs/quick-reference/`
For quick reference guides, cheat sheets, step-by-step instructions.

### `docs/backend/`
For backend-specific features like RLHF, memory management, security implementations.

### `docs/development-guides/`
For coding standards, style guides, and development best practices.

### `docs/planning/`
For PRDs, backlogs, roadmaps, and project planning documents.

### `scripts/`
For ALL executable scripts (.sh, .py) including tests, migrations, monitoring, and utilities.

## Special Cases

### Exceptions (Files allowed in root)
* `README.md` - Project overview (root only)
* `CLAUDE.md` - Project instructions for AI agents (root only)
* `src/backend/README.md` - Backend-specific readme
* `AINative-website/README.md` - Frontend-specific readme
* `src/backend/start.sh` - Backend startup script (specific exception)

### What if multiple categories match?
Choose the MOST SPECIFIC category:
* `BUG_DEPLOYMENT_RAILWAY.md` → `docs/issues/` (issues takes priority over deployment)
* `API_TEST_GUIDE.md` → `docs/testing/` (testing takes priority over API)
* `QUICK_REFERENCE_DEPLOYMENT.md` → `docs/quick-reference/` (quick-reference is most specific)

### Creating new categories
If none of the existing categories fit, propose a new category in `docs/` rather than creating files in root. Document the new category in this mapping file.

## Enforcement Checklist

Before creating any documentation file:

- [ ] Is this a .md file?
- [ ] Am I about to create it in root, backend, or frontend root?
- [ ] If yes to both above, STOP
- [ ] Identify the category from the mapping table
- [ ] Create in the correct `docs/[category]/` location
- [ ] Verify file is in correct location before committing

## Common Mistakes

* ❌ Creating `ISSUE_*.md` in root
* ❌ Creating `*_GUIDE.md` in backend directory
* ❌ Creating test scripts in `src/backend/`
* ❌ Creating deployment docs in root
* ❌ Moving files AFTER creation instead of creating in correct location

## This is a ZERO-TOLERANCE rule. No exceptions.
