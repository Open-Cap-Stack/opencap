---
description: Database schema management using idempotent sync script instead of Alembic migrations
---

# Database Schema Sync

Use the schema sync script for all database changes. NEVER run Alembic migrations directly in production.

## Workflow

### 1. Dry Run First (Always!)
```bash
python scripts/sync-production-schema.py --dry-run
```

### 2. Review Output
- Check which tables/columns will be created
- Verify no destructive changes

### 3. Apply to Production
```bash
export DATABASE_URL="postgresql://..."
python scripts/sync-production-schema.py --apply
```

### 4. Verify
```bash
psql "$DATABASE_URL" -c "\dt"
```

## Rules

- **ALWAYS** use `scripts/sync-production-schema.py`
- **ALWAYS** run `--dry-run` before `--apply`
- **NEVER** run `alembic upgrade head` in production
- **NEVER** manually execute SQL in production

## Adding New Tables

1. Define models in `src/backend/app/models/`
2. Add table creation logic to sync script
3. Test with `--dry-run`
4. Apply to dev → staging → production

## Adding New Columns

1. Update model in `src/backend/app/models/`
2. Add column check and ADD COLUMN logic
3. Use IF NOT EXISTS patterns
4. Test and apply

Invoke this skill when working with database schema changes.
