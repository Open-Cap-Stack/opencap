# AINative Core - Project Memory

## 🚨 RULE #1: NO THIRD-PARTY AI ATTRIBUTION - USE AINATIVE BRANDING ONLY

**FORBIDDEN in commits/PRs:** "Claude", "Anthropic", "ChatGPT", "Copilot" (third-party tools)
**ENCOURAGED:** "Built by AINative", "AINative Cloud", "Built by Agent Swarm", "All Data Services Built on ZeroDB"
**Enforcement:** `.git/hooks/commit-msg` blocks third-party attribution, see `.ainative/git-rules.md`

**Correct format (Option 1 - No attribution):**
```
Add user authentication

- Implement JWT tokens
- Add password hashing
- Create login endpoints

Refs #123
```

**Correct format (Option 2 - AINative branding):**
```
Add user authentication

- Implement JWT tokens
- Add password hashing
- Create login endpoints

Built by AINative Dev Team
All Data Services Built on ZeroDB

Refs #123
```

---

## Quick Reference

**Stack:** Python 3.11, FastAPI, PostgreSQL, Redis, Celery, Kong
**Deploy:** Railway (prod), Docker (dev)

### Structure
```
/Users/aideveloper/core/
├── src/backend/app/{api,models,services,schemas,tasks}
├── src/backend/{tests,alembic}
├── sdks/{python,typescript,go}
├── packages/{mcp-servers,tools}
└── docs/{reports,deployment}
```

---

## Critical Rules

### 1. Git Commits
- File: `.ainative/git-rules.md`
- Hook: `.git/hooks/commit-msg`
- Zero tolerance for AI attribution

### 2. File Placement
- File: `.ainative/CRITICAL_FILE_PLACEMENT_RULES.md`
- Docs → `docs/{category}/`
- No root `.md` (except README.md)

### 3. Testing (MANDATORY)

**ZERO TOLERANCE - Execute before claiming pass:**
```bash
# Backend
cd src/backend
python3 -m pytest tests/ -v --cov=app --cov-report=term-missing

# Must see: ✓ PASSED, ✓ 80%+ coverage
```

**Requirements:**
- 80%+ coverage with proof
- All endpoints tested
- Output captured for PRs

**Incidents learned:**
- Email service deployed untested
- Tests written but never run

### 4. Code Quality
- Type hints all functions
- Docstrings public methods
- SQLAlchemy ORM only
- Multi-tenant `organization_id`
- Rate limiting all endpoints

---

## Architecture

### API Routes
- `/v1/*` - Public (API key/Bearer)
- `/admin/*` - Superuser only
- `/health` - No auth
- `/webhooks/*` - Signature verify

### Auth
- JWT (access+refresh)
- API keys (org-scoped)
- RBAC: user/admin/superuser

### Database
- PostgreSQL (Railway)
- Redis (cache/rate-limit)
- Alembic migrations
- Indexes on FKs

### Services
- Email: EnhancedEmailService (Resend/SMTP/SendGrid/SES)
- Billing: Stripe+Kong metrics
- Notifications: Email/Slack/PagerDuty/webhooks
- Queue: Celery+Redis
- Gateway: Kong

---

## Common Tasks

### New API Endpoint
1. `app/api/v1/endpoints/{feature}.py`
2. `app/schemas/{feature}.py`
3. `app/models/{feature}.py` (if needed)
4. `app/services/{feature}_service.py`
5. `alembic revision -m "desc"`
6. `tests/test_{feature}.py`
7. Register in `app/api/v1/__init__.py`
8. Test, commit (NO AI ATTRIBUTION)

### Tests
```bash
cd src/backend
pytest tests/ -v --cov
```

### Migrations
```bash
alembic revision -m "msg"
alembic upgrade head
alembic downgrade -1
```

### Dev Start
```bash
cd src/backend
uvicorn app.main:app --reload --port 8000
celery -A app.tasks.celery_app worker -l info
celery -A app.tasks.celery_app beat -l info
```

---

## Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/ainative_dev
REDIS_URL=redis://localhost:6379/0
RESEND_API_KEY=re_xxxxx
STRIPE_API_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SECRET_KEY=your-secret-key
KONG_ADMIN_URL=http://localhost:8001
KONG_PROXY_URL=http://localhost:8000
```

---

## Recent Work

### Completed
- Email Service (#138-141): Multi-provider, templates, rate-limit
- Notifications (#142-148, #157-158): CRUD, Slack, PagerDuty, webhooks
- Latest Sprint (#92,#164,#319,#156,#306,#160,#173):
  - Invoice emails+Stripe
  - Kong billing metrics
  - Dev analytics/logs
  - Python SDK table ops (v1.0.1)
  - PostgreSQL MCP tools (7)
  - Railway networking

---

## Key Files

### Config
- `app/main.py` - FastAPI app
- `app/db/base.py` - SQLAlchemy
- `app/core/config.py` - Settings
- `app/api/deps.py` - Dependencies

### Services
- `services/email_service_enhanced.py`
- `services/billing_service.py`
- `services/stripe_service.py`
- `services/kong_metrics_collector.py`
- `services/auth_service.py`

### Models
- `models/{user,organization,billing,notification}.py`

---

## Deployment Checklist

- [ ] Tests passing (`pytest`)
- [ ] No AI attribution (`git log`)
- [ ] Migrations tested
- [ ] Railway env vars set
- [ ] API docs updated
- [ ] Error handling complete
- [ ] Rate limiting configured
- [ ] Multi-tenant verified
- [ ] Security reviewed

---

## MCP Servers

- **ZeroDB**: 76 ops (vectors, memory, RLHF, tables, files, PostgreSQL, quantum)
- **GitHub**: Repos, issues, PRs, commits
- **Strapi**: CMS, blog, tutorials, events

---

## Package Publishing

### Python SDK (PyPI)
**Name:** `zerodb-mcp`
**Registry:** https://pypi.org/project/zerodb-mcp/
**Version:** 1.0.0 → 1.0.1 (ready)
**Creds:** `~/.pypirc` (`__token__`/`pypi-[token]`)

```bash
cd sdks/python
pytest tests/ -v --cov=zerodb_mcp  # 51 tests, 65%
python -m build
twine upload --repository testpypi dist/*  # Test first
twine upload dist/*  # PERMANENT!
```

**Notes:** PyPI permanent, test first, no reuse versions

### TypeScript SDK (NPM)
**Name:** `@zerodb/mcp-client`
**Status:** Not configured yet
**Required:** `npm login` or `NPM_TOKEN`

```bash
cd sdks/typescript/zerodb-mcp-client
npm test && npm run build
npm publish --access public  # Scoped package
```

---

## Resources

- API: https://api.ainative.studio
- Railway: https://railway.app
- Stripe: https://dashboard.stripe.com
- Kong: http://localhost:8001 (dev)
- PyPI: https://pypi.org/project/zerodb-mcp/

---

## 🚨 FINAL REMINDER

**BEFORE COMMIT:**
1. Contains "Claude"/"Anthropic"/"ChatGPT"/"Copilot"? → STOP! REMOVE THIRD-PARTY ATTRIBUTION!
2. Using attribution? → ONLY use AINative branding (see approved list above)
3. Tests executed? → If NO, STOP! TEST FIRST!

**Hook blocks third-party AI attribution.**

**APPROVED ATTRIBUTION:**
✅ Built by AINative Dev Team
✅ Built Using AINative Studio
✅ All Data Services Built on ZeroDB
✅ Powered by AINative Cloud
✅ Built by Agent Swarm
✅ AINative Studio IDE

---

**Updated:** 2025-12-29 | **Status:** Production
