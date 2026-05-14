# PRD: MCP Server and AI Chat Plugin for OpenCap Stack

**Document Status**: Draft  
**Date**: 2026-05-08  
**Product Area**: Developer Integrations / AI Chat Access

---

## 1. Product Overview

OpenCap Stack manages the full lifecycle of a company's cap table: stakeholders, share classes, equity plans, SAFE agreements, fundraising rounds, 409A valuations, vesting schedules, waterfall analyses, tax calculations, and financial reporting. Today, all of these operations require a browser-based dashboard or direct API calls.

This PRD covers two complementary products that expose cap table management through a natural language chat interface:

1. **OpenCap MCP Server** — A Model Context Protocol server that lets any MCP-compatible AI client (Claude Code, Claude Desktop, Cursor, Codex, Windsurf, etc.) call OpenCap APIs as structured tools via chat.
2. **OpenCap Chat Plugin** — An AI chat plugin integration (starting with claude.ai) that enables non-developer founders, attorneys, and finance teams to query and update their cap table through a conversational interface without installing any developer tooling.

Together these products reduce the friction of cap table management from "open dashboard, navigate menus, fill forms" to "ask a question or give an instruction in plain English."

---

## 2. User Personas

| Persona | Context | Primary Need |
|---------|---------|--------------|
| Founder / CEO | Early-stage startup | Check ownership summary, issue equity to a new hire, run dilution scenarios |
| CFO / Finance | Series A+ company | Pull financial reports, initiate 409A requests, review vesting schedules |
| Startup Attorney | Law firm, multiple clients | Review SAFE terms, check compliance status, export documents |
| Developer | Building on top of OpenCap | Automate cap table operations from an AI-native workflow |

---

## 3. User Stories

### MCP Server

- As a developer using Claude Code, I want to type "show me the cap table" and get a structured ownership summary without leaving my editor.
- As a founder in Claude Desktop, I want to issue 1,000 options to a new engineer by describing the grant in natural language.
- As a CFO, I want to ask "what is our current 409A valuation?" and receive the latest valuation with expiry date.
- As an attorney, I want to retrieve all outstanding SAFEs for a client company and review their conversion terms.
- As a developer, I want to automate equity grant workflows by wiring MCP tools into an agent pipeline.
- As an operations lead, I want to trigger a waterfall analysis for a hypothetical exit scenario through chat.

### Chat Plugin

- As a non-technical founder, I want to use claude.ai to ask "who are my largest shareholders?" without needing an API key or developer setup.
- As a finance team member, I want to query vesting schedules and get plain-English summaries of upcoming vest events.
- As a board member, I want to receive a financial reporting summary on demand via the plugin without accessing the dashboard.
- As a new user, I want to connect my OpenCap account to the plugin via OAuth once and never worry about tokens again.

---

## 4. MCP Server Specification

### 4.1 Protocol

