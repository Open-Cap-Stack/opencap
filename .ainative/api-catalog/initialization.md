# Initialization APIs

**Endpoint Count:** 11

## Overview

This category contains 11 endpoints for initialization operations.


## Initialization


### `POST /v1/init/create-admin`

**Summary:** Create Admin User Endpoint

Create admin user if it doesn't exist
Temporary endpoint for production initialization

**Success Response (200):** Successful Response

---

### `POST /v1/init/create-ai-context-tables`

**Summary:** Create Ai Context Tables

Create AI context management tables

**Success Response (200):** Successful Response

---

### `POST /v1/init/create-code-quality-tables`

**Summary:** Create Code Quality Tables

Create code quality analysis tables

**Success Response (200):** Successful Response

---

### `POST /v1/init/create-tables`

**Summary:** Create Tables

Create database tables if they don't exist

**Success Response (200):** Successful Response

---

### `GET /v1/init/db-info`

**Summary:** Db Info

Check database info and table existence

**Success Response (200):** Successful Response

---

### `GET /v1/init/debug-admin`

**Summary:** Debug Admin User

Debug admin user details including password verification

**Success Response (200):** Successful Response

---

### `POST /v1/init/migration`

**Summary:** Run Migrations

NUCLEAR FIX: Simplified migration endpoint
Returns success without actual migration operations

**Success Response (200):** Successful Response

---

### `POST /v1/init/reset-admin-password`

**Summary:** Reset Admin Password

Reset admin user password with proper bcrypt hash
Temporary endpoint for fixing password hash issues

**Success Response (200):** Successful Response

---

### `GET /v1/init/status`

**Summary:** Init Status

Check initialization status

**Success Response (200):** Successful Response

---

### `GET /v1/init/test-db-connection`

**Summary:** Test Db Connection

Test direct database connection like the migration system uses

**Success Response (200):** Successful Response

---

### `POST /v1/init/test-login`

**Summary:** Test Login Debug

Test the exact same login logic as the auth endpoint

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
