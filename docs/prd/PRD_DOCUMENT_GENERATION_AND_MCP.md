# PRD: Automated Document Generation & MCP Tool Expansion

**Author**: Product Engineering
**Date**: 2026-05-28
**Status**: In Progress
**Priority**: P0

---

## Problem Statement

When equity is issued to stakeholders (founders, employees, advisors), the company must produce and manage several legal documents: Restricted Stock Purchase Agreements (RSPAs), stock certificates, and IRS Section 83(b) election forms. Currently, OCS has no ability to generate these documents — they must be created manually outside the platform and uploaded.

Additionally, the MCP server (which powers AI assistant interactions) lacks document generation, upload, and deadline management tools. Users cannot ask their AI assistant to "issue shares to Adam and generate the paperwork" — a workflow that should be a core product capability.

## Goals

1. **Auto-generate legal documents** when equity is granted through OCS
2. **Add MCP tools** so AI assistants can perform the full equity issuance workflow
3. **Track 83(b) deadlines** and send automated email reminders
4. **Reduce time-to-compliance** from days (manual) to seconds (automated)

## Non-Goals

- E-signature integration (future phase)
- State-specific tax form variations (future phase)
- Automated IRS filing (out of scope — users must mail the 83(b) themselves)

---

## User Stories

### US-1: Founder issues shares and gets paperwork auto-generated
> As a founder, when I issue shares to a new stakeholder, I want the platform to automatically generate the RSPA, stock certificate, and 83(b) form so I don't have to create them manually.

### US-2: AI assistant handles full equity workflow via MCP
> As a user of the OCS MCP tools, I want to tell my AI assistant "issue 250,000 shares to Adam Morning and generate all the paperwork" and have it create the stakeholder, issue shares, generate documents, upload them to the data room, and set up deadline reminders.

### US-3: Stakeholder gets reminded about 83(b) deadline
> As a stakeholder who received restricted stock, I want to receive email reminders at 25 days, 14 days, and 7 days before my 83(b) filing deadline so I don't miss it and face adverse tax consequences.

### US-4: Admin tracks 83(b) compliance across all stakeholders
> As an admin, I want to see a dashboard showing which stakeholders have pending 83(b) elections, their deadlines, and filing status.

---

## Feature Specifications

### Feature 1: Document Generation Engine (Backend)

**Endpoint**: `POST /api/v1/documents/generate`

**Request body**:
```json
{
  "templateType": "rspa" | "stock_certificate" | "83b_election",
  "stakeholderId": "stakeholder_xxx",
  "companyId": "company_xxx",
  "params": {
    "shares": 250000,
    "pricePerShare": 0.00001,
    "effectiveDate": "2025-06-01",
    "issuanceDate": "2026-05-28",
    "certificateNumber": "C-2",
    "vestingSchedule": "fully_vested" | "4yr_1yr_cliff_monthly",
    "vestingMonths": 48,
    "cliffMonths": 12
  }
}
```

**Response**: Generated PDF as base64 + document record created in data room.

**Templates**:
| Template | Fields | Output |
|----------|--------|--------|
| RSPA | Company name, purchaser name, shares, price/share, total price, vesting terms, effective date, acceleration provisions | Multi-page PDF |
| Stock Certificate | Company name, holder name, shares, certificate number, date, officer signatures | 1-page PDF with legends |
| 83(b) Election | Taxpayer name, SSN placeholder, company name, shares, transfer date, FMV, amount paid, restrictions | 1-page PDF with IRS instructions |

### Feature 2: MCP Tools (6 new tools)

| Tool | Description | Parameters |
|------|------------|------------|
| `generate_document` | Generate RSPA, certificate, or 83(b) from template | templateType, stakeholderId, params |
| `upload_document` | Upload a file to the data room | title, fileName, companyId, base64Content, category |
| `delete_document` | Remove a document | documentId |
| `send_83b_reminder` | Send 83(b) deadline reminder email to stakeholder | stakeholderId, grantId |
| `get_83b_status` | Check 83(b) filing status for all grants | companyId |
| `export_cap_table` | Export cap table as CSV or JSON | companyId, format |

### Feature 3: 83(b) Deadline Tracking & Email Reminders (Backend)

**Cron job** or scheduled task:
- Runs daily at 9 AM UTC
- Queries all equity grants with `grantDate` within last 30 days
- Calculates 83(b) deadline (grantDate + 30 days)
- Sends email reminders at: 25 days, 14 days, 7 days, 3 days, 1 day before deadline
- Uses existing Resend email service

**Email template**: `send83bDeadlineReminder(stakeholderEmail, stakeholderName, grantDetails, daysRemaining, deadline)`

### Feature 4: 83(b) Status Dashboard Enhancement (Frontend)

- Persist 83(b) filing status to backend (not just localStorage)
- Show filing status per grant on the tax page
- Admin view: all pending 83(b) elections across all stakeholders
- Color-coded urgency: green (>14 days), yellow (7-14 days), red (<7 days), black (expired)

---

## Technical Architecture

```
User / MCP Tool
      │
      ▼
Backend API  ──────────────────────────────────
  │                                             │
  ├── POST /documents/generate                  │
  │     └── documentGeneratorService.js         │
  │           ├── generateRSPA()                │
  │           ├── generateStockCertificate()    │
  │           └── generate83bElection()         │
  │                                             │
  ├── Equity Grant Lifecycle Hook               │
  │     └── On grant creation → fire trigger    │
  │           ├── Generate documents            │
  │           ├── Upload to data room           │
  │           └── Schedule 83(b) reminders      │
  │                                             │
  └── Cron: 83(b) Reminder Scheduler            │
        └── emailService.send83bReminder()      │
                                                │
MCP Server (packages/opencap-mcp/)              │
  ├── tools/documents.ts (add generate, upload) │
  ├── tools/compliance.ts (add 83b tools)       │
  └── tools/export.ts (add cap table export)    │
```

---

## Implementation Plan

| Phase | Issues | Deliverable |
|-------|--------|-------------|
| Phase 1 | #665-#667 | Document generation engine + 3 templates |
| Phase 2 | #668-#670 | MCP tools (generate, upload, delete, export) |
| Phase 3 | #671-#672 | 83(b) tracking + email reminders |
| Phase 4 | #673 | Frontend 83(b) dashboard enhancement |

---

## Success Metrics

- Documents generated within 2 seconds of API call
- 100% of equity grants have auto-generated documents
- 0 missed 83(b) deadlines for stakeholders with email on file
- MCP tools handle full equity issuance workflow end-to-end

---

## Dependencies

- fpdf2 Python library (or Node.js PDF generation — PDFKit/jsPDF)
- Resend email service (already configured)
- ZeroDB document storage (already configured)
- MCP server build pipeline (already configured)

---

## Open Questions

1. Should we support e-signature (DocuSign/HelloSign) in a future phase?
2. Should document templates be customizable per company (white-label)?
3. Should we auto-file 83(b) with IRS via certified mail service integration?
