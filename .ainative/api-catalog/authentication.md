# Authentication APIs

**Endpoint Count:** 26

## Overview

This category contains 26 endpoints for authentication operations.


## Admin API


### `GET /admin/auth/debug-headers`

**Summary:** Debug Headers

Debug endpoint to see headers in main backend

**Success Response (200):** Successful Response

---

### `POST /admin/auth/login`

**Summary:** Admin Login

Admin login endpoint
Authenticates admin users and returns JWT token

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/auth/login/json`

**Summary:** Admin Login Json

Admin login endpoint (JSON version)
Authenticates admin users and returns JWT token

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/auth/logout`

**Summary:** Admin Logout

Admin logout endpoint
In a stateless JWT system, logout is handled client-side by removing the token

**Success Response (200):** Successful Response

---

### `GET /admin/auth/me`

**Summary:** Get Admin Info

Get current admin user information
Supports both JWT and API key authentication

**Success Response (200):** Successful Response

---

### `GET /v1/admin/auth/debug-headers`

**Summary:** Debug Headers

Debug endpoint to see headers in main backend

**Success Response (200):** Successful Response

---

### `POST /v1/admin/auth/login`

**Summary:** Admin Login

Admin login endpoint
Authenticates admin users and returns JWT token

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/auth/login/json`

**Summary:** Admin Login Json

Admin login endpoint (JSON version)
Authenticates admin users and returns JWT token

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/auth/logout`

**Summary:** Admin Logout

Admin logout endpoint
In a stateless JWT system, logout is handled client-side by removing the token

**Success Response (200):** Successful Response

---

### `GET /v1/admin/auth/me`

**Summary:** Get Admin Info

Get current admin user information
Supports both JWT and API key authentication

**Success Response (200):** Successful Response

---

## Public API


### `POST /v1/public/auth/` 🚫 **DEPRECATED**

**Summary:** Login Access Token

DEPRECATED: Use /v1/auth/login instead.
This endpoint will be removed on 2026-02-08.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/auth/account` 🚫 **DEPRECATED**

**Summary:** Delete Account

Delete user account

Permanently deletes the authenticated user account with all related data.
Handles cascading deletes for projects, API keys, documents, and other user data.

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/change-password` 🚫 **DEPRECATED**

**Summary:** Change Password

Change user password

- **current_password**: Current password
- **new_password**: New password (minimum 8 characters)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/forgot-password` 🚫 **DEPRECATED**

**Summary:** Forgot Password

Request password reset

- **email**: User email address

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/github/callback` 🚫 **DEPRECATED**

**Summary:** Github Oauth Callback

Handle GitHub OAuth callback

Exchange authorization code for access token and user info.
Creates or updates user account with GitHub information.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/linkedin/callback` 🚫 **DEPRECATED**

**Summary:** Linkedin Oauth Callback

Handle LinkedIn OAuth callback (Issue #413)

Exchange authorization code for access token and user info.
Creates or updates user account with LinkedIn information.

LinkedIn uses OpenID Connect (OIDC) for authentication:
- Token endpoint: https://www.linkedin.com/oauth/v2/accessToken
- UserInfo endpoint: https://api.linkedin.com/v2/userinfo

Required scopes: openid, profile, email

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/login` 🚫 **DEPRECATED**

**Summary:** Login Access Token

DEPRECATED: Use /v1/auth/login instead.
This endpoint will be removed on 2026-02-08.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/login-json` 🚫 **DEPRECATED**

**Summary:** Login With Json

DEPRECATED: Use /v1/auth/login instead.
This endpoint will be removed on 2026-02-08.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/logout` 🚫 **DEPRECATED**

**Summary:** Logout User

Logout user and invalidate current session

Note: This endpoint logs the logout event for security auditing.
Since JWTs are stateless, the client must discard the token on their end.
The token will naturally expire based on its expiration time.

Returns success message after logout.

**Success Response (200):** Successful Response

---

### `GET /v1/public/auth/me` 🚫 **DEPRECATED**

**Summary:** Get Current User Info

Get current authenticated user information

Returns user profile data for the authenticated user.

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/refresh` 🚫 **DEPRECATED**

**Summary:** Refresh Token

Refresh access token

Returns a new access token for the authenticated user

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/register` 🚫 **DEPRECATED**

**Summary:** Register User

DEPRECATED: Use /v1/auth/register instead.
This endpoint will be removed on 2026-02-08.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/resend-verification` 🚫 **DEPRECATED**

**Summary:** Resend Verification Email

Resend email verification link

- **email**: User's email address

Returns success message. For security, always returns success even if email doesn't exist.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/reset-password` 🚫 **DEPRECATED**

**Summary:** Reset Password

Reset password with token

- **token**: Password reset token
- **new_password**: New password

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/verify-email` 🚫 **DEPRECATED**

**Summary:** Verify Email

Verify user email with verification token

- **token**: Email verification token sent to user's email

Returns success message after email verification.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/auth/verify-token` 🚫 **DEPRECATED**

**Summary:** Verify Token Endpoint

Verify access token validity

Check if the provided token is valid and return user information.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
