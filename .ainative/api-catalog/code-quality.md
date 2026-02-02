# Code Quality APIs

**Endpoint Count:** 6

## Overview

This category contains 6 endpoints for code quality operations.


## Code Quality


### `GET /v1/code-quality/`

**Summary:** List Analyses

Get a list of code quality analyses for the current user.

- **project_id** (optional): Filter by project ID
- **limit** (optional): Maximum number of records to return (default: 10, max: 100)

Returns a list of analysis summaries ordered by creation date (newest first).

**Parameters:**

- `project_id` (query): Filter by project ID
- `limit` (query): Maximum number of records to return

**Success Response (200):** Success

---

### `POST /v1/code-quality/analyze`

**Summary:** Create Code Analysis

Create a new code quality analysis for the given code content.

- **project_id**: ID of the project being analyzed
- **file_path**: Path to the file being analyzed
- **code_content**: Content of the file to analyze

Returns the analysis results including issues and metrics.

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/code-quality/analyze/agent`

**Summary:** Create Agent Code Analysis

Create a new code quality analysis using the Cody agent's selected LLM.

**Status:** Coming Soon - This endpoint is planned but not yet implemented.

- **project_id**: ID of the project being analyzed
- **file_path**: Path to the file being analyzed
- **code_content**: Content of the file to analyze
- **agent_session_id**: ID of the agent session to use for analysis

Returns the analysis results including issues and metrics, with LLM information.

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/code-quality/fixes`

**Summary:** Generate Quick Fixes

Generate fix suggestions for code quality issues using the agent's LLM.

**Status:** Coming Soon - This endpoint is planned but not yet implemented.

- **analysis_id**: ID of the analysis containing the issues
- **issue_ids**: List of issue IDs to generate fixes for
- **agent_session_id**: ID of the agent session to use for fix generation

Returns suggested fixes for each issue with original and improved code.

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/code-quality/fixes/direct`

**Summary:** Generate Quick Fixes Direct

Generate fix suggestions using real direct LLM API calls (OpenAI, Anthropic, Ollama).

GIVEN a user with an active agent session and code analysis with issues
WHEN the endpoint is called with valid data
THEN it returns successful results with fix suggestions

Following SCSS V2.0 standards with real database operations and direct API calls.

- **analysis_id**: ID of the analysis containing the issues
- **issue_ids**: List of issue IDs to generate fixes for
- **agent_session_id**: ID of the agent session to use for fix generation

Returns suggested fixes for each issue with original and improved code.

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/code-quality/{analysis_id}`

**Summary:** Get Analysis

Get detailed results of a specific code quality analysis.

- **analysis_id**: ID of the analysis to retrieve

Returns the complete analysis with all issues and metrics.

**Parameters:**

- `analysis_id` (path) *(required)*: No description

**Success Response (200):** Success

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
