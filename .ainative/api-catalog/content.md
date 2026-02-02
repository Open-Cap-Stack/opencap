# Content APIs

**Endpoint Count:** 25

## Overview

This category contains 25 endpoints for content operations.


## Public API


### `GET /v1/public/videos/{video_id}/related`

**Summary:** Get Related Videos

Get ML-based recommendations for videos related to the specified video

**Parameters:**

- `video_id` (path) *(required)*: No description
- `limit` (query): Maximum number of recommendations to return
- `strategy` (query): Recommendation algorithm: content, collaborative, or hybrid

**Success Response (200):** Successful Response

---

### `GET /v1/public/videos/{video_id}/related/analytics`

**Summary:** Get Recommendation Analytics

Get CTR analytics for video recommendations (admin only)

**Parameters:**

- `video_id` (path) *(required)*: No description
- `time_range_days` (query): Analytics time range in days

**Success Response (200):** Successful Response

---

### `POST /v1/public/videos/{video_id}/related/click`

**Summary:** Track Recommendation Click

Record when a user clicks on a recommended video for CTR analysis

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

## Video Recommendations


### `GET /v1/videos/{video_id}/related`

**Summary:** Get Related Videos

Get ML-based recommendations for videos related to the specified video

**Parameters:**

- `video_id` (path) *(required)*: No description
- `limit` (query): Maximum number of recommendations to return
- `strategy` (query): Recommendation algorithm: content, collaborative, or hybrid

**Success Response (200):** Successful Response

---

### `GET /v1/videos/{video_id}/related/analytics`

**Summary:** Get Recommendation Analytics

Get CTR analytics for video recommendations (admin only)

**Parameters:**

- `video_id` (path) *(required)*: No description
- `time_range_days` (query): Analytics time range in days

**Success Response (200):** Successful Response

---

### `POST /v1/videos/{video_id}/related/click`

**Summary:** Track Recommendation Click

Record when a user clicks on a recommended video for CTR analysis

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

## 🎬 Showcase Videos


### `GET /api/v1/videos/showcase`

**Summary:** Filter Showcase Videos

Filter and search showcase demo videos.

Supports:
- Technology stack filtering (e.g., ?tech_stack=React,Python)
- Tag-based filtering (e.g., ?tags=opensource,tutorial)
- Full-text search in title and description
- Pagination

Returns only DEMO type videos with showcase metadata.

Issue #192

**Parameters:**

- `tech_stack` (query): Filter by technology (comma-separated)
- `tags` (query): Filter by tags (comma-separated)
- `search` (query): Search in title and description
- `page` (query): Page number
- `limit` (query): Items per page

**Success Response (200):** Successful Response

---

### `POST /api/v1/videos/{video_id}/annotations`

**Summary:** Create Annotation

Add timed annotation to a showcase video.

Annotations provide interactive markers during video playback:
- Feature demonstrations
- Technology explanations
- Bug fix highlights
- Educational information

Issue #192

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /api/v1/videos/{video_id}/annotations`

**Summary:** List Annotations

List all annotations for a video in chronological order.

Supports optional filtering by annotation type.
Returns annotations sorted by timestamp for timeline display.

Issue #192

**Parameters:**

- `video_id` (path) *(required)*: No description
- `type` (query): Filter by annotation type

**Success Response (200):** Successful Response

---

### `PATCH /api/v1/videos/{video_id}/annotations/{annotation_id}`

**Summary:** Update Annotation

Update an existing video annotation.

Allows modification of timestamp, title, description, type, and URL.
Validates ownership and video duration constraints.

Issue #192

**Parameters:**

- `video_id` (path) *(required)*: No description
- `annotation_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /api/v1/videos/{video_id}/annotations/{annotation_id}`

**Summary:** Delete Annotation

Delete a video annotation.

Permanently removes the annotation from the video.
Validates ownership before deletion.

Issue #192

**Parameters:**

- `video_id` (path) *(required)*: No description
- `annotation_id` (path) *(required)*: No description

---

## 📹 Videos CRUD


### `POST /api/v1/videos/demos`

**Summary:** Create Demo

Create a new demo showcase video.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /api/v1/videos/demos`

**Summary:** List Demos

List demo videos with pagination.

**Parameters:**

- `offset` (query): Pagination offset
- `limit` (query): Items per page
- `status_filter` (query): Filter by status

**Success Response (200):** Successful Response

---

### `GET /api/v1/videos/demos/{video_id}`

**Summary:** Get Demo

Get demo video details.

**Parameters:**

- `video_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /api/v1/videos/tutorials`

**Summary:** Create Tutorial

Create a new tutorial video.

Validates:
- Title length (1-200 chars)
- Description length (max 2000 chars)
- Duration is positive

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /api/v1/videos/tutorials`

**Summary:** List Tutorials

List tutorial videos with pagination.

Supports:
- Pagination (offset/limit)
- Status filtering
- User-specific filtering

**Parameters:**

- `offset` (query): Pagination offset
- `limit` (query): Items per page
- `status_filter` (query): Filter by status

**Success Response (200):** Successful Response

---

### `GET /api/v1/videos/tutorials/{video_id}`

**Summary:** Get Tutorial

Get tutorial details with chapters.

Returns tutorial video with all associated chapters ordered by sequence.

**Parameters:**

- `video_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /api/v1/videos/tutorials/{video_id}/chapters`

**Summary:** Add Chapter

Add a chapter to a tutorial video.

Validates:
- Video exists and belongs to user
- Chapter times are non-overlapping
- end_time > start_time

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /api/v1/videos/tutorials/{video_id}/chapters`

**Summary:** List Chapters

List all chapters for a tutorial video, ordered by sequence.

**Parameters:**

- `video_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /api/v1/videos/tutorials/{video_id}/chapters/{chapter_id}`

**Summary:** Update Chapter

Update a chapter.

Validates ownership and non-overlapping times.

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /api/v1/videos/tutorials/{video_id}/chapters/{chapter_id}`

**Summary:** Delete Chapter

Delete a chapter from a tutorial video.

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

---

### `POST /api/v1/videos/webinars`

**Summary:** Create Webinar

Create a new webinar with associated video.

Creates both video record and webinar metadata in a single transaction.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /api/v1/videos/webinars`

**Summary:** List Webinars

List webinars with filtering by time (upcoming/past).

Filters:
- upcoming: scheduled_at > now
- past: scheduled_at < now
- all: no filter

**Parameters:**

- `filter_type` (query): Filter: upcoming, past, or all
- `offset` (query): Pagination offset
- `limit` (query): Items per page

**Success Response (200):** Successful Response

---

### `GET /api/v1/videos/webinars/{webinar_id}`

**Summary:** Get Webinar

Get webinar details with full video information.

**Parameters:**

- `webinar_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /api/v1/videos/webinars/{webinar_id}/register`

**Summary:** Register For Webinar

Register for a webinar.

Increments registration count and validates against max_attendees.

**Parameters:**

- `webinar_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
