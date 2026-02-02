# Zerodb APIs

**Endpoint Count:** 457

## Overview

This category contains 457 endpoints for zerodb operations.


## Admin API


### `GET /admin/database/admin/health`

**Summary:** Get database health status

Get comprehensive database health status for admin monitoring.

    Returns:
    - Connection pool status
    - Database connectivity
    - Table counts
    - Recent query performance

    Requires admin authentication.

**Success Response (200):** Health status retrieved successfully

---

### `GET /admin/database/admin/metrics`

**Summary:** Get database performance metrics

Get detailed database performance metrics for admin monitoring.

    Returns:
    - Query performance statistics
    - Table sizes and growth
    - Index usage statistics
    - Cache hit ratios

    Requires admin authentication.

**Success Response (200):** Metrics retrieved successfully

---

### `GET /admin/database/events/activity`

**Summary:** Get recent database event activity

Get recent database event activity for admin monitoring.

    Returns:
    - Recent database operations
    - User activity
    - System events

    Requires admin authentication.

**Parameters:**

- `hours` (query): Number of hours to look back (1-168)
- `limit` (query): Maximum number of events to return

**Success Response (200):** Activity retrieved successfully

---

### `POST /admin/migrations/create-agent-tables`

**Summary:** Create Agent Tables

Create agent system tables in production database (Admin only)

Emergency endpoint to deploy agent tables immediately

**Success Response (201):** Successful Response

---

### `GET /admin/migrations/verify-agent-tables`

**Summary:** Verify Agent Tables

Verify that agent tables exist in the database

**Success Response (200):** Successful Response

---

### `GET /admin/run-migration/migration-status`

**Summary:** Check Migration Status

Check if debug and analytics tables exist

Returns the status of all tables that should be created by the migration.

**Success Response (200):** Successful Response

---

### `POST /admin/run-migration/run-debug-analytics-migration`

**Summary:** Run Debug Analytics Migration

Run the debug and analytics tables migration

