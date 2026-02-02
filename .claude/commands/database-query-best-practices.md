---
description: Prevent connection pool exhaustion when querying Railway PostgreSQL
---

# Database Query Best Practices

## The Problem

```
psycopg2.OperationalError: sorry, too many clients already
```

This happens when connection pool limit (300) is reached.

## Before ANY Query

### 1. Check Connection Pool Status

```bash
python3 scripts/check_db_connection_pool.py
```

Or manually:
```python
cur.execute("SELECT count(*) FROM pg_stat_activity WHERE datname = 'railway'")
active = cur.fetchone()[0]
print(f"Active connections: {active}/300")
```

### 2. Stop Dev Servers First

```bash
pkill -9 -f "npm run dev"
pkill -9 -f "npm run develop"
sleep 10  # Wait for connections to close
```

## ALWAYS Use Context Managers

```python
# CORRECT
try:
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=30)
    cur = conn.cursor()
    cur.execute("SELECT * FROM users")
    results = cur.fetchall()
finally:
    if cur: cur.close()
    if conn: conn.close()
```

```python
# WRONG - Connection leak!
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT * FROM users")
# Forgot to close!
```

## Use Railway CLI (Recommended)

```bash
railway run psql -c "SELECT COUNT(*) FROM users"
```

This uses Railway's managed connections.

## Emergency: Pool Full

### Option 1: Kill Local Processes
```bash
pkill -9 -f "npm run dev"
pkill -9 node
sleep 30
```

### Option 2: Check Active Connections
```bash
railway run psql -c "SELECT pid, usename, state FROM pg_stat_activity WHERE datname = 'railway'"
```

### Option 3: Terminate Idle (Last Resort)
```bash
railway run psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes'"
```

## Golden Rules

1. **ALWAYS** close connections immediately after use
2. **NEVER** leave connections open during dev server runs
3. **PREFER** Railway CLI for ad-hoc queries

Invoke this skill when querying the production database.
