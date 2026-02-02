# Code Chunks APIs

**Endpoint Count:** 5

## Overview

This category contains 5 endpoints for code chunks operations.


## Code Chunks


### `GET /v1/code-chunks/`

**Summary:** List Code Chunks

List all code chunks.

SCSS V2.0 compliant with real database operations.

**Success Response (200):** Successful Response

---

### `POST /v1/code-chunks/`

**Summary:** Create Code Chunk

Create a new code chunk.

SCSS V2.0 compliant with direct SQL operations.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/code-chunks/{chunk_id}`

**Summary:** Get Code Chunk

Get a code chunk by ID.

SCSS V2.0 compliant with direct SQL operations.

**Parameters:**

- `chunk_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/code-chunks/{chunk_id}`

**Summary:** Update Code Chunk

Update a code chunk.

SCSS V2.0 compliant with direct SQL operations.

**Parameters:**

- `chunk_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/code-chunks/{chunk_id}`

**Summary:** Delete Code Chunk

Delete a code chunk (soft delete).

SCSS V2.0 compliant with direct SQL operations.

**Parameters:**

- `chunk_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
