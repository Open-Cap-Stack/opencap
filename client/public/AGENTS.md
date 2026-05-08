# OpenCap Stack — Agent Guide

This document describes how AI agents can interact with OpenCap Stack programmatically.

## Quick Start (Zero Human Steps)

```bash
# 1. Register as an agent
curl -X POST https://opencapstack.com/api/v1/agents/onboard \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"my-agent","agent_name":"My Agent","capabilities":["read:cap-table"]}'

# 2. Use returned token for all subsequent requests
curl https://opencapstack.com/api/v1/stakeholders \
  -H "Authorization: Bearer <token_from_step_1>"
```

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| Agent Onboard | `POST /api/v1/agents/onboard` | Zero-friction agent registration, returns JWT immediately |
| Register | `POST /api/v1/auth/register` | Human account registration |
| Login | `POST /api/v1/auth/login` | Returns `{ token, refreshToken }` |
| Refresh | `POST /api/v1/auth/refresh` | Refresh expired JWT |

All protected endpoints require: `Authorization: Bearer <token>`

## Capabilities

Agents can request specific capability scopes during onboarding:

| Scope | Description |
|-------|-------------|
| `read:cap-table` | Read stakeholders, share classes, equity plans |
| `write:stakeholders` | Create and update stakeholder records |
| `write:equity` | Issue grants, update vesting schedules |
| `read:financials` | Access valuations, financial reports |
| `write:documents` | Upload and manage documents |
| `read:analytics` | Access reporting and analytics |

## Key API Resources

### Cap Table
- `GET /api/v1/stakeholders` — All stakeholders with pagination
- `POST /api/v1/stakeholders` — Create stakeholder
- `GET /api/v1/share-classes` — Share class definitions
- `GET /api/v1/equity-plans` — Equity compensation plans
- `GET /api/v1/equity-grants` — Individual grants

### SAFE & Instruments
- `GET /api/v1/safe-notes` — SAFE instruments
- `POST /api/v1/safe-notes` — Create SAFE
- `GET /api/v1/securities` — All securities

### Financial
- `GET /api/v1/valuations/409a` — 409A valuations
- `GET /api/v1/fundraising-rounds` — Funding history
- `POST /api/v1/dilution/simulate` — Run dilution scenario

### Documents
- `POST /api/v1/documents` — Upload document
- `GET /api/v1/documents` — List documents
- `POST /api/v1/documents/:id/sign` — Digital signature

## Data Format

All responses follow OCTA v2.0 schema. Dates in ISO 8601. Currency in USD cents unless specified.

```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 50, "total": 200 },
  "meta": { "version": "1.0", "timestamp": "2026-05-07T00:00:00Z" }
}
```

## Rate Limits

| Tier | Requests/min | Burst |
|------|-------------|-------|
| Agent (default) | 100 | 200 |
| Agent (elevated) | 500 | 1000 |

Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Format

```json
{
  "error": {
    "code": "STAKEHOLDER_NOT_FOUND",
    "message": "No stakeholder with id: abc123",
    "status": 404,
    "docs": "https://opencapstack.com/api-docs#stakeholders"
  }
}
```

## OpenAPI Spec

Full machine-readable spec: `GET /openapi.json`

## MCP Server

OpenCap Stack exposes an MCP server for Claude and other MCP-compatible agents: see `/mcp-server-card.json`

## Schema Validation

All inputs validated against OCTA v2.0 JSON Schema. Schema available at `/api/v1/schema`.
