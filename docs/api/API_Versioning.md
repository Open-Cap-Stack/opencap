# API Versioning Documentation
**Chore: OCAE-209**

## Overview

The OpenCap Stack implements API versioning to ensure backward compatibility as the API evolves. This document explains how API versioning works and how to use different API versions.

## How API Versioning Works

OpenCap API supports two route patterns:

1. **Legacy Routes**: `/api/{resource}` (e.g., `/api/spvs`)
2. **Versioned Routes**: `/api/v{version}/{resource}` (e.g., `/api/v1/spvs`)

All API responses include the version header `X-API-Version` that identifies the API version being used.

## Current API Versions

| Version | Status | Route Format | Release Date |
|---------|--------|--------------|--------------|
| 1.0     | Active | `/api/v1/...` | 2025-03-24   |

## Using API Versions

### Version 1 (Current)

Version 1 is the current API version. You can access it using either the legacy routes or the versioned routes.

**Examples:**

```
GET /api/spvs                 # Legacy route
GET /api/v1/spvs              # Versioned route (equivalent)

GET /api/companies            # Legacy route
GET /api/v1/companies         # Versioned route (equivalent)
```

Both route styles will return the same data with the same structure.

## API Versioning Headers

All API responses include the `X-API-Version` header that indicates the API version:

```
X-API-Version: 1.0
```

You can use this header to identify which API version is serving your request.

## Unsupported Versions

If you request an unsupported API version (e.g., `/api/v999/spvs`), the API will respond with:

```json
{
  "error": "API version not supported: v999. Supported versions: v1"
}
```

## Future Versions

As the API evolves, new versions will be introduced. When a new API version is released:

1. The legacy routes and older versioned routes will continue to work as before
2. New features and breaking changes will be implemented in the newest version

This ensures backward compatibility while allowing the API to evolve.

## Recommendations

- For new integrations, always use the explicit versioned routes (e.g., `/api/v1/...`)
- Check the `X-API-Version` header in responses to confirm the version being used
- Monitor for announcements of new API versions and deprecation notices

## API Versioning Implementation

The API versioning is implemented using Express middleware that:

1. Validates the requested API version
2. Adds version headers to responses
3. Routes requests to the appropriate handler based on the requested version

This implementation ensures a consistent user experience across all API versions.
