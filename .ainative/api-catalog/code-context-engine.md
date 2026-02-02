# Code Context Engine APIs

**Endpoint Count:** 20

## Overview

This category contains 20 endpoints for code context engine operations.


## Code Context Engine


### `POST /v1/code-context/chunks/process`

**Summary:** Process File Chunking

Process code file into semantic chunks with vector embeddings for AI context.

Analyzes source code and breaks it into logically meaningful segments (functions,
classes, methods, modules) with associated metadata and vector embeddings for
semantic similarity search.

**Use Cases:**
- Prepare files for AI-powered code analysis and understanding
- Build searchable code context for development assistants
- Create embeddings for semantic code search across projects
- Enable intelligent code navigation and discovery

**Request Body:**
- `file_path`: Relative path to file (e.g., "src/utils/helpers.py")
- `file_content`: Complete source code content
- `project_id`: UUID of the project

**Response:**
- List of code chunks with metadata (line numbers, type, content)
- Vector embeddings (1536 dimensions, OpenAI ada-002 compatible)
- Chunking statistics and processing time

**Errors:**
- **400 Bad Request**: Invalid file content, unsupported language, or malformed UUID
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Processing failure or database error

**Performance:**
- Average processing time: ~500ms for 1000 LOC
- Supports files up to 10MB
- Async processing for large files available

**Example:**
```json
{
  "file_path": "src/auth/handlers.py",
  "file_content": "def authenticate_user(username, password):\n    return verify_credentials(username, password)",
  "project_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/chunks/search`

**Summary:** Search Code Chunks

Search for semantically similar code chunks using natural language or code snippets.

Performs vector similarity search across all code chunks in a project to find
relevant code segments. Supports both natural language queries and code snippet
matching for intelligent code discovery.

**Use Cases:**
- Find functions handling authentication across entire codebase
- Locate error handling patterns similar to a code snippet
- Discover API endpoints matching specific functionality
- Search for code implementing particular algorithms or patterns

**Request Body:**
- `query`: Natural language description or code snippet to search for
- `project_id`: UUID of the project to search within
- `limit`: Maximum number of results (1-100, default 10)

**Response:**
- Array of matching code chunks with similarity scores (0.0-1.0)
- Each chunk includes file path, line numbers, content, and metadata
- Results sorted by semantic similarity (highest first)

**Search Examples:**
- "function that validates user authentication"
- "error handling for API requests"
- "def process_payment"
- "React component for user profile"

**Errors:**
- **400 Bad Request**: Invalid query, malformed UUID, or limit out of range
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Project not found or has no indexed chunks
- **500 Internal Server Error**: Search failure or embedding generation error

**Performance:**
- Average search time: ~200ms for projects with 10,000 chunks
- Supports vector similarity threshold filtering
- Results cached for identical queries (5 minutes TTL)

**Example:**
```json
{
  "query": "function that validates email addresses",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "limit": 20
}
```

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/code-context/cross-project/context`

**Summary:** Get Cross Project Context

Get comprehensive context about project relationships.

GIVEN a project
WHEN requesting cross-project context
THEN return detailed context about project relationships

**Parameters:**

- `project_id` (query) *(required)*: ID of the project

**Success Response (200):** Successful Response

---

### `POST /v1/code-context/cross-project/relationships`

**Summary:** Register Project Relationship

Register a relationship between two projects.

GIVEN two related projects
WHEN registering their relationship
THEN create connection record and return relationship data

**Parameters:**

- `source_project_id` (query) *(required)*: ID of the source project
- `target_project_id` (query) *(required)*: ID of the target project
- `relationship_type` (query) *(required)*: Type of relationship

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/cross-project/resolve`

**Summary:** Resolve Cross Project Reference

Resolve a reference across projects.

GIVEN a reference from one project
WHEN resolving it across multiple projects
THEN return matching code locations in other projects

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/code-context/cross-project/similar`

**Summary:** Find Similar Code Across Projects

Find semantically similar code across projects.

GIVEN code content from one project
WHEN searching for similar code across multiple projects
THEN return semantically similar code from other projects

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/code-context/git/analyze`

**Summary:** Analyze Git Repository

Analyze a Git repository and store context information.

GIVEN a Git repository
WHEN analyzing for context
THEN extract commit history, file evolution, and contributor insights

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/git/file-history`

**Summary:** Get Git File History

Get detailed history for a specific file.

GIVEN a file in a Git repository
WHEN requesting file history
THEN return detailed commit history and evolution

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/code-context/git/ownership`

**Summary:** Get Git Code Ownership

Get code ownership information for the repository.

