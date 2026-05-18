# @opencapstack/mcp-server

An MCP (Model Context Protocol) server for OpenCap Stack. Connect your cap table to Claude Desktop, Claude Code, Cursor, and any MCP-compatible client to manage stakeholders, share classes, SAFEs, dilution models, waterfall analyses, and financial reports — all through natural language.

---

## Quick start

```bash
npx @opencapstack/mcp-server
```

The server reads your API key from the `OPENCAP_API_KEY` environment variable and starts on stdio by default.

---

## Configuration

### Claude Desktop

Add the following to your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "opencap": {
      "command": "npx",
      "args": ["@opencapstack/mcp-server"],
      "env": {
        "OPENCAP_API_KEY": "your-jwt-token-here",
        "OPENCAP_BASE_URL": "https://api.opencapstack.com"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code

Add to your Claude Code MCP settings (`.claude/settings.json` or via `claude mcp add`):

```json
{
  "mcpServers": {
    "opencap": {
      "command": "npx",
      "args": ["@opencapstack/mcp-server"],
      "env": {
        "OPENCAP_API_KEY": "your-jwt-token-here"
      }
    }
  }
}
```

Or from the command line:

```bash
claude mcp add opencap npx @opencapstack/mcp-server
```

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENCAP_API_KEY` | Yes | — | Your OpenCap JWT token. Get one at `https://api.opencapstack.com/api/v1/auth/login` |
| `OPENCAP_BASE_URL` | No | `https://api.opencapstack.com` | Base URL for the OpenCap API. **Must NOT include `/api/v1`** (the tools add this automatically). Correct: `https://api.opencapstack.com`. Wrong: `https://api.opencapstack.com/api/v1`. If the suffix is present it will be stripped automatically with a warning. |
| `TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `sse` |
| `PORT` | No | `3001` | Port for the SSE HTTP server (only used when `TRANSPORT=sse`) |

---

## Available tools

| Tool | Description |
|------|-------------|
| `list_stakeholders` | List all stakeholders in the cap table |
| `get_stakeholder` | Get details for a stakeholder by ID |
| `create_stakeholder` | Add a new stakeholder |
| `update_stakeholder` | Update an existing stakeholder |
| `list_share_classes` | List all share classes |
| `get_share_class` | Get details for a share class by ID |
| `create_share_class` | Create a new share class |
| `list_equity_plans` | List all equity plans |
| `get_equity_plan` | Get details for an equity plan |
| `create_equity_plan` | Create a new equity incentive plan |
| `list_safes` | List all SAFE instruments |
| `get_safe` | Get details for a SAFE by ID |
| `create_safe` | Record a new SAFE |
| `update_safe` | Update a SAFE (e.g. record conversion) |
| `list_documents` | List cap table documents |
| `get_document` | Get a document by ID |
| `search_documents` | Search documents by keyword |
| `get_latest_valuation` | Get the most recent 409A valuation |
| `get_valuation_history` | Get the valuation history timeline |
| `create_valuation_request` | Record a new valuation |
| `calculate_dilution` | Model dilution from a new issuance |
| `get_fully_diluted_shares` | Get fully diluted share count |
| `run_waterfall_analysis` | Model exit proceeds distribution |
| `list_financial_reports` | List financial reports |
| `get_financial_report` | Get a financial report by ID |
| `create_financial_report` | Generate a new financial report |

---

## Self-hosted usage

If you run your own OpenCap Stack instance, set `OPENCAP_BASE_URL` to your instance's root URL (without the `/api/v1` path -- the MCP tools add this automatically):

```json
{
  "env": {
    "OPENCAP_API_KEY": "your-jwt-token",
    "OPENCAP_BASE_URL": "https://opencap.yourcompany.internal"
  }
}
```

> **Common mistake:** Do not set `OPENCAP_BASE_URL` to `https://opencap.yourcompany.internal/api/v1`. The `/api/v1` prefix is appended by each tool automatically. If you include it, all requests will use a doubled path like `/api/v1/api/v1/...`. The server will strip a trailing `/api/v1` and log a warning, but it is best to set the correct value upfront.

### SSE transport (web clients)

Start the server in SSE mode for HTTP-based MCP clients:

```bash
TRANSPORT=sse PORT=3001 OPENCAP_API_KEY=your-token npx @opencapstack/mcp-server
```

The server will expose:
- `GET /sse` — SSE connection endpoint
- `POST /messages?sessionId=<id>` — message endpoint

---

## Security

**Never hardcode your API key.** Always pass it through environment variables.

- Do not commit `.env` files containing `OPENCAP_API_KEY` to source control.
- Rotate your API key regularly at `https://app.opencapstack.com/settings`.
- When using the SSE transport, run the server behind a reverse proxy with TLS and access controls.
- API keys are scoped to your account — treat them like passwords.

---

## Development

```bash
git clone https://github.com/Open-Cap-Stack/opencapstack
cd packages/opencap-mcp
npm install
npm run build   # compile TypeScript
npm run dev     # run with tsx (no compile step)
npm test        # run Jest tests
```

---

## License

MIT