The server implements the [Model Context Protocol](https://modelcontextprotocol.io) over **stdio** (for local use) and **HTTP/SSE** (for hosted/remote use). It is written in Node.js using the `@modelcontextprotocol/sdk` package.

### 4.2 Authentication

All MCP tool calls proxy to the OpenCap REST API. Authentication is handled via a **Bearer token** (JWT) issued by the OpenCap `/api/v1/auth` endpoint. The MCP server reads the token from:

1. `OPENCAP_API_KEY` environment variable (preferred for headless/CI use)
2. A one-time `authenticate` tool call that exchanges email + password for a JWT and caches it in memory for the session

The token is forwarded as `Authorization: Bearer <token>` on every upstream API request.

### 4.3 Base URL Configuration

```
OPENCAP_BASE_URL=https://api.opencapstack.com  # or self-hosted URL
OPENCAP_API_KEY=<jwt-token>
```

### 4.4 Tool Registry

Tools are organized into domain groups. Each tool maps 1:1 to an existing OpenCap REST endpoint.

#### Stakeholder Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_stakeholders` | GET | `/api/v1/stakeholders` | List all stakeholders with pagination |
| `get_stakeholder` | GET | `/api/v1/stakeholders/:id` | Get a stakeholder by ID |
| `create_stakeholder` | POST | `/api/v1/stakeholders` | Add a new stakeholder |
| `update_stakeholder` | PUT | `/api/v1/stakeholders/:id` | Update stakeholder details |
| `delete_stakeholder` | DELETE | `/api/v1/stakeholders/:id` | Remove a stakeholder |

#### Share Class Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_share_classes` | GET | `/api/v1/share-classes` | List all share classes |
| `get_share_class` | GET | `/api/v1/share-classes/:id` | Get share class details |
| `create_share_class` | POST | `/api/v1/share-classes` | Create a new share class |
| `update_share_class` | PUT | `/api/v1/share-classes/:id` | Update share class terms |

#### Equity Plan Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_equity_plans` | GET | `/api/v1/equity-plans` | List all equity plans |
| `get_equity_plan` | GET | `/api/v1/equity-plans/:id` | Get equity plan details |
| `create_equity_plan` | POST | `/api/v1/equity-plans` | Create a new equity plan (e.g., option pool) |
| `update_equity_plan` | PUT | `/api/v1/equity-plans/:id` | Update plan parameters |

#### Security Issuance Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_security_issuances` | GET | `/api/v1/security-issuances` | List all security issuances |
| `create_security_issuance` | POST | `/api/v1/security-issuances` | Issue a new security |
| `get_compliance_status` | GET | `/api/v1/security-issuances/compliance` | Get issuance compliance status |

#### Vesting Schedule Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_vesting_schedules` | GET | `/api/v1/vesting-schedules` | List all vesting schedules |
| `get_vesting_schedule` | GET | `/api/v1/vesting-schedules/:id` | Get schedule details |
| `create_vesting_schedule` | POST | `/api/v1/vesting-schedules` | Create a vesting schedule |
| `calculate_vesting` | GET | `/api/v1/vesting-schedules/:id/calculate` | Calculate current vested amount |
| `get_vesting_timeline` | GET | `/api/v1/vesting-schedules/:id/timeline` | Get full vesting timeline |
| `get_upcoming_vesting` | GET | `/api/v1/vesting-schedules/:id/upcoming` | Get upcoming vest events |

#### Option Exercise Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `create_exercise_request` | POST | `/api/v1/exercise-requests` | Submit an option exercise request |
| `get_exercise_request` | GET | `/api/v1/exercise-requests/:id` | Get exercise request status |
| `approve_exercise` | POST | `/api/v1/exercise-requests/:id/approve` | Approve an exercise request |
| `process_exercise` | POST | `/api/v1/exercise-requests/:id/process` | Process a completed exercise |

#### SAFE Agreement Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_safes` | GET | `/api/v1/safes/company/:companyId` | List all SAFEs for a company |
| `get_safe` | GET | `/api/v1/safes/:safeId` | Get SAFE details |
| `create_safe` | POST | `/api/v1/safes` | Create a new SAFE |
| `update_safe` | PUT | `/api/v1/safes/:safeId` | Update SAFE terms |
| `send_safe` | POST | `/api/v1/safes/:safeId/send` | Send SAFE to investor |
| `mark_safe_funded` | POST | `/api/v1/safes/:safeId/fund` | Mark SAFE as funded |

#### Fundraising Round Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_fundraising_rounds` | GET | `/api/v1/fundraising-rounds` | List all rounds |
| `get_fundraising_round` | GET | `/api/v1/fundraising-rounds/:id` | Get round details |
| `create_fundraising_round` | POST | `/api/v1/fundraising-rounds` | Create a new round |
| `update_fundraising_round` | PUT | `/api/v1/fundraising-rounds/:id` | Update round details |

#### Dilution Analysis Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `calculate_dilution` | POST | `/api/v1/dilution/calculate` | Run a dilution calculation |
| `calculate_safe_dilution` | POST | `/api/v1/dilution/safe` | Model SAFE conversion dilution |
| `calculate_option_pool` | POST | `/api/v1/dilution/option-pool` | Calculate option pool dilution |
| `compare_dilution_scenarios` | POST | `/api/v1/dilution/compare` | Compare multiple dilution scenarios |
| `get_fully_diluted_shares` | GET | `/api/v1/dilution/fully-diluted/:companyId` | Get fully diluted share count |

#### Waterfall Analysis Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `create_waterfall_analysis` | POST | `/api/v1/waterfall-analyses` | Create a waterfall analysis |
| `run_waterfall_analysis` | POST | `/api/v1/waterfall-analyses/:id/run` | Execute waterfall for exit scenario |
| `compare_waterfall_scenarios` | POST | `/api/v1/waterfall-analyses/compare` | Compare multiple exit scenarios |
| `get_waterfall_visualization` | GET | `/api/v1/waterfall-analyses/:id/visualization` | Get chart-ready visualization data |

#### 409A Valuation Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `get_latest_valuation` | GET | `/api/v1/409a-valuations/latest` | Get the most recent 409A |
| `list_valuations` | GET | `/api/v1/409a-valuations` | List all 409A valuations |
| `create_valuation_request` | POST | `/api/v1/409a-valuations` | Submit a new 409A request |
| `get_company_valuation` | GET | `/api/v1/409a-valuations/company/:companyId/current` | Get current valuation for a company |
| `get_valuation_history` | GET | `/api/v1/409a-valuations/company/:companyId/history` | Get valuation history |

#### Tax Calculation Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `calculate_tax` | POST | `/api/v1/tax-calculator/calculate` | Calculate tax for an equity event |
| `list_tax_calculations` | GET | `/api/v1/tax-calculator` | List saved tax calculations |
| `get_tax_calculation` | GET | `/api/v1/tax-calculator/:id` | Get a specific tax calculation |

#### Document Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_documents` | GET | `/api/v1/documents` | List all documents |
| `search_documents` | POST | `/api/v1/documents/search` | Search documents by query |
| `get_document` | GET | `/api/v1/documents/:id` | Get document metadata |
| `list_folders` | GET | `/api/v1/documents/folders` | List document folders |
| `get_folder_contents` | GET | `/api/v1/documents/folders/:id/contents` | List documents in a folder |

#### Financial Reporting Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_financial_reports` | GET | `/api/v1/financial-reporting` | List all financial reports |
| `get_financial_report` | GET | `/api/v1/financial-reporting/:id` | Get a specific report |
| `create_financial_report` | POST | `/api/v1/financial-reporting` | Generate a new financial report |
| `search_financial_reports` | GET | `/api/v1/financial-reporting/search` | Search reports by criteria |

#### Investor Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `list_investors` | GET | `/api/v1/investors` | List all investors |
| `get_investor` | GET | `/api/v1/investors/:id` | Get investor profile |
| `create_investor` | POST | `/api/v1/investors` | Add a new investor |

#### Company Tools

| Tool Name | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
| `get_company` | GET | `/api/v1/companies/:id` | Get company details |
| `update_company` | PUT | `/api/v1/companies/:id` | Update company information |
| `get_company_settings` | GET | `/api/v1/companies/:id/settings` | Get company settings |

### 4.5 MCP Server Package Structure

```
packages/opencap-mcp/
├── src/
│   ├── index.ts           # Entry point, stdio + HTTP server setup
│   ├── auth.ts            # Bearer token handling
│   ├── client.ts          # OpenCap API HTTP client
│   ├── tools/
│   │   ├── stakeholders.ts
│   │   ├── shareClasses.ts
│   │   ├── equityPlans.ts
│   │   ├── securityIssuances.ts
│   │   ├── vestingSchedules.ts
│   │   ├── exercises.ts
│   │   ├── safes.ts
│   │   ├── fundraising.ts
│   │   ├── dilution.ts
│   │   ├── waterfall.ts
│   │   ├── valuations.ts
│   │   ├── taxCalculator.ts
│   │   ├── documents.ts
│   │   ├── financialReporting.ts
│   │   ├── investors.ts
│   │   └── company.ts
│   └── server.ts          # MCP server instance and tool registration
├── package.json
├── tsconfig.json
└── README.md
```

### 4.6 Distribution

- **npm package**: `@opencapstack/mcp-server` (public)
- **npx usage**: `npx @opencapstack/mcp-server`
- **Hosted endpoint**: `https://mcp.opencapstack.com/sse` (HTTP/SSE transport)
- **Claude Desktop config** (users add to `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "opencap": {
      "command": "npx",
      "args": ["-y", "@opencapstack/mcp-server"],
      "env": {
        "OPENCAP_API_KEY": "<your-jwt-token>",
        "OPENCAP_BASE_URL": "https://api.opencapstack.com"
      }
    }
  }
}
```

---

## 5. Chat Plugin Specification

### 5.1 Overview

The OpenCap Chat Plugin enables non-developer users to interact with their cap table through claude.ai. It surfaces as a connected app in the Claude plugin store. The plugin uses OAuth 2.0 for user authentication and exposes the same tool surface as the MCP server.

### 5.2 Plugin Manifest

The plugin is described by a manifest file served at `https://api.opencapstack.com/.well-known/ai-plugin.json`:

```json
{
  "schema_version": "v1",
  "name_for_human": "OpenCap Stack",
  "name_for_model": "opencap",
  "description_for_human": "Manage your startup cap table: stakeholders, equity, valuations, documents, and financial reports — all through chat.",
  "description_for_model": "OpenCap Stack is a cap table management platform. Use these tools to read and update stakeholder records, share classes, equity plans, SAFE agreements, fundraising rounds, 409A valuations, vesting schedules, dilution models, waterfall analyses, tax calculations, and financial reports. All operations require an authenticated user session established via OAuth.",
  "auth": {
    "type": "oauth",
    "client_url": "https://app.opencapstack.com/oauth/authorize",
    "scope": "cap_table:read cap_table:write documents:read documents:write reporting:read",
    "authorization_url": "https://api.opencapstack.com/oauth/token",
    "authorization_content_type": "application/json"
  },
  "api": {
    "type": "openapi",
    "url": "https://api.opencapstack.com/.well-known/openapi.yaml"
  },
  "logo_url": "https://app.opencapstack.com/logo.png",
  "contact_email": "support@opencapstack.com",
  "legal_info_url": "https://opencapstack.com/terms"
}
```

### 5.3 OAuth Flow

1. User clicks "Connect OpenCap" in the claude.ai plugin UI.
2. Claude redirects user to `https://app.opencapstack.com/oauth/authorize` with `client_id`, `redirect_uri`, `scope`, and `state`.
3. User logs in (or is already logged in) and approves the requested scopes.
4. OpenCap redirects to `redirect_uri` with an authorization `code`.
5. Claude exchanges the code at `https://api.opencapstack.com/oauth/token` for an access token + refresh token.
6. All subsequent plugin tool calls include `Authorization: Bearer <access_token>`.
7. Token refresh is handled automatically using the refresh token.

**OAuth Scopes**:

| Scope | Access |
|-------|--------|
| `cap_table:read` | Read stakeholders, share classes, equity plans |
| `cap_table:write` | Create and update cap table records |
| `documents:read` | Read documents and folders |
| `documents:write` | Upload and manage documents |
| `reporting:read` | Access financial reports, valuations, analytics |

### 5.4 Plugin Tool Handlers

The plugin exposes the same tools as the MCP server (see Section 4.4) but delivered via an OpenAPI spec at `https://api.opencapstack.com/.well-known/openapi.yaml`. The OpenAPI spec maps directly to the existing Express routes.

### 5.5 OpenAPI Spec Hosting

The existing Express app will serve a generated OpenAPI 3.0 spec via `swagger-jsdoc` or a static YAML file covering all plugin-relevant endpoints. This spec is the contract between claude.ai and the OpenCap API.

### 5.6 Plugin Deployment

- Plugin manifest hosted at the production API domain
- Submitted to the claude.ai app store via Anthropic's plugin submission process
- Versioned alongside the OpenCap API; breaking changes require a new plugin version

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AI Chat Clients                   │
│  Claude Desktop  │  Claude Code  │  claude.ai UI   │
└────────┬─────────┴───────┬───────┴────────┬────────┘
         │ stdio/HTTP       │ stdio/HTTP      │ HTTPS (OAuth)
         ▼                  ▼                 ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────────┐
│  MCP Server    │  │  MCP Server    │  │  Chat Plugin       │
│  (local npx)   │  │  (hosted SSE)  │  │  (OpenAPI + OAuth) │
└───────┬────────┘  └───────┬────────┘  └────────┬───────────┘
        │                   │                     │
        └───────────────────┴─────────────────────┘
                            │
                     Bearer Token (JWT)
                            │
                            ▼
              ┌─────────────────────────┐
              │   OpenCap REST API      │
              │   Express + Node.js     │
              │   (existing backend)    │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │        ZeroDB           │
              │  (primary data store)   │
              └─────────────────────────┘
```

### 6.1 MCP Server Design Principles

- Each tool handler is a thin wrapper: validate input schema → build HTTP request → call OpenCap API → return formatted response
- No business logic lives in the MCP server; it is a protocol adapter only
- Tool schemas use JSON Schema with clear `description` fields so the LLM can self-select the right tool
- Error responses from the API are surfaced as MCP tool errors with actionable messages

### 6.2 Plugin Design Principles

- The OpenAPI spec is the single source of truth for plugin capabilities
- OAuth token storage and refresh are handled by the claude.ai platform
- The plugin does not add a separate data layer; all reads/writes go through the existing API

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| MCP tool response latency | < 2s (p95) for read operations |
| MCP tool response latency | < 5s (p95) for write/calculation operations |
| Plugin OAuth round-trip | < 3s |
| MCP server test coverage | >= 80% |
| Plugin handler test coverage | >= 80% |
| Authentication | Bearer JWT (MCP) / OAuth 2.0 (Plugin) |
| Rate limiting | Inherit from OpenCap API limits |
| Multi-tenancy | Company ID scoped via JWT claims |

---

## 8. Success Metrics

### MCP Server

| Metric | 30-day Target | 90-day Target |
|--------|--------------|--------------|
| npm downloads per week | 100 | 500 |
| Active MCP sessions per day | 50 | 300 |
| Tool call success rate | >= 99% | >= 99.5% |
| Unique developers using MCP | 20 | 100 |

### Chat Plugin

| Metric | 30-day Target | 90-day Target |
|--------|--------------|--------------|
| Plugin installs | 50 | 500 |
| Weekly active plugin users | 20 | 200 |
| OAuth completion rate | >= 80% | >= 85% |
| Tool call success rate | >= 98% | >= 99% |

---

## 9. Out of Scope (v1)

- Real-time push notifications via MCP (future: MCP resources/subscriptions)
- Bulk data export tools (CSV/Excel generation via chat)
- Admin-level tools (user management, billing) — auth scopes will block these
- Support for MCP clients other than Claude Desktop, Claude Code, Cursor in v1 (will add as ecosystem grows)

---

## 10. Dependencies and Risks

| Item | Risk | Mitigation |
|------|------|-----------|
| claude.ai plugin store approval | Medium — timeline uncertain | Begin submission early; use hosted MCP as fallback |
| OpenAPI spec completeness | Medium — existing routes lack OpenAPI annotations | Generate spec from route files as first workstream task |
| MCP SDK stability | Low — protocol is stable at 1.0 | Pin SDK version; follow changelog |
| Token security | Medium — API keys in env vars | Document secure storage practices; support token rotation |

---

## 11. Implementation Workstreams

### Workstream A: MCP Server
1. Scaffold MCP server package (`@opencapstack/mcp-server`)
2. Implement read tools (stakeholders, share classes, equity plans)
3. Implement write tools (create stakeholder, issue equity, create share class)
4. Implement document management tools
5. Implement financial reporting and 409A tools
6. Authentication and API key management
7. npm package build, publish, and distribution

### Workstream B: Chat Plugin
1. Plugin manifest and OpenAPI spec hosting
2. OAuth 2.0 flow implementation (authorization server additions)
3. Plugin tool handlers (leverage MCP tool logic)
4. Plugin submission and claude.ai app store listing

---

*This document describes the planned MCP Server and Chat Plugin integration for OpenCap Stack.*
