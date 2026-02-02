# Messages APIs

**Endpoint Count:** 5

## Overview

This category contains 5 endpoints for messages operations.


## Messages


### `POST /v1/community/messages/send`

**Summary:** Send a message

Send a new message in a thread.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/community/messages/threads/{thread_id}/unread-count`

**Summary:** Get unread message count

Get the number of unread messages in a thread for the current user.

**Parameters:**

- `thread_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/community/messages/unread`

**Summary:** Mark messages as unread

Mark messages in a thread as unread by removing or resetting the read receipt.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PATCH /v1/community/messages/{message_id}/read`

**Summary:** Mark message as read

Mark a specific message as read. Creates or updates a read receipt.

**Parameters:**

- `message_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/community/messages/{message_id}/read-receipts`

**Summary:** Get read receipts for a message

Get list of users who have read this message. Only visible to message sender.

**Parameters:**

- `message_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
