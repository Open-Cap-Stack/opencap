# AINative Core - Project Memory

## Critical Rules

### 1. Git Commits
- Zero tolerance for AI attribution
- Hook blocks forbidden text

### 2. File Placement
- Docs → `docs/{category}/`
- No root `.md` (except README.md)

### 3. Testing (MANDATORY)
```bash
cd src/backend
python3 -m pytest tests/ -v --cov=app --cov-report=term-missing
```
- 80%+ coverage required
- All endpoints tested

### 4. Code Quality
- Type hints all functions
- Docstrings public methods
- SQLAlchemy ORM only
- Multi-tenant `organization_id`
- Rate limiting all endpoints

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
- Email: Multi-provider
- Billing: Stripe+Kong metrics
- Notifications: Multi-channel
- Queue: Celery+Redis
- Gateway: Kong

## Common Tasks

### New API Endpoint
1. `app/api/v1/endpoints/{feature}.py`
2. `app/schemas/{feature}.py`
3. `app/models/{feature}.py`
4. `app/services/{feature}_service.py`
5. `alembic revision -m "desc"`
6. `tests/test_{feature}.py`
7. Register in `app/api/v1/__init__.py`
8. Test, commit (NO AI ATTRIBUTION)

## Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/ainative_dev
REDIS_URL=redis://localhost:6379/0
RESEND_API_KEY=re_xxxxx
STRIPE_API_KEY=sk_test_xxxxx
SECRET_KEY=your-secret-key
```

## Package Publishing

### Python SDK (PyPI)
```bash
cd sdks/python
pytest tests/ -v --cov=zerodb_mcp
python -m build
twine upload dist/*
```

### TypeScript SDK (NPM)
```bash
cd sdks/typescript/zerodb-mcp-client
npm test && npm run build
npm publish --access public
```

## Deployment Checklist
- [ ] Tests passing
- [ ] No AI attribution
- [ ] Migrations tested
- [ ] Env vars set
- [ ] API docs updated
- [ ] Error handling complete
- [ ] Rate limiting configured

## 🚨 FINAL REMINDER
1. No "Claude"/"Anthropic"
2. No attribution
3. Tests executed

**Updated:** 2025-12-18 | **Status:** Production