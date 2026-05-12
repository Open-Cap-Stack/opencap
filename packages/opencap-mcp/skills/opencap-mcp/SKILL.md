---
name: opencap-mcp
description: >
  Use when working with the OpenCap Stack cap table via the MCP server. Covers
  stakeholders, share classes, SAFEs, equity plans, equity grants, valuations,
  documents, dilution analysis, and waterfall modeling. Always start with
  `whoami` then `cap_table_summary` to orient before any write operations.
---

# OpenCap MCP — Agent Guide

## Starting Every Session

Always run these two tools first:

```
whoami              → confirms auth, returns email + companyId
cap_table_summary   → shows current state (stakeholders, SAFEs, grants, plans)
```

If `whoami` fails: check `OPENCAP_API_KEY` and that `OPENCAP_BASE_URL` does **not** end with `/api/v1`.

---

## Company ID

AINative Studio's companyId is `ainative-studio`. Always pass this in every tool call that requires `companyId`.

---

## ID Field Rules — Critical

Never use the MongoDB `_id` field for follow-up operations. Use the domain ID:

| Entity | Correct ID field | Example |
|--------|-----------------|---------|
| SAFE | `safeId` | `safe_1747096...` |
| Stakeholder | `row_id` | `7f8475ad-...` |
| Equity Plan | `row_id` | `9529e0d1-...` |
| Share Class | `row_id` | `abc123-...` |
| Equity Grant | `grantId` | `GRT-...` |
| Financial Report | `row_id` | `def456-...` |

Always get IDs from `list_*` tool output, not from create responses alone (re-fetch is automatic in 1.6.0+).

---

## Workflow Sequencing

Call `list_workflows` for full step-by-step guides. Quick reference:

**Add advisor with equity:**
1. `create_stakeholder` (role: advisor) → note `row_id`
2. `list_equity_plans` — use existing plan or `create_equity_plan`
3. `create_equity_grant` (employeeId = stakeholder `row_id`, equityPlanId = plan `row_id`)

**Record SAFE investment:**
1. `list_stakeholders` or `create_stakeholder` (role: investor) → note `row_id`
2. `create_safe` (investorId = stakeholder `row_id`)

**Set up share classes:**
1. `create_share_class` — Common first, then Preferred
2. `list_share_classes` to confirm

**Record 409A valuation:**
1. `create_valuation_request`
2. (optional) `create_financial_report` (reportType: 409A_report)

---

## Known Issues (check GitHub before workarounds)

| Issue | Status | Workaround |
|-------|--------|------------|
| `POST /api/v1/equity-grants` returns ZeroDB 500 | Open (#557) | None yet — grant creation blocked |
| `update_safe` status doesn't persist | Open (#554) | Re-check with `get_safe` after update |
| `GET /api/v1/safes` returns 404 in production | Open | `cap_table_summary` shows `safes` as unavailable |
| `Stakeholder` has no `title`/`jobTitle` field | Open (#555) | Store title in `notes` field |

---

## All Available Tools (29 total)

### Meta
- `whoami` — verify auth, returns email/role/companyId
- `list_workflows` — step-by-step guides for common operations
- `cap_table_summary` — overview of entire cap table state

### Stakeholders
- `list_stakeholders`, `get_stakeholder`, `create_stakeholder`, `update_stakeholder`, `get_cap_table`

### Share Classes
- `list_share_classes`, `get_share_class`, `create_share_class`

### Equity Plans
- `list_equity_plans`, `get_equity_plan`, `create_equity_plan`

### Equity Grants
- `list_equity_grants`, `get_equity_grant`, `create_equity_grant`, `update_equity_grant`, `get_vesting_schedule`

### SAFEs
- `list_safes`, `get_safe`, `create_safe`, `update_safe`

### Valuations
- `get_latest_valuation`, `get_valuation_history`, `create_valuation_request`

### Documents
- `list_documents`, `get_document`, `search_documents`

### Analysis
- `calculate_dilution`, `run_waterfall_analysis`

### Financial Reports
- `list_financial_reports`, `get_financial_report`, `create_financial_report`

---

## Config Reference

**Claude Code (`~/.claude.json` projects entry):**
```json
{
  "opencap": {
    "type": "stdio",
    "command": "opencap-mcp",
    "env": {
      "OPENCAP_API_KEY": "<your-jwt-token>",
      "OPENCAP_BASE_URL": "https://api.opencapstack.com"
    }
  }
}
```

**Note:** `OPENCAP_BASE_URL` must NOT end with `/api/v1` — tools already prefix that path.

**Getting an API key:** `POST /api/v1/auth/login` with your credentials, or ask your admin to generate one via the admin-token endpoint.

---

## Error Recovery

| Error | Cause | Fix |
|-------|-------|-----|
| `API key rejected or expired` | Token expired or wrong secret | Regenerate token, update `OPENCAP_API_KEY`, restart MCP |
| `Record not found` + ID hint | Using `_id` instead of domain ID | Use `safeId` / `row_id` / `grantId` from `list_*` output |
| `Server error saving record` | ZeroDB 500 on create | Check all referenced IDs exist; retry once; check GitHub issues |
| `OPENCAP_BASE_URL should not include /api/v1` | Startup warning in stderr | Remove `/api/v1` suffix from the env var |
| `cap_table_summary` shows unavailable entities | One route returning 404 | Check individual `list_*` tools; log GitHub issue if consistent |
