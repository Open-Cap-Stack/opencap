# Schema Sync Script vs Alembic Migrations

## Comparison Table

| Feature | Sync Script | Alembic |
|---------|------------|---------|
| **Idempotency** | ✅ Yes - run multiple times safely | ❌ No - fails if run twice |
| **State Tracking** | ✅ Checks current DB state | ❌ Requires migration history table |
| **Dry Run** | ✅ Preview changes before apply | ❌ No built-in preview |
| **Simplicity** | ✅ One script to maintain | ❌ Many migration files |
| **Flexibility** | ✅ Works with any DB state | ❌ Requires sequential migrations |
| **Team Coordination** | ✅ Minimal - script is source of truth | ❌ High - must sync migration order |
| **Rollback** | ⚠️ Manual rollback required | ✅ Built-in downgrade |
| **Production Safety** | ✅ Transparent, preview-first | ⚠️ Risky without careful testing |
| **Learning Curve** | ✅ Low - straightforward Python | ⚠️ Medium - Alembic-specific knowledge |
| **Version Control** | ✅ Single file to track | ⚠️ Many files, merge conflicts common |

## When to Use Each

### Use Sync Script (Recommended)

* ✅ Production deployments
* ✅ Environment synchronization (dev → staging → prod)
* ✅ Adding new tables or columns
* ✅ Creating indexes
* ✅ Teams preferring simplicity
* ✅ Scenarios requiring idempotency

### Use Alembic (Limited Cases)

* Development experimentation (local only)
* Complex data migrations requiring downgrade paths
* Teams with strong Alembic expertise
* Documentation of schema evolution history

**NOTE:** Even when using Alembic for local development, ALWAYS use sync script for production deployments.

## Migration Path: Alembic → Sync Script

If currently using Alembic in production:

1. **Create Sync Script:** Extract current schema from production to sync script
2. **Test Sync Script:** Run `--dry-run` against production (should show no changes)
3. **Transition:** For new schema changes, add to sync script instead of creating migrations
4. **Keep Alembic:** Preserve migration files for historical documentation only
5. **Update CI/CD:** Replace `alembic upgrade head` with `python scripts/sync-production-schema.py --apply`

## Common Pitfalls with Alembic (Why We Avoid It)

1. **Migration Order Conflicts:** Team members create migrations simultaneously, causing conflicts
2. **Non-Idempotent:** Running same migration twice causes errors
3. **Hidden Dependencies:** Migration X depends on migration Y being run first
4. **Production Failures:** No dry-run capability leads to blind deployments
5. **State Desync:** Development and production migration histories diverge
6. **Rollback Complexity:** Downgrade paths often untested and broken

## Success Stories with Sync Script

* **Zero Production Failures:** Dry-run catches issues before apply
* **Environment Parity:** Dev, staging, prod always in sync
* **Team Velocity:** No migration order coordination needed
* **Simplified Onboarding:** New developers understand sync script immediately
* **Cleaner Git History:** Single file vs dozens of migration files