GIVEN a Git repository
WHEN requesting code ownership
THEN return file ownership and expertise mapping

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/code-context/metadata/file`

**Summary:** Get File Metadata

Retrieve comprehensive metadata and metrics for a specific code file.

Returns detailed analytics about a file including complexity metrics, authorship
history, security classification, dependencies, and change frequency. Useful for
code quality analysis, technical debt tracking, and team productivity insights.

**Use Cases:**
- Code quality dashboards and reporting
- Identifying high-complexity files requiring refactoring
- Tracking file ownership and expertise mapping
- Security audits and sensitive code identification
- Understanding file dependencies and impact analysis

**Query Parameters:**
- `file_path`: Relative path to file within project (e.g., "src/auth/handlers.py")
- `project_id`: UUID of the project

**Response Fields:**
- `file_path`: Relative path to the file
- `file_hash`: SHA-256 hash for change detection
- `line_count`: Total lines (including blanks)
- `code_lines`: Lines of actual code
- `comment_lines`: Lines of comments/docstrings
- `complexity_score`: Cyclomatic complexity (higher = more complex)
- `security_classification`: Sensitivity level (low/medium/high/critical)
- `last_modified_at`: Last modification timestamp (ISO 8601)
- `last_author`: Email/username of last modifier
- `change_count`: Number of commits affecting this file
- `dependencies`: List of imported modules/packages

**Errors:**
- **400 Bad Request**: Invalid file path or malformed UUID
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: File not found in project or metadata not indexed
- **500 Internal Server Error**: Database query failure

**Example Response:**
```json
{
  "file_path": "src/auth/handlers.py",
  "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "line_count": 250,
  "code_lines": 180,
  "comment_lines": 45,
  "complexity_score": 12.5,
  "security_classification": "high",
  "last_modified_at": "2025-01-01T10:30:00Z",
  "last_author": "jane.doe@example.com",
  "change_count": 15,
  "dependencies": [
    {"type": "import", "module": "fastapi", "version": "0.104.0"}
  ]
}
```

**Parameters:**

- `file_path` (query) *(required)*: Path to the file
- `project_id` (query) *(required)*: ID of the project

**Success Response (200):** Successful Response

---

### `GET /v1/code-context/metadata/project`

**Summary:** Get Project Metrics

Get aggregate metrics for an entire project.

GIVEN a project
WHEN requesting project metrics
THEN return aggregate file metrics for the project

**Parameters:**

- `project_id` (query) *(required)*: ID of the project

**Success Response (200):** Successful Response

---

### `POST /v1/code-context/metadata/track`

**Summary:** Track File Metadata

Track a file change and update metadata.

GIVEN a file change
WHEN tracking the change
THEN update file metadata and return tracking results

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/snapshots/auto/configure`

**Summary:** Configure Auto Snapshot

Configure automated snapshot creation.

GIVEN a project
WHEN configuring automated snapshots
THEN set up triggers and retention policy

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/snapshots/auto/create`

**Summary:** Create Auto Snapshot

Create an automated snapshot based on configuration.

GIVEN a snapshot configuration
WHEN creating an automated snapshot
THEN save the current code state with auto-generated metadata

**Parameters:**

- `config_id` (query) *(required)*: ID of the auto-snapshot configuration

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/snapshots/compare`

**Summary:** Compare Snapshots

Compare two snapshots and identify differences.

GIVEN two snapshot IDs
WHEN comparing them
THEN return detailed change analysis

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/code-context/snapshots/list`

**Summary:** List Snapshots

List snapshots for a project.

GIVEN a project
WHEN listing snapshots
THEN return snapshot list with metadata

**Parameters:**

- `project_id` (query) *(required)*: ID of the project
- `snapshot_type` (query): Type of snapshots to list
- `limit` (query): Maximum number of snapshots to return
- `offset` (query): Offset for pagination

**Success Response (200):** Successful Response

---

### `POST /v1/code-context/snapshots/manual`

**Summary:** Create Manual Snapshot

Create a manual snapshot of code.

GIVEN a project at a specific state
WHEN creating a manual snapshot
THEN save the current code state with user-provided metadata

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/code-context/snapshots/restore`

**Summary:** Restore Snapshot

Restore code from a snapshot to a target directory.

GIVEN a snapshot ID and target directory
WHEN restoring snapshot
THEN extract files to target location

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/code-context/snapshots/{snapshot_id}`

**Summary:** Get Snapshot Details

Get detailed information about a snapshot.

GIVEN a snapshot ID
WHEN requesting detailed information
THEN return comprehensive snapshot metadata

**Parameters:**

- `snapshot_id` (path) *(required)*: ID of the snapshot

**Success Response (200):** Successful Response

---

### `DELETE /v1/code-context/snapshots/{snapshot_id}`

**Summary:** Delete Snapshot

Delete a snapshot.

GIVEN a snapshot ID
WHEN deleting the snapshot
THEN remove snapshot data and update records

**Parameters:**

- `snapshot_id` (path) *(required)*: ID of the snapshot to delete

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
