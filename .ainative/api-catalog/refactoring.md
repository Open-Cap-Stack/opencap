# Refactoring APIs

**Endpoint Count:** 4

## Overview

This category contains 4 endpoints for refactoring operations.


## Refactoring


### `POST /v1/refactoring/`

**Summary:** Generate Refactoring Suggestions

Generate refactoring suggestions for the provided code.

This endpoint analyzes the provided code and generates refactoring suggestions
to improve code quality, readability, and maintainability.

- **project_id**: ID of the project being analyzed
- **file_path**: Path to the file being analyzed
- **code_content**: Content of the file to analyze
- **analysis_id**: Optional ID of previous code quality analysis

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/refactoring/apply/{suggestion_id}`

**Summary:** Apply Refactoring Suggestion

Apply a refactoring suggestion to the codebase.

This endpoint applies the selected refactoring suggestion to the code,
making the suggested changes and returning the updated code.

- **suggestion_id**: ID of the suggestion to apply
- **modifications**: Optional modifications to the suggestion

**Parameters:**

- `suggestion_id` (path) *(required)*: ID of the suggestion to apply

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/refactoring/suggestions/project/{project_id}`

**Summary:** Get refactoring suggestions for a project

Get a list of refactoring suggestions for a specific project.

Returns a summary of the most recent refactoring suggestions for the project,
ordered by creation date (most recent first).

- **project_id**: ID of the project to get suggestions for
- **limit**: Maximum number of suggestions to return (default: 10)

**Parameters:**

- `project_id` (path) *(required)*: ID of the project
- `limit` (query): Maximum number of suggestions to return

**Success Response (200):** Success

---

### `GET /v1/refactoring/suggestions/{suggestion_id}`

**Summary:** Get refactoring suggestion details

Get detailed information about a specific refactoring suggestion.

Returns complete information about the suggestion, including the suggested code changes
and explanation of the refactoring.

- **suggestion_id**: ID of the suggestion to retrieve

**Parameters:**

- `suggestion_id` (path) *(required)*: ID of the suggestion to retrieve

**Success Response (200):** Success

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
