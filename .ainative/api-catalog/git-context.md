# Git Context APIs

**Endpoint Count:** 4

## Overview

This category contains 4 endpoints for git context operations.


## Git Context


### `POST /v1/git-context/`

**Summary:** Clone Repository

Endpoint to clone or update a Git repository based on its URL.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/git-context/blame`

**Summary:** Get File Blame Information

Retrieves Git blame information line-by-line for a given file within a repository. The repository must be cloned first.

**Parameters:**

- `repository_url` (query) *(required)*: The URL of the repository.
- `file_path` (query) *(required)*: Relative path to the file within the repository.

**Success Response (200):** Successful Response

---

### `GET /v1/git-context/file-history`

**Summary:** Get File Commit History

Retrieves the commit history specifically for a given file within a repository. The repository must be cloned first.

**Parameters:**

- `repository_url` (query) *(required)*: The URL of the repository.
- `file_path` (query) *(required)*: Relative path to the file within the repository.

**Success Response (200):** Successful Response

---

### `GET /v1/git-context/history`

**Summary:** Get Commit History

Retrieves the commit history for a given repository URL. The repository must be cloned first via the POST /git/clone endpoint.

**Parameters:**

- `repository_url` (query) *(required)*: The URL of the repository.
- `max_count` (query): Maximum number of commits to return.

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