This endpoint creates the missing tables for:
- Debug sessions (/v1/internal/debug/sessions/*)
- Deployment analytics (/v1/internal/deployment-analytics/*)
- Error analysis (/v1/internal/error-analysis/*)

Requires admin privileges.

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/analytics/errors`

**Summary:** Get Error Analytics

Get ZeroDB error analytics

**Parameters:**

- `time_range` (query): Time range for analytics

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/analytics/performance`

**Summary:** Get Performance Analytics

Get ZeroDB performance analytics

**Parameters:**

- `time_range` (query): Time range for analytics

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/analytics/usage`

**Summary:** Get Analytics Usage

Get ZeroDB analytics usage

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/collections`

**Summary:** Get Zerodb Collections

Get all ZeroDB collections

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/events`

**Summary:** Get Zerodb Events

Get recent ZeroDB events

**Parameters:**

- `limit` (query): Number of events to retrieve

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/mcp/connections`

**Summary:** Get Mcp Connections

Get MCP connections for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/postgres/databases`

**Summary:** Get Postgres Databases

Get all PostgreSQL database instances

**Success Response (200):** Successful Response

---

### `POST /admin/zerodb/postgres/provision`

**Summary:** Provision Postgres Database

Provision a new PostgreSQL database instance

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/postgresql/instances`

**Summary:** Get Postgresql Instances

Get PostgreSQL instances for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/rlhf/datasets`

**Summary:** Get Rlhf Datasets

Get RLHF datasets for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/storage/buckets`

**Summary:** Get Storage Buckets

Get storage buckets for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/streaming/topics`

**Summary:** Get Streaming Topics

Get streaming topics for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /admin/zerodb/vectors/collections`

**Summary:** Get Vector Collections

Get vector collections for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /v1/admin/database/admin/health`

**Summary:** Get database health status

Get comprehensive database health status for admin monitoring.

    Returns:
    - Connection pool status
    - Database connectivity
    - Table counts
    - Recent query performance

    Requires admin authentication.

**Success Response (200):** Health status retrieved successfully

---

### `GET /v1/admin/database/admin/metrics`

**Summary:** Get database performance metrics

Get detailed database performance metrics for admin monitoring.

    Returns:
    - Query performance statistics
    - Table sizes and growth
    - Index usage statistics
    - Cache hit ratios

    Requires admin authentication.

**Success Response (200):** Metrics retrieved successfully

---

### `GET /v1/admin/database/events/activity`

**Summary:** Get recent database event activity

Get recent database event activity for admin monitoring.

    Returns:
    - Recent database operations
    - User activity
    - System events

    Requires admin authentication.

**Parameters:**

- `hours` (query): Number of hours to look back (1-168)
- `limit` (query): Maximum number of events to return

**Success Response (200):** Activity retrieved successfully

---

### `POST /v1/admin/migrations/create-agent-tables`

**Summary:** Create Agent Tables

Create agent system tables in production database (Admin only)

Emergency endpoint to deploy agent tables immediately

**Success Response (201):** Successful Response

---

### `GET /v1/admin/migrations/verify-agent-tables`

**Summary:** Verify Agent Tables

Verify that agent tables exist in the database

**Success Response (200):** Successful Response

---

### `GET /v1/admin/run-migration/migration-status`

**Summary:** Check Migration Status

Check if debug and analytics tables exist

Returns the status of all tables that should be created by the migration.

**Success Response (200):** Successful Response

---

### `POST /v1/admin/run-migration/run-debug-analytics-migration`

**Summary:** Run Debug Analytics Migration

Run the debug and analytics tables migration

This endpoint creates the missing tables for:
- Debug sessions (/v1/internal/debug/sessions/*)
- Deployment analytics (/v1/internal/deployment-analytics/*)
- Error analysis (/v1/internal/error-analysis/*)

Requires admin privileges.

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/analytics/errors`

**Summary:** Get Error Analytics

Get ZeroDB error analytics

**Parameters:**

- `time_range` (query): Time range for analytics

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/analytics/performance`

**Summary:** Get Performance Analytics

Get ZeroDB performance analytics

**Parameters:**

- `time_range` (query): Time range for analytics

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/analytics/usage`

**Summary:** Get Analytics Usage

Get ZeroDB analytics usage

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/collections`

**Summary:** Get Zerodb Collections

Get all ZeroDB collections

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/events`

**Summary:** Get Zerodb Events

Get recent ZeroDB events

**Parameters:**

- `limit` (query): Number of events to retrieve

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/mcp/connections`

**Summary:** Get Mcp Connections

Get MCP connections for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/postgres/databases`

**Summary:** Get Postgres Databases

Get all PostgreSQL database instances

**Success Response (200):** Successful Response

---

### `POST /v1/admin/zerodb/postgres/provision`

**Summary:** Provision Postgres Database

Provision a new PostgreSQL database instance

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/postgresql/instances`

**Summary:** Get Postgresql Instances

Get PostgreSQL instances for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/rlhf/datasets`

**Summary:** Get Rlhf Datasets

Get RLHF datasets for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/storage/buckets`

**Summary:** Get Storage Buckets

Get storage buckets for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/streaming/topics`

**Summary:** Get Streaming Topics

Get streaming topics for ZeroDB

**Success Response (200):** Successful Response

---

### `GET /v1/admin/zerodb/vectors/collections`

**Summary:** Get Vector Collections

Get vector collections for ZeroDB

**Success Response (200):** Successful Response

---

## Public API


### `GET /v1/public/database/stats`

**Summary:** Get public database statistics

Get basic database statistics for public monitoring.

    Returns:
    - Database size
    - Connection count (safe aggregated metrics)
    - Uptime indicator

    No authentication required - safe for public access.

**Success Response (200):** Statistics retrieved successfully

---

### `GET /v1/public/database/status`

**Summary:** Get public database status

Get basic database status for public monitoring.

    Returns:
    - Database connectivity status
    - Timestamp
    - API version

    No authentication required - safe for public access.

**Success Response (200):** Status retrieved successfully

---

### `POST /v1/public/embeddings/embed-and-store`

**Summary:** Embed And Store

Generate embeddings and store in ZeroDB

Workflow:
1. Generate embeddings (FREE via Railway service)
2. Store vectors in ZeroDB with metadata

Returns:
    Storage confirmation

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/embeddings/generate`

**Summary:** Generate Embeddings

Generate embeddings for texts

FREE - No usage costs!
Uses Railway self-hosted HuggingFace service (BAAI/bge-small-en-v1.5)

Returns:
    Embeddings with metadata

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/embeddings/health`

**Summary:** Embeddings Health Check

Check embedding service health

Returns:
    Health status

**Success Response (200):** Successful Response

---

### `GET /v1/public/embeddings/models`

**Summary:** List Embedding Models

List available embedding models

Returns:
    List of models with metadata

**Success Response (200):** Successful Response

---

### `POST /v1/public/embeddings/semantic-search`

**Summary:** Semantic Search

Semantic search in ZeroDB

Workflow:
1. Generate query embedding (FREE via Railway service)
2. Search ZeroDB for similar vectors

Returns:
    Search results with similarity scores

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/embeddings/usage`

**Summary:** Get Embedding Usage

Get embedding usage statistics

Since embeddings are FREE (self-hosted), this returns usage counts only

Returns:
    Usage statistics

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/analytics/stats`

**Summary:** Get project analytics statistics

Get comprehensive analytics for the project including vector stats, query metrics, and performance data. Used by Analytics dashboard.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/database/namespaces`

**Summary:** Get list of vector namespaces

Get list of available vector namespaces with counts. Used by Semantic Search page for namespace filtering.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/database/postgres/history`

**Summary:** Get query history

Retrieve SQL query execution history for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): Number of items to return
- `offset` (query): Pagination offset

**Success Response (200):** Successful Response

---

### `POST /v1/public/projects/{project_id}/database/postgres/query`

**Summary:** Execute SQL query

Execute a SQL query against the project's PostgreSQL database.

    Security Features:
    - SQL injection prevention
    - Dangerous command blocking (DROP DATABASE, TRUNCATE, etc.)
    - Query timeout enforcement (default 30s, max 300s)
    - Read-only mode support
    - Row limit enforcement (default 1000, max 10000)
    - Rate limiting (100 queries/min per user)

    Credits Consumption:
    - Base: 1 credit
    - +1 credit per 1000ms execution time
    - +1 credit per 1000 rows returned/affected

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/database/postgres/schema`

**Summary:** Get schema information

Get detailed schema information including tables and columns

**Parameters:**

- `project_id` (path) *(required)*: No description
- `schema_name` (query): Schema name to retrieve

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/database/postgres/status`

**Summary:** Check PostgreSQL status

Check if PostgreSQL instance is provisioned and healthy

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/database/postgres/tables`

**Summary:** List database tables

Get list of tables in the PostgreSQL database with schema information

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/projects/{project_id}/database/postgres/validate`

**Summary:** Validate SQL query

Validate SQL query without executing it

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/projects/{project_id}/postgres`

**Summary:** Provision Dedicated PostgreSQL Instance

Create a dedicated PostgreSQL instance for the project via Railway

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/postgres`

**Summary:** Get PostgreSQL Instance Status

Get the status and details of the dedicated PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/projects/{project_id}/postgres`

**Summary:** Delete PostgreSQL Instance

Delete the dedicated PostgreSQL instance and all data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `confirm` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/postgres/connection`

**Summary:** Get PostgreSQL Connection Details

Get connection string and credentials for direct SQL access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `credential_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/postgres/logs`

**Summary:** Get PostgreSQL Query Logs

Get recent SQL query logs and performance data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): No description
- `query_type` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/projects/{project_id}/postgres/restart`

**Summary:** Restart PostgreSQL Instance

Restart the dedicated PostgreSQL instance via Railway deployment restart

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/projects/{project_id}/postgres/rotate`

**Summary:** Rotate PostgreSQL Credentials

Generate new credentials for the PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/postgres/usage`

**Summary:** Get PostgreSQL Usage Statistics

Get detailed usage statistics and billing information

**Parameters:**

- `project_id` (path) *(required)*: No description
- `hours` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/stats`

**Summary:** Get overall project statistics

Get comprehensive project statistics including counts of all resources. Used by main Dashboard overview.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/public/{project_id}/database/agents/types`

**Summary:** Get list of agent types

Get list of unique agent types for filtering in Agent Logs page. Public endpoint for frontend filtering.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/users/settings`

**Summary:** Deprecated Get User Settings

DEPRECATED: Use /settings instead (main settings endpoint)

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `PUT /v1/public/users/settings`

**Summary:** Deprecated Update User Settings

DEPRECATED: Use /settings instead (main settings endpoint)

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/analytics/usage`

**Summary:** Deprecated Get Analytics Usage

DEPRECATED: Use /v1/projects/{project_id}/database/stats instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/api-keys`

**Summary:** Deprecated Get Api Keys

DEPRECATED: Use /api-keys instead (main API keys endpoint)

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/collections`

**Summary:** Deprecated Get Collections

DEPRECATED: Use /v1/projects/{project_id}/database/tables instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/mcp/connections`

**Summary:** Deprecated Get Mcp Connections

DEPRECATED: MCP connections are now managed through the main MCP API

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/mcp/execute`

**Summary:** Deprecated Mcp Execute

DEPRECATED: Use canonical ZeroDB API paths instead of MCP execute wrapper

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).
The MCP execute pattern has been replaced with direct canonical API paths.

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/mcp/health`

**Summary:** Deprecated Mcp Health

DEPRECATED: Use /health instead (main health endpoint)

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/mcp/operations`

**Summary:** Deprecated Mcp Operations

DEPRECATED: Use /docs to see available ZeroDB operations

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects`

**Summary:** Deprecated Get Projects

DEPRECATED: Use /v1/projects instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/projects`

**Summary:** Deprecated Create Project

DEPRECATED: Use /v1/projects instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/rlhf/datasets`

**Summary:** Deprecated Get Rlhf Datasets

DEPRECATED: Use /v1/projects/{project_id}/database/rlhf/datasets instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/rlhf/status`

**Summary:** Deprecated Get Rlhf Status

DEPRECATED: Use /v1/projects/{project_id}/database/rlhf/status instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/stats`

**Summary:** Deprecated Get Stats

DEPRECATED: Use /v1/projects/{project_id}/database/stats instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/storage/buckets`

**Summary:** Deprecated Get Storage Buckets

DEPRECATED: Use /v1/projects/{project_id}/database/files instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/streaming/topics`

**Summary:** Deprecated Get Streaming Topics

DEPRECATED: Use /v1/projects/{project_id}/database/events instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/tables`

**Summary:** Deprecated Get Tables

DEPRECATED: Use /v1/projects/{project_id}/database/tables instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/usage`

**Summary:** Deprecated Get Usage

DEPRECATED: Use /v1/projects/{project_id}/database/stats instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/vectors/collections`

**Summary:** Deprecated Get Vector Collections

DEPRECATED: Use /v1/projects/{project_id}/database/vectors instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/vectors/indexes`

**Summary:** Deprecated Get Vector Indexes

DEPRECATED: Use /v1/projects/{project_id}/database/vectors/stats instead

This endpoint was removed as part of Issue #729 (ZeroDB triple redundancy cleanup).

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/agent-logs/metrics`

**Summary:** Get Agent Logs Metrics

Get comprehensive agent logs metrics

Returns:
- active_agents: Number of unique agents with activity in time range
- completed_tasks: Tasks completed successfully
- error_rate: Percentage of ERROR level logs
- avg_duration_ms: Average task duration in milliseconds
- total_logs: Total log entries
- logs_by_level: Breakdown by log level
- recent_errors: Recent error messages

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `time_range_hours` (query): Time range in hours (1-168)

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/agent-logs/recent-activity`

**Summary:** Get Recent Activity

Get recent agent activity logs

Returns chronologically ordered list of recent agent activities
with detailed information for debugging and monitoring

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `limit` (query): Maximum number of activities
- `agent_id` (query): Filter by agent ID
- `log_level` (query): Filter by log level

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/agent-logs/sessions/{session_id}`

**Summary:** Get Session Details

Get detailed logs and metrics for a specific agent session

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `session_id` (path) *(required)*: Session ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/agent-logs/trace`

**Summary:** Get Agent Trace

Get live trace visualization data for agent execution

Returns structured trace data suitable for timeline visualization
including execution flow, state transitions, and error tracking

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `session_id` (query): Filter by session ID
- `agent_id` (query): Filter by agent ID
- `time_window_minutes` (query): Time window in minutes

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database`

**Summary:** Enable Database

Enable ZeroDB for an existing project
Creates database instance and returns configuration

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database`

**Summary:** Get Database Status

Get database status and configuration for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database`

**Summary:** Update Database Config

Update database configuration for a project

Supports updating both top-level fields and database_config dictionary:
- quantum_enabled: bool - Enable/disable quantum compression
- vector_dimensions: int - Set vector embedding dimensions
- mcp_enabled: bool - Enable/disable MCP features
- database_config: dict - Additional configuration options

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database`

**Summary:** Disable Database

Disable database features for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/agent-logs`

**Summary:** Create Agent Log

Create agent execution log

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/agent-logs`

**Summary:** List Agent Logs

List agent logs with optional filtering

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): No description
- `session_id` (query): No description
- `log_level` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/agent-logs/export`

**Summary:** Export Agent Logs

Export agent logs in specified format

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/agent-logs/stats`

**Summary:** Get Agent Logs Stats

Get agent logs statistics

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/agent-logs/{log_id}`

**Summary:** Get Agent Log

Get a specific agent log by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `log_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/agent-logs/{log_id}`

**Summary:** Delete Agent Log

Delete an agent log entry

**Parameters:**

- `project_id` (path) *(required)*: No description
- `log_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/agents/active`

**Summary:** List Active Agents

List active agents for project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/agents/traces`

**Summary:** List Agent Traces

List agent execution traces

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): No description
- `session_id` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/backups`

**Summary:** Get database backups

Get list of database backups for the project.

    **Backup Information:**
    - Backup ID (unique identifier)
    - Creation timestamp
    - Size in megabytes
    - Status (completed, failed, in_progress)

    **Pagination:**
    - Use `skip` and `limit` query parameters
    - Default: skip=0, limit=50
    - Maximum limit: 1000

    **Use Cases:**
    - Database Settings page backup listing
    - Backup restoration workflows
    - Storage usage monitoring

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): Number of backups to skip
- `limit` (query): Maximum backups to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/batch/query`

**Summary:** Execute batch query operations

Execute multiple table operations (query, insert, update, delete) in a single request. Supports up to 50 operations per batch with optional parallel execution. MongoDB-style filters are supported for query/update/delete operations.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/connection`

**Summary:** Get database connection information

Get database connection details for the project's PostgreSQL instance.

    **Information Included:**
    - Database host and port
    - Database name
    - Connection status (active, inactive, provisioning)
    - Masked connection string (password hidden)

    **Status Values:**
    - `active`: Database is running and accessible
    - `inactive`: Database is stopped or unreachable
    - `provisioning`: Database is being provisioned

    **Use Cases:**
    - Database Settings page display
    - Connection string generation for clients
    - Status monitoring

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/events`

**Summary:** Create Event

Create an event record

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/events`

**Summary:** List Events

List events for a project with optional topic filter

**Parameters:**

- `project_id` (path) *(required)*: No description
- `topic` (query): Filter by event topic
- `skip` (query): Number of records to skip
- `limit` (query): Maximum number of records to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/events/batch`

**Summary:** Batch publish events

Publish multiple events in a single request for high-throughput event streaming. Supports up to 100 events per batch with individual validation.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/events/stats`

**Summary:** Get Event Stats

Get event statistics for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `time_range` (query): Time range: hour, day, week, month
- `topic` (query): Filter by event topic

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/events/subscriptions`

**Summary:** List event subscriptions

Get all event subscriptions for a project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/events/subscriptions`

**Summary:** Create event subscription

Create a new event subscription for a project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/events/subscriptions/{subscription_id}`

**Summary:** Delete event subscription

Delete an event subscription by ID

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `subscription_id` (path) *(required)*: Subscription ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/events/{event_id}`

**Summary:** Get Event

Get a specific event by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `event_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/export`

**Summary:** Create database export job

Start an async database export job. Supports JSON, CSV, Parquet, and PostgreSQL dump formats.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/exports/{export_id}`

**Summary:** Get export job status

Check the status of an export job and get the download URL when completed.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `export_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/extensions`

**Summary:** Get PostgreSQL extensions

Get list of installed PostgreSQL extensions for the project.

    **Extension Information:**
    - Extension name (e.g., pg_vector, uuid-ossp)
    - Version number
    - Description

    **Common Extensions:**
    - `pg_vector`: Vector similarity search
    - `uuid-ossp`: UUID generation
    - `pg_stat_statements`: Query performance tracking
    - `pg_trgm`: Trigram matching for text search

    **Use Cases:**
    - Database Settings page extensions listing
    - Feature availability checking
    - Extension installation guidance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/files`

**Summary:** Upload File

Upload a file to project storage

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/files`

**Summary:** List Files

List all files in project storage

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/files/stats`

**Summary:** Get File Stats

Get file storage statistics for project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/files/{file_id}`

**Summary:** Get File

Get file metadata by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/files/{file_id}`

**Summary:** Delete File

Delete a file from project storage

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/files/{file_id}/download`

**Summary:** Download File

Download file content

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/files/{file_id}/presigned-url`

**Summary:** Generate Presigned Url

Generate presigned URL for file access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/import`

**Summary:** Start database import

Import data from various sources (JSON, CSV, URL, PostgreSQL backup, or previous export).

    **Import Sources:**
    - `json`: Import from JSON data (requires `file_content` as base64)
    - `csv`: Import from CSV data (requires `file_content` as base64)
    - `file_url`: Download and import from URL (requires `file_url`)
    - `export_id`: Re-import from previous export (requires `export_id`)
    - `postgresql_backup`: Restore from PostgreSQL backup (requires `backup_id`)

    **Merge Strategies:**
    - `skip`: Skip existing records (default)
    - `overwrite`: Replace existing records
    - `merge`: Merge metadata, keep latest embedding

    **Process:**
    1. Creates import job and validates request
    2. Validates schema if `validate_schema=true`
    3. Creates rollback snapshot if `overwrite_existing=true`
    4. Imports records with chosen merge strategy
    5. Returns import job status (poll GET endpoint for progress)

    **Security:**
    - File URLs must be from allowed domains
    - Maximum file size: 500MB
    - SQL injection protection for PostgreSQL imports

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

---

### `GET /v1/public/{project_id}/database/imports/{import_id}`

**Summary:** Get import status

Get the current status of a database import operation.

    **Status Values:**
    - `pending`: Import job created, waiting to start
    - `validating`: Validating data schema
    - `in_progress`: Actively importing data
    - `completed`: Import finished successfully
    - `failed`: Import failed (check error_message)
    - `rollback`: Import being rolled back

    **Progress Tracking:**
    - `progress_percent`: 0-100 completion percentage
    - `records_imported`: Number of records successfully imported
    - `records_failed`: Number of records that failed
    - `records_skipped`: Number of records skipped (duplicates)
    - `records_total`: Total records to import

    **Polling Recommendation:**
    - Poll every 2-5 seconds while status is `validating` or `in_progress`
    - Stop polling when status is `completed`, `failed`, or `rollback`

**Parameters:**

- `project_id` (path) *(required)*: No description
- `import_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/imports/{import_id}/rollback`

**Summary:** Rollback import

Rollback a failed or unwanted database import.

    **Requirements:**
    - Import must have `rollback_available=true`
    - Rollback snapshot must exist

    **Process:**
    1. Changes import status to `rollback`
    2. Deletes records created during import
    3. Restores database state from snapshot
    4. Marks import as `failed` with rollback message

    **Note:** Rollback is only available for imports with `overwrite_existing=true`

**Parameters:**

- `project_id` (path) *(required)*: No description
- `import_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/maintenance/analyze`

**Summary:** Run ANALYZE to update statistics

Execute PostgreSQL ANALYZE operation to update query planner statistics.

    **What it Does:**
    - Collects statistics about table contents
    - Updates query planner optimization data
    - Improves query performance by enabling better execution plans

    **When to Use:**
    - After bulk INSERT/UPDATE/DELETE operations
    - When query plans are suboptimal
    - Regular maintenance (weekly)
    - After schema changes

    **Note:** This operation is lightweight and doesn't lock tables.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/maintenance/reindex`

**Summary:** Rebuild database indexes

Execute PostgreSQL REINDEX operation to rebuild corrupted or bloated indexes.

    **What it Does:**
    - Rebuilds all indexes from scratch
    - Fixes index corruption
    - Reduces index bloat
    - Improves query performance

    **When to Use:**
    - Suspected index corruption
    - Significant index bloat after many updates
    - Performance degradation despite VACUUM/ANALYZE
    - After major data changes

    **Note:** REINDEX requires exclusive table locks and may take time.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/maintenance/vacuum`

**Summary:** Run VACUUM on database

Execute PostgreSQL VACUUM operation to reclaim storage and optimize performance.

    **VACUUM Operations:**
    - `VACUUM`: Standard vacuum operation (reclaim space from deleted rows)
    - `VACUUM ANALYZE`: Vacuum + update statistics for query planner
    - `VACUUM FULL`: Complete table rewrite (locks tables, reclaims maximum space)

    **When to Use:**
    - After bulk deletions
    - Regular maintenance (weekly/monthly)
    - When disk space is needed
    - Query performance degradation

    **Note:** VACUUM FULL requires exclusive table locks and may take longer.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/memory`

**Summary:** Create Memory Record

Create a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/memory`

**Summary:** List Memories

List memory records for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description
- `role` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/memory/batch/delete`

**Summary:** Batch delete memory records

Delete multiple memory records by ID in a single request. Supports up to 500 IDs per batch.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/memory/batch/update`

**Summary:** Batch update memory records

Update multiple memory records with partial field updates. Supports up to 500 updates per batch.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/memory/batch/upsert`

**Summary:** Batch upsert memory records

Create or update multiple memory records in a single atomic transaction. Supports up to 500 records per batch with automatic rollback on failure.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/memory/search`

**Summary:** Search Memory

Search memory records

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/memory/{memory_id}`

**Summary:** Get Memory Record

Get a specific memory record by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database/memory/{memory_id}`

**Summary:** Update Memory Record

Update a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/memory/{memory_id}`

**Summary:** Delete Memory Record

Delete a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/metrics`

**Summary:** Get database performance metrics

Get real-time database performance metrics for monitoring and optimization.

    **Metrics Included:**
    - Active database connections
    - Queries per second (QPS)
    - Cache hit rate (0.0 - 1.0)
    - Average query latency in milliseconds

    **Use Cases:**
    - Database Settings page monitoring
    - Performance dashboards
    - Alerting on threshold breaches
    - Capacity planning

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/query`

**Summary:** Execute Sql Query

Execute SQL query against project's dedicated PostgreSQL instance

**Security Features:**
- Automatic SQL injection detection using pattern matching
- Dangerous command blacklist (DROP DATABASE, TRUNCATE, ALTER SYSTEM, etc.)
- Configurable timeout enforcement (30s default, 5min max)
- Read-only mode option for SELECT-only queries
- Query complexity scoring for accurate billing

**Billing:**
- Base cost: 0.1 credits per query
- Execution time: 0.01 credits per 100ms
- Complexity factor: 0.01 credits per complexity point

**Query Types Supported:**
- SELECT: Read data from tables
- INSERT: Add new records
- UPDATE: Modify existing records
- DELETE: Remove records

**Usage Examples:**

Simple SELECT:
```json
{
  "sql": "SELECT * FROM users LIMIT 10",
  "timeout_seconds": 30,
  "max_rows": 100
}
```

Complex Analytics:
```json
{
  "sql": "SELECT DATE(created_at) as date, COUNT(*) as count FROM orders WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC",
  "timeout_seconds": 60,
  "max_rows": 1000
}
```

Read-Only Mode:
```json
{
  "sql": "SELECT * FROM products",
  "read_only": true,
  "timeout_seconds": 30
}
```

**Error Codes:**
- 400: SQL validation failed (dangerous command or injection detected)
- 404: No PostgreSQL instance found (provision one first)
- 408: Query timeout exceeded
- 500: Query execution error

**Rate Limits:**
- 100 queries per minute per user (future implementation)
- 500 queries per minute per project (future implementation)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf`

**Summary:** Create Rlhf Dataset

Create RLHF dataset

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/export`

**Summary:** Export Rlhf Data

Export RLHF training data in multiple formats

**Supported Formats:**
- **json**: Standard JSON array format
- **csv**: Comma-separated values for spreadsheets
- **parquet**: Apache Parquet columnar format (requires pandas and pyarrow)
- **openai**: OpenAI fine-tuning JSONL format (compatible with GPT-3.5/4 fine-tuning)
- **anthropic**: Anthropic Claude fine-tuning format (experimental)

**Filters:**
- start_date: ISO format date (e.g., "2025-01-01T00:00:00Z")
- end_date: ISO format date
- feedback: Filter by feedback type (positive, negative, mixed)
- model: Filter by model name
- session_id: Filter by session ID

**Example Request (OpenAI format):**
```json
{
  "format": "openai",
  "start_date": "2025-12-01T00:00:00Z",
  "feedback": "positive"
}
```

**CSV Format:**
Returns CSV string with columns: interaction_id, prompt, response, feedback, reward, model, session_id, agent_id, human_feedback, created_at

**Parquet Format:**
Returns base64-encoded Parquet binary data with full schema information

**OpenAI Format:**
Returns JSONL with format: {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/interactions`

**Summary:** Log Rlhf Interaction

Log RLHF interaction for learning

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/rlhf/interactions`

**Summary:** List Rlhf Interactions

List RLHF interactions for project with optional filters

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): No description
- `limit` (query): No description
- `feedback` (query): No description
- `model` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description
- `reward_min` (query): No description
- `reward_max` (query): No description
- `tags` (query): No description
- `start_time` (query): No description
- `end_time` (query): No description
- `search` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/interactions/batch`

**Summary:** Batch Create Rlhf Interactions

Batch create multiple RLHF interactions

**Use Case:** Import interactions from CSV, JSON, or other sources

**Request Body:**
```json
[
  {
    "prompt": "What is machine learning?",
    "response": "Machine learning is...",
    "feedback": "positive",
    "reward": 0.9,
    "model": "gpt-4",
    "session_id": "session-123",
    "agent_id": "agent-456",
    "human_feedback": "Great explanation!",
    "tags": ["ml", "education"],
    "context": "Educational context",
    "metadata": {"source": "import"}
  }
]
```

**Response:**
```json
{
  "project_id": "uuid",
  "created_count": 5,
  "failed_count": 0,
  "created_interactions": [
    {"interaction_id": "uuid1", "status": "created"},
    {"interaction_id": "uuid2", "status": "created"}
  ],
  "errors": []
}
```

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/interactions/compare`

**Summary:** Create Comparison Interaction

Create comparison-based RLHF interaction

**Use Case:** A/B testing of responses where user selects preferred response

**Example Request:**
```json
{
  "prompt": "Explain neural networks",
  "response_a": "Neural networks are computational models...",
  "response_b": "Neural networks are brain-inspired algorithms...",
  "preferred_response": "B",
  "model_a": "gpt-3.5-turbo",
  "model_b": "gpt-4",
  "feedback_comment": "Response B is more intuitive",
  "session_id": "session-123"
}
```

**Creates Two Interactions:**
- Preferred response gets positive feedback (reward 1.0)
- Non-preferred response gets negative feedback (reward -1.0)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/interactions/single-review`

**Summary:** Create Single Review Interaction

Create single review RLHF interaction with rating

**Use Case:** Simple thumbs up/down or 5-star rating of a response

**Example Request:**
```json
{
  "prompt": "How do I deploy to production?",
  "response": "Here are the steps...",
  "rating": 5,
  "feedback_comment": "Very helpful and detailed!",
  "model": "gpt-4",
  "tags": ["deployment", "helpful"],
  "session_id": "session-123"
}
```

**Rating to Feedback Mapping:**
- 5: positive (reward 1.0)
- 4: positive (reward 0.5)
- 3: mixed (reward 0.0)
- 2: negative (reward -0.5)
- 1: negative (reward -1.0)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/rlhf/interactions/{interaction_id}`

**Summary:** Get Rlhf Interaction

Get specific RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/rlhf/interactions/{interaction_id}`

**Summary:** Delete Rlhf Interaction

Delete an RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database/rlhf/interactions/{interaction_id}/feedback`

**Summary:** Update Rlhf Feedback

Update feedback for an RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/rlhf/sessions`

**Summary:** List Rlhf Sessions

List RLHF sessions for project with optional filters

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): No description
- `limit` (query): No description
- `status` (query): No description
- `start_time` (query): No description
- `end_time` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/sessions`

**Summary:** Create Rlhf Session

Create a new RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Get Rlhf Session

Get specific RLHF session details

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Update Rlhf Session

Update an existing RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Delete Rlhf Session

Delete an RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/sessions/{session_id}/start`

**Summary:** Start Rlhf Session

Start an RLHF session (set status to active)

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/sessions/{session_id}/stop`

**Summary:** Stop Rlhf Session

Stop an RLHF session (set status to stopped)

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/start`

**Summary:** Start Rlhf Session Simple

Start a new RLHF session or resume existing one

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/rlhf/stats`

**Summary:** Get Rlhf Stats

Get RLHF statistics for project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `time_range` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/rlhf/stop`

**Summary:** Stop Rlhf Session Simple

Stop an RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database/settings/quantum-compression`

**Summary:** Toggle quantum compression for project

Enable or disable quantum compression for vector storage.

    **Quantum Compression Benefits:**
    - Up to 60% reduction in vector storage size
    - Preserved similarity relationships
    - Faster vector searches (smaller index)
    - Lower memory footprint

    **Algorithms Available:**
    - `quantum_harmonic`: Frequency domain compression (recommended)
    - `sparse_encode`: Sparsity-based compression
    - `entropy_reduce`: PCA-based compression

    **Note:** Enabling compression will compress future vectors.
    Existing vectors can be compressed using the batch compression endpoint.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/storage/upload`

**Summary:** Upload File Binary

Upload binary file to MinIO storage

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/tables`

**Summary:** Create Table

Create a new table in project database

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/tables`

**Summary:** List Tables

List all tables in project database with pagination metadata

Returns paginated response with:
- total: Total number of tables in project
- skip: Number of tables skipped
- limit: Maximum tables per page
- has_more: Whether more tables are available
- data: List of table objects

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/tables/{table_id}`

**Summary:** Get Table

Get table details

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/tables/{table_name}`

**Summary:** Delete Table

Delete a table and all its data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/tables/{table_name}/query`

**Summary:** Query Rows Mongo Style

Query table rows using MongoDB-style filters and operators

**Supported Filter Operators:**
- `$eq`: Equals (e.g., {"status": {"$eq": "active"}})
- `$ne`: Not equals (e.g., {"status": {"$ne": "deleted"}})
- `$gt`: Greater than (e.g., {"age": {"$gt": 18}})
- `$gte`: Greater than or equal (e.g., {"age": {"$gte": 18}})
- `$lt`: Less than (e.g., {"price": {"$lt": 100}})
- `$lte`: Less than or equal (e.g., {"price": {"$lte": 100}})
- `$in`: Value in array (e.g., {"status": {"$in": ["active", "pending"]}})
- `$nin`: Value not in array (e.g., {"status": {"$nin": ["deleted", "banned"]}})
- `$contains`: String/array contains (e.g., {"tags": {"$contains": "premium"}})
- `$regex`: Regex pattern match (e.g., {"email": {"$regex": ".*@gmail\.com$"}})

**Sort Specification:**
- Use 1 for ascending order, -1 for descending order
- Example: {"created_at": -1, "name": 1}

**Security Features:**
- Automatic SQL injection prevention via parameterized queries
- Field name validation (alphanumeric, underscore, dot only)
- Maximum result limit enforcement (1000 rows)
- Operator whitelist validation

**Example Request:**
```json
{
  "filter": {
    "age": {"$gte": 18},
    "status": {"$in": ["active", "pending"]},
    "tags": {"$contains": "premium"},
    "email": {"$regex": ".*@gmail\.com$"}
  },
  "sort": {"created_at": -1},
  "limit": 50,
  "skip": 0
}
```

**Example Response:**
```json
{
  "total": 245,
  "skip": 0,
  "limit": 50,
  "has_more": true,
  "filter_summary": {
    "age": {"$gte": 18},
    "status": {"$in": ["active", "pending"]}
  },
  "execution_time_ms": 45.23,
  "data": [
    {
      "row_id": "uuid",
      "project_id": "uuid",
      "table_id": "uuid",
      "table_name": "users",
      "row_data": {"age": 25, "status": "active", ...},
      "created_at": "2025-12-03T10:00:00Z",
      "updated_at": "2025-12-03T10:00:00Z"
    }
  ]
}
```

**Error Codes:**
- 400: Invalid filter operator, field name, or dangerous pattern detected
- 404: Table not found
- 500: Query execution error

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/tables/{table_name}/rows`

**Summary:** Create Row

Insert a new row into a table

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/tables/{table_name}/rows`

**Summary:** List Rows

Read all rows from a table with pagination metadata

Returns paginated response with:
- total: Total number of rows in table
- skip: Number of rows skipped
- limit: Maximum rows per page
- has_more: Whether more rows are available
- data: List of row objects

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database/tables/{table_name}/rows/bulk`

**Summary:** Bulk Update Rows

Bulk update rows in a table using MongoDB-style operators

**Supported Update Operators:**
- `$set` - Set field values
- `$inc` - Increment numeric fields
- `$push` - Add to array fields
- `$pull` - Remove from array fields
- `$unset` - Remove fields

**Filter Operators:**
- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

**Example Request:**
```json
{
  "filter": {
    "status": "pending",
    "created_at": {"$lt": "2025-01-01"}
  },
  "update": {
    "$set": {
      "status": "active",
      "updated_at": "2025-12-03T10:00:00Z"
    },
    "$inc": {
      "login_count": 1
    },
    "$push": {
      "notifications": "Account activated"
    }
  },
  "confirm_large_operation": false
}
```

**Safety Features:**
- Requires non-empty filter to prevent accidental updates
- Confirmation required for operations affecting >100 rows
- Transaction support with automatic rollback on errors
- Validation of all update operators

**Returns:**
- `matched_count` - Number of rows matched by filter
- `modified_count` - Number of rows actually modified
- `filter_used` - Filter criteria applied
- `update_operators` - Update operators applied
- `execution_time_ms` - Operation execution time
- `warnings` - Any warnings during operation

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/tables/{table_name}/rows/bulk`

**Summary:** Bulk Delete Rows

Bulk delete rows from a table using MongoDB-style filters

**Filter Operators:**
- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

**Example Request:**
```json
{
  "filter": {
    "status": "inactive",
    "last_login": {"$lt": "2024-01-01"}
  },
  "confirm_large_operation": false
}
```

**Safety Features:**
- Requires non-empty filter to prevent accidental deletion of all rows
- Confirmation required for operations affecting >100 rows
- Transaction support with automatic rollback on errors

**Returns:**
- `deleted_count` - Number of rows deleted
- `filter_used` - Filter criteria applied
- `execution_time_ms` - Operation execution time
- `warnings` - Any warnings during operation

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Get Row

Get a specific row by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Update Row

Update an existing row

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Delete Row

Delete a row from a table

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/vectors`

**Summary:** List Vectors

List all vectors in a project with pagination

Returns vectors with optional filtering by namespace.
Use detailed=false (default) to exclude full embeddings and save bandwidth.
Use detailed=true to include full vector embeddings in the response.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): Number of vectors to skip
- `limit` (query): Maximum vectors to return
- `namespace` (query): Filter by namespace
- `detailed` (query): Include full embeddings (default: false for bandwidth efficiency)

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/vectors/analytics`

**Summary:** Get advanced vector analytics

Get comprehensive vector analytics including similarity metrics, storage stats, and quality indicators.

    **Features:**
    - Total vector counts and namespace distribution
    - Average cosine similarity analysis (sample-based for performance)
    - Detailed storage metrics (bytes, MB, GB)
    - Quality metrics (magnitude, sparsity, variance)
    - Dimension statistics and distribution

    **Performance:**
    - Samples up to 1000 vectors for similarity calculations
    - Uses efficient SQL aggregations for counts
    - Results are cached for improved performance

    **Use Cases:**
    - Monitor vector quality and consistency
    - Identify storage optimization opportunities
    - Analyze vector clustering potential
    - Track vector statistics over time

    Args:
        project_id: UUID of the project
        namespace: Optional namespace filter
        sample_size: Maximum vectors to analyze (default: 1000, max: 10000)

    Returns:
        VectorAnalyticsResponse with comprehensive analytics

**Parameters:**

- `project_id` (path) *(required)*: No description
- `namespace` (query): Optional namespace filter
- `sample_size` (query): Maximum vectors to analyze

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/vectors/cluster`

**Summary:** Run clustering on vectors

Run clustering algorithms on project vectors to identify groups and patterns.

    **Algorithms:**

    1. **KMeans** (default)
       - Best for: Well-separated, spherical clusters
       - Parameters: n_clusters (2-100)
       - Returns: Cluster centroids and inertia

    2. **DBSCAN**
       - Best for: Arbitrary shapes, noise detection
       - Parameters: eps (distance threshold), min_samples
       - Returns: Variable clusters + noise points

    3. **Hierarchical**
       - Best for: Nested cluster structures
       - Parameters: n_clusters (2-100)
       - Returns: Hierarchical cluster tree

    **Features:**
    - Analyzes up to 100,000 vectors (configurable)
    - Returns cluster centroids (first 10 dimensions)
    - Lists vector IDs per cluster (first 50)
    - Provides algorithm-specific metrics

    **Performance:**
    - Uses cosine distance for similarity
    - Optimized for high-dimensional embeddings
    - Samples large datasets for efficiency

    **Example Request:**
    ```json
    {
      "algorithm": "kmeans",
      "n_clusters": 5,
      "namespace": "embeddings",
      "max_vectors": 5000
    }
    ```

    Args:
        project_id: UUID of the project
        request: Clustering configuration

    Returns:
        VectorClusteringResponse with cluster assignments and metrics

    Raises:
        HTTPException: 400 for invalid parameters, 500 for clustering failures

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/vectors/quantum-compress`

**Summary:** Quantum Compress Vector

Compress a vector using quantum-inspired compression algorithms

This endpoint provides advanced vector compression using three algorithms:
- **quantum_harmonic**: Frequency domain compression using quantum harmonic oscillator principles (60% compression)
- **sparse_encode**: Threshold-based sparse representation with dynamic sparsification
- **entropy_reduce**: Entropy-based compression using principal component analysis

Features:
- Achieves up to 60% compression ratio while preserving similarity relationships
- Adjustable precision (8, 16, or 32-bit quantization)
- Maintains semantic meaning for vector search operations
- Returns base64-encoded compressed data with full metadata

Args:
    project_id: UUID of the project
    request: QuantumCompressRequest containing:
        - vector_embedding: Vector to compress (1-4096 dimensions)
        - compression_ratio: Target ratio (0.2-0.8, default 0.5)
        - preserve_similarity: Maintain similarity relationships (default True)
        - precision: Bit precision for quantization (8, 16, or 32, default 16)
        - method: Algorithm choice (quantum_harmonic, sparse_encode, entropy_reduce)

Returns:
    QuantumCompressResponse with:
        - compressed_data: Base64-encoded compressed vector
        - original_dimensions: Original vector dimensions
        - compressed_dimensions: Compressed representation dimensions
        - compression_ratio: Actual compression ratio achieved
        - compression_metadata: Entropy, sparsity, and magnitude metrics
        - stats: Performance statistics (size, time, algorithm)

Raises:
    HTTPException: 400 for invalid input, 500 for compression failures

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/vectors/search`

**Summary:** Search Vectors

Search vectors using similarity

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/vectors/stats`

**Summary:** Get Vector Stats

Get vector statistics for a project

Returns:
- total_vectors: Total count of vectors
- namespaces: List of unique namespaces
- avg_dimensions: Average embedding dimensions
- total_size_mb: Estimated storage size

**Parameters:**

- `project_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace
- `detailed` (query): Include detailed statistics

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/vectors/upsert`

**Summary:** Upsert Vector

Upsert a vector into project database

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/database/vectors/upsert-batch`

**Summary:** Upsert Vectors Batch

Batch upsert vectors

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/database/vectors/{vector_id}`

**Summary:** Get Vector

Get a specific vector by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `vector_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/database/vectors/{vector_id}`

**Summary:** Delete Vector

Delete a specific vector by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `vector_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/embeddings/embed-and-store`

**Summary:** Embed And Store In Project

Generate embeddings and automatically store in ZeroDB project
with automatic dimension detection and routing (Issues #309, #310)

**Optimized for RAG workflows:**
1. Generate embeddings (FREE via Railway service)
2. Auto-detect dimension (384, 768, 1024, or 1536)
3. Route to correct database column (vector_384, vector_768, etc.)
4. Store vectors in project's ZeroDB database
5. Ready for semantic search immediately

**Supported Models:**
- `BAAI/bge-small-en-v1.5` (384-dim) - Default, fastest, FREE
- `BAAI/bge-base-en-v1.5` (768-dim) - Better quality, FREE
- `BAAI/bge-large-en-v1.5` (1024-dim) - Best quality, FREE
- Custom 1536-dim (OpenAI compatible)

**Parameters:**
- `texts`: List of texts to embed and store (1-100)
- `model`: Model to use (optional, defaults to BAAI/bge-small-en-v1.5)
- `metadata_list`: Optional metadata for each text
- `namespace`: Vector namespace (default: "default")

**Returns:**
- `success`: Boolean indicating success
- `vectors_stored`: Number of vectors stored
- `embeddings_generated`: Number of embeddings generated
- `model`: Model used
- `dimensions`: Detected dimension (384, 768, 1024, or 1536)
- `target_column`: Database column where vectors are stored
- `namespace`: Namespace used
- `project_id`: Project UUID
- `processing_time_ms`: Total processing time

**Example:**
```python
POST /v1/{project_id}/embeddings/embed-and-store
{
    "texts": ["Document 1", "Document 2"],
    "model": "BAAI/bge-base-en-v1.5",  # Optional
    "namespace": "my_docs"
}

# Response
{
    "success": true,
    "vectors_stored": 2,
    "dimensions": 768,
    "target_column": "vector_768",  # Auto-detected routing
    ...
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/embeddings/generate`

**Summary:** Generate Project Embeddings

Generate embeddings within a ZeroDB project context (Issue #310: Multi-Model Support)

**FREE - No usage costs!**
Uses Railway self-hosted HuggingFace service

**Supported Models:**
- `BAAI/bge-small-en-v1.5` (384-dim) - Default, fastest
- `BAAI/bge-base-en-v1.5` (768-dim) - Better quality
- `BAAI/bge-large-en-v1.5` (1024-dim) - Best quality

**Parameters:**
- `texts`: List of texts to embed (1-100)
- `model`: Model to use (optional, defaults to BAAI/bge-small-en-v1.5)
- `normalize`: Normalize embeddings to unit length (default: true)

**Returns:**
- `embeddings`: List of embedding vectors
- `model`: Model used
- `dimensions`: Vector dimensions (384, 768, or 1024)
- `count`: Number of embeddings generated
- `processing_time_ms`: Generation time in milliseconds
- `project_id`: Project UUID

**Example:**
```python
POST /v1/{project_id}/embeddings/generate
{
    "texts": ["ZeroDB is a vector database"],
    "model": "BAAI/bge-base-en-v1.5"  # Optional, uses small by default
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/embeddings/models`

**Summary:** List Available Embedding Models

List available embedding models for a ZeroDB project (Issue #310)

**Supported Models:**
- BAAI/bge-small-en-v1.5 (384-dim) - Default, fastest, FREE
- BAAI/bge-base-en-v1.5 (768-dim) - Better quality, FREE
- BAAI/bge-large-en-v1.5 (1024-dim) - Best quality, FREE

**Use Cases:**
- **384-dim**: General-purpose, cost-sensitive (80% of users)
- **768-dim**: Higher quality search (15% of users)
- **1024-dim**: Mission-critical search (5% of users)

Returns:
    List of available models with metadata

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/embeddings/search`

**Summary:** Semantic Search In Project

Semantic search within a ZeroDB project with dimension-aware routing (Issues #309, #310)

**Optimized for RAG:**
1. Generate query embedding (FREE via Railway service)
2. Auto-detect dimension and search correct column
3. Return most relevant documents

**Parameters:**
- `query`: Search query text
- `model`: Model to use (must match stored vectors' model, defaults to BAAI/bge-small-en-v1.5)
- `limit`: Maximum results (1-100, default: 10)
- `threshold`: Similarity threshold (0.0-1.0, default: 0.7)
- `namespace`: Vector namespace (default: "default")
- `filter_metadata`: Optional metadata filters

**Returns:**
- `results`: List of matching vectors with metadata
- `query`: Original search query
- `total_results`: Total number of results
- `model`: Model used for query embedding
- `project_id`: Project UUID
- `processing_time_ms`: Search time in milliseconds

**Important:** Use the same model you used when storing vectors!
- If you stored with `BAAI/bge-base-en-v1.5` (768-dim), search with same model
- Mixing dimensions will result in poor search quality

**Example:**
```python
POST /v1/{project_id}/embeddings/search
{
    "query": "What is ZeroDB?",
    "model": "BAAI/bge-base-en-v1.5",  # Match your stored vectors' model
    "limit": 5,
    "threshold": 0.75
}

# Response
{
    "results": [
        {
            "id": "vec_123",
            "document": "ZeroDB is a vector database...",
            "similarity": 0.92,
            "metadata": {...}
        }
    ],
    "total_results": 5,
    "model": "BAAI/bge-base-en-v1.5",
    ...
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/files`

**Summary:** List Files

List all files in project storage

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `skip` (query): Number of files to skip
- `limit` (query): Maximum files to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/files/metadata`

**Summary:** Upload File Metadata

Upload file metadata only (no binary file)

Use this endpoint when you've already uploaded the file to MinIO
and just need to register the metadata in the database

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/files/stats/summary`

**Summary:** Get File Stats

Get file storage statistics for project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/{project_id}/files/upload`

**Summary:** Upload File Binary

Upload binary file to MinIO storage with metadata tracking

This endpoint:
1. Uploads the file to MinIO object storage
2. Stores file metadata in the database
3. Updates project storage usage
4. Returns file details including URLs

Fixed Issues:
- Corrected method call from upload_file() to upload_file_metadata()
- Added proper error handling and rollback
- Improved metadata parsing

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/files/{file_id}`

**Summary:** Get File

Get file metadata by ID

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/{project_id}/files/{file_id}`

**Summary:** Delete File

Delete file metadata and optionally the file from storage

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID
- `delete_from_storage` (query): Also delete from MinIO storage

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/files/{file_id}/content`

**Summary:** Stream File Content

Stream file content directly from MinIO storage.

This endpoint acts as a proxy, fetching the file from MinIO using
server-side authentication and streaming it to the client.

Use this endpoint for displaying images when presigned URLs don't work
due to proxy/edge network issues.

Example usage in HTML:
    <img src="/api/v1/projects/{project_id}/files/{file_id}/content" />

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/{project_id}/files/{file_id}/download`

**Summary:** Download File

Download file from MinIO storage

Returns presigned URL for direct download

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

## ZeroDB Database


### `GET /v1/projects/projects/{project_id}/analytics/stats`

**Summary:** Get project analytics statistics

Get comprehensive analytics for the project including vector stats, query metrics, and performance data. Used by Analytics dashboard.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/projects/{project_id}/database/namespaces`

**Summary:** Get list of vector namespaces

Get list of available vector namespaces with counts. Used by Semantic Search page for namespace filtering.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/projects/{project_id}/postgres`

**Summary:** Provision Dedicated PostgreSQL Instance

Create a dedicated PostgreSQL instance for the project via Railway

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/projects/{project_id}/postgres`

**Summary:** Get PostgreSQL Instance Status

Get the status and details of the dedicated PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/projects/{project_id}/postgres`

**Summary:** Delete PostgreSQL Instance

Delete the dedicated PostgreSQL instance and all data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `confirm` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/projects/{project_id}/postgres/connection`

**Summary:** Get PostgreSQL Connection Details

Get connection string and credentials for direct SQL access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `credential_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/projects/{project_id}/postgres/logs`

**Summary:** Get PostgreSQL Query Logs

Get recent SQL query logs and performance data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): No description
- `query_type` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/projects/{project_id}/postgres/restart`

**Summary:** Restart PostgreSQL Instance

Restart the dedicated PostgreSQL instance via Railway deployment restart

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/projects/{project_id}/postgres/rotate`

**Summary:** Rotate PostgreSQL Credentials

Generate new credentials for the PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/projects/{project_id}/postgres/usage`

**Summary:** Get PostgreSQL Usage Statistics

Get detailed usage statistics and billing information

**Parameters:**

- `project_id` (path) *(required)*: No description
- `hours` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/projects/{project_id}/stats`

**Summary:** Get overall project statistics

Get comprehensive project statistics including counts of all resources. Used by main Dashboard overview.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/public/{project_id}/database/agents/types`

**Summary:** Get list of agent types

Get list of unique agent types for filtering in Agent Logs page. Public endpoint for frontend filtering.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/agent-logs/metrics`

**Summary:** Get Agent Logs Metrics

Get comprehensive agent logs metrics

Returns:
- active_agents: Number of unique agents with activity in time range
- completed_tasks: Tasks completed successfully
- error_rate: Percentage of ERROR level logs
- avg_duration_ms: Average task duration in milliseconds
- total_logs: Total log entries
- logs_by_level: Breakdown by log level
- recent_errors: Recent error messages

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `time_range_hours` (query): Time range in hours (1-168)

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/agent-logs/recent-activity`

**Summary:** Get Recent Activity

Get recent agent activity logs

Returns chronologically ordered list of recent agent activities
with detailed information for debugging and monitoring

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `limit` (query): Maximum number of activities
- `agent_id` (query): Filter by agent ID
- `log_level` (query): Filter by log level

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/agent-logs/sessions/{session_id}`

**Summary:** Get Session Details

Get detailed logs and metrics for a specific agent session

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `session_id` (path) *(required)*: Session ID

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/agent-logs/trace`

**Summary:** Get Agent Trace

Get live trace visualization data for agent execution

Returns structured trace data suitable for timeline visualization
including execution flow, state transitions, and error tracking

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `session_id` (query): Filter by session ID
- `agent_id` (query): Filter by agent ID
- `time_window_minutes` (query): Time window in minutes

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database`

**Summary:** Enable Database

Enable ZeroDB for an existing project
Creates database instance and returns configuration

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database`

**Summary:** Get Database Status

Get database status and configuration for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database`

**Summary:** Update Database Config

Update database configuration for a project

Supports updating both top-level fields and database_config dictionary:
- quantum_enabled: bool - Enable/disable quantum compression
- vector_dimensions: int - Set vector embedding dimensions
- mcp_enabled: bool - Enable/disable MCP features
- database_config: dict - Additional configuration options

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database`

**Summary:** Disable Database

Disable database features for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/agent-logs`

**Summary:** Create Agent Log

Create agent execution log

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/agent-logs`

**Summary:** List Agent Logs

List agent logs with optional filtering

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): No description
- `session_id` (query): No description
- `log_level` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/agent-logs/export`

**Summary:** Export Agent Logs

Export agent logs in specified format

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/agent-logs/stats`

**Summary:** Get Agent Logs Stats

Get agent logs statistics

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/agent-logs/{log_id}`

**Summary:** Get Agent Log

Get a specific agent log by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `log_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/agent-logs/{log_id}`

**Summary:** Delete Agent Log

Delete an agent log entry

**Parameters:**

- `project_id` (path) *(required)*: No description
- `log_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/agents/active`

**Summary:** List Active Agents

List active agents for project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/agents/traces`

**Summary:** List Agent Traces

List agent execution traces

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): No description
- `session_id` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/backups`

**Summary:** Get database backups

Get list of database backups for the project.

    **Backup Information:**
    - Backup ID (unique identifier)
    - Creation timestamp
    - Size in megabytes
    - Status (completed, failed, in_progress)

    **Pagination:**
    - Use `skip` and `limit` query parameters
    - Default: skip=0, limit=50
    - Maximum limit: 1000

    **Use Cases:**
    - Database Settings page backup listing
    - Backup restoration workflows
    - Storage usage monitoring

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): Number of backups to skip
- `limit` (query): Maximum backups to return

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/batch/query`

**Summary:** Execute batch query operations

Execute multiple table operations (query, insert, update, delete) in a single request. Supports up to 50 operations per batch with optional parallel execution. MongoDB-style filters are supported for query/update/delete operations.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/connection`

**Summary:** Get database connection information

Get database connection details for the project's PostgreSQL instance.

    **Information Included:**
    - Database host and port
    - Database name
    - Connection status (active, inactive, provisioning)
    - Masked connection string (password hidden)

    **Status Values:**
    - `active`: Database is running and accessible
    - `inactive`: Database is stopped or unreachable
    - `provisioning`: Database is being provisioned

    **Use Cases:**
    - Database Settings page display
    - Connection string generation for clients
    - Status monitoring

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/events`

**Summary:** Create Event

Create an event record

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/events`

**Summary:** List Events

List events for a project with optional topic filter

**Parameters:**

- `project_id` (path) *(required)*: No description
- `topic` (query): Filter by event topic
- `skip` (query): Number of records to skip
- `limit` (query): Maximum number of records to return

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/events/batch`

**Summary:** Batch publish events

Publish multiple events in a single request for high-throughput event streaming. Supports up to 100 events per batch with individual validation.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/events/stats`

**Summary:** Get Event Stats

Get event statistics for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `time_range` (query): Time range: hour, day, week, month
- `topic` (query): Filter by event topic

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/events/subscriptions`

**Summary:** List event subscriptions

Get all event subscriptions for a project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/events/subscriptions`

**Summary:** Create event subscription

Create a new event subscription for a project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/events/subscriptions/{subscription_id}`

**Summary:** Delete event subscription

Delete an event subscription by ID

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `subscription_id` (path) *(required)*: Subscription ID

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/events/{event_id}`

**Summary:** Get Event

Get a specific event by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `event_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/export`

**Summary:** Create database export job

Start an async database export job. Supports JSON, CSV, Parquet, and PostgreSQL dump formats.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/exports/{export_id}`

**Summary:** Get export job status

Check the status of an export job and get the download URL when completed.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `export_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/extensions`

**Summary:** Get PostgreSQL extensions

Get list of installed PostgreSQL extensions for the project.

    **Extension Information:**
    - Extension name (e.g., pg_vector, uuid-ossp)
    - Version number
    - Description

    **Common Extensions:**
    - `pg_vector`: Vector similarity search
    - `uuid-ossp`: UUID generation
    - `pg_stat_statements`: Query performance tracking
    - `pg_trgm`: Trigram matching for text search

    **Use Cases:**
    - Database Settings page extensions listing
    - Feature availability checking
    - Extension installation guidance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/files`

**Summary:** Upload File

Upload a file to project storage

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/files`

**Summary:** List Files

List all files in project storage

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/files/stats`

**Summary:** Get File Stats

Get file storage statistics for project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/files/{file_id}`

**Summary:** Get File

Get file metadata by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/files/{file_id}`

**Summary:** Delete File

Delete a file from project storage

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/files/{file_id}/download`

**Summary:** Download File

Download file content

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/files/{file_id}/presigned-url`

**Summary:** Generate Presigned Url

Generate presigned URL for file access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/import`

**Summary:** Start database import

Import data from various sources (JSON, CSV, URL, PostgreSQL backup, or previous export).

    **Import Sources:**
    - `json`: Import from JSON data (requires `file_content` as base64)
    - `csv`: Import from CSV data (requires `file_content` as base64)
    - `file_url`: Download and import from URL (requires `file_url`)
    - `export_id`: Re-import from previous export (requires `export_id`)
    - `postgresql_backup`: Restore from PostgreSQL backup (requires `backup_id`)

    **Merge Strategies:**
    - `skip`: Skip existing records (default)
    - `overwrite`: Replace existing records
    - `merge`: Merge metadata, keep latest embedding

    **Process:**
    1. Creates import job and validates request
    2. Validates schema if `validate_schema=true`
    3. Creates rollback snapshot if `overwrite_existing=true`
    4. Imports records with chosen merge strategy
    5. Returns import job status (poll GET endpoint for progress)

    **Security:**
    - File URLs must be from allowed domains
    - Maximum file size: 500MB
    - SQL injection protection for PostgreSQL imports

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

---

### `GET /v1/projects/{project_id}/database/imports/{import_id}`

**Summary:** Get import status

Get the current status of a database import operation.

    **Status Values:**
    - `pending`: Import job created, waiting to start
    - `validating`: Validating data schema
    - `in_progress`: Actively importing data
    - `completed`: Import finished successfully
    - `failed`: Import failed (check error_message)
    - `rollback`: Import being rolled back

    **Progress Tracking:**
    - `progress_percent`: 0-100 completion percentage
    - `records_imported`: Number of records successfully imported
    - `records_failed`: Number of records that failed
    - `records_skipped`: Number of records skipped (duplicates)
    - `records_total`: Total records to import

    **Polling Recommendation:**
    - Poll every 2-5 seconds while status is `validating` or `in_progress`
    - Stop polling when status is `completed`, `failed`, or `rollback`

**Parameters:**

- `project_id` (path) *(required)*: No description
- `import_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/imports/{import_id}/rollback`

**Summary:** Rollback import

Rollback a failed or unwanted database import.

    **Requirements:**
    - Import must have `rollback_available=true`
    - Rollback snapshot must exist

    **Process:**
    1. Changes import status to `rollback`
    2. Deletes records created during import
    3. Restores database state from snapshot
    4. Marks import as `failed` with rollback message

    **Note:** Rollback is only available for imports with `overwrite_existing=true`

**Parameters:**

- `project_id` (path) *(required)*: No description
- `import_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/maintenance/analyze`

**Summary:** Run ANALYZE to update statistics

Execute PostgreSQL ANALYZE operation to update query planner statistics.

    **What it Does:**
    - Collects statistics about table contents
    - Updates query planner optimization data
    - Improves query performance by enabling better execution plans

    **When to Use:**
    - After bulk INSERT/UPDATE/DELETE operations
    - When query plans are suboptimal
    - Regular maintenance (weekly)
    - After schema changes

    **Note:** This operation is lightweight and doesn't lock tables.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/maintenance/reindex`

**Summary:** Rebuild database indexes

Execute PostgreSQL REINDEX operation to rebuild corrupted or bloated indexes.

    **What it Does:**
    - Rebuilds all indexes from scratch
    - Fixes index corruption
    - Reduces index bloat
    - Improves query performance

    **When to Use:**
    - Suspected index corruption
    - Significant index bloat after many updates
    - Performance degradation despite VACUUM/ANALYZE
    - After major data changes

    **Note:** REINDEX requires exclusive table locks and may take time.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/maintenance/vacuum`

**Summary:** Run VACUUM on database

Execute PostgreSQL VACUUM operation to reclaim storage and optimize performance.

    **VACUUM Operations:**
    - `VACUUM`: Standard vacuum operation (reclaim space from deleted rows)
    - `VACUUM ANALYZE`: Vacuum + update statistics for query planner
    - `VACUUM FULL`: Complete table rewrite (locks tables, reclaims maximum space)

    **When to Use:**
    - After bulk deletions
    - Regular maintenance (weekly/monthly)
    - When disk space is needed
    - Query performance degradation

    **Note:** VACUUM FULL requires exclusive table locks and may take longer.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/memory`

**Summary:** Create Memory Record

Create a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/memory`

**Summary:** List Memories

List memory records for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description
- `role` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/memory/batch/delete`

**Summary:** Batch delete memory records

Delete multiple memory records by ID in a single request. Supports up to 500 IDs per batch.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/memory/batch/update`

**Summary:** Batch update memory records

Update multiple memory records with partial field updates. Supports up to 500 updates per batch.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/memory/batch/upsert`

**Summary:** Batch upsert memory records

Create or update multiple memory records in a single atomic transaction. Supports up to 500 records per batch with automatic rollback on failure.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/memory/search`

**Summary:** Search Memory

Search memory records

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/memory/{memory_id}`

**Summary:** Get Memory Record

Get a specific memory record by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database/memory/{memory_id}`

**Summary:** Update Memory Record

Update a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/memory/{memory_id}`

**Summary:** Delete Memory Record

Delete a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/metrics`

**Summary:** Get database performance metrics

Get real-time database performance metrics for monitoring and optimization.

    **Metrics Included:**
    - Active database connections
    - Queries per second (QPS)
    - Cache hit rate (0.0 - 1.0)
    - Average query latency in milliseconds

    **Use Cases:**
    - Database Settings page monitoring
    - Performance dashboards
    - Alerting on threshold breaches
    - Capacity planning

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/query`

**Summary:** Execute Sql Query

Execute SQL query against project's dedicated PostgreSQL instance

**Security Features:**
- Automatic SQL injection detection using pattern matching
- Dangerous command blacklist (DROP DATABASE, TRUNCATE, ALTER SYSTEM, etc.)
- Configurable timeout enforcement (30s default, 5min max)
- Read-only mode option for SELECT-only queries
- Query complexity scoring for accurate billing

**Billing:**
- Base cost: 0.1 credits per query
- Execution time: 0.01 credits per 100ms
- Complexity factor: 0.01 credits per complexity point

**Query Types Supported:**
- SELECT: Read data from tables
- INSERT: Add new records
- UPDATE: Modify existing records
- DELETE: Remove records

**Usage Examples:**

Simple SELECT:
```json
{
  "sql": "SELECT * FROM users LIMIT 10",
  "timeout_seconds": 30,
  "max_rows": 100
}
```

Complex Analytics:
```json
{
  "sql": "SELECT DATE(created_at) as date, COUNT(*) as count FROM orders WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC",
  "timeout_seconds": 60,
  "max_rows": 1000
}
```

Read-Only Mode:
```json
{
  "sql": "SELECT * FROM products",
  "read_only": true,
  "timeout_seconds": 30
}
```

**Error Codes:**
- 400: SQL validation failed (dangerous command or injection detected)
- 404: No PostgreSQL instance found (provision one first)
- 408: Query timeout exceeded
- 500: Query execution error

**Rate Limits:**
- 100 queries per minute per user (future implementation)
- 500 queries per minute per project (future implementation)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf`

**Summary:** Create Rlhf Dataset

Create RLHF dataset

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/export`

**Summary:** Export Rlhf Data

Export RLHF training data in multiple formats

**Supported Formats:**
- **json**: Standard JSON array format
- **csv**: Comma-separated values for spreadsheets
- **parquet**: Apache Parquet columnar format (requires pandas and pyarrow)
- **openai**: OpenAI fine-tuning JSONL format (compatible with GPT-3.5/4 fine-tuning)
- **anthropic**: Anthropic Claude fine-tuning format (experimental)

**Filters:**
- start_date: ISO format date (e.g., "2025-01-01T00:00:00Z")
- end_date: ISO format date
- feedback: Filter by feedback type (positive, negative, mixed)
- model: Filter by model name
- session_id: Filter by session ID

**Example Request (OpenAI format):**
```json
{
  "format": "openai",
  "start_date": "2025-12-01T00:00:00Z",
  "feedback": "positive"
}
```

**CSV Format:**
Returns CSV string with columns: interaction_id, prompt, response, feedback, reward, model, session_id, agent_id, human_feedback, created_at

**Parquet Format:**
Returns base64-encoded Parquet binary data with full schema information

**OpenAI Format:**
Returns JSONL with format: {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/interactions`

**Summary:** Log Rlhf Interaction

Log RLHF interaction for learning

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/rlhf/interactions`

**Summary:** List Rlhf Interactions

List RLHF interactions for project with optional filters

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): No description
- `limit` (query): No description
- `feedback` (query): No description
- `model` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description
- `reward_min` (query): No description
- `reward_max` (query): No description
- `tags` (query): No description
- `start_time` (query): No description
- `end_time` (query): No description
- `search` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/interactions/batch`

**Summary:** Batch Create Rlhf Interactions

Batch create multiple RLHF interactions

**Use Case:** Import interactions from CSV, JSON, or other sources

**Request Body:**
```json
[
  {
    "prompt": "What is machine learning?",
    "response": "Machine learning is...",
    "feedback": "positive",
    "reward": 0.9,
    "model": "gpt-4",
    "session_id": "session-123",
    "agent_id": "agent-456",
    "human_feedback": "Great explanation!",
    "tags": ["ml", "education"],
    "context": "Educational context",
    "metadata": {"source": "import"}
  }
]
```

**Response:**
```json
{
  "project_id": "uuid",
  "created_count": 5,
  "failed_count": 0,
  "created_interactions": [
    {"interaction_id": "uuid1", "status": "created"},
    {"interaction_id": "uuid2", "status": "created"}
  ],
  "errors": []
}
```

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/interactions/compare`

**Summary:** Create Comparison Interaction

Create comparison-based RLHF interaction

**Use Case:** A/B testing of responses where user selects preferred response

**Example Request:**
```json
{
  "prompt": "Explain neural networks",
  "response_a": "Neural networks are computational models...",
  "response_b": "Neural networks are brain-inspired algorithms...",
  "preferred_response": "B",
  "model_a": "gpt-3.5-turbo",
  "model_b": "gpt-4",
  "feedback_comment": "Response B is more intuitive",
  "session_id": "session-123"
}
```

**Creates Two Interactions:**
- Preferred response gets positive feedback (reward 1.0)
- Non-preferred response gets negative feedback (reward -1.0)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/interactions/single-review`

**Summary:** Create Single Review Interaction

Create single review RLHF interaction with rating

**Use Case:** Simple thumbs up/down or 5-star rating of a response

**Example Request:**
```json
{
  "prompt": "How do I deploy to production?",
  "response": "Here are the steps...",
  "rating": 5,
  "feedback_comment": "Very helpful and detailed!",
  "model": "gpt-4",
  "tags": ["deployment", "helpful"],
  "session_id": "session-123"
}
```

**Rating to Feedback Mapping:**
- 5: positive (reward 1.0)
- 4: positive (reward 0.5)
- 3: mixed (reward 0.0)
- 2: negative (reward -0.5)
- 1: negative (reward -1.0)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/rlhf/interactions/{interaction_id}`

**Summary:** Get Rlhf Interaction

Get specific RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/rlhf/interactions/{interaction_id}`

**Summary:** Delete Rlhf Interaction

Delete an RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database/rlhf/interactions/{interaction_id}/feedback`

**Summary:** Update Rlhf Feedback

Update feedback for an RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/rlhf/sessions`

**Summary:** List Rlhf Sessions

List RLHF sessions for project with optional filters

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): No description
- `limit` (query): No description
- `status` (query): No description
- `start_time` (query): No description
- `end_time` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/sessions`

**Summary:** Create Rlhf Session

Create a new RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Get Rlhf Session

Get specific RLHF session details

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Update Rlhf Session

Update an existing RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Delete Rlhf Session

Delete an RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/sessions/{session_id}/start`

**Summary:** Start Rlhf Session

Start an RLHF session (set status to active)

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/sessions/{session_id}/stop`

**Summary:** Stop Rlhf Session

Stop an RLHF session (set status to stopped)

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/start`

**Summary:** Start Rlhf Session Simple

Start a new RLHF session or resume existing one

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/rlhf/stats`

**Summary:** Get Rlhf Stats

Get RLHF statistics for project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `time_range` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/rlhf/stop`

**Summary:** Stop Rlhf Session Simple

Stop an RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database/settings/quantum-compression`

**Summary:** Toggle quantum compression for project

Enable or disable quantum compression for vector storage.

    **Quantum Compression Benefits:**
    - Up to 60% reduction in vector storage size
    - Preserved similarity relationships
    - Faster vector searches (smaller index)
    - Lower memory footprint

    **Algorithms Available:**
    - `quantum_harmonic`: Frequency domain compression (recommended)
    - `sparse_encode`: Sparsity-based compression
    - `entropy_reduce`: PCA-based compression

    **Note:** Enabling compression will compress future vectors.
    Existing vectors can be compressed using the batch compression endpoint.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/storage/upload`

**Summary:** Upload File Binary

Upload binary file to MinIO storage

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/tables`

**Summary:** Create Table

Create a new table in project database

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/tables`

**Summary:** List Tables

List all tables in project database with pagination metadata

Returns paginated response with:
- total: Total number of tables in project
- skip: Number of tables skipped
- limit: Maximum tables per page
- has_more: Whether more tables are available
- data: List of table objects

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/tables/{table_id}`

**Summary:** Get Table

Get table details

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/tables/{table_name}`

**Summary:** Delete Table

Delete a table and all its data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/tables/{table_name}/query`

**Summary:** Query Rows Mongo Style

Query table rows using MongoDB-style filters and operators

**Supported Filter Operators:**
- `$eq`: Equals (e.g., {"status": {"$eq": "active"}})
- `$ne`: Not equals (e.g., {"status": {"$ne": "deleted"}})
- `$gt`: Greater than (e.g., {"age": {"$gt": 18}})
- `$gte`: Greater than or equal (e.g., {"age": {"$gte": 18}})
- `$lt`: Less than (e.g., {"price": {"$lt": 100}})
- `$lte`: Less than or equal (e.g., {"price": {"$lte": 100}})
- `$in`: Value in array (e.g., {"status": {"$in": ["active", "pending"]}})
- `$nin`: Value not in array (e.g., {"status": {"$nin": ["deleted", "banned"]}})
- `$contains`: String/array contains (e.g., {"tags": {"$contains": "premium"}})
- `$regex`: Regex pattern match (e.g., {"email": {"$regex": ".*@gmail\.com$"}})

**Sort Specification:**
- Use 1 for ascending order, -1 for descending order
- Example: {"created_at": -1, "name": 1}

**Security Features:**
- Automatic SQL injection prevention via parameterized queries
- Field name validation (alphanumeric, underscore, dot only)
- Maximum result limit enforcement (1000 rows)
- Operator whitelist validation

**Example Request:**
```json
{
  "filter": {
    "age": {"$gte": 18},
    "status": {"$in": ["active", "pending"]},
    "tags": {"$contains": "premium"},
    "email": {"$regex": ".*@gmail\.com$"}
  },
  "sort": {"created_at": -1},
  "limit": 50,
  "skip": 0
}
```

**Example Response:**
```json
{
  "total": 245,
  "skip": 0,
  "limit": 50,
  "has_more": true,
  "filter_summary": {
    "age": {"$gte": 18},
    "status": {"$in": ["active", "pending"]}
  },
  "execution_time_ms": 45.23,
  "data": [
    {
      "row_id": "uuid",
      "project_id": "uuid",
      "table_id": "uuid",
      "table_name": "users",
      "row_data": {"age": 25, "status": "active", ...},
      "created_at": "2025-12-03T10:00:00Z",
      "updated_at": "2025-12-03T10:00:00Z"
    }
  ]
}
```

**Error Codes:**
- 400: Invalid filter operator, field name, or dangerous pattern detected
- 404: Table not found
- 500: Query execution error

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/tables/{table_name}/rows`

**Summary:** Create Row

Insert a new row into a table

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/tables/{table_name}/rows`

**Summary:** List Rows

Read all rows from a table with pagination metadata

Returns paginated response with:
- total: Total number of rows in table
- skip: Number of rows skipped
- limit: Maximum rows per page
- has_more: Whether more rows are available
- data: List of row objects

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database/tables/{table_name}/rows/bulk`

**Summary:** Bulk Update Rows

Bulk update rows in a table using MongoDB-style operators

**Supported Update Operators:**
- `$set` - Set field values
- `$inc` - Increment numeric fields
- `$push` - Add to array fields
- `$pull` - Remove from array fields
- `$unset` - Remove fields

**Filter Operators:**
- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

**Example Request:**
```json
{
  "filter": {
    "status": "pending",
    "created_at": {"$lt": "2025-01-01"}
  },
  "update": {
    "$set": {
      "status": "active",
      "updated_at": "2025-12-03T10:00:00Z"
    },
    "$inc": {
      "login_count": 1
    },
    "$push": {
      "notifications": "Account activated"
    }
  },
  "confirm_large_operation": false
}
```

**Safety Features:**
- Requires non-empty filter to prevent accidental updates
- Confirmation required for operations affecting >100 rows
- Transaction support with automatic rollback on errors
- Validation of all update operators

**Returns:**
- `matched_count` - Number of rows matched by filter
- `modified_count` - Number of rows actually modified
- `filter_used` - Filter criteria applied
- `update_operators` - Update operators applied
- `execution_time_ms` - Operation execution time
- `warnings` - Any warnings during operation

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/tables/{table_name}/rows/bulk`

**Summary:** Bulk Delete Rows

Bulk delete rows from a table using MongoDB-style filters

**Filter Operators:**
- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

**Example Request:**
```json
{
  "filter": {
    "status": "inactive",
    "last_login": {"$lt": "2024-01-01"}
  },
  "confirm_large_operation": false
}
```

**Safety Features:**
- Requires non-empty filter to prevent accidental deletion of all rows
- Confirmation required for operations affecting >100 rows
- Transaction support with automatic rollback on errors

**Returns:**
- `deleted_count` - Number of rows deleted
- `filter_used` - Filter criteria applied
- `execution_time_ms` - Operation execution time
- `warnings` - Any warnings during operation

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Get Row

Get a specific row by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/projects/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Update Row

Update an existing row

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Delete Row

Delete a row from a table

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/vectors`

**Summary:** List Vectors

List all vectors in a project with pagination

Returns vectors with optional filtering by namespace.
Use detailed=false (default) to exclude full embeddings and save bandwidth.
Use detailed=true to include full vector embeddings in the response.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): Number of vectors to skip
- `limit` (query): Maximum vectors to return
- `namespace` (query): Filter by namespace
- `detailed` (query): Include full embeddings (default: false for bandwidth efficiency)

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/vectors/analytics`

**Summary:** Get advanced vector analytics

Get comprehensive vector analytics including similarity metrics, storage stats, and quality indicators.

    **Features:**
    - Total vector counts and namespace distribution
    - Average cosine similarity analysis (sample-based for performance)
    - Detailed storage metrics (bytes, MB, GB)
    - Quality metrics (magnitude, sparsity, variance)
    - Dimension statistics and distribution

    **Performance:**
    - Samples up to 1000 vectors for similarity calculations
    - Uses efficient SQL aggregations for counts
    - Results are cached for improved performance

    **Use Cases:**
    - Monitor vector quality and consistency
    - Identify storage optimization opportunities
    - Analyze vector clustering potential
    - Track vector statistics over time

    Args:
        project_id: UUID of the project
        namespace: Optional namespace filter
        sample_size: Maximum vectors to analyze (default: 1000, max: 10000)

    Returns:
        VectorAnalyticsResponse with comprehensive analytics

**Parameters:**

- `project_id` (path) *(required)*: No description
- `namespace` (query): Optional namespace filter
- `sample_size` (query): Maximum vectors to analyze

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/vectors/cluster`

**Summary:** Run clustering on vectors

Run clustering algorithms on project vectors to identify groups and patterns.

    **Algorithms:**

    1. **KMeans** (default)
       - Best for: Well-separated, spherical clusters
       - Parameters: n_clusters (2-100)
       - Returns: Cluster centroids and inertia

    2. **DBSCAN**
       - Best for: Arbitrary shapes, noise detection
       - Parameters: eps (distance threshold), min_samples
       - Returns: Variable clusters + noise points

    3. **Hierarchical**
       - Best for: Nested cluster structures
       - Parameters: n_clusters (2-100)
       - Returns: Hierarchical cluster tree

    **Features:**
    - Analyzes up to 100,000 vectors (configurable)
    - Returns cluster centroids (first 10 dimensions)
    - Lists vector IDs per cluster (first 50)
    - Provides algorithm-specific metrics

    **Performance:**
    - Uses cosine distance for similarity
    - Optimized for high-dimensional embeddings
    - Samples large datasets for efficiency

    **Example Request:**
    ```json
    {
      "algorithm": "kmeans",
      "n_clusters": 5,
      "namespace": "embeddings",
      "max_vectors": 5000
    }
    ```

    Args:
        project_id: UUID of the project
        request: Clustering configuration

    Returns:
        VectorClusteringResponse with cluster assignments and metrics

    Raises:
        HTTPException: 400 for invalid parameters, 500 for clustering failures

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/vectors/quantum-compress`

**Summary:** Quantum Compress Vector

Compress a vector using quantum-inspired compression algorithms

This endpoint provides advanced vector compression using three algorithms:
- **quantum_harmonic**: Frequency domain compression using quantum harmonic oscillator principles (60% compression)
- **sparse_encode**: Threshold-based sparse representation with dynamic sparsification
- **entropy_reduce**: Entropy-based compression using principal component analysis

Features:
- Achieves up to 60% compression ratio while preserving similarity relationships
- Adjustable precision (8, 16, or 32-bit quantization)
- Maintains semantic meaning for vector search operations
- Returns base64-encoded compressed data with full metadata

Args:
    project_id: UUID of the project
    request: QuantumCompressRequest containing:
        - vector_embedding: Vector to compress (1-4096 dimensions)
        - compression_ratio: Target ratio (0.2-0.8, default 0.5)
        - preserve_similarity: Maintain similarity relationships (default True)
        - precision: Bit precision for quantization (8, 16, or 32, default 16)
        - method: Algorithm choice (quantum_harmonic, sparse_encode, entropy_reduce)

Returns:
    QuantumCompressResponse with:
        - compressed_data: Base64-encoded compressed vector
        - original_dimensions: Original vector dimensions
        - compressed_dimensions: Compressed representation dimensions
        - compression_ratio: Actual compression ratio achieved
        - compression_metadata: Entropy, sparsity, and magnitude metrics
        - stats: Performance statistics (size, time, algorithm)

Raises:
    HTTPException: 400 for invalid input, 500 for compression failures

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/vectors/search`

**Summary:** Search Vectors

Search vectors using similarity

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/vectors/stats`

**Summary:** Get Vector Stats

Get vector statistics for a project

Returns:
- total_vectors: Total count of vectors
- namespaces: List of unique namespaces
- avg_dimensions: Average embedding dimensions
- total_size_mb: Estimated storage size

**Parameters:**

- `project_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace
- `detailed` (query): Include detailed statistics

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/vectors/upsert`

**Summary:** Upsert Vector

Upsert a vector into project database

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/database/vectors/upsert-batch`

**Summary:** Upsert Vectors Batch

Batch upsert vectors

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/database/vectors/{vector_id}`

**Summary:** Get Vector

Get a specific vector by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `vector_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/database/vectors/{vector_id}`

**Summary:** Delete Vector

Delete a specific vector by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `vector_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/files`

**Summary:** List Files

List all files in project storage

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `skip` (query): Number of files to skip
- `limit` (query): Maximum files to return

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/files/metadata`

**Summary:** Upload File Metadata

Upload file metadata only (no binary file)

Use this endpoint when you've already uploaded the file to MinIO
and just need to register the metadata in the database

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/files/stats/summary`

**Summary:** Get File Stats

Get file storage statistics for project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/files/upload`

**Summary:** Upload File Binary

Upload binary file to MinIO storage with metadata tracking

This endpoint:
1. Uploads the file to MinIO object storage
2. Stores file metadata in the database
3. Updates project storage usage
4. Returns file details including URLs

Fixed Issues:
- Corrected method call from upload_file() to upload_file_metadata()
- Added proper error handling and rollback
- Improved metadata parsing

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/files/{file_id}`

**Summary:** Get File

Get file metadata by ID

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/files/{file_id}`

**Summary:** Delete File

Delete file metadata and optionally the file from storage

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID
- `delete_from_storage` (query): Also delete from MinIO storage

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/files/{file_id}/content`

**Summary:** Stream File Content

Stream file content directly from MinIO storage.

This endpoint acts as a proxy, fetching the file from MinIO using
server-side authentication and streaming it to the client.

Use this endpoint for displaying images when presigned URLs don't work
due to proxy/edge network issues.

Example usage in HTML:
    <img src="/api/v1/projects/{project_id}/files/{file_id}/content" />

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/files/{file_id}/download`

**Summary:** Download File

Download file from MinIO storage

Returns presigned URL for direct download

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

## ZeroDB Database - Public


### `GET /v1/public/zerodb/projects/{project_id}/analytics/stats`

**Summary:** Get project analytics statistics

Get comprehensive analytics for the project including vector stats, query metrics, and performance data. Used by Analytics dashboard.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects/{project_id}/database/namespaces`

**Summary:** Get list of vector namespaces

Get list of available vector namespaces with counts. Used by Semantic Search page for namespace filtering.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/projects/{project_id}/postgres`

**Summary:** Provision Dedicated PostgreSQL Instance

Create a dedicated PostgreSQL instance for the project via Railway

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects/{project_id}/postgres`

**Summary:** Get PostgreSQL Instance Status

Get the status and details of the dedicated PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/projects/{project_id}/postgres`

**Summary:** Delete PostgreSQL Instance

Delete the dedicated PostgreSQL instance and all data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `confirm` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects/{project_id}/postgres/connection`

**Summary:** Get PostgreSQL Connection Details

Get connection string and credentials for direct SQL access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `credential_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects/{project_id}/postgres/logs`

**Summary:** Get PostgreSQL Query Logs

Get recent SQL query logs and performance data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): No description
- `query_type` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/projects/{project_id}/postgres/restart`

**Summary:** Restart PostgreSQL Instance

Restart the dedicated PostgreSQL instance via Railway deployment restart

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/projects/{project_id}/postgres/rotate`

**Summary:** Rotate PostgreSQL Credentials

Generate new credentials for the PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects/{project_id}/postgres/usage`

**Summary:** Get PostgreSQL Usage Statistics

Get detailed usage statistics and billing information

**Parameters:**

- `project_id` (path) *(required)*: No description
- `hours` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/projects/{project_id}/stats`

**Summary:** Get overall project statistics

Get comprehensive project statistics including counts of all resources. Used by main Dashboard overview.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/public/{project_id}/database/agents/types`

**Summary:** Get list of agent types

Get list of unique agent types for filtering in Agent Logs page. Public endpoint for frontend filtering.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/agent-logs/metrics`

**Summary:** Get Agent Logs Metrics

Get comprehensive agent logs metrics

Returns:
- active_agents: Number of unique agents with activity in time range
- completed_tasks: Tasks completed successfully
- error_rate: Percentage of ERROR level logs
- avg_duration_ms: Average task duration in milliseconds
- total_logs: Total log entries
- logs_by_level: Breakdown by log level
- recent_errors: Recent error messages

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `time_range_hours` (query): Time range in hours (1-168)

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/agent-logs/recent-activity`

**Summary:** Get Recent Activity

Get recent agent activity logs

Returns chronologically ordered list of recent agent activities
with detailed information for debugging and monitoring

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `limit` (query): Maximum number of activities
- `agent_id` (query): Filter by agent ID
- `log_level` (query): Filter by log level

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/agent-logs/sessions/{session_id}`

**Summary:** Get Session Details

Get detailed logs and metrics for a specific agent session

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `session_id` (path) *(required)*: Session ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/agent-logs/trace`

**Summary:** Get Agent Trace

Get live trace visualization data for agent execution

Returns structured trace data suitable for timeline visualization
including execution flow, state transitions, and error tracking

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `session_id` (query): Filter by session ID
- `agent_id` (query): Filter by agent ID
- `time_window_minutes` (query): Time window in minutes

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database`

**Summary:** Enable Database

Enable ZeroDB for an existing project
Creates database instance and returns configuration

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database`

**Summary:** Get Database Status

Get database status and configuration for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database`

**Summary:** Update Database Config

Update database configuration for a project

Supports updating both top-level fields and database_config dictionary:
- quantum_enabled: bool - Enable/disable quantum compression
- vector_dimensions: int - Set vector embedding dimensions
- mcp_enabled: bool - Enable/disable MCP features
- database_config: dict - Additional configuration options

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database`

**Summary:** Disable Database

Disable database features for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/agent-logs`

**Summary:** Create Agent Log

Create agent execution log

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/agent-logs`

**Summary:** List Agent Logs

List agent logs with optional filtering

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): No description
- `session_id` (query): No description
- `log_level` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/agent-logs/export`

**Summary:** Export Agent Logs

Export agent logs in specified format

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/agent-logs/stats`

**Summary:** Get Agent Logs Stats

Get agent logs statistics

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/agent-logs/{log_id}`

**Summary:** Get Agent Log

Get a specific agent log by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `log_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/agent-logs/{log_id}`

**Summary:** Delete Agent Log

Delete an agent log entry

**Parameters:**

- `project_id` (path) *(required)*: No description
- `log_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/agents/active`

**Summary:** List Active Agents

List active agents for project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/agents/traces`

**Summary:** List Agent Traces

List agent execution traces

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): No description
- `session_id` (query): No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/backups`

**Summary:** Get database backups

Get list of database backups for the project.

    **Backup Information:**
    - Backup ID (unique identifier)
    - Creation timestamp
    - Size in megabytes
    - Status (completed, failed, in_progress)

    **Pagination:**
    - Use `skip` and `limit` query parameters
    - Default: skip=0, limit=50
    - Maximum limit: 1000

    **Use Cases:**
    - Database Settings page backup listing
    - Backup restoration workflows
    - Storage usage monitoring

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): Number of backups to skip
- `limit` (query): Maximum backups to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/batch/query`

**Summary:** Execute batch query operations

Execute multiple table operations (query, insert, update, delete) in a single request. Supports up to 50 operations per batch with optional parallel execution. MongoDB-style filters are supported for query/update/delete operations.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/connection`

**Summary:** Get database connection information

Get database connection details for the project's PostgreSQL instance.

    **Information Included:**
    - Database host and port
    - Database name
    - Connection status (active, inactive, provisioning)
    - Masked connection string (password hidden)

    **Status Values:**
    - `active`: Database is running and accessible
    - `inactive`: Database is stopped or unreachable
    - `provisioning`: Database is being provisioned

    **Use Cases:**
    - Database Settings page display
    - Connection string generation for clients
    - Status monitoring

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/events`

**Summary:** Create Event

Create an event record

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/events`

**Summary:** List Events

List events for a project with optional topic filter

**Parameters:**

- `project_id` (path) *(required)*: No description
- `topic` (query): Filter by event topic
- `skip` (query): Number of records to skip
- `limit` (query): Maximum number of records to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/events/batch`

**Summary:** Batch publish events

Publish multiple events in a single request for high-throughput event streaming. Supports up to 100 events per batch with individual validation.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/events/stats`

**Summary:** Get Event Stats

Get event statistics for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `time_range` (query): Time range: hour, day, week, month
- `topic` (query): Filter by event topic

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/events/subscriptions`

**Summary:** List event subscriptions

Get all event subscriptions for a project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/events/subscriptions`

**Summary:** Create event subscription

Create a new event subscription for a project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/events/subscriptions/{subscription_id}`

**Summary:** Delete event subscription

Delete an event subscription by ID

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `subscription_id` (path) *(required)*: Subscription ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/events/{event_id}`

**Summary:** Get Event

Get a specific event by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `event_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/export`

**Summary:** Create database export job

Start an async database export job. Supports JSON, CSV, Parquet, and PostgreSQL dump formats.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/exports/{export_id}`

**Summary:** Get export job status

Check the status of an export job and get the download URL when completed.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `export_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/extensions`

**Summary:** Get PostgreSQL extensions

Get list of installed PostgreSQL extensions for the project.

    **Extension Information:**
    - Extension name (e.g., pg_vector, uuid-ossp)
    - Version number
    - Description

    **Common Extensions:**
    - `pg_vector`: Vector similarity search
    - `uuid-ossp`: UUID generation
    - `pg_stat_statements`: Query performance tracking
    - `pg_trgm`: Trigram matching for text search

    **Use Cases:**
    - Database Settings page extensions listing
    - Feature availability checking
    - Extension installation guidance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/files`

**Summary:** Upload File

Upload a file to project storage

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/files`

**Summary:** List Files

List all files in project storage

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/files/stats`

**Summary:** Get File Stats

Get file storage statistics for project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/files/{file_id}`

**Summary:** Get File

Get file metadata by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/files/{file_id}`

**Summary:** Delete File

Delete a file from project storage

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/files/{file_id}/download`

**Summary:** Download File

Download file content

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/files/{file_id}/presigned-url`

**Summary:** Generate Presigned Url

Generate presigned URL for file access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/import`

**Summary:** Start database import

Import data from various sources (JSON, CSV, URL, PostgreSQL backup, or previous export).

    **Import Sources:**
    - `json`: Import from JSON data (requires `file_content` as base64)
    - `csv`: Import from CSV data (requires `file_content` as base64)
    - `file_url`: Download and import from URL (requires `file_url`)
    - `export_id`: Re-import from previous export (requires `export_id`)
    - `postgresql_backup`: Restore from PostgreSQL backup (requires `backup_id`)

    **Merge Strategies:**
    - `skip`: Skip existing records (default)
    - `overwrite`: Replace existing records
    - `merge`: Merge metadata, keep latest embedding

    **Process:**
    1. Creates import job and validates request
    2. Validates schema if `validate_schema=true`
    3. Creates rollback snapshot if `overwrite_existing=true`
    4. Imports records with chosen merge strategy
    5. Returns import job status (poll GET endpoint for progress)

    **Security:**
    - File URLs must be from allowed domains
    - Maximum file size: 500MB
    - SQL injection protection for PostgreSQL imports

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

---

### `GET /v1/public/zerodb/{project_id}/database/imports/{import_id}`

**Summary:** Get import status

Get the current status of a database import operation.

    **Status Values:**
    - `pending`: Import job created, waiting to start
    - `validating`: Validating data schema
    - `in_progress`: Actively importing data
    - `completed`: Import finished successfully
    - `failed`: Import failed (check error_message)
    - `rollback`: Import being rolled back

    **Progress Tracking:**
    - `progress_percent`: 0-100 completion percentage
    - `records_imported`: Number of records successfully imported
    - `records_failed`: Number of records that failed
    - `records_skipped`: Number of records skipped (duplicates)
    - `records_total`: Total records to import

    **Polling Recommendation:**
    - Poll every 2-5 seconds while status is `validating` or `in_progress`
    - Stop polling when status is `completed`, `failed`, or `rollback`

**Parameters:**

- `project_id` (path) *(required)*: No description
- `import_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/imports/{import_id}/rollback`

**Summary:** Rollback import

Rollback a failed or unwanted database import.

    **Requirements:**
    - Import must have `rollback_available=true`
    - Rollback snapshot must exist

    **Process:**
    1. Changes import status to `rollback`
    2. Deletes records created during import
    3. Restores database state from snapshot
    4. Marks import as `failed` with rollback message

    **Note:** Rollback is only available for imports with `overwrite_existing=true`

**Parameters:**

- `project_id` (path) *(required)*: No description
- `import_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/maintenance/analyze`

**Summary:** Run ANALYZE to update statistics

Execute PostgreSQL ANALYZE operation to update query planner statistics.

    **What it Does:**
    - Collects statistics about table contents
    - Updates query planner optimization data
    - Improves query performance by enabling better execution plans

    **When to Use:**
    - After bulk INSERT/UPDATE/DELETE operations
    - When query plans are suboptimal
    - Regular maintenance (weekly)
    - After schema changes

    **Note:** This operation is lightweight and doesn't lock tables.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/maintenance/reindex`

**Summary:** Rebuild database indexes

Execute PostgreSQL REINDEX operation to rebuild corrupted or bloated indexes.

    **What it Does:**
    - Rebuilds all indexes from scratch
    - Fixes index corruption
    - Reduces index bloat
    - Improves query performance

    **When to Use:**
    - Suspected index corruption
    - Significant index bloat after many updates
    - Performance degradation despite VACUUM/ANALYZE
    - After major data changes

    **Note:** REINDEX requires exclusive table locks and may take time.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/maintenance/vacuum`

**Summary:** Run VACUUM on database

Execute PostgreSQL VACUUM operation to reclaim storage and optimize performance.

    **VACUUM Operations:**
    - `VACUUM`: Standard vacuum operation (reclaim space from deleted rows)
    - `VACUUM ANALYZE`: Vacuum + update statistics for query planner
    - `VACUUM FULL`: Complete table rewrite (locks tables, reclaims maximum space)

    **When to Use:**
    - After bulk deletions
    - Regular maintenance (weekly/monthly)
    - When disk space is needed
    - Query performance degradation

    **Note:** VACUUM FULL requires exclusive table locks and may take longer.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/memory`

**Summary:** Create Memory Record

Create a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/memory`

**Summary:** List Memories

List memory records for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description
- `role` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/memory/batch/delete`

**Summary:** Batch delete memory records

Delete multiple memory records by ID in a single request. Supports up to 500 IDs per batch.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/memory/batch/update`

**Summary:** Batch update memory records

Update multiple memory records with partial field updates. Supports up to 500 updates per batch.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/memory/batch/upsert`

**Summary:** Batch upsert memory records

Create or update multiple memory records in a single atomic transaction. Supports up to 500 records per batch with automatic rollback on failure.

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/memory/search`

**Summary:** Search Memory

Search memory records

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/memory/{memory_id}`

**Summary:** Get Memory Record

Get a specific memory record by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database/memory/{memory_id}`

**Summary:** Update Memory Record

Update a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/memory/{memory_id}`

**Summary:** Delete Memory Record

Delete a memory record

**Parameters:**

- `project_id` (path) *(required)*: No description
- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/metrics`

**Summary:** Get database performance metrics

Get real-time database performance metrics for monitoring and optimization.

    **Metrics Included:**
    - Active database connections
    - Queries per second (QPS)
    - Cache hit rate (0.0 - 1.0)
    - Average query latency in milliseconds

    **Use Cases:**
    - Database Settings page monitoring
    - Performance dashboards
    - Alerting on threshold breaches
    - Capacity planning

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/query`

**Summary:** Execute Sql Query

Execute SQL query against project's dedicated PostgreSQL instance

**Security Features:**
- Automatic SQL injection detection using pattern matching
- Dangerous command blacklist (DROP DATABASE, TRUNCATE, ALTER SYSTEM, etc.)
- Configurable timeout enforcement (30s default, 5min max)
- Read-only mode option for SELECT-only queries
- Query complexity scoring for accurate billing

**Billing:**
- Base cost: 0.1 credits per query
- Execution time: 0.01 credits per 100ms
- Complexity factor: 0.01 credits per complexity point

**Query Types Supported:**
- SELECT: Read data from tables
- INSERT: Add new records
- UPDATE: Modify existing records
- DELETE: Remove records

**Usage Examples:**

Simple SELECT:
```json
{
  "sql": "SELECT * FROM users LIMIT 10",
  "timeout_seconds": 30,
  "max_rows": 100
}
```

Complex Analytics:
```json
{
  "sql": "SELECT DATE(created_at) as date, COUNT(*) as count FROM orders WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC",
  "timeout_seconds": 60,
  "max_rows": 1000
}
```

Read-Only Mode:
```json
{
  "sql": "SELECT * FROM products",
  "read_only": true,
  "timeout_seconds": 30
}
```

**Error Codes:**
- 400: SQL validation failed (dangerous command or injection detected)
- 404: No PostgreSQL instance found (provision one first)
- 408: Query timeout exceeded
- 500: Query execution error

**Rate Limits:**
- 100 queries per minute per user (future implementation)
- 500 queries per minute per project (future implementation)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf`

**Summary:** Create Rlhf Dataset

Create RLHF dataset

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/export`

**Summary:** Export Rlhf Data

Export RLHF training data in multiple formats

**Supported Formats:**
- **json**: Standard JSON array format
- **csv**: Comma-separated values for spreadsheets
- **parquet**: Apache Parquet columnar format (requires pandas and pyarrow)
- **openai**: OpenAI fine-tuning JSONL format (compatible with GPT-3.5/4 fine-tuning)
- **anthropic**: Anthropic Claude fine-tuning format (experimental)

**Filters:**
- start_date: ISO format date (e.g., "2025-01-01T00:00:00Z")
- end_date: ISO format date
- feedback: Filter by feedback type (positive, negative, mixed)
- model: Filter by model name
- session_id: Filter by session ID

**Example Request (OpenAI format):**
```json
{
  "format": "openai",
  "start_date": "2025-12-01T00:00:00Z",
  "feedback": "positive"
}
```

**CSV Format:**
Returns CSV string with columns: interaction_id, prompt, response, feedback, reward, model, session_id, agent_id, human_feedback, created_at

**Parquet Format:**
Returns base64-encoded Parquet binary data with full schema information

**OpenAI Format:**
Returns JSONL with format: {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/interactions`

**Summary:** Log Rlhf Interaction

Log RLHF interaction for learning

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/rlhf/interactions`

**Summary:** List Rlhf Interactions

List RLHF interactions for project with optional filters

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): No description
- `limit` (query): No description
- `feedback` (query): No description
- `model` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description
- `reward_min` (query): No description
- `reward_max` (query): No description
- `tags` (query): No description
- `start_time` (query): No description
- `end_time` (query): No description
- `search` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/interactions/batch`

**Summary:** Batch Create Rlhf Interactions

Batch create multiple RLHF interactions

**Use Case:** Import interactions from CSV, JSON, or other sources

**Request Body:**
```json
[
  {
    "prompt": "What is machine learning?",
    "response": "Machine learning is...",
    "feedback": "positive",
    "reward": 0.9,
    "model": "gpt-4",
    "session_id": "session-123",
    "agent_id": "agent-456",
    "human_feedback": "Great explanation!",
    "tags": ["ml", "education"],
    "context": "Educational context",
    "metadata": {"source": "import"}
  }
]
```

**Response:**
```json
{
  "project_id": "uuid",
  "created_count": 5,
  "failed_count": 0,
  "created_interactions": [
    {"interaction_id": "uuid1", "status": "created"},
    {"interaction_id": "uuid2", "status": "created"}
  ],
  "errors": []
}
```

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/interactions/compare`

**Summary:** Create Comparison Interaction

Create comparison-based RLHF interaction

**Use Case:** A/B testing of responses where user selects preferred response

**Example Request:**
```json
{
  "prompt": "Explain neural networks",
  "response_a": "Neural networks are computational models...",
  "response_b": "Neural networks are brain-inspired algorithms...",
  "preferred_response": "B",
  "model_a": "gpt-3.5-turbo",
  "model_b": "gpt-4",
  "feedback_comment": "Response B is more intuitive",
  "session_id": "session-123"
}
```

**Creates Two Interactions:**
- Preferred response gets positive feedback (reward 1.0)
- Non-preferred response gets negative feedback (reward -1.0)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/interactions/single-review`

**Summary:** Create Single Review Interaction

Create single review RLHF interaction with rating

**Use Case:** Simple thumbs up/down or 5-star rating of a response

**Example Request:**
```json
{
  "prompt": "How do I deploy to production?",
  "response": "Here are the steps...",
  "rating": 5,
  "feedback_comment": "Very helpful and detailed!",
  "model": "gpt-4",
  "tags": ["deployment", "helpful"],
  "session_id": "session-123"
}
```

**Rating to Feedback Mapping:**
- 5: positive (reward 1.0)
- 4: positive (reward 0.5)
- 3: mixed (reward 0.0)
- 2: negative (reward -0.5)
- 1: negative (reward -1.0)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/rlhf/interactions/{interaction_id}`

**Summary:** Get Rlhf Interaction

Get specific RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/rlhf/interactions/{interaction_id}`

**Summary:** Delete Rlhf Interaction

Delete an RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database/rlhf/interactions/{interaction_id}/feedback`

**Summary:** Update Rlhf Feedback

Update feedback for an RLHF interaction

**Parameters:**

- `project_id` (path) *(required)*: No description
- `interaction_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/rlhf/sessions`

**Summary:** List Rlhf Sessions

List RLHF sessions for project with optional filters

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): No description
- `limit` (query): No description
- `status` (query): No description
- `start_time` (query): No description
- `end_time` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/sessions`

**Summary:** Create Rlhf Session

Create a new RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Get Rlhf Session

Get specific RLHF session details

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Update Rlhf Session

Update an existing RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/rlhf/sessions/{session_id}`

**Summary:** Delete Rlhf Session

Delete an RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/sessions/{session_id}/start`

**Summary:** Start Rlhf Session

Start an RLHF session (set status to active)

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/sessions/{session_id}/stop`

**Summary:** Stop Rlhf Session

Stop an RLHF session (set status to stopped)

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/start`

**Summary:** Start Rlhf Session Simple

Start a new RLHF session or resume existing one

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/rlhf/stats`

**Summary:** Get Rlhf Stats

Get RLHF statistics for project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `time_range` (query): No description
- `session_id` (query): No description
- `agent_id` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/rlhf/stop`

**Summary:** Stop Rlhf Session Simple

Stop an RLHF session

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database/settings/quantum-compression`

**Summary:** Toggle quantum compression for project

Enable or disable quantum compression for vector storage.

    **Quantum Compression Benefits:**
    - Up to 60% reduction in vector storage size
    - Preserved similarity relationships
    - Faster vector searches (smaller index)
    - Lower memory footprint

    **Algorithms Available:**
    - `quantum_harmonic`: Frequency domain compression (recommended)
    - `sparse_encode`: Sparsity-based compression
    - `entropy_reduce`: PCA-based compression

    **Note:** Enabling compression will compress future vectors.
    Existing vectors can be compressed using the batch compression endpoint.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/storage/upload`

**Summary:** Upload File Binary

Upload binary file to MinIO storage

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/tables`

**Summary:** Create Table

Create a new table in project database

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/tables`

**Summary:** List Tables

List all tables in project database with pagination metadata

Returns paginated response with:
- total: Total number of tables in project
- skip: Number of tables skipped
- limit: Maximum tables per page
- has_more: Whether more tables are available
- data: List of table objects

**Parameters:**

- `project_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/tables/{table_id}`

**Summary:** Get Table

Get table details

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/tables/{table_name}`

**Summary:** Delete Table

Delete a table and all its data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/tables/{table_name}/query`

**Summary:** Query Rows Mongo Style

Query table rows using MongoDB-style filters and operators

**Supported Filter Operators:**
- `$eq`: Equals (e.g., {"status": {"$eq": "active"}})
- `$ne`: Not equals (e.g., {"status": {"$ne": "deleted"}})
- `$gt`: Greater than (e.g., {"age": {"$gt": 18}})
- `$gte`: Greater than or equal (e.g., {"age": {"$gte": 18}})
- `$lt`: Less than (e.g., {"price": {"$lt": 100}})
- `$lte`: Less than or equal (e.g., {"price": {"$lte": 100}})
- `$in`: Value in array (e.g., {"status": {"$in": ["active", "pending"]}})
- `$nin`: Value not in array (e.g., {"status": {"$nin": ["deleted", "banned"]}})
- `$contains`: String/array contains (e.g., {"tags": {"$contains": "premium"}})
- `$regex`: Regex pattern match (e.g., {"email": {"$regex": ".*@gmail\.com$"}})

**Sort Specification:**
- Use 1 for ascending order, -1 for descending order
- Example: {"created_at": -1, "name": 1}

**Security Features:**
- Automatic SQL injection prevention via parameterized queries
- Field name validation (alphanumeric, underscore, dot only)
- Maximum result limit enforcement (1000 rows)
- Operator whitelist validation

**Example Request:**
```json
{
  "filter": {
    "age": {"$gte": 18},
    "status": {"$in": ["active", "pending"]},
    "tags": {"$contains": "premium"},
    "email": {"$regex": ".*@gmail\.com$"}
  },
  "sort": {"created_at": -1},
  "limit": 50,
  "skip": 0
}
```

**Example Response:**
```json
{
  "total": 245,
  "skip": 0,
  "limit": 50,
  "has_more": true,
  "filter_summary": {
    "age": {"$gte": 18},
    "status": {"$in": ["active", "pending"]}
  },
  "execution_time_ms": 45.23,
  "data": [
    {
      "row_id": "uuid",
      "project_id": "uuid",
      "table_id": "uuid",
      "table_name": "users",
      "row_data": {"age": 25, "status": "active", ...},
      "created_at": "2025-12-03T10:00:00Z",
      "updated_at": "2025-12-03T10:00:00Z"
    }
  ]
}
```

**Error Codes:**
- 400: Invalid filter operator, field name, or dangerous pattern detected
- 404: Table not found
- 500: Query execution error

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows`

**Summary:** Create Row

Insert a new row into a table

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows`

**Summary:** List Rows

Read all rows from a table with pagination metadata

Returns paginated response with:
- total: Total number of rows in table
- skip: Number of rows skipped
- limit: Maximum rows per page
- has_more: Whether more rows are available
- data: List of row objects

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/bulk`

**Summary:** Bulk Update Rows

Bulk update rows in a table using MongoDB-style operators

**Supported Update Operators:**
- `$set` - Set field values
- `$inc` - Increment numeric fields
- `$push` - Add to array fields
- `$pull` - Remove from array fields
- `$unset` - Remove fields

**Filter Operators:**
- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

**Example Request:**
```json
{
  "filter": {
    "status": "pending",
    "created_at": {"$lt": "2025-01-01"}
  },
  "update": {
    "$set": {
      "status": "active",
      "updated_at": "2025-12-03T10:00:00Z"
    },
    "$inc": {
      "login_count": 1
    },
    "$push": {
      "notifications": "Account activated"
    }
  },
  "confirm_large_operation": false
}
```

**Safety Features:**
- Requires non-empty filter to prevent accidental updates
- Confirmation required for operations affecting >100 rows
- Transaction support with automatic rollback on errors
- Validation of all update operators

**Returns:**
- `matched_count` - Number of rows matched by filter
- `modified_count` - Number of rows actually modified
- `filter_used` - Filter criteria applied
- `update_operators` - Update operators applied
- `execution_time_ms` - Operation execution time
- `warnings` - Any warnings during operation

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/bulk`

**Summary:** Bulk Delete Rows

Bulk delete rows from a table using MongoDB-style filters

**Filter Operators:**
- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

**Example Request:**
```json
{
  "filter": {
    "status": "inactive",
    "last_login": {"$lt": "2024-01-01"}
  },
  "confirm_large_operation": false
}
```

**Safety Features:**
- Requires non-empty filter to prevent accidental deletion of all rows
- Confirmation required for operations affecting >100 rows
- Transaction support with automatic rollback on errors

**Returns:**
- `deleted_count` - Number of rows deleted
- `filter_used` - Filter criteria applied
- `execution_time_ms` - Operation execution time
- `warnings` - Any warnings during operation

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Get Row

Get a specific row by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Update Row

Update an existing row

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/{row_id}`

**Summary:** Delete Row

Delete a row from a table

**Parameters:**

- `project_id` (path) *(required)*: No description
- `table_name` (path) *(required)*: No description
- `row_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/vectors`

**Summary:** List Vectors

List all vectors in a project with pagination

Returns vectors with optional filtering by namespace.
Use detailed=false (default) to exclude full embeddings and save bandwidth.
Use detailed=true to include full vector embeddings in the response.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `offset` (query): Number of vectors to skip
- `limit` (query): Maximum vectors to return
- `namespace` (query): Filter by namespace
- `detailed` (query): Include full embeddings (default: false for bandwidth efficiency)

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/vectors/analytics`

**Summary:** Get advanced vector analytics

Get comprehensive vector analytics including similarity metrics, storage stats, and quality indicators.

    **Features:**
    - Total vector counts and namespace distribution
    - Average cosine similarity analysis (sample-based for performance)
    - Detailed storage metrics (bytes, MB, GB)
    - Quality metrics (magnitude, sparsity, variance)
    - Dimension statistics and distribution

    **Performance:**
    - Samples up to 1000 vectors for similarity calculations
    - Uses efficient SQL aggregations for counts
    - Results are cached for improved performance

    **Use Cases:**
    - Monitor vector quality and consistency
    - Identify storage optimization opportunities
    - Analyze vector clustering potential
    - Track vector statistics over time

    Args:
        project_id: UUID of the project
        namespace: Optional namespace filter
        sample_size: Maximum vectors to analyze (default: 1000, max: 10000)

    Returns:
        VectorAnalyticsResponse with comprehensive analytics

**Parameters:**

- `project_id` (path) *(required)*: No description
- `namespace` (query): Optional namespace filter
- `sample_size` (query): Maximum vectors to analyze

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/vectors/cluster`

**Summary:** Run clustering on vectors

Run clustering algorithms on project vectors to identify groups and patterns.

    **Algorithms:**

    1. **KMeans** (default)
       - Best for: Well-separated, spherical clusters
       - Parameters: n_clusters (2-100)
       - Returns: Cluster centroids and inertia

    2. **DBSCAN**
       - Best for: Arbitrary shapes, noise detection
       - Parameters: eps (distance threshold), min_samples
       - Returns: Variable clusters + noise points

    3. **Hierarchical**
       - Best for: Nested cluster structures
       - Parameters: n_clusters (2-100)
       - Returns: Hierarchical cluster tree

    **Features:**
    - Analyzes up to 100,000 vectors (configurable)
    - Returns cluster centroids (first 10 dimensions)
    - Lists vector IDs per cluster (first 50)
    - Provides algorithm-specific metrics

    **Performance:**
    - Uses cosine distance for similarity
    - Optimized for high-dimensional embeddings
    - Samples large datasets for efficiency

    **Example Request:**
    ```json
    {
      "algorithm": "kmeans",
      "n_clusters": 5,
      "namespace": "embeddings",
      "max_vectors": 5000
    }
    ```

    Args:
        project_id: UUID of the project
        request: Clustering configuration

    Returns:
        VectorClusteringResponse with cluster assignments and metrics

    Raises:
        HTTPException: 400 for invalid parameters, 500 for clustering failures

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/vectors/quantum-compress`

**Summary:** Quantum Compress Vector

Compress a vector using quantum-inspired compression algorithms

This endpoint provides advanced vector compression using three algorithms:
- **quantum_harmonic**: Frequency domain compression using quantum harmonic oscillator principles (60% compression)
- **sparse_encode**: Threshold-based sparse representation with dynamic sparsification
- **entropy_reduce**: Entropy-based compression using principal component analysis

Features:
- Achieves up to 60% compression ratio while preserving similarity relationships
- Adjustable precision (8, 16, or 32-bit quantization)
- Maintains semantic meaning for vector search operations
- Returns base64-encoded compressed data with full metadata

Args:
    project_id: UUID of the project
    request: QuantumCompressRequest containing:
        - vector_embedding: Vector to compress (1-4096 dimensions)
        - compression_ratio: Target ratio (0.2-0.8, default 0.5)
        - preserve_similarity: Maintain similarity relationships (default True)
        - precision: Bit precision for quantization (8, 16, or 32, default 16)
        - method: Algorithm choice (quantum_harmonic, sparse_encode, entropy_reduce)

Returns:
    QuantumCompressResponse with:
        - compressed_data: Base64-encoded compressed vector
        - original_dimensions: Original vector dimensions
        - compressed_dimensions: Compressed representation dimensions
        - compression_ratio: Actual compression ratio achieved
        - compression_metadata: Entropy, sparsity, and magnitude metrics
        - stats: Performance statistics (size, time, algorithm)

Raises:
    HTTPException: 400 for invalid input, 500 for compression failures

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/vectors/search`

**Summary:** Search Vectors

Search vectors using similarity

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/vectors/stats`

**Summary:** Get Vector Stats

Get vector statistics for a project

Returns:
- total_vectors: Total count of vectors
- namespaces: List of unique namespaces
- avg_dimensions: Average embedding dimensions
- total_size_mb: Estimated storage size

**Parameters:**

- `project_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace
- `detailed` (query): Include detailed statistics

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/vectors/upsert`

**Summary:** Upsert Vector

Upsert a vector into project database

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/database/vectors/upsert-batch`

**Summary:** Upsert Vectors Batch

Batch upsert vectors

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/database/vectors/{vector_id}`

**Summary:** Get Vector

Get a specific vector by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `vector_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/database/vectors/{vector_id}`

**Summary:** Delete Vector

Delete a specific vector by ID

**Parameters:**

- `project_id` (path) *(required)*: No description
- `vector_id` (path) *(required)*: No description
- `namespace` (query): Filter by namespace

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/embeddings/embed-and-store`

**Summary:** Embed And Store In Project

Generate embeddings and automatically store in ZeroDB project
with automatic dimension detection and routing (Issues #309, #310)

**Optimized for RAG workflows:**
1. Generate embeddings (FREE via Railway service)
2. Auto-detect dimension (384, 768, 1024, or 1536)
3. Route to correct database column (vector_384, vector_768, etc.)
4. Store vectors in project's ZeroDB database
5. Ready for semantic search immediately

**Supported Models:**
- `BAAI/bge-small-en-v1.5` (384-dim) - Default, fastest, FREE
- `BAAI/bge-base-en-v1.5` (768-dim) - Better quality, FREE
- `BAAI/bge-large-en-v1.5` (1024-dim) - Best quality, FREE
- Custom 1536-dim (OpenAI compatible)

**Parameters:**
- `texts`: List of texts to embed and store (1-100)
- `model`: Model to use (optional, defaults to BAAI/bge-small-en-v1.5)
- `metadata_list`: Optional metadata for each text
- `namespace`: Vector namespace (default: "default")

**Returns:**
- `success`: Boolean indicating success
- `vectors_stored`: Number of vectors stored
- `embeddings_generated`: Number of embeddings generated
- `model`: Model used
- `dimensions`: Detected dimension (384, 768, 1024, or 1536)
- `target_column`: Database column where vectors are stored
- `namespace`: Namespace used
- `project_id`: Project UUID
- `processing_time_ms`: Total processing time

**Example:**
```python
POST /v1/{project_id}/embeddings/embed-and-store
{
    "texts": ["Document 1", "Document 2"],
    "model": "BAAI/bge-base-en-v1.5",  # Optional
    "namespace": "my_docs"
}

# Response
{
    "success": true,
    "vectors_stored": 2,
    "dimensions": 768,
    "target_column": "vector_768",  # Auto-detected routing
    ...
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/embeddings/generate`

**Summary:** Generate Project Embeddings

Generate embeddings within a ZeroDB project context (Issue #310: Multi-Model Support)

**FREE - No usage costs!**
Uses Railway self-hosted HuggingFace service

**Supported Models:**
- `BAAI/bge-small-en-v1.5` (384-dim) - Default, fastest
- `BAAI/bge-base-en-v1.5` (768-dim) - Better quality
- `BAAI/bge-large-en-v1.5` (1024-dim) - Best quality

**Parameters:**
- `texts`: List of texts to embed (1-100)
- `model`: Model to use (optional, defaults to BAAI/bge-small-en-v1.5)
- `normalize`: Normalize embeddings to unit length (default: true)

**Returns:**
- `embeddings`: List of embedding vectors
- `model`: Model used
- `dimensions`: Vector dimensions (384, 768, or 1024)
- `count`: Number of embeddings generated
- `processing_time_ms`: Generation time in milliseconds
- `project_id`: Project UUID

**Example:**
```python
POST /v1/{project_id}/embeddings/generate
{
    "texts": ["ZeroDB is a vector database"],
    "model": "BAAI/bge-base-en-v1.5"  # Optional, uses small by default
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/embeddings/models`

**Summary:** List Available Embedding Models

List available embedding models for a ZeroDB project (Issue #310)

**Supported Models:**
- BAAI/bge-small-en-v1.5 (384-dim) - Default, fastest, FREE
- BAAI/bge-base-en-v1.5 (768-dim) - Better quality, FREE
- BAAI/bge-large-en-v1.5 (1024-dim) - Best quality, FREE

**Use Cases:**
- **384-dim**: General-purpose, cost-sensitive (80% of users)
- **768-dim**: Higher quality search (15% of users)
- **1024-dim**: Mission-critical search (5% of users)

Returns:
    List of available models with metadata

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/embeddings/search`

**Summary:** Semantic Search In Project

Semantic search within a ZeroDB project with dimension-aware routing (Issues #309, #310)

**Optimized for RAG:**
1. Generate query embedding (FREE via Railway service)
2. Auto-detect dimension and search correct column
3. Return most relevant documents

**Parameters:**
- `query`: Search query text
- `model`: Model to use (must match stored vectors' model, defaults to BAAI/bge-small-en-v1.5)
- `limit`: Maximum results (1-100, default: 10)
- `threshold`: Similarity threshold (0.0-1.0, default: 0.7)
- `namespace`: Vector namespace (default: "default")
- `filter_metadata`: Optional metadata filters

**Returns:**
- `results`: List of matching vectors with metadata
- `query`: Original search query
- `total_results`: Total number of results
- `model`: Model used for query embedding
- `project_id`: Project UUID
- `processing_time_ms`: Search time in milliseconds

**Important:** Use the same model you used when storing vectors!
- If you stored with `BAAI/bge-base-en-v1.5` (768-dim), search with same model
- Mixing dimensions will result in poor search quality

**Example:**
```python
POST /v1/{project_id}/embeddings/search
{
    "query": "What is ZeroDB?",
    "model": "BAAI/bge-base-en-v1.5",  # Match your stored vectors' model
    "limit": 5,
    "threshold": 0.75
}

# Response
{
    "results": [
        {
            "id": "vec_123",
            "document": "ZeroDB is a vector database...",
            "similarity": 0.92,
            "metadata": {...}
        }
    ],
    "total_results": 5,
    "model": "BAAI/bge-base-en-v1.5",
    ...
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/files`

**Summary:** List Files

List all files in project storage

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `skip` (query): Number of files to skip
- `limit` (query): Maximum files to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/files/metadata`

**Summary:** Upload File Metadata

Upload file metadata only (no binary file)

Use this endpoint when you've already uploaded the file to MinIO
and just need to register the metadata in the database

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/files/stats/summary`

**Summary:** Get File Stats

Get file storage statistics for project

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/zerodb/{project_id}/files/upload`

**Summary:** Upload File Binary

Upload binary file to MinIO storage with metadata tracking

This endpoint:
1. Uploads the file to MinIO object storage
2. Stores file metadata in the database
3. Updates project storage usage
4. Returns file details including URLs

Fixed Issues:
- Corrected method call from upload_file() to upload_file_metadata()
- Added proper error handling and rollback
- Improved metadata parsing

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/files/{file_id}`

**Summary:** Get File

Get file metadata by ID

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/zerodb/{project_id}/files/{file_id}`

**Summary:** Delete File

Delete file metadata and optionally the file from storage

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID
- `delete_from_storage` (query): Also delete from MinIO storage

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/files/{file_id}/content`

**Summary:** Stream File Content

Stream file content directly from MinIO storage.

This endpoint acts as a proxy, fetching the file from MinIO using
server-side authentication and streaming it to the client.

Use this endpoint for displaying images when presigned URLs don't work
due to proxy/edge network issues.

Example usage in HTML:
    <img src="/api/v1/projects/{project_id}/files/{file_id}/content" />

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/zerodb/{project_id}/files/{file_id}/download`

**Summary:** Download File

Download file from MinIO storage

Returns presigned URL for direct download

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_id` (path) *(required)*: File ID

**Success Response (200):** Successful Response

---

## ZeroDB Embeddings


### `POST /v1/projects/{project_id}/embeddings/embed-and-store`

**Summary:** Embed And Store In Project

Generate embeddings and automatically store in ZeroDB project
with automatic dimension detection and routing (Issues #309, #310)

**Optimized for RAG workflows:**
1. Generate embeddings (FREE via Railway service)
2. Auto-detect dimension (384, 768, 1024, or 1536)
3. Route to correct database column (vector_384, vector_768, etc.)
4. Store vectors in project's ZeroDB database
5. Ready for semantic search immediately

**Supported Models:**
- `BAAI/bge-small-en-v1.5` (384-dim) - Default, fastest, FREE
- `BAAI/bge-base-en-v1.5` (768-dim) - Better quality, FREE
- `BAAI/bge-large-en-v1.5` (1024-dim) - Best quality, FREE
- Custom 1536-dim (OpenAI compatible)

**Parameters:**
- `texts`: List of texts to embed and store (1-100)
- `model`: Model to use (optional, defaults to BAAI/bge-small-en-v1.5)
- `metadata_list`: Optional metadata for each text
- `namespace`: Vector namespace (default: "default")

**Returns:**
- `success`: Boolean indicating success
- `vectors_stored`: Number of vectors stored
- `embeddings_generated`: Number of embeddings generated
- `model`: Model used
- `dimensions`: Detected dimension (384, 768, 1024, or 1536)
- `target_column`: Database column where vectors are stored
- `namespace`: Namespace used
- `project_id`: Project UUID
- `processing_time_ms`: Total processing time

**Example:**
```python
POST /v1/{project_id}/embeddings/embed-and-store
{
    "texts": ["Document 1", "Document 2"],
    "model": "BAAI/bge-base-en-v1.5",  # Optional
    "namespace": "my_docs"
}

# Response
{
    "success": true,
    "vectors_stored": 2,
    "dimensions": 768,
    "target_column": "vector_768",  # Auto-detected routing
    ...
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/embeddings/generate`

**Summary:** Generate Project Embeddings

Generate embeddings within a ZeroDB project context (Issue #310: Multi-Model Support)

**FREE - No usage costs!**
Uses Railway self-hosted HuggingFace service

**Supported Models:**
- `BAAI/bge-small-en-v1.5` (384-dim) - Default, fastest
- `BAAI/bge-base-en-v1.5` (768-dim) - Better quality
- `BAAI/bge-large-en-v1.5` (1024-dim) - Best quality

**Parameters:**
- `texts`: List of texts to embed (1-100)
- `model`: Model to use (optional, defaults to BAAI/bge-small-en-v1.5)
- `normalize`: Normalize embeddings to unit length (default: true)

**Returns:**
- `embeddings`: List of embedding vectors
- `model`: Model used
- `dimensions`: Vector dimensions (384, 768, or 1024)
- `count`: Number of embeddings generated
- `processing_time_ms`: Generation time in milliseconds
- `project_id`: Project UUID

**Example:**
```python
POST /v1/{project_id}/embeddings/generate
{
    "texts": ["ZeroDB is a vector database"],
    "model": "BAAI/bge-base-en-v1.5"  # Optional, uses small by default
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/embeddings/models`

**Summary:** List Available Embedding Models

List available embedding models for a ZeroDB project (Issue #310)

**Supported Models:**
- BAAI/bge-small-en-v1.5 (384-dim) - Default, fastest, FREE
- BAAI/bge-base-en-v1.5 (768-dim) - Better quality, FREE
- BAAI/bge-large-en-v1.5 (1024-dim) - Best quality, FREE

**Use Cases:**
- **384-dim**: General-purpose, cost-sensitive (80% of users)
- **768-dim**: Higher quality search (15% of users)
- **1024-dim**: Mission-critical search (5% of users)

Returns:
    List of available models with metadata

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/embeddings/search`

**Summary:** Semantic Search In Project

Semantic search within a ZeroDB project with dimension-aware routing (Issues #309, #310)

**Optimized for RAG:**
1. Generate query embedding (FREE via Railway service)
2. Auto-detect dimension and search correct column
3. Return most relevant documents

**Parameters:**
- `query`: Search query text
- `model`: Model to use (must match stored vectors' model, defaults to BAAI/bge-small-en-v1.5)
- `limit`: Maximum results (1-100, default: 10)
- `threshold`: Similarity threshold (0.0-1.0, default: 0.7)
- `namespace`: Vector namespace (default: "default")
- `filter_metadata`: Optional metadata filters

**Returns:**
- `results`: List of matching vectors with metadata
- `query`: Original search query
- `total_results`: Total number of results
- `model`: Model used for query embedding
- `project_id`: Project UUID
- `processing_time_ms`: Search time in milliseconds

**Important:** Use the same model you used when storing vectors!
- If you stored with `BAAI/bge-base-en-v1.5` (768-dim), search with same model
- Mixing dimensions will result in poor search quality

**Example:**
```python
POST /v1/{project_id}/embeddings/search
{
    "query": "What is ZeroDB?",
    "model": "BAAI/bge-base-en-v1.5",  # Match your stored vectors' model
    "limit": 5,
    "threshold": 0.75
}

# Response
{
    "results": [
        {
            "id": "vec_123",
            "document": "ZeroDB is a vector database...",
            "similarity": 0.92,
            "metadata": {...}
        }
    ],
    "total_results": 5,
    "model": "BAAI/bge-base-en-v1.5",
    ...
}
```

**Backward Compatible:** Calls without `model` parameter use default (384-dim)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

## ZeroDB PostgreSQL


### `POST /v1/projects/{project_id}/postgres`

**Summary:** Provision Dedicated PostgreSQL Instance

Create a dedicated PostgreSQL instance for the project via Railway

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/postgres`

**Summary:** Get PostgreSQL Instance Status

Get the status and details of the dedicated PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}/postgres`

**Summary:** Delete PostgreSQL Instance

Delete the dedicated PostgreSQL instance and all data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `confirm` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/postgres/connection`

**Summary:** Get PostgreSQL Connection Details

Get connection string and credentials for direct SQL access

**Parameters:**

- `project_id` (path) *(required)*: No description
- `credential_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/postgres/logs`

**Summary:** Get PostgreSQL Query Logs

Get recent SQL query logs and performance data

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): No description
- `query_type` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/postgres/restart`

**Summary:** Restart PostgreSQL Instance

Restart the dedicated PostgreSQL instance via Railway deployment restart

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/projects/{project_id}/postgres/rotate`

**Summary:** Rotate PostgreSQL Credentials

Generate new credentials for the PostgreSQL instance

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/postgres/usage`

**Summary:** Get PostgreSQL Usage Statistics

Get detailed usage statistics and billing information

**Parameters:**

- `project_id` (path) *(required)*: No description
- `hours` (query): No description

**Success Response (200):** Successful Response

---

## ZeroDB Projects


### `GET /v1/projects`

**Summary:** List Projects

List all projects for the current user with pagination and filtering

This endpoint provides comprehensive project listing with:
- Pagination support (skip/limit)
- Status and tier filtering 
- Soft-delete awareness
- Usage metrics included

**Parameters:**

- `skip` (query): Number of projects to skip
- `limit` (query): Max projects to return
- `status` (query): Filter by status
- `tier` (query): Filter by tier
- `include_deleted` (query): Include soft-deleted projects

**Success Response (200):** Successful Response

---

### `POST /v1/projects`

**Summary:** Create Project

Create a new project with unified database features

This endpoint creates a project with:
- Tier-based feature enablement
- Automatic quantum/MCP configuration
- Usage limit validation
- Database feature initialization

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/projects/bulk-stats`

**Summary:** Get Bulk Project Stats

Get statistics for multiple projects in a single API call

This endpoint significantly reduces API calls by returning stats for multiple
projects at once. It uses a single optimized database query with JOINs.

**Performance Benefits:**
- Single database query instead of N queries
- Batch processing for large project lists
- Pagination support for results

**Returns:**
- table_count: Number of NoSQL tables in project
- row_count: Total rows across all tables (placeholder, requires table query)
- vector_count: Number of vectors stored
- memory_count: Number of memory entries (stored in events_count)
- event_count: Number of events
- storage_used_bytes: Storage used in bytes (memory_usage_mb * 1024 * 1024)

**Example:**
```json
{
  "project_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Parameters:**

- `page` (query): Page number
- `page_size` (query): Items per page (max 100)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/projects/stats/summary`

**Summary:** Get Projects Summary

Get summary statistics for all user projects

Returns:
- Total projects by tier
- Total usage across all projects  
- Overall tier limits

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}`

**Summary:** Get Project

Get a specific project by ID

Returns detailed project information including:
- All configuration settings
- Usage metrics
- Database features status
- Tier limits

**Parameters:**

- `project_id` (path) *(required)*: No description
- `include_deleted` (query): Include soft-deleted project

**Success Response (200):** Successful Response

---

### `PATCH /v1/projects/{project_id}`

**Summary:** Update Project

Update a project

Supports updating:
- Basic project information (name, description)
- Tier (with automatic feature reconfiguration)
- Status (ACTIVE, SUSPENDED, DELETED)
- Database settings

Security:
- Users can only update their own projects
- Input validation prevents SQL injection
- Audit log created for all update operations

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/projects/{project_id}`

**Summary:** Delete Project

Delete a project (soft delete by default)

- Soft delete: Sets status to DELETED and deleted_at timestamp
- Hard delete: Permanently removes from database
- Cascade delete: Removes all related project data (vectors, tables, files, events)
- Soft deleted projects can be restored

Security:
- Users can only delete their own projects
- Audit log created for all delete operations
- Rate limiting applied to prevent abuse

**Parameters:**

- `project_id` (path) *(required)*: No description
- `hard_delete` (query): Permanently delete (cannot be restored)
- `cascade` (query): Cascade delete related data (vectors, tables, files, events)

---

### `POST /v1/projects/{project_id}/restore`

**Summary:** Restore Project

Restore a soft-deleted project

Sets status back to ACTIVE and clears deleted_at timestamp.
Only works on soft-deleted projects.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/projects/{project_id}/usage`

**Summary:** Get Project Usage

Get detailed usage metrics for a project

Returns:
- Current usage counts (vectors, tables, events, etc.)
- Tier-based limits
- Usage percentages

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
