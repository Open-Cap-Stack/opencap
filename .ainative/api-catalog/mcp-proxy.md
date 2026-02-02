# Mcp Proxy APIs

**Endpoint Count:** 9

## Overview

This category contains 9 endpoints for mcp proxy operations.


## MCP Proxy


### `POST /v1/mcp/connection-pool/cleanup`

**Summary:** Force Connection Pool Cleanup

Force cleanup of connection pools
If container_endpoint is provided, cleans only that pool, otherwise cleans all pools

**Parameters:**

- `container_endpoint` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/connection-pool/config`

**Summary:** Get Connection Pool Config

Get current connection pool configuration
Shows pool limits, timeouts, and other settings

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/connection-pool/health/{container_endpoint}`

**Summary:** Get Connection Pool Health

Get health status for a specific container's connection pool
Shows detailed health information for all pooled connections

**Parameters:**

- `container_endpoint` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/connection-pool/stats`

**Summary:** Get Connection Pool Stats

Get connection pool statistics and status
Shows pool utilization, performance metrics, and health

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/comprehensive-stats`

**Summary:** Get Comprehensive Proxy Stats

Get comprehensive proxy and connection pool statistics
Combines proxy, pool, and registry statistics for complete overview

**Success Response (200):** Successful Response

---

### `POST /v1/mcp/registry/health-check-all`

**Summary:** Bulk Health Check User Instances

Perform bulk health check on all user's MCP instances

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/registry/stats`

**Summary:** Get Container Registry Stats

Get container registry statistics (admin/debugging endpoint)

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/{instance_id}/status`

**Summary:** Get Mcp Instance Proxy Status

Get proxy status for an MCP instance
Returns container endpoint and connection information with registry health data

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/mcp/{instance_id}/test-connection`

**Summary:** Test Mcp Proxy Connection

Test proxy connection to MCP container
Useful for debugging connection issues with enhanced registry diagnostics

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
