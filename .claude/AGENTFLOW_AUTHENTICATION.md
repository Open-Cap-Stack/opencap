# AgentFlow Authentication Rules

## Critical Authentication Requirements

### ⚠️ ZERO TOLERANCE: AUTO_LOGIN Configuration

**Production MUST have `AGENTFLOW_AUTO_LOGIN=false`**

This is not optional. Auto-login in production is a security vulnerability.

### Environment Variable Requirements

```bash
# MANDATORY for production
AGENTFLOW_AUTO_LOGIN=false                    # CRITICAL: Never true in production
AGENTFLOW_API_URL=https://api.ainative.studio # Required for AINative API auth
```

## AINative API Integration

### Correct Endpoint and Format

**Endpoint**: `https://api.ainative.studio/v1/public/auth/login`

**Content-Type**: `application/x-www-form-urlencoded`

**Fields**: `username` and `password`

### ✅ Correct Implementation

```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        f"{ainative_api_url}/v1/public/auth/login",  # ✓ Correct endpoint
        data={"username": username, "password": password},  # ✓ Form data with username
        headers={"Content-Type": "application/x-www-form-urlencoded"},  # ✓ Correct content-type
        timeout=10.0
    )
```

### ❌ Common Mistakes (DO NOT DO THIS)

```python
# WRONG ENDPOINT
f"{ainative_api_url}/v1/auth/login"  # ❌ Missing /public/

# WRONG CONTENT TYPE
json={"email": username, "password": password}  # ❌ Using JSON instead of form

# WRONG FIELD NAME
data={"email": username, "password": password}  # ❌ Using email instead of username
```

## Authentication Flow

### 1. User Login Attempt

User provides credentials via login form or API.

### 2. AINative API Authentication (First)

```python
# Try AINative API first
response = await client.post(
    f"{ainative_api_url}/v1/public/auth/login",
    data={"username": username, "password": password},
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    timeout=10.0
)

if response.status_code == 200:
    # Success - auto-create local user if needed
    user = await get_user_by_username(db, username)
    if not user:
        # Auto-create user
        user = User(
            id=uuid4(),
            username=username,
            password=get_password_hash(password),
            is_active=True,
            is_superuser=(username == "admin@ainative.studio")
        )
        db.add(user)
        await db.commit()
    return user
```

### 3. Fallback to Local Authentication

```python
except Exception as e:
    logger.warning(f"AINative API failed: {e}, falling back to local auth")

# Check local database
user = await get_user_by_username(db, username)
if user and verify_password(password, user.password):
    return user
```

## Testing Authentication

### Test AUTO_LOGIN Status

```bash
curl https://agentflow.ainative.studio/api/v1/auto_login
```

**Expected (Production)**:
```json
{
  "detail": {
    "message": "Auto login is disabled. Please enable it in the settings",
    "auto_login": false
  }
}
```

**HTTP Status**: 400 (Bad Request)

**❌ If it returns anything else, AUTO_LOGIN is enabled - FIX IMMEDIATELY**

### Test Login with AINative Credentials

```bash
curl -X POST https://agentflow.ainative.studio/api/v1/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ainative.studio&password=Admin2025!Secure"
```

**Expected**:
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

**HTTP Status**: 200 (Success)

### Test AINative API Directly

```bash
curl -X POST https://api.ainative.studio/v1/public/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@ainative.studio&password=Admin2025!Secure"
```

Should return access token from AINative API.

## Troubleshooting

### Login Fails with "Incorrect username or password"

**Check these in order:**

1. **Verify AINative API is accessible**:
   ```bash
   curl -I https://api.ainative.studio/health
   ```

2. **Check environment variable**:
   ```bash
   railway variables --service "AgentFlow" | grep AGENTFLOW_API_URL
   ```
   Should be: `https://api.ainative.studio`

3. **Verify endpoint in code**:
   ```bash
   grep -n "v1/public/auth/login" src/backend/base/agentflow/services/auth/utils.py
   ```
   Should find: `/v1/public/auth/login` (not `/v1/auth/login`)

4. **Check content-type in code**:
   ```bash
   grep -A 2 "auth/login" src/backend/base/agentflow/services/auth/utils.py | grep -i content-type
   ```
   Should find: `application/x-www-form-urlencoded`

5. **Check field names in code**:
   ```bash
   grep -A 2 "auth/login" src/backend/base/agentflow/services/auth/utils.py | grep data=
   ```
   Should find: `username` (not `email`)

### No Login Page (Auto-Login Still Active)

