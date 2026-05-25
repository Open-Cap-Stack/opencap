# OpenCap Plugin — Submission Pre-Checklist

**Issue**: #507 — Submit OpenCap plugin to claude.ai plugin store  
**Related**: #504 (manifest), #505 (OAuth flow), #506 (OpenAPI spec)  
**Date**: 2026-05-19  
**Checklist status**: NOT READY FOR SUBMISSION

---

## Summary

7 of 13 requirements are ready. 6 items require work before submission. Blocking items are the logo (wrong format/size), missing OAuth refresh token support, manifest/spec mismatches, and missing plugin environment variables in production config.

---

## Pre-Submission Checklist

### Manifest (`/.well-known/ai-plugin.json`)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Manifest file exists and is served | ✅ Done | Served at `/.well-known/ai-plugin.json` via `axDiscoveryRoutes.js`. File at `client/public/.well-known/ai-plugin.json`. |
| 2 | `schema_version: "v1"` present | ✅ Done | Confirmed in manifest. |
| 3 | `name_for_human`, `name_for_model`, descriptions present | ✅ Done | All four description fields populated. |
| 4 | `logo_url` points to a valid 512×512 PNG | ❌ Missing | Currently `https://app.opencapstack.com/favicon.svg` — an SVG file. Plugin store requires a 512×512 PNG. The two PNG files in `client/public/` (`ocs-icon.png`, `ocs-logo.png`) are both 1536×1024. A 512×512 PNG must be created, served at a public URL (e.g. `https://app.opencapstack.com/logo.png`), and the manifest `logo_url` updated. |
| 5 | `contact_email` and `legal_info_url` present | ✅ Done | `support@opencapstack.com` and `https://opencapstack.com/legal`. |
| 6 | OAuth scopes match PRD | ⚠️ Needs work | Manifest scope: `cap_table:read cap_table:write documents:read`. PRD (Section 5.2) specifies five scopes including `documents:write` and `reporting:read`. The manifest is missing two scopes. Update `auth.scope` in `client/public/.well-known/ai-plugin.json`. |
| 7 | `api.url` points to the served OpenAPI spec | ⚠️ Needs work | Manifest `api.url` is `https://api.opencapstack.com/openapi.json`, which matches the actual served path (`/openapi.json` via `axDiscoveryRoutes.js`). However the PRD says the spec should be at `/.well-known/openapi.yaml`. Recommend aligning one way: either move the spec to `/.well-known/openapi.yaml` and add a route, or update the PRD. Current state is functional but inconsistent with the PRD. |

---

### OpenAPI Specification (`/openapi.json`)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 8 | OpenAPI 3.x spec file exists and is served | ✅ Done | Served at `/openapi.json` via `axDiscoveryRoutes.js`. File at `client/public/openapi.json`. Valid JSON. |
| 9 | Spec is valid OpenAPI 3.x | ✅ Done | Version `3.0.3`, has `info`, `servers`, `paths` (15 paths), `components`, `securitySchemes`. All required top-level fields present. |
| 10 | OAuth endpoints documented in spec | ✅ Done | Spec includes `/auth/plugin/authorize`, `/auth/plugin/token`, `/auth/plugin/userinfo`, and `/plugin/summary`. |

---

### OAuth Flow (`/api/v1/auth/plugin/*`)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 11 | OAuth authorize endpoint implemented | ✅ Done | `GET /api/v1/auth/plugin/authorize` in `routes/v1/pluginAuthRoutes.js`, handled by `controllers/pluginAuthController.js`. Authorization code flow with 5-minute TTL, redirect URI validation, and `PLUGIN_CLIENT_ID` check. 27 unit tests passing. |
| 12 | Token exchange endpoint implemented | ✅ Done | `POST /api/v1/auth/plugin/token` exchanges auth code for a JWT access token. Client secret validation, single-use codes, and redirect URI binding are all present. |
| 13 | Refresh token support | ❌ Missing | The token endpoint returns `access_token`, `token_type`, and `expires_in` (1 hour). It does **not** issue a `refresh_token` and does not handle `grant_type: refresh_token`. The PRD (Section 5.3, step 7) states "Token refresh is handled automatically using the refresh token." Without refresh tokens, the user must re-authenticate every hour. This is a blocking gap for a production plugin. |

