# Social Graph APIs

**Endpoint Count:** 15

## Overview

This category contains 15 endpoints for social graph operations.


## Social Graph


### `POST /v1/social/block/{user_id}`

**Summary:** Block User

Block a user to prevent all interactions

**Parameters:**

- `user_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/social/block/{user_id}`

**Summary:** Unblock User

Unblock a previously blocked user

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/social/follow/{user_id}`

**Summary:** Follow User

Follow a user to see their public content in your feed

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (201):** Successful Response

---

### `DELETE /v1/social/follow/{user_id}`

**Summary:** Unfollow User

Stop following a user

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/social/friend-request/{request_id}`

**Summary:** Cancel Friend Request

Cancel a friend request you sent

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/social/friend-request/{request_id}/accept`

**Summary:** Accept Friend Request

Accept a pending friend request

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/social/friend-request/{request_id}/decline`

**Summary:** Decline Friend Request

Decline a pending friend request

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/social/friend-request/{user_id}`

**Summary:** Send Friend Request

Send a friend request to another user

**Parameters:**

- `user_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/social/ignore/{user_id}`

**Summary:** Ignore User

Ignore a user to hide their content from your feed

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (201):** Successful Response

---

### `DELETE /v1/social/ignore/{user_id}`

**Summary:** Unignore User

Stop ignoring a user

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/social/me/friend-requests`

**Summary:** Get Friend Requests

Get pending friend requests for the current user

**Parameters:**

- `offset` (query): Number of items to skip
- `limit` (query): Number of items to return

**Success Response (200):** Successful Response

---

### `GET /v1/social/me/stats`

**Summary:** Get Social Stats

Get social statistics for the current user

**Success Response (200):** Successful Response

---

### `GET /v1/social/{user_id}/followers`

**Summary:** Get Followers

Get list of users following the specified user

**Parameters:**

- `user_id` (path) *(required)*: No description
- `offset` (query): Number of items to skip
- `limit` (query): Number of items to return

**Success Response (200):** Successful Response

---

### `GET /v1/social/{user_id}/following`

**Summary:** Get Following

Get list of users that the specified user is following

**Parameters:**

- `user_id` (path) *(required)*: No description
- `offset` (query): Number of items to skip
- `limit` (query): Number of items to return

**Success Response (200):** Successful Response

---

### `GET /v1/social/{user_id}/friends`

**Summary:** Get Friends

Get list of confirmed friends for the specified user

**Parameters:**

- `user_id` (path) *(required)*: No description
- `offset` (query): Number of items to skip
- `limit` (query): Number of items to return

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
