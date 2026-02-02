# Railway Configuration & Troubleshooting Guide

**🚨 NEVER WASTE TIME ON KONG DNS ISSUES AGAIN 🚨**

## ⛔ STOP - READ THIS BEFORE DEBUGGING KONG ⛔

**IF YOU SEE 502/503 ERRORS OR DNS FAILURES:**

1. **DO NOT attempt to fix DNS configuration** - it's already correct
2. **DO NOT change Kong upstream URL** - it's already correct at `ainative-browser-builder.up.railway.app:443`
3. **DO NOT try internal hostnames** - Kong CANNOT access Railway private network (architectural limitation)

**FIRST, check if backend is running:**
```bash
curl -s https://ainative-browser-builder.up.railway.app/health
```

- ✅ **Returns `{"status":"healthy"}`** → Kong config is fine, check Kong logs
- ❌ **Fails or times out** → Backend is down, NOT a Kong issue

**ARCHITECTURAL FACT (Read This Carefully):**

Kong gateway service runs in a **separate Railway container** from the backend. Railway's private network DNS (`*.railway.internal`) is NOT accessible between Kong and backend services due to network isolation. This is a Railway platform limitation, not a configuration issue.

**Therefore:**
- Kong MUST use public backend URL: `https://ainative-browser-builder.up.railway.app:443`
- Internal hostnames (`cody.railway.internal`, `cody:8080`) will ALWAYS fail from Kong
- This is not fixable by configuration changes - it's how Railway's network works

**YES, "ainative-browser-builder" IS the backend service** - ignore the confusing name.

---

## Railway Service Configuration

(Verified 2026-01-03)

### Backend Service: "AINative- Core -Production"
- **Public URL**: `ainative-browser-builder.up.railway.app`
  - HTTP: `:8080`
  - HTTPS: `:443`
- **Internal Hostnames** (Railway Private Network):
  - Full: `cody.railway.internal:8080`
  - Short: `cody:8080`
  - **WARNING**: DNS resolution for internal hostnames from Kong service FAILS
- **TCP Proxy**: `switchback.proxy.rlwy.net:56718` (PostgreSQL)
- **Database Connection**:
  - **Direct (legacy)**: Port 5432 - DO NOT USE (hits 100 connection limit)
  - **PgBouncer (production)**: Port 6432 - USE THIS (1000+ app connections → 100 DB connections)
- **Database Pool**: 10 base + 10 overflow = 20 connections per instance (optimized for PgBouncer)
- **Service Name Pattern**: Contains spaces ("AINative- Core -Production")

### Kong Gateway Service: "kong-gateway"
- **Public URLs**:
  - `kong-gateway-production-8c94.up.railway.app:8000`
  - `api.ainative.studio:8000` (primary)
- **Internal**: `kong-gateway.railway.internal`
- **Root Directory**: `/kong`
- **Config File**: `/kong/config/kong.yml`
- **Correct Upstream**: `https://ainative-browser-builder.up.railway.app:443` ✅
- **DO NOT USE**: Any internal hostnames - Kong CANNOT resolve Railway private network DNS

