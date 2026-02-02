# Github Integration APIs

**Endpoint Count:** 6

## Overview

This category contains 6 endpoints for github integration operations.


## GitHub Integration


### `POST /api/github/webhook`

**Summary:** Github Webhook

NUCLEAR FIX: Simplified GitHub webhook handler
Accepts all webhook events without signature verification for development

**Success Response (200):** Successful Response

---

### `GET /v1/github/connection-status`

**Summary:** Get Connection Status

Check GitHub connection status

Returns whether user has connected their GitHub account and basic connection info.
This is a simplified endpoint that returns connection status without full settings.

**Success Response (200):** Successful Response

---

### `GET /v1/github/repositories`

**Summary:** Get Github Repositories

Get GitHub repositories for user using stored OAuth token

Fetches real repository data from api.github.com using the user's
stored GitHub access token.

**Parameters:**

- `limit` (query): No description
- `include_private` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/github/settings`

**Summary:** Get Github Settings

Get GitHub integration settings - now properly integrated with GitHubSettingsService

**Success Response (200):** Successful Response

---

### `POST /v1/github/token`

**Summary:** Save Github Token

Save GitHub token - now properly integrated with GitHubSettingsService

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/github/user`

**Summary:** Get Github User

Get GitHub user information using stored OAuth token

Fetches real GitHub user data from api.github.com using the user's
stored GitHub access token (saved during OAuth callback).

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