**Symptom**: Homepage loads without login prompt

**Fix**:
```bash
# 1. Check current setting
railway variables --service "AgentFlow" | grep AUTO_LOGIN

# 2. Set to false
railway variables --service "AgentFlow" --set "AGENTFLOW_AUTO_LOGIN=false"

# 3. Force redeploy
git commit --allow-empty -m "Disable auto-login"
git push origin main

# 4. Verify after 2-3 minutes
curl https://agentflow.ainative.studio/api/v1/auto_login
# Must return: {"detail":{"message":"Auto login is disabled...","auto_login":false}}
```

### Authentication Works Locally but Fails in Production

**Common causes**:

1. **Missing environment variable**:
   ```bash
   railway variables --service "AgentFlow"
   ```
   Verify both `AGENTFLOW_AUTO_LOGIN=false` and `AGENTFLOW_API_URL` are set

2. **Code not deployed**:
   ```bash
   railway status --json | grep -A 5 '"name": "AgentFlow"'
   ```
   Check commit hash matches your latest push

3. **Network issue from Railway to AINative API**:
   ```bash
   railway logs --service "AgentFlow" --lines 100 | grep -i "ainative\|auth"
   ```
   Look for connection errors or timeouts

## Security Rules

### ✅ DO

1. **Set `AGENTFLOW_AUTO_LOGIN=false` in production**
2. **Use HTTPS for all AINative API calls**
3. **Hash passwords before storing** (bcrypt with salt)
4. **Validate username/password format** before sending to API
5. **Log authentication attempts** (success and failure)
6. **Implement rate limiting** on login endpoint
7. **Use secure session tokens** (JWT with expiration)
8. **Auto-create users only on successful AINative auth**

### ❌ DON'T

1. **Never set `AGENTFLOW_AUTO_LOGIN=true` in production**
2. **Never log passwords** (even hashed)
3. **Never store passwords in plain text**
4. **Never skip AINative API authentication** in production
5. **Never hard-code credentials** in code or config
6. **Never commit .env files** with credentials
7. **Never expose database credentials** in error messages
8. **Never allow unlimited login attempts**

## Auto-User Creation Rules

### When to Auto-Create

**Only create users automatically when**:
1. AINative API authentication succeeds (HTTP 200)
2. User doesn't exist locally (`get_user_by_username` returns None)
3. Username is valid (non-empty, proper format)

### User Creation Fields

```python
user = User(
    id=uuid4(),                                          # Generate new UUID
    username=username,                                   # From login request
    password=get_password_hash(password),                # Hash with bcrypt
    is_active=True,                                      # Always true for AINative users
    is_superuser=(username == "admin@ainative.studio")   # Only for admin
)
```

### Superuser Detection

**Admin account**: `admin@ainative.studio`

This user gets `is_superuser=True` automatically.

All other users get `is_superuser=False`.

## Logging Requirements

### Log Successful Authentication

```python
logger.info(f"AINative API authentication successful for user {username}")
logger.info(f"Auto-created user {username} from AINative API authentication")
```

### Log Authentication Failures

```python
logger.warning(f"AINative API authentication failed: {e}, falling back to local auth")
```

### Never Log

- ❌ Passwords (plain or hashed)
- ❌ Session tokens
- ❌ API keys
- ❌ Database credentials

## Code Location

**Implementation file**: `src/backend/base/agentflow/services/auth/utils.py`

**Function**: `authenticate_user(username: str, password: str, db: AsyncSession) -> User | None`

**Line**: ~598-640

## Verification Checklist

Before marking authentication as complete:

- [ ] `AGENTFLOW_AUTO_LOGIN=false` set in Railway
- [ ] Auto-login endpoint returns `{"auto_login": false}`
- [ ] Login with AINative credentials returns tokens
- [ ] AINative API called at `/v1/public/auth/login`
- [ ] Content-type is `application/x-www-form-urlencoded`
- [ ] Request uses `username` field (not `email`)
- [ ] Auto-user creation works for new users
- [ ] Admin users get `is_superuser=True`
- [ ] Fallback to local auth works if AINative API fails
- [ ] Production frontend shows login page

## Related Documentation

- [AINative API Authentication Guide](../../docs/AINATIVE_API_AUTHENTICATION.md)
- [Environment Variables Reference](../../docs/ENVIRONMENT_VARIABLES.md)
- [Railway Deployment Guide](../../docs/RAILWAY_DEPLOYMENT.md)

---

**Last Updated**: 2026-01-18
