# API Key Management - Production Testing

**Use when:** Testing production API endpoints, creating test credentials, debugging authentication issues

---

## Creating Test API Keys for Production

### CRITICAL: API Keys are Hashed

**Security fact:** API keys are stored as SHA256 hashes in the database. You CANNOT retrieve existing keys - you can ONLY create new ones.

### Step 1: Get Database Public URL

```bash
# Railway provides a public PostgreSQL endpoint
railway run --service "AINative- Core -Production" printenv DATABASE_PUBLIC_URL

# Output format:
# postgresql://postgres:PASSWORD@yamabiko.proxy.rlwy.net:PORT/railway
```

**Common mistake:** Using `DATABASE_URL` (internal hostname) instead of `DATABASE_PUBLIC_URL` (public endpoint)

### Step 2: Create Test API Key

```bash
python3 << 'EOF'
import psycopg2
import hashlib
import secrets
from datetime import datetime, timedelta

# Get DATABASE_PUBLIC_URL from Railway
DATABASE_URL = "postgresql://postgres:PASSWORD@yamabiko.proxy.rlwy.net:PORT/railway"

# Generate a new API key
key_value = f"ainative_test_{secrets.token_urlsafe(32)}"
hashed = hashlib.sha256(key_value.encode()).hexdigest()
prefix = key_value[:12]  # First 12 chars as prefix

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Get admin user ID (or any user for testing)
cur.execute("SELECT id FROM users WHERE email = 'admin@ainative.studio' LIMIT 1")
admin_user = cur.fetchone()

if not admin_user:
    print("ERROR: User not found")
    exit(1)

user_id = admin_user[0]

# Create API key (expires in 7 days)
cur.execute("""
    INSERT INTO api_keys (
        user_id, name, hashed_key, prefix,
        is_active, expires_at, created_at, updated_at
    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
    RETURNING id
""", (
    user_id,
    "Test Production API",
    hashed,
    prefix,
    True,
    datetime.now() + timedelta(days=7)
))

api_key_id = cur.fetchone()[0]
conn.commit()

print(f"✅ Created test API key:")
print(f"   ID: {api_key_id}")
print(f"   Key: {key_value}")
print(f"   Expires: 7 days")
print(f"\n📋 Set environment variable:")
print(f'export AINATIVE_API_KEY="{key_value}"')

cur.close()
conn.close()
EOF
```

**Output:**
```
✅ Created test API key:
   ID: ae969805-f0ca-40ae-be59-ad467527122b
   Key: ainative_test_ODWMe2TpA0Rq6gGKs4ITG6vTtpQnngvfoCT33cTRIj4
   Expires: 7 days

📋 Set environment variable:
export AINATIVE_API_KEY="ainative_test_ODWMe2TpA0Rq6gGKs4ITG6vTtpQnngvfoCT33cTRIj4"
```

### Step 3: Test with API Key

```bash
# Set the environment variable
export AINATIVE_API_KEY="ainative_test_..."

# Test endpoint
curl -X POST "https://api.ainative.studio/v1/managed/chat/completions" \
  -H "X-API-Key: $AINATIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sdxl",
    "messages": [{"role": "user", "content": "A red cube"}]
  }'
```

---

## API Keys Table Schema

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255),
    hashed_key VARCHAR(64) NOT NULL,  -- SHA256 hash
    prefix VARCHAR(12),                -- First 12 chars for identification
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key columns:**
- `hashed_key` - SHA256 hash of the actual key (security)
- `prefix` - First 12 characters for logging/identification
- No `key` or `plaintext_key` column exists

---

## Authentication Methods

The API supports two authentication methods:

### Method 1: X-API-Key Header (Recommended)
```bash
curl -H "X-API-Key: ainative_test_..." https://api.ainative.studio/v1/...
```

### Method 2: Bearer Token (JWT)
```bash
curl -H "Authorization: Bearer eyJhbG..." https://api.ainative.studio/v1/...
```

**FastAPI dependency:** `get_current_user_flexible` in `app/api/deps.py`

---

## Testing Scripts

### Run Integration Tests
```bash
export AINATIVE_API_KEY="ainative_test_..."
python3 scripts/test_gpu_endpoints.py
```

### Test Specific Endpoint
```bash
export AINATIVE_API_KEY="ainative_test_..."
curl -X POST "https://api.ainative.studio/v1/managed/chat/completions" \
  -H "X-API-Key: $AINATIVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "sdxl", "messages": [{"role": "user", "content": "test"}]}'
```

---

## Common Errors

### Error: "Invalid API key"
**Cause:** Key doesn't exist or is hashed incorrectly
**Fix:** Create a new API key using the script above

### Error: "Could not translate host name 'postgres.railway.internal'"
**Cause:** Using internal DATABASE_URL instead of DATABASE_PUBLIC_URL
**Fix:** Use `railway run printenv DATABASE_PUBLIC_URL`

### Error: "Inactive user"
**Cause:** User account is disabled
**Fix:** Activate user: `UPDATE users SET is_active = true WHERE email = 'admin@ainative.studio'`

### Error: "Insufficient credits"
**Cause:** User has no credits
**Fix:** Add credits: `UPDATE users SET credits = 1000 WHERE email = 'admin@ainative.studio'`

---

## Cleanup Test API Keys

After testing, clean up temporary API keys:

```bash
python3 << 'EOF'
import psycopg2

DATABASE_URL = "postgresql://..."  # DATABASE_PUBLIC_URL

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Delete test API keys older than 7 days
cur.execute("""
    DELETE FROM api_keys
    WHERE name LIKE 'Test%'
    AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id, name
""")

deleted = cur.fetchall()
conn.commit()

print(f"Deleted {len(deleted)} test API keys:")
for key_id, name in deleted:
    print(f"  - {name} ({key_id})")

cur.close()
conn.close()
EOF
```

---

## Production API Testing Checklist

Before testing production endpoints:

- [ ] Get DATABASE_PUBLIC_URL from Railway
- [ ] Create test API key using the script above
- [ ] Verify user has sufficient credits (>100 for testing)
- [ ] Set AINATIVE_API_KEY environment variable
- [ ] Test authentication with health endpoint first
- [ ] Run actual endpoint tests
- [ ] Clean up test API keys after testing

---

## Quick Reference

| Task | Command |
|------|---------|
| Get DB URL | `railway run --service "AINative- Core -Production" printenv DATABASE_PUBLIC_URL` |
| Create API key | Use Python script above |
| Test auth | `curl -H "X-API-Key: ..." https://api.ainative.studio/health` |
| Run tests | `AINATIVE_API_KEY="..." python3 scripts/test_gpu_endpoints.py` |
| Check credits | `SELECT credits FROM users WHERE email = 'admin@ainative.studio'` |

---

**Last Updated:** 2026-01-15
**Created for:** Issue #778 - GPU endpoint deployment testing
