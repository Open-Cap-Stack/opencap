# AgentFlow Railway Deployment Rules

## Critical Configuration

### ⚠️ MANDATORY Environment Variables

**Production MUST have these set correctly or authentication will fail:**

```bash
AGENTFLOW_AUTO_LOGIN=false                    # CRITICAL: Must be false in production
AGENTFLOW_API_URL=https://api.ainative.studio # Required for authentication
AGENTFLOW_DATABASE_URL=postgresql://...       # Railway PostgreSQL (auto-provided)
```

### Service Information

- **Service Name**: `AgentFlow`
- **Production URL**: https://agentflow.ainative.studio
- **GitHub Repo**: AINative-Studio/AgentFlow
- **Auto-Deploy**: Yes (from main branch)

## Deployment Commands

### Check Current Deployment

```bash
railway status --json | python3 -c "
import sys, json
data = json.load(sys.stdin)
for service in data['services']['edges']:
    if service['node']['name'] == 'AgentFlow':
        deployment = service['node']['serviceInstances']['edges'][0]['node']['latestDeployment']
        print(f\"Status: {deployment['status']}\")
        if 'meta' in deployment and 'commitHash' in deployment['meta']:
            print(f\"Commit: {deployment['meta']['commitHash'][:7]}\")
"
```

### Deploy to AgentFlow

```bash
# Option 1: Push to GitHub (auto-deploys)
git push origin main

# Option 2: Force redeploy via empty commit
git commit --allow-empty -m "Force AgentFlow redeploy"
git push origin main

# Option 3: Manual Railway CLI (if needed)
# Note: May fail with "File too large" - use GitHub method instead
railway up --detach --service "AgentFlow"
```

### Set Environment Variables

```bash
# Set AUTO_LOGIN to false (CRITICAL for production)
railway variables --service "AgentFlow" --set "AGENTFLOW_AUTO_LOGIN=false"

# Set API URL
railway variables --service "AgentFlow" --set "AGENTFLOW_API_URL=https://api.ainative.studio"

# View all variables
railway variables --service "AgentFlow"
```

## Verification Checklist

After deployment, verify these in order:

### 1. Check Deployment Status

```bash
railway status --json | grep -A 10 '"name": "AgentFlow"'
```

Expected: `"status": "SUCCESS"`

### 2. Verify AUTO_LOGIN is Disabled

```bash
curl https://agentflow.ainative.studio/api/v1/auto_login
```

Expected response:
```json
{"detail":{"message":"Auto login is disabled. Please enable it in the settings","auto_login":false}}
```

**❌ If it returns anything else, AUTO_LOGIN is still enabled - FIX IMMEDIATELY**

### 3. Test Health Endpoint

```bash
curl https://agentflow.ainative.studio/health
```

Expected: `{"status":"ok"}`

### 4. Test Authentication

```bash
curl -X POST https://agentflow.ainative.studio/api/v1/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ainative.studio&password=Admin2025!Secure"
```

Expected: Returns `access_token`, `refresh_token`, `token_type`

## Common Issues and Fixes

### Issue: No Login Page Appears (Auto-Login Still Enabled)

**Symptom**: Users bypass login page

**Fix**:
```bash
# 1. Set environment variable
railway variables --service "AgentFlow" --set "AGENTFLOW_AUTO_LOGIN=false"

# 2. Force redeploy
git commit --allow-empty -m "Disable auto-login in production"
git push origin main

# 3. Wait 2-3 minutes, then verify
curl https://agentflow.ainative.studio/api/v1/auto_login
```

### Issue: Login Returns "Incorrect username or password"

**Checklist**:
- ✓ Check `AGENTFLOW_API_URL` is set to `https://api.ainative.studio`
- ✓ Verify backend code uses `/v1/public/auth/login` endpoint
- ✓ Verify backend uses `application/x-www-form-urlencoded` content-type
- ✓ Verify backend uses `username` field (not `email`)

**Test AINative API directly**:
```bash
curl -X POST https://api.ainative.studio/v1/public/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ainative.studio&password=Admin2025!Secure"
```

### Issue: Deployment Fails with "File too large"

**Symptom**: `Failed to upload code. File too large (250MB+)`

**Fix**: Use GitHub auto-deploy instead of CLI:
```bash
git push origin main
# Railway will auto-deploy from GitHub (no file size limits)
```

**Verify `.railwayignore` excludes**:
- `node_modules/`
- `.venv/`
- `__pycache__/`
- Other large directories

## Authentication Implementation Rules

### Correct Implementation

```python
# src/backend/base/agentflow/services/auth/utils.py

async def authenticate_user(username: str, password: str, db: AsyncSession) -> User | None:
    import os
    import httpx

    ainative_api_url = os.getenv("AGENTFLOW_API_URL", "https://api.ainative.studio")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ainative_api_url}/v1/public/auth/login",  # ✓ /v1/PUBLIC/auth/login
                data={"username": username, "password": password},  # ✓ form data, username field
                headers={"Content-Type": "application/x-www-form-urlencoded"},  # ✓ form-encoded
                timeout=10.0
            )

            if response.status_code == 200:
                # Auto-create local user for session
                ...
    except Exception as e:
        logger.warning(f"AINative API failed: {e}, falling back to local auth")

    # Fallback to local authentication
    ...
```

### ❌ Common Mistakes to Avoid

```python
# WRONG: Using /v1/auth/login instead of /v1/public/auth/login
f"{ainative_api_url}/v1/auth/login"  # ❌ Returns 404

# WRONG: Using JSON instead of form-encoded
json={"email": username, "password": password}  # ❌ Returns 422

# WRONG: Using email field instead of username
data={"email": username, "password": password}  # ❌ Returns 422
```

## Rollback Procedure

If deployment causes issues:

### Via Railway Dashboard

1. Go to https://railway.app/project/47539617-ae34-4a52-a010-a88d875f347e
2. Select "AgentFlow" service
3. Click "Deployments" tab
4. Find previous working deployment
5. Click "..." menu → "Redeploy"

### Via Git

```bash
# Reset to previous working commit
git reset --hard <previous-commit-hash>
git push --force origin main

# Railway auto-deploys the rollback
```

## Production URLs

- **Frontend**: https://agentflow.ainative.studio
- **API**: https://agentflow.ainative.studio/api/v1
- **API Docs**: https://agentflow.ainative.studio/docs
- **Health**: https://agentflow.ainative.studio/health
- **Auto-Login Status**: https://agentflow.ainative.studio/api/v1/auto_login

## Railway Service IDs

- **Project ID**: `47539617-ae34-4a52-a010-a88d875f347e`
- **Service ID**: `00744e52-e9eb-4246-8e95-693cae458b06`
- **Environment**: `production` (`57b51c97-8a3b-4632-816f-7761a78b7d19`)

## ZERO TOLERANCE Rules

1. **NEVER set `AGENTFLOW_AUTO_LOGIN=true` in production**
2. **NEVER deploy without verifying AUTO_LOGIN is disabled**
3. **ALWAYS verify authentication works after deployment**
4. **ALWAYS use `/v1/public/auth/login` endpoint (not `/v1/auth/login`)**
5. **ALWAYS use form-urlencoded content-type (not JSON)**

## Related Documentation

- [Complete Deployment Guide](../../docs/RAILWAY_DEPLOYMENT.md)
- [Environment Variables Reference](../../docs/ENVIRONMENT_VARIABLES.md)
- [Authentication Integration](../../docs/AINATIVE_API_AUTHENTICATION.md)

---

**Last Updated**: 2026-01-18
