# Mcp Settings APIs

**Endpoint Count:** 5

## Overview

This category contains 5 endpoints for mcp settings operations.


## MCP Settings


### `GET /v1/mcp/servers`

**Summary:** List Available Mcp Servers

List all available MCP servers

Returns a list of all MCP servers available in the catalog along with
information about which servers the current user has enabled.

**Authentication Required**: JWT token or API key

**Returns**:
- **servers**: List of all available MCP servers with metadata
- **total**: Total number of available servers
- **user_enabled**: List of server names currently enabled by the user

**Use Cases**:
- Discover available MCP servers
- See which servers you've enabled
- Get server metadata (description, category, features, pricing)

**Success Response (200):** Successful Response

---

### `POST /v1/mcp/servers/{server_name}/disable`

**Summary:** Disable Mcp Server

Disable a specific MCP server

Disables an MCP server for the current user. The server will no longer be
available for execution in AI workflows or agent operations.

**Authentication Required**: JWT token or API key

**Returns**: Server status confirming it has been disabled

**Note**: This does not delete the server configuration, only sets it to disabled.
You can re-enable it later with the enable endpoint.

**Parameters:**

- `server_name` (path) *(required)*: Name of the MCP server to disable

**Success Response (200):** Successful Response

---

### `POST /v1/mcp/servers/{server_name}/enable`

**Summary:** Enable Mcp Server

Enable a specific MCP server

Enables an MCP server from the catalog for the current user with optional configuration:
- **priority**: Execution priority (higher = higher priority)
- **timeout_seconds**: Request timeout in seconds (1-300)
- **retry_attempts**: Number of retry attempts on failure (0-10)
- **custom_config**: Server-specific configuration options

**Authentication Required**: JWT token or API key

**Returns**: Server status and configuration

**Errors**:
- 404: Server not found in catalog
- 400: Invalid configuration parameters

**Parameters:**

- `server_name` (path) *(required)*: Name of the MCP server to enable

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/settings`

**Summary:** Get Mcp Settings

Get user's MCP settings

Returns the current user's MCP configuration including:
- List of enabled MCP servers
- Per-server configuration (priority, timeout, retry settings)
- Global settings (timeout, concurrent requests)

**Authentication Required**: JWT token or API key

**Success Response (200):** Successful Response

---

### `PUT /v1/mcp/settings`

**Summary:** Update Mcp Settings

Update user's MCP settings

Allows partial updates of MCP configuration:
- **enabled_servers**: List of MCP server names to enable
- **server_configs**: Per-server configuration (priority, timeout, retry settings)
- **global_timeout_seconds**: Global timeout for all MCP operations (1-300 seconds)
- **max_concurrent_requests**: Maximum concurrent MCP requests (1-20)

**Authentication Required**: JWT token or API key

**Validation**:
- Server names must exist in MCP catalog
- Timeout must be between 1 and 300 seconds
- Max concurrent requests must be between 1 and 20

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