**Critical Facts**:
1. **Kong MUST use public backend URL** - private network DNS does not work
2. Backend service public URL is confusingly named "browser-builder" - this IS the correct backend
3. **PgBouncer ENABLED (Issue #665)** - Use port 6432 for connection pooling (1000+ app connections)
4. Database pool optimized: 20 connections per instance (10 base + 10 overflow)
5. Service names in Railway contain spaces - use quotes in CLI commands

**Testing Commands**:
```bash
# Test backend directly
curl -s https://ainative-browser-builder.up.railway.app/health

# Test through Kong
curl -I https://api.ainative.studio/health
# Expected: HTTP 200 with "via: 1.1 kong/3.8.0" header

# Check backend logs
railway logs --service "AINative- Core -Production" | tail -50

# Check Kong logs
railway logs --service kong-gateway | tail -50
```

---

## TROUBLESHOOTING SCENARIOS 🔧

### Scenario 1: Seeing 502/503 Errors from Kong

**Symptoms**:
- `curl https://api.ainative.studio/health` returns HTTP 502 or 503
- Kong logs show "upstream connect error" or "connection failure"

**Step-by-Step Fix**:
1. **First, check if backend is actually running**:
   ```bash
   curl -s https://ainative-browser-builder.up.railway.app/health
   # If this fails, backend is down (NOT a Kong issue)
   ```

2. **If backend is down, check Railway deployment**:
   ```bash
   railway status --service "AINative- Core -Production"
   railway logs --service "AINative- Core -Production" | tail -100
   # Look for: "Stopping Container", "rate limit", "QueuePool limit"
   ```

3. **If backend is UP but Kong still fails, check Kong config**:
   ```bash
   cat /Users/aideveloper/core/kong/config/kong.yml | grep -A5 "url:"
   # MUST show: url: https://ainative-browser-builder.up.railway.app
   ```

4. **NEVER try these "fixes" (they don't work)**:
   - ❌ Changing to `cody.railway.internal` → DNS will fail
   - ❌ Changing to `cody:8080` → DNS will fail
   - ❌ Changing to `https://api.ainative.studio` → Circular proxy
   - ✅ ONLY use: `https://ainative-browser-builder.up.railway.app:443`

### Scenario 2: Kong Returns 404 for Everything

**Symptoms**:
- All endpoints return HTTP 404
- No Kong headers present (`x-kong-request-id` missing)
- Logs show "no Route matched with those values"

**Root Cause**: Kong service not running or config file not loaded

**Step-by-Step Fix**:
1. **Check if Kong is actually deployed**:
   ```bash
   railway status --service kong-gateway
   # Should show: "Status: Running" or "Active"
   ```

2. **Verify Kong loaded the config file**:
   ```bash
   railway logs --service kong-gateway | grep -i "declarative"
   # Expected: "declarative config is valid"
   ```

3. **If config not loaded, check file location**:
   ```bash
   # Kong service Root Directory MUST be: /kong
   # Config file MUST be at: /kong/config/kong.yml
   # Railway will look for kong.yml in: <root>/config/kong.yml
   ```

### Scenario 3: DNS Resolution Failures

**Symptoms**:
- Kong logs show: "DNS resolution failed: dns server error: 3 name error"
- Logs mention: "cody.railway.internal", "cody.internal", "cody:33"

**Solution**: YOU ARE USING THE WRONG HOSTNAME!
```bash
# Open kong/config/kong.yml
# Find the services: section
# Change url: line to EXACTLY this:
url: https://ainative-browser-builder.up.railway.app
protocol: https
host: ainative-browser-builder.up.railway.app
port: 443
```

**Why this happens**: Kong gateway service CANNOT access Railway's private network DNS. Must use public URLs.

### Scenario 4: Circular Proxy (Kong → Kong)

**Symptoms**:
- Logs show: "invalid response was received from the upstream server"
- Headers show: `via: 1.1 kong/3.8.0, 1.1 kong/3.8.0` (TWO Kong hops)

**Root Cause**: Kong is configured to proxy to itself (`api.ainative.studio`)

**Solution**:
```bash
# NEVER use Kong's own public URL as upstream
# Kong URL: api.ainative.studio (DO NOT USE AS UPSTREAM)
# Backend URL: ainative-browser-builder.up.railway.app (USE THIS)
```

### Scenario 5: Database Connection Pool Exhaustion

**Symptoms**:
- Backend logs show: "QueuePool limit of size 3 overflow 5 reached"
- Railway logs show: "Stopping Container"
- Backend auto-restarts frequently

**Check Current Pool Size**:
```bash
grep -n "DB_POOL_SIZE" /Users/aideveloper/core/src/backend/app/db/session.py
# Should show line with: DB_POOL_SIZE = getattr(settings, "DB_POOL_SIZE", 150)
```

**If pool is too small, edit session.py** (but it should already be 150).

### Scenario 6: Kong Admin API Endpoints (Issue #734)

**🚨 CRITICAL: Kong Admin API CANNOT be accessed from backend service 🚨**

**Problem**: Backend service CANNOT access Kong Admin API (port 8001) due to Railway's network architecture.

**Why Kong Admin API is Inaccessible**:
1. **Security Best Practice**: Kong Admin API should NEVER be publicly exposed
2. **Railway Port Exposure**: Only port 8000 (proxy) is exposed, not port 8001 (admin)
3. **Network Isolation**: Railway services cannot access each other's private network DNS
4. **Architectural Limitation**: Backend → Kong Admin API is architecturally impossible on Railway

**What This Means**:
- ❌ **Backend CANNOT monitor Kong** via Admin API endpoints
- ❌ **Backend CANNOT configure Kong** programmatically
- ❌ **No `/admin/kong/*` endpoints** - they have been removed (Issue #734)
- ✅ **Kong gateway (port 8000) works perfectly** - routes traffic to backend

**Kong Monitoring Alternatives**:
```bash
# Option 1: Use Railway native logs/metrics
railway logs --service kong-gateway | tail -100

# Option 2: Access Kong Admin Dashboard via Railway port forwarding
# (Manual access only - not programmatic)

# Option 3: Monitor via Kong proxy headers
curl -I https://api.ainative.studio/health | grep -i kong
# Shows: x-kong-proxy-latency, x-kong-upstream-latency, x-kong-request-id
```

**Removed Backend Endpoints** (Issue #734):
- All `/admin/kong/*` endpoints (13 endpoints total)
- Files removed: `app/api/admin/health.py`, `app/api/admin/kong.py`, `app/api/v1/endpoints/kong_admin.py`, etc.
- Files kept: Kong billing integration (Issue #319) via file-log plugin

**Reference**: See `docs/issues/ISSUE_734_KONG_ENDPOINTS_INVESTIGATION.md`

---

## Files You Should NEVER Modify (Unless You Know Why)

**DO NOT TOUCH**:
- `/kong/config/kong.yml` upstream URL - it's already correct
- `/src/backend/app/db/session.py` pool size - already maxed at 150
- Railway service names in dashboard - breaks existing configuration

**Safe to Modify**:
- Kong routes, plugins, rate limits (in kong.yml)
- Kong CORS origins, headers (in kong.yml)
- Database pool timeout settings (if needed for tuning)

---

## Deployment Verification

**After pushing changes to Railway, wait 120 seconds, then run**:

**Step 1: Check Kong headers are present**:
```bash
curl -I https://api.ainative.studio/health | grep -i kong
# Expected: x-kong-request-id, via: 1.1 kong/3.8.0
```

**Step 2: Verify backend responds**:
```bash
curl -s https://ainative-browser-builder.up.railway.app/health
# Expected: {"status":"healthy"}
```

**Step 3: Test API validation works**:
```bash
curl -s https://api.ainative.studio/v1/public/auth/login -X POST
# Expected: HTTP 422 "Validation error" (NOT 404 or 500)
```

**Success Criteria** ✅:
- Kong headers present in responses
- Backend health check returns JSON
- API endpoints return validation errors (422), not 404/500
- No DNS resolution errors in Kong logs
- No "upstream connect error" in Kong logs

**Failure Indicators** ❌:
- HTTP 502/503 → Backend down or unreachable
- HTTP 404 → Kong not routing correctly
- No Kong headers → Kong not processing requests
- "DNS resolution failed" → Wrong hostname in config
- "invalid upstream response" → Circular proxy or backend crashed

---

## Common Error Messages - Quick Reference

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| `DNS resolution failed: dns server error: 3 name error` | Kong can't resolve internal hostname | Use public URL: `ainative-browser-builder.up.railway.app` |
| `upstream connect error or disconnect/reset` | Backend not responding | Check if backend deployed/running |
| `no Route matched with those values` | Kong routes not configured | Verify `/kong/config/kong.yml` loaded |
| `invalid response was received from upstream` | Circular proxy or backend crashed | Check upstream URL, check backend logs |
| `QueuePool limit of size X reached` | Database pool exhausted | Already fixed at 150 (check session.py) |
| `x-railway-fallback: true` | Kong not running | Check Railway deployment status |
