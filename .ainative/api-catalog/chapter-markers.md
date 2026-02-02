# Chapter Markers APIs

**Endpoint Count:** 9

## Overview

This category contains 9 endpoints for chapter markers operations.


## Chapter Markers


### `GET /v1/videos/{video_id}/chapters`

**Summary:** List video chapters

Get all chapters for a video with optional filtering

**Parameters:**

- `video_id` (path) *(required)*: No description
- `source` (query): Filter by source: 'manual' or 'ai'
- `search` (query): Search in title and description
- `min_confidence` (query): Minimum confidence score

**Success Response (200):** Successful Response

---

### `POST /v1/videos/{video_id}/chapters`

**Summary:** Create manual chapter

Create a new chapter manually

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/videos/{video_id}/chapters/at-time`

**Summary:** Find chapter at timestamp

Find the active chapter at a specific video timestamp

**Parameters:**

- `video_id` (path) *(required)*: No description
- `timestamp` (query) *(required)*: Timestamp in seconds

**Success Response (200):** Successful Response

---

### `POST /v1/videos/{video_id}/chapters/generate`

**Summary:** Generate AI chapters from transcript

Automatically generate chapter markers using AI analysis of video transcript

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/videos/{video_id}/chapters/{chapter_id}`

**Summary:** Get chapter details

Get detailed information about a specific chapter

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/videos/{video_id}/chapters/{chapter_id}`

**Summary:** Update chapter

Update an existing chapter

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/videos/{video_id}/chapters/{chapter_id}`

**Summary:** Delete chapter

Delete a chapter

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

---

### `GET /v1/videos/{video_id}/chapters/{chapter_id}/next`

**Summary:** Get next chapter

Get the next chapter in sequence

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/videos/{video_id}/chapters/{chapter_id}/previous`

**Summary:** Get previous chapter

Get the previous chapter in sequence

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
