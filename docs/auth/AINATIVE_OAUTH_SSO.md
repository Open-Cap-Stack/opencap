# AINative OAuth 2.0 SSO — Sign in with AINative

## Overview

OpenCap Stack supports "Sign in with AINative" via OAuth 2.0 Authorization Code flow with PKCE. Users with AINative accounts can authenticate into OCS without creating a separate account.

## OAuth Configuration

| Parameter | Value |
|-----------|-------|
| Client ID | `f064e124-9a9e-4ccd-92dc-f7c3b62c9190` |
| Authorize URL | `https://api.ainative.studio/oauth/authorize` |
| Token URL | `https://api.ainative.studio/v1/oauth/token` |
| UserInfo URL | `https://api.ainative.studio/oauth/userinfo` |
| Redirect URI | `https://opencapstack.com/api/auth/callback/ainative` |
| Scope | `user:profile` |
| PKCE | S256 (required) |
| Discovery | `https://api.ainative.studio/.well-known/openid-configuration` |

## Environment Variables

Set in Railway (backend service):

```bash
AINATIVE_OAUTH_CLIENT_ID=f064e124-9a9e-4ccd-92dc-f7c3b62c9190
AINATIVE_OAUTH_CLIENT_SECRET=<secret — stored in Railway env vars>
```

## Authentication Flow

```
User clicks "Sign in with AINative"
        │
        ▼
Frontend generates PKCE verifier + challenge, stores in sessionStorage
        │
        ▼
Redirect to: api.ainative.studio/oauth/authorize
  ?client_id=...&redirect_uri=...&response_type=code
  &scope=user:profile&state=...&code_challenge=...&code_challenge_method=S256
        │
        ▼
User logs in on AINative login page
        │
        ▼
AINative redirects to: opencapstack.com/api/auth/callback/ainative?code=...&state=...
        │
        ▼
Next.js API route redirects to: /auth/ainative/callback?code=...&state=...
        │
        ▼
Callback page sends { code, code_verifier, redirect_uri } to OCS backend
  POST /api/v1/auth/exchange-token
        │
        ▼
Backend exchanges code for access_token (server-side, with client_secret)
  POST api.ainative.studio/v1/oauth/token
        │
        ▼
Backend resolves user profile:
  1. Try GET /oauth/userinfo
  2. Fallback: GET /api/v1/auth/me
  3. Fallback: decode JWT payload (sub = email)
        │
        ▼
Match or provision OCS user by email
        │
        ▼
Issue OCS JWT + refresh token
        │
        ▼
Frontend stores tokens, redirects:
  - Existing user (has companyId) → /dashboard
  - New user (no companyId) → /company-setup
```

## User Provisioning

### Existing user (email match)
- Returns existing OCS account with all roles/permissions intact
- Updates `lastLogin` timestamp

### New user (no email match)
- Auto-provisioned with:
  - Role: `employee`
  - Status: `active`
  - Auth provider: `ainative`
  - Random password (SSO users don't use password auth)
  - No companyId (null)
- Redirected to `/company-setup` to either:
  1. Create a new company (user becomes founder/admin)
  2. Join an existing company via invite code

## Security

- **client_secret** never touches the browser — token exchange is server-side only
- **PKCE** (S256) protects against authorization code interception
- **state** parameter prevents CSRF attacks
- Auto-provisioned users get a random 32-byte password (unusable for direct login)
- Rate-limited: same limits as `/auth/login`

## Files

### Frontend (opencap-frontend)
- `lib/authService.js` — `initiateAINativeLogin()`, `handleAINativeCallback()`
- `app/api/auth/callback/ainative/route.js` — redirect handler
- `app/auth/[provider]/callback/page.jsx` — code exchange + redirect logic

### Backend (opencapstack)
- `controllers/authController.js` — `exchangeAINativeToken()`
- `middleware/authMiddleware.js` — `provisionAINativeUser()`
- `routes/v1/authRoutes.js` — `POST /exchange-token`

## Related Issues
- #665 — AINative OAuth 2.0 SSO integration
