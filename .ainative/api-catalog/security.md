# Security APIs

**Endpoint Count:** 4

## Overview

This category contains 4 endpoints for security operations.


## Security


### `GET /v1/security/ip-whitelist`

**Summary:** Get IP whitelist configuration

Get IP whitelist configuration for the current user.

    Returns:
    - Whether IP whitelist is enabled
    - Whitelist mode (allowlist/blocklist)
    - List of IP entries with descriptions

    Requires authentication.

**Success Response (200):** IP whitelist retrieved successfully

---

### `POST /v1/security/ip-whitelist`

**Summary:** Add IP to whitelist

Add an IP address or CIDR range to the user's whitelist.

    Supports:
    - Single IP addresses (e.g., 192.168.1.100)
    - CIDR notation (e.g., 192.168.1.0/24)
    - IPv4 and IPv6

    Requires authentication.

**Request Body:** JSON

**Success Response (201):** IP added successfully

---

### `PUT /v1/security/ip-whitelist/toggle`

**Summary:** Toggle IP whitelist enabled/disabled

Enable or disable IP whitelist enforcement for the user.

    When enabled, only requests from whitelisted IPs will be allowed.

    Requires authentication.

**Request Body:** JSON

**Success Response (200):** IP whitelist toggled successfully

---

### `DELETE /v1/security/ip-whitelist/{entry_id}`

**Summary:** Remove IP from whitelist

Remove an IP address from the user's whitelist.

    Requires authentication and the entry must belong to the user.

**Parameters:**

- `entry_id` (path) *(required)*: No description

**Success Response (200):** IP removed successfully

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
