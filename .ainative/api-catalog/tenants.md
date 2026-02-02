# Tenants APIs

**Endpoint Count:** 9

## Overview

This category contains 9 endpoints for tenants operations.


## Tenants


### `POST /v1/tenants/`

**Summary:** Create Tenant

Create a new tenant.

- User becomes OWNER of the tenant
- Slug must be unique (URL-safe identifier)
- Domain must be unique if provided

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/tenants/`

**Summary:** List Tenants

List tenants with pagination.

**Parameters:**

- `tier` (query): No description
- `offset` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/tenants/{tenant_id}`

**Summary:** Get Tenant

Get tenant by ID.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/tenants/{tenant_id}`

**Summary:** Update Tenant

Update tenant information.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/tenants/{tenant_id}`

**Summary:** Delete Tenant

Soft delete a tenant.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

---

### `POST /v1/tenants/{tenant_id}/members`

**Summary:** Add Tenant Member

Add a member to a tenant.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/tenants/{tenant_id}/members`

**Summary:** List Tenant Members

List members of a tenant.

**Parameters:**

- `tenant_id` (path) *(required)*: No description
- `role` (query): No description
- `offset` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/tenants/{tenant_id}/members/{user_id}/role`

**Summary:** Update Member Role

Update a member's role.

**Parameters:**

- `tenant_id` (path) *(required)*: No description
- `user_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PATCH /v1/tenants/{tenant_id}/settings`

**Summary:** Update Tenant Settings

Update tenant configuration settings.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
