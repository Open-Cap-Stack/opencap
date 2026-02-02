# Albums APIs

**Endpoint Count:** 8

## Overview

This category contains 8 endpoints for albums operations.


## Albums


### `POST /v1/community/albums/`

**Summary:** Create a new album

Create a new photo/video album for the authenticated user

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/community/albums/`

**Summary:** Get user's albums

Get all albums for the authenticated user with pagination

**Parameters:**

- `page` (query): Page number
- `page_size` (query): Items per page

**Success Response (200):** Successful Response

---

### `GET /v1/community/albums/{album_id}`

**Summary:** Get album details

Get detailed information about an album including all items

**Parameters:**

- `album_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/community/albums/{album_id}`

**Summary:** Update album

Update album details (title, description, visibility, cover)

**Parameters:**

- `album_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/community/albums/{album_id}`

**Summary:** Delete album

Delete an album and all its items

**Parameters:**

- `album_id` (path) *(required)*: No description

---

### `POST /v1/community/albums/{album_id}/items`

**Summary:** Add item to album

Add a photo or video to an album

**Parameters:**

- `album_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/community/albums/{album_id}/items/{item_id}`

**Summary:** Remove item from album

Remove a photo or video from an album

**Parameters:**

- `album_id` (path) *(required)*: No description
- `item_id` (path) *(required)*: No description

---

### `POST /v1/community/albums/{album_id}/reorder`

**Summary:** Reorder album items

Change the order of items in an album

**Parameters:**

- `album_id` (path) *(required)*: No description

**Request Body:** JSON

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
