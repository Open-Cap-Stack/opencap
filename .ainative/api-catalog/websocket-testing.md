# Websocket Testing APIs

**Endpoint Count:** 9

## Overview

This category contains 9 endpoints for websocket testing operations.


## WebSocket Testing


### `POST /test/websocket/broadcast/agent-status`

**Summary:** Test Broadcast Agent Status

Test endpoint to trigger agent_status_update broadcast

**Parameters:**

- `project_id` (query) *(required)*: No description
- `agent_name` (query) *(required)*: No description
- `status` (query) *(required)*: No description
- `progress` (query) *(required)*: No description
- `task` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /test/websocket/broadcast/project-completed`

**Summary:** Test Broadcast Project Completed

Test endpoint to trigger project_completed broadcast

**Parameters:**

- `project_id` (query) *(required)*: No description
- `url` (query): No description
- `deployment_url` (query): No description

**Success Response (200):** Successful Response

---

### `POST /test/websocket/broadcast/project-error`

**Summary:** Test Broadcast Project Error

Test endpoint to trigger project_error broadcast

**Parameters:**

- `project_id` (query) *(required)*: No description
- `error` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /test/websocket/broadcast/project-progress`

**Summary:** Test Broadcast Project Progress

Test endpoint to trigger project_progress broadcast

**Parameters:**

- `project_id` (query) *(required)*: No description
- `progress` (query) *(required)*: No description
- `message` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /test/websocket/broadcast/project-started`

**Summary:** Test Broadcast Project Started

Test endpoint to trigger project_started broadcast

This allows integration tests to trigger broadcasts from the server process
where ws_manager has the active connections.

**Parameters:**

- `project_id` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /test/websocket/broadcast/workflow-log`

**Summary:** Test Broadcast Workflow Log

Test endpoint to trigger workflow_log broadcast

**Parameters:**

- `project_id` (query) *(required)*: No description
- `message` (query) *(required)*: No description
- `level` (query): No description
- `emoji` (query): No description

**Success Response (200):** Successful Response

---

### `POST /test/websocket/broadcast/workflow-stage`

**Summary:** Test Broadcast Workflow Stage

Test endpoint to trigger workflow_stage_update broadcast

**Parameters:**

- `project_id` (query) *(required)*: No description
- `stage` (query) *(required)*: No description
- `message` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /test/websocket/connections`

**Summary:** Test Get All Connections

Get all active WebSocket connections (for debugging)

**Success Response (200):** Successful Response

---

### `GET /test/websocket/connections/{project_id}`

**Summary:** Test Get Connection Count

Get the number of active WebSocket connections for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
