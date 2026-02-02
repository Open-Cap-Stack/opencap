# Team Workflows APIs

**Endpoint Count:** 5

## Overview

This category contains 5 endpoints for team workflows operations.


## Team Workflows


### `GET /v1/team-workflows/workflows`

**Summary:** List Workflows

List all workflows for the current team.

GIVEN an authenticated user with proper permissions
WHEN requesting a list of team workflows with optional team filtering
THEN return the list of workflows

Following SCSS V2.0 standards with real database operations.

**Parameters:**

- `team_id` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/team-workflows/workflows`

**Summary:** Create Workflow

Create a new team workflow.

GIVEN an authenticated user with proper permissions and valid workflow data
WHEN creating a new workflow
THEN create the workflow and return its details

Following SCSS V2.0 standards with real database operations.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/team-workflows/workflows/{workflow_id}`

**Summary:** Get Workflow

Get details of a specific workflow.

GIVEN an authenticated user with proper permissions and a valid workflow ID
WHEN requesting details of a specific workflow
THEN return the workflow details

Following SCSS V2.0 standards with real database operations.

**Parameters:**

- `workflow_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/team-workflows/workflows/{workflow_id}`

**Summary:** Update Workflow

Update a workflow.

GIVEN an authenticated user with proper permissions, a valid workflow ID, and valid update data
WHEN updating a workflow
THEN update the workflow and return its updated details

Following SCSS V2.0 standards with real database operations.

**Parameters:**

- `workflow_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/team-workflows/workflows/{workflow_id}`

**Summary:** Delete Workflow

Delete a workflow.

GIVEN an authenticated user with proper permissions and a valid workflow ID
WHEN deleting a workflow
THEN mark the workflow as deleted

Following SCSS V2.0 standards with real database operations.

**Parameters:**

- `workflow_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
