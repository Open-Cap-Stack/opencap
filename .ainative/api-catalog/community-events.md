# Community Events APIs

**Endpoint Count:** 9

## Overview

This category contains 9 endpoints for community events operations.


## Community Events


### `POST /v1/community/events`

**Summary:** Create a new event

Create a new community event with RSVP tracking

**Parameters:**

- `x-tenant-id` (header): No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/community/events`

**Summary:** Browse upcoming events

Get a paginated list of upcoming community events

**Parameters:**

- `skip` (query): Number of events to skip
- `limit` (query): Max events to return
- `privacy` (query): Filter by privacy level
- `group_id` (query): Filter by group ID
- `x-tenant-id` (header): No description

**Success Response (200):** Successful Response

---

### `GET /v1/community/events/me/upcoming`

**Summary:** Get user's upcoming events

Get events the current user is attending (RSVP'd as 'going')

**Parameters:**

- `skip` (query): Number of events to skip
- `limit` (query): Max events to return
- `x-tenant-id` (header): No description

**Success Response (200):** Successful Response

---

### `GET /v1/community/events/{event_id}`

**Summary:** Get event details

Retrieve detailed information about a specific event

**Parameters:**

- `event_id` (path) *(required)*: Event ID
- `x-tenant-id` (header): No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/community/events/{event_id}`

**Summary:** Update event

Update an existing event (creator or admin only)

**Parameters:**

- `event_id` (path) *(required)*: Event ID
- `x-tenant-id` (header): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/community/events/{event_id}`

**Summary:** Cancel event

Cancel an event (creator or admin only)

**Parameters:**

- `event_id` (path) *(required)*: Event ID
- `x-tenant-id` (header): No description

**Success Response (200):** Successful Response

---

### `GET /v1/community/events/{event_id}/attendees`

**Summary:** Get event attendees

Get a paginated list of event attendees with their RSVP status

**Parameters:**

- `event_id` (path) *(required)*: Event ID
- `skip` (query): Number of attendees to skip
- `limit` (query): Max attendees to return
- `status` (query): Filter by RSVP status
- `x-tenant-id` (header): No description

**Success Response (200):** Successful Response

---

### `POST /v1/community/events/{event_id}/rsvp`

**Summary:** RSVP to event

Create or update your RSVP for an event

**Parameters:**

- `event_id` (path) *(required)*: Event ID
- `x-tenant-id` (header): No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `PATCH /v1/community/events/{event_id}/rsvp`

**Summary:** Update RSVP

Update your existing RSVP for an event

**Parameters:**

- `event_id` (path) *(required)*: Event ID
- `x-tenant-id` (header): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
