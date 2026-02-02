# Debugging APIs

**Endpoint Count:** 13

## Overview

This category contains 13 endpoints for debugging operations.


## Debugging


### `POST /v1/debugging/sessions`

**Summary:** Create Debugging Session

Create a new debugging session.

Given a user who wants to start debugging an issue
When they provide the necessary session details
Then a new debugging session is created and returned

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/debugging/sessions`

**Summary:** Get Debugging Sessions

Get debugging sessions for the current user.

Given a user who wants to view their debugging sessions
When they request their debugging sessions with optional filters
Then a list of debugging sessions is returned

**Parameters:**

- `project_id` (query): Filter by project ID
- `status` (query): Filter by session status
- `limit` (query): Maximum number of sessions to return
- `offset` (query): Offset for pagination

**Success Response (200):** Successful Response

---

### `POST /v1/debugging/sessions/analyze`

**Summary:** Analyze And Suggest Fixes

Analyze an error and suggest potential fixes.

Given a user who wants to analyze an error and get fixing suggestions
When they provide the error details
Then a new debugging session is created with suggestions and returned

**Parameters:**

- `project_id` (query) *(required)*: ID of the project
- `error_analysis_id` (query): ID of an existing error analysis
- `error_message` (query): Error message if not using analysis
- `error_stack_trace` (query): Stack trace if not using analysis

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/debugging/sessions/{session_id}`

**Summary:** Get Debugging Session

Get a specific debugging session.

Given a user who wants to view a specific debugging session
When they provide the session ID
Then the debugging session details are returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Success Response (200):** Successful Response

---

### `PUT /v1/debugging/sessions/{session_id}`

**Summary:** Update Debugging Session

Update a debugging session.

Given a user who wants to update a debugging session
When they provide the session ID and update data
Then the debugging session is updated and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/debugging/sessions/{session_id}/details`

**Summary:** Get Debugging Session With Details

Get a debugging session with all details.

Given a user who wants to view a complete debugging session
When they provide the session ID
Then the debugging session with all steps, suggestions, and test cases is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Success Response (200):** Successful Response

---

### `POST /v1/debugging/sessions/{session_id}/steps`

**Summary:** Add Debugging Step

Add a new debugging step.

Given a user who wants to add a step to a debugging session
When they provide the step details
Then a new debugging step is created and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/debugging/sessions/{session_id}/steps`

**Summary:** Get Debugging Steps

Get steps for a debugging session.

Given a user who wants to view steps in a debugging session
When they provide the session ID
Then a list of debugging steps is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session
- `status` (query): Filter by step status

**Success Response (200):** Successful Response

---

### `POST /v1/debugging/sessions/{session_id}/suggestions`

**Summary:** Add Debugging Suggestion

Add a new debugging suggestion.

Given a user who wants to add a suggestion to a debugging session
When they provide the suggestion details
Then a new debugging suggestion is created and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/debugging/sessions/{session_id}/suggestions`

**Summary:** Get Debugging Suggestions

Get suggestions for a debugging session.

Given a user who wants to view suggestions in a debugging session
When they provide the session ID
Then a list of debugging suggestions is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session
- `suggestion_type` (query): Filter by suggestion type

**Success Response (200):** Successful Response

---

### `POST /v1/debugging/sessions/{session_id}/test-cases`

**Summary:** Add Test Case Suggestion

Add a new test case suggestion.

Given a user who wants to add a test case to a debugging session
When they provide the test case details
Then a new test case suggestion is created and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/debugging/sessions/{session_id}/test-cases`

**Summary:** Get Test Case Suggestions

Get test case suggestions for a debugging session.

Given a user who wants to view test cases in a debugging session
When they provide the session ID
Then a list of test case suggestions is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session
- `test_type` (query): Filter by test type

**Success Response (200):** Successful Response

---

### `PUT /v1/debugging/steps/{step_id}`

**Summary:** Update Debugging Step

Update a debugging step.

Given a user who wants to update a debugging step
When they provide the step ID and update data
Then the debugging step is updated and returned

**Parameters:**

- `step_id` (path) *(required)*: ID of the debugging step

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
