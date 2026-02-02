# Community Search APIs

**Endpoint Count:** 5

## Overview

This category contains 5 endpoints for community search operations.


## Community Search


### `GET /v1/search/`

**Summary:** Unified Community Search

Search across users, posts, groups, and events with a single query

**Parameters:**

- `q` (query) *(required)*: Search query
- `search_type` (query): Type of content to search
- `tenant_id` (query): Filter by tenant ID
- `offset` (query): Pagination offset
- `limit` (query): Results per page

**Success Response (200):** Successful Response

---

### `GET /v1/search/events`

**Summary:** Search Events

Search events by title or description

**Parameters:**

- `q` (query) *(required)*: Search query
- `tenant_id` (query): Filter by tenant ID
- `offset` (query): Pagination offset
- `limit` (query): Results per page

**Success Response (200):** Successful Response

---

### `GET /v1/search/groups`

**Summary:** Search Groups

Search groups by name or description

**Parameters:**

- `q` (query) *(required)*: Search query
- `tenant_id` (query): Filter by tenant ID
- `offset` (query): Pagination offset
- `limit` (query): Results per page

**Success Response (200):** Successful Response

---

### `GET /v1/search/posts`

**Summary:** Search Posts

Search posts by title or body

**Parameters:**

- `q` (query) *(required)*: Search query
- `tenant_id` (query): Filter by tenant ID
- `offset` (query): Pagination offset
- `limit` (query): Results per page

**Success Response (200):** Successful Response

---

### `GET /v1/search/users`

**Summary:** Search Users

Search users by username, name, or bio

**Parameters:**

- `q` (query) *(required)*: Search query
- `tenant_id` (query): Filter by tenant ID
- `offset` (query): Pagination offset
- `limit` (query): Results per page

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