---

### Logo Asset

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 14 | 512×512 PNG logo served at a public URL | ❌ Missing | No 512×512 PNG exists. `ocs-icon.png` is 1536×1024; `ocs-logo.png` is 1536×1024; `favicon.svg` is an SVG. No `/logo.png` route is registered anywhere in the app. Action needed: resize or create a 512×512 PNG, add it to `client/public/`, add a route in `axDiscoveryRoutes.js`, and update the manifest `logo_url`. |

---

### Environment Configuration

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 15 | Plugin env vars documented and configured | ⚠️ Needs work | The OAuth controller requires `PLUGIN_CLIENT_ID`, `PLUGIN_CLIENT_SECRET`, and `PLUGIN_REDIRECT_URI`. These are not validated in `config/validateEnv.js`, and there is no evidence they are documented in `.env.example`. They must be set in the production environment before the plugin can function. Add validation and documentation. |

---

## What Is Ready

- Manifest file exists and is correctly structured and served
- OpenAPI 3.0.3 spec exists, is valid, is served, and documents the OAuth and plugin endpoints
- OAuth authorize and token endpoints are fully implemented with tests (27 passing)
- Plugin tool handler (`/api/v1/plugin/summary`) exists and is tested
- `/.well-known/ai-plugin.json`, `/openapi.json`, and `/.well-known/agent.json` are all served with correct `Content-Type` and `Cache-Control` headers

---

## What Is Blocking Submission

1. **Logo** — SVG logo in manifest; plugin store requires 512×512 PNG. No `/logo.png` route exists.
2. **Refresh tokens** — Token endpoint issues no `refresh_token` and does not implement the `refresh_token` grant type. Users will be forced to re-authorize every hour.
3. **Missing OAuth scopes in manifest** — `documents:write` and `reporting:read` are absent from `auth.scope`.
4. **Plugin env vars not in production config** — `PLUGIN_CLIENT_ID`, `PLUGIN_CLIENT_SECRET`, `PLUGIN_REDIRECT_URI` are required at runtime but are not validated or documented.

---

## Recommended Next Steps

1. **Create 512×512 PNG logo** — Export from existing brand assets, add to `client/public/logo.png`, add `router.get('/logo.png', sendFile('logo.png', 'image/png'))` to `routes/axDiscoveryRoutes.js`, and update `logo_url` in `client/public/.well-known/ai-plugin.json`.

2. **Add refresh token support** — In `controllers/pluginAuthController.js`, issue a `refresh_token` alongside the access token in the `/token` response. Add a `grant_type: refresh_token` branch that validates the refresh token and issues a new access token. Store refresh tokens with longer TTL (e.g. 30 days).

3. **Fix manifest scopes** — Add `documents:write` and `reporting:read` to `auth.scope` in `client/public/.well-known/ai-plugin.json`.

4. **Document and validate plugin env vars** — Add `PLUGIN_CLIENT_ID`, `PLUGIN_CLIENT_SECRET`, and `PLUGIN_REDIRECT_URI` to `.env.example` with comments. Add production validation in `config/validateEnv.js` (warn in dev, error in prod if not set).

5. **Resolve manifest/PRD path discrepancy** (minor) — Either move the OpenAPI spec to `/.well-known/openapi.yaml` (add route, update manifest `api.url`) or update the PRD to reflect the current `openapi.json` path. Both are valid; just needs to be consistent.

6. **End-to-end OAuth test** — Once the above items are addressed, perform a live OAuth round-trip against the production API before final submission.

---

## File Locations

| File | Path |
|------|------|
| Plugin manifest | `client/public/.well-known/ai-plugin.json` |
| OpenAPI spec | `client/public/openapi.json` |
| AX discovery routes (serves manifests) | `routes/axDiscoveryRoutes.js` |
| Plugin auth controller | `controllers/pluginAuthController.js` |
| Plugin auth routes | `routes/v1/pluginAuthRoutes.js` |
| Plugin tool routes | `routes/v1/pluginRoutes.js` |
| Plugin auth tests | `tests/unit/controllers/pluginAuthController.test.js` |
| Plugin routes tests | `tests/unit/routes/pluginRoutes.test.js` |
| PRD | `docs/PRD_MCP_AND_CLAUDE_PLUGIN.md` |
