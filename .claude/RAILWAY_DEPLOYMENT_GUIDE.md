# Railway Deployment Guide

## Service Architecture

The AINative Studio production environment uses a multi-service architecture on Railway:

### Key Services

1. **kong-gateway** - API Gateway (routes requests to backend services)
2. **core** - Main Python backend (handles auth, users, billing, etc.)
3. **AINative-Community** - Strapi CMS service
4. **ainative-postgres** - PostgreSQL database
5. Other services: QNN, AgentFlow, ZeroPipeline, etc.

### Critical: Deploy to the Correct Service

**ALWAYS deploy backend code to the `core` service, NOT kong-gateway!**

## Deployment Commands

### 1. List All Services
```bash
railway status --json | jq -r '.services.edges[].node.name'
```

### 2. Identify Backend Service
The main Python backend is the **"AINative- Core -Production"** service.

**WARNING:** There is also a service called **"core"** (without the AINative prefix) - this is NOT the production service! Always use the full service name "AINative- Core -Production".

### 3. Deploy to Core Backend
```bash
# Option 1: Deploy with service flag (RECOMMENDED)
railway up --detach --service "AINative- Core -Production"

# Option 2: Link to service first, then deploy
railway link --service "AINative- Core -Production"
railway up --detach
```

### 4. Check Deployment Status
```bash
# View deployment in Railway dashboard
railway status --json | jq -r '.services.edges[] | select(.node.name == "core") | .node.serviceInstances.edges[0].node.latestDeployment'
```

## Common Mistakes to Avoid

❌ **DON'T:** Deploy without specifying service (deploys to wrong service)
```bash
railway up  # This will deploy to whatever service is linked (often wrong!)
```

✅ **DO:** Always specify the service explicitly
```bash
railway up --service core  # Correct!
```

❌ **DON'T:** Assume `railway up` knows which service based on the code
- Railway doesn't auto-detect service from code
- It uses the `.railway` config or prompts interactively
- In non-TTY environments (like Claude Code), prompts fail

✅ **DO:** Use Railway docs to understand service structure first
- Check Railway dashboard to see all services
- Identify which service handles which functionality
- Kong Gateway = API proxy (don't deploy backend code here!)
- Core = Python backend (deploy auth/API code here!)

## GitHub CI/CD Integration

Railway can auto-deploy from GitHub when CI passes. If CI fails:

### Option 1: Fix CI and Let Auto-Deploy Work
```bash
# Fix failing tests
# Commit fixes
# Push to main
# Railway auto-deploys when CI passes
```

### Option 2: Force Deploy (Bypass CI)
```bash
# Use when change is critical and safe despite CI failures
railway up --detach --service core
```

## Verifying Deployment

### 1. Check Health Endpoint
```bash
curl https://api.ainative.studio/health | jq
```

Note: This shows kong-gateway info, not core backend. Kong routes to core.

### 2. Test Actual Functionality
```bash
# Test registration (uses core backend)
curl -X POST "https://api.ainative.studio/v1/public/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'
```

### 3. Check Railway Dashboard
- Build logs: https://railway.com/project/{project-id}/service/{service-id}
- Deployment status
- Error logs if deployment failed

## Database Connection Issues

If you see "Database connection failed" after deployment:

1. **Wait 2-3 minutes** - Service might still be starting
2. **Check Railway logs** - Look for connection errors
3. **Verify environment variables** - DATABASE_URL must be set correctly
4. **Check database service status** - Ensure PostgreSQL is running

## Troubleshooting

### Issue: "Service not found"
**Solution:** List services first, use exact service name
```bash
railway status --json | jq -r '.services.edges[].node.name'
railway up --service core  # Use exact name from list
```

### Issue: "Multiple services found"
**Solution:** Always use `--service` flag explicitly

### Issue: Deployment succeeds but changes don't appear
**Possible causes:**
1. Deployed to wrong service (check service name)
2. Code not committed to git (Railway deploys from git, not local files)
3. Deployment still in progress (wait longer)
4. Cache issue (try hard refresh or new incognito window)

## Best Practices

1. **Always verify service name before deploying**
   ```bash
   railway status --json | jq -r '.services.edges[] | select(.node.name == "core")'
   ```

2. **Use explicit service flags**
   ```bash
   railway up --detach --service core  # Good
   railway up  # Bad - ambiguous
   ```

3. **Check deployment status after deploying**
   ```bash
   # Wait 2-3 minutes, then test
   curl https://api.ainative.studio/health
   ```

4. **Use Railway dashboard for detailed logs**
   - More reliable than CLI for checking deployment progress
   - Shows build output, runtime logs, errors
   - Access: https://railway.com/project/{project-id}

## Quick Reference

```bash
# Deploy backend code (auth, API, etc.)
railway up --detach --service "AINative- Core -Production"

# Deploy Strapi CMS
cd community/strapi-community
railway up --detach --service AINative-Community

# Check all services and their status
railway status --json | jq -r '.services.edges[].node | {name, latestDeployment: .serviceInstances.edges[0].node.latestDeployment.status}'
```

---

**Remember:** The `AINative- Core -Production` service is the Python FastAPI backend that handles:
- Authentication (`/v1/auth/*`, `/v1/public/auth/*`)
- User management
- Billing/Stripe integration
- API keys
- ZeroDB integration
- Email service

**Kong Gateway** is just the API proxy - it routes requests to `AINative- Core -Production` and other services.

---

**Last Updated:** 2025-12-31
