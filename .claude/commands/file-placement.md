---
description: ZERO TOLERANCE file placement rules for documentation and scripts
---

# File Placement Rules

## NEVER Create Files in Wrong Locations

| FORBIDDEN | REQUIRED LOCATION |
|-----------|-------------------|
| `/*.md` (root) | `docs/{category}/filename.md` |
| `/src/backend/*.md` | `docs/{category}/filename.md` |
| `/src/backend/*.sh` | `scripts/filename.sh` |

**Exceptions:** Only `README.md` and `CLAUDE.md` allowed in root.

## Documentation Categories

| Type | Location |
|------|----------|
| Issues/Bugs | `docs/issues/` |
| Testing/QA | `docs/testing/` |
| API Documentation | `docs/api/` |
| Implementation Reports | `docs/reports/` |
| Deployment | `docs/deployment/` |
| Development Guides | `docs/development-guides/` |
| Agent Swarm | `docs/agent-swarm/` |
| Backend Docs | `docs/backend/` |
| Quick Reference | `docs/quick-reference/` |

## Scripts Location

ALL scripts (.sh, .py utilities) go in `scripts/` folder.

**Exception:** `src/backend/start.sh` only.

## Before Creating ANY File

1. Check if you're creating in a root directory
2. If yes, STOP and use the appropriate `docs/` or `scripts/` subfolder
3. Choose the correct category based on content
4. Create in the correct location FIRST TIME

Invoke this skill when creating documentation or scripts.
