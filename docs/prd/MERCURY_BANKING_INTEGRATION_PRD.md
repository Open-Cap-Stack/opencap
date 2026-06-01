# PRD: Mercury Banking Integration

**Author:** Toby Morning
**Status:** Draft
**Created:** 2026-06-01
**Target:** Q3 2026
**Priority:** P1 — Revenue-enabling feature

---

## 1. Executive Summary

Integrate Mercury's banking API into OpenCap Stack to provide real-time financial data alongside cap table management. This transforms OpenCap from a static equity tracker into a live financial operating system for startups — the single source of truth for both ownership and cash.

**Key outcomes:**
- Real-time cash balance and runway on the dashboard (replaces "$0.00M" placeholder)
- Automated SAFE funding verification (proves wire receipt without manual confirmation)
- Bank statements auto-imported to data rooms (eliminates manual upload during due diligence)
- Investor updates auto-populated with real financial metrics

---

## 2. Problem Statement

### Current Pain Points

1. **Dashboard is financially blind** — The dashboard shows "Amount Raised: $0.00M", "Cash on Hand: —", and "No recent activities" because there's no connection to actual banking data. Users must check Mercury separately and mentally reconcile.

2. **SAFE funding is manually verified** — When an investor wires $250K for a SAFE, the founder must manually check Mercury, confirm the wire, then come back to OpenCap to click "Mark as Funded." This is error-prone and creates a gap between financial reality and cap table state.

3. **Due diligence is manual** — Every fundraise requires uploading 12-24 months of bank statements to data rooms. Founders download PDFs from Mercury, rename them, upload to OpenCap. This takes hours per round.

4. **Investor updates require manual data entry** — The investor update template has placeholders for Cash on Hand, Burn Rate, and Runway. Founders look up these numbers in Mercury and type them manually, risking errors.

5. **No activity feed** — The "Recent Activities" section is empty because there's no transaction data flowing in.

### Why Mercury

- **80%+ of YC companies bank with Mercury** — this is the startup default
- Mercury has a mature, documented API with OAuth support
- Mercury's CLI (`mercury-cli`) is open-source and actively maintained
- Mercury already issues SAFEs — direct data model alignment
- No other cap table tool has this integration — competitive moat

---

## 3. User Stories

### Founder (Primary)

| ID | Story | Priority |
|----|-------|----------|
| F1 | As a founder, I want to see my Mercury account balance on the OpenCap dashboard so I know my cash position without switching apps | P0 |
| F2 | As a founder, I want my runway calculated automatically from my burn rate so I can share accurate numbers with my board | P0 |
| F3 | As a founder, I want SAFE funding verified automatically when the wire hits my Mercury account so the cap table stays current | P1 |
| F4 | As a founder, I want bank statements auto-imported to my data room so I don't waste hours on due diligence prep | P1 |
| F5 | As a founder, I want my investor update template auto-populated with real financials so I send accurate reports | P2 |
| F6 | As a founder, I want to see recent transactions on my dashboard so I have a live activity feed | P2 |

### Investor (Secondary)

| ID | Story | Priority |
|----|-------|----------|
| I1 | As an investor, I want to see that my SAFE funding has been verified by the bank (not just marked manually) so I trust the data | P1 |
| I2 | As an investor reviewing a data room, I want bank statements to be current and complete so due diligence moves faster | P1 |

### Accountant (Secondary)

| ID | Story | Priority |
|----|-------|----------|
| A1 | As an accountant, I want transaction data available alongside equity data so I can prepare 409A valuations with complete financial context | P2 |
| A2 | As an accountant, I want to reconcile SAFE payments against bank records within one platform | P2 |

---

## 4. Solution Design

### 4.1 Architecture Overview

```
+------------------+     OAuth 2.0      +------------------+
|   OpenCap Stack  | <================> |   Mercury API    |
|                  |                    |                  |
|  mercuryService  | -- GET accounts -> |  /accounts       |
|  .js             | -- GET txns    -> |  /transactions   |
|                  | -- GET stmts   -> |  /statements     |
|  integrations    | <-- webhooks  --- |  /webhooks       |
|  table (ZeroDB)  |                    |                  |
+------------------+                    +------------------+
        |
        v
+------------------+
|   Frontend       |
|  Dashboard       |
|  SAFE Notes      |
|  Data Rooms      |
|  Investor Updates|
+------------------+
```

### 4.2 Authentication Flow

Mercury supports OAuth 2.0 and API key authentication. We'll support both:

**OAuth Flow (recommended for users):**
1. User clicks "Connect Mercury" in Settings > Integrations
2. Redirect to Mercury OAuth consent screen
3. Mercury redirects back with auth code
4. Backend exchanges code for access + refresh tokens
5. Tokens stored in `integrations` ZeroDB table (same pattern as Google OAuth)

**API Key Flow (for power users / CI):**
1. User generates API key at `app.mercury.com/settings/tokens`
2. Enters key in Settings > Integrations > Mercury > API Key
3. Key stored encrypted in `integrations` table

### 4.3 Data Model

**integrations table (existing)**
```json
{
  "userId": "toby-enterprise-001",
  "provider": "mercury",
  "accessToken": "encrypted_token",
  "refreshToken": "encrypted_refresh",
  "tokenExpiry": "2026-07-01T00:00:00Z",
  "mercuryAccountIds": ["acc_xxx", "acc_yyy"],
  "connectedAt": "2026-06-15T00:00:00Z",
  "lastSyncAt": "2026-06-15T12:00:00Z"
}
```

**mercury_snapshots table (new)**
```json
{
  "companyId": "ainative-studio",
  "accountId": "acc_xxx",
  "accountName": "AINative Lab, Inc. — Checking",
  "balance": 847523.41,
  "currency": "USD",
  "snapshotAt": "2026-06-15T12:00:00Z",
  "burnRate30d": 42000,
  "runwayMonths": 20.2
}
```

### 4.4 Backend Services

**`services/mercuryService.js`** — Core Mercury API wrapper

| Method | Mercury API | Purpose |
|--------|------------|---------|
| `getAccounts(userId)` | `GET /accounts` | List all Mercury accounts |
| `getBalance(userId, accountId)` | `GET /accounts/{id}` | Current balance |
| `getTransactions(userId, params)` | `GET /transactions` | Transaction list with filters |
| `getStatements(userId, accountId)` | `GET /statements` | Download bank statements |
| `verifyPayment(userId, amount, since)` | `GET /transactions` + filter | Find matching wire for SAFE funding |
| `createWebhook(userId, url)` | `POST /webhooks` | Register for real-time events |

### 4.5 API Endpoints (New)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/connect/mercury/auth` | Initiate Mercury OAuth |
| `GET` | `/api/v1/connect/mercury/callback` | OAuth callback + token exchange |
| `GET` | `/api/v1/integrations/mercury/status` | Connection status |
| `GET` | `/api/v1/integrations/mercury/accounts` | List connected accounts |
| `GET` | `/api/v1/integrations/mercury/balance` | Current balance + runway |
| `GET` | `/api/v1/integrations/mercury/transactions` | Recent transactions |
| `POST` | `/api/v1/integrations/mercury/verify-funding` | Verify SAFE wire receipt |
| `POST` | `/api/v1/integrations/mercury/import-statements` | Import statements to data room |
| `DELETE` | `/api/v1/connect/mercury/disconnect` | Revoke Mercury connection |

---

## 5. Feature Specifications

### 5.1 Phase 1: Mercury Connect + Dashboard Balance

**Scope:** OAuth connect, balance display, runway calculation

**Dashboard Changes:**
- "Cash on Hand" card shows real Mercury balance
- New "Runway" card shows months of runway based on 30-day burn rate
- "Amount Raised" calculated from incoming wires tagged as funding
- Mercury account badge (connected/disconnected indicator)

**Settings > Integrations:**
- "Connect Mercury" button (same UX as Google Drive connect)
- Show connected account name and last sync time
- "Disconnect" option

**Calculation Logic:**
```
burn_rate_30d = sum(outgoing transactions last 30 days) / 30 * 30
runway_months = current_balance / burn_rate_30d
```

**Sync frequency:** Every 15 minutes via cron, or on-demand when user views dashboard.

### 5.2 Phase 2: SAFE Funding Verification

**Scope:** Automated wire verification for SAFE agreements

**User Flow:**
1. SAFE is in "Sent" or "Signed" status
2. Investor wires money to Mercury account
3. User clicks "Verify Funding" on the SAFE
4. Backend searches Mercury transactions for a wire matching:
   - Amount = SAFE investment amount (+/- $1 tolerance for wire fees)
   - Date = within last 30 days
   - Type = incoming wire/ACH
5. If match found:
   - SAFE status auto-updates to "Funded"
   - Transaction ID linked to SAFE record for audit trail
   - Funding date set from transaction date
6. If no match:
   - Show "No matching wire found" with suggestions (check amount, check date range)

**New SAFE fields:**
```json
{
  "fundingVerification": {
    "method": "mercury_auto",
    "mercuryTransactionId": "txn_xxx",
    "verifiedAt": "2026-06-15T12:00:00Z",
    "verifiedAmount": 250000,
    "wireDate": "2026-06-14"
  }
}
```

### 5.3 Phase 3: Data Room Auto-Import

**Scope:** Bank statement import for due diligence

**User Flow:**
1. In Data Rooms, user clicks "Import Bank Statements"
2. Select date range (default: last 12 months)
3. Select Mercury account (if multiple)
4. Backend downloads statements as PDFs from Mercury
5. PDFs stored in documents table with:
   - Category: "financial"
   - Type: "bank_statement"
   - Source: "mercury"
   - Proper naming: "Mercury_Statement_2026-05_AINative_Lab.pdf"
6. Statements appear in the data room document list

**Auto-sync option:**
- Toggle "Auto-import new statements monthly"
- Cron job downloads new statement on the 5th of each month

### 5.4 Phase 4: Investor Update Auto-Population

**Scope:** Pre-fill investor update templates with real metrics

**Template fields auto-populated:**
| Template Field | Mercury Source |
|---------------|---------------|
| Cash on hand | `GET /accounts/{id}` → balance |
| Burn rate | Calculated from 30-day outgoing transactions |
| Runway | balance / burn_rate |
| MRR | Incoming recurring transactions (tagged) |
| Revenue | Sum of incoming customer payments |

**User Flow:**
1. User creates investor update from template
2. If Mercury is connected, financial fields are pre-filled
3. User can edit/override any auto-filled value
4. "Last synced" timestamp shown next to each auto-filled field

### 5.5 Phase 5: Transaction Activity Feed

**Scope:** Real-time activity feed on dashboard

**Dashboard "Recent Activities" section:**
- Show last 10 transactions from Mercury
- Transaction types: wire received, payment sent, transfer, payroll
- Each entry shows: date, counterparty, amount, type
- Clickable to see full transaction details
- "View all transactions" link to a dedicated transactions page

**Webhook Integration:**
- Register Mercury webhook for `transaction.created` events
- Real-time updates pushed to dashboard via existing Socket.IO infrastructure
- Webhook handler at `POST /api/v1/webhooks/mercury`

---

## 6. Security & Compliance

### Token Storage
- Mercury access tokens encrypted at rest using AES-256
- Refresh tokens stored separately with additional encryption layer
- Token rotation on every refresh
- Tokens scoped to read-only where possible

### Data Handling
- Bank data is NOT stored permanently — only snapshots for dashboard display
- Transaction data cached for 15 minutes, not persisted
- Statements stored as encrypted documents in the data room (same as existing docs)
- User can delete all Mercury data via "Disconnect" which purges tokens and snapshots

### Permissions
- Only `admin` and `founder` roles can connect Mercury
- `accountant` role can view balance and statements (read-only)
- `employee` role cannot access Mercury data
- All Mercury API calls logged in audit trail

### Compliance
- Mercury is SOC 2 Type II certified
- OpenCap stores no banking credentials — only OAuth tokens
- Compliant with fintech data handling best practices
- User consent required before any data access (OAuth flow)

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mercury connection rate | 40% of active companies | % of companies with Mercury connected |
| Dashboard engagement | +50% daily active usage | Time on dashboard before/after |
| SAFE funding verification | 90% auto-verified | % of funded SAFEs verified via Mercury vs manual |
| Data room prep time | -80% reduction | Time to prepare financial docs for due diligence |
| Investor update accuracy | 100% auto-populated | % of financial fields auto-filled |

---

## 8. Rollout Plan

| Phase | Scope | Timeline | Effort |
|-------|-------|----------|--------|
| **Phase 1** | OAuth Connect + Dashboard Balance | 2 weeks | 3-5 story points |
| **Phase 2** | SAFE Funding Verification | 1 week | 2-3 story points |
| **Phase 3** | Data Room Statement Import | 1 week | 2-3 story points |
| **Phase 4** | Investor Update Auto-Population | 1 week | 2 story points |
| **Phase 5** | Transaction Activity Feed + Webhooks | 2 weeks | 3-5 story points |

**Total estimated effort:** 7 weeks, 12-18 story points

### Dependencies
- Mercury API access (OAuth client registration)
- Mercury developer account approval
- ZeroDB table creation for mercury_snapshots
- Socket.IO setup for real-time webhook relay (Phase 5)

### Risks
| Risk | Mitigation |
|------|-----------|
| Mercury rate limits | Cache aggressively, sync every 15 min not on every page load |
| OAuth token expiry | Auto-refresh with stored refresh token, graceful fallback |
| Mercury API changes | Pin to API version, monitor changelog |
| Multi-account complexity | Start with primary checking account, expand later |
| User has non-Mercury bank | Show "Connect Mercury" only, add other banks in future |

---

## 9. Future Considerations

- **Multi-bank support** — Add Brex, SVB, Chase integrations using Plaid
- **Automatic 409A data** — Use Mercury revenue data for valuation inputs
- **Payroll integration** — Sync Mercury payroll with equity vesting milestones
- **Treasury management** — Show Mercury treasury yields alongside cap table
- **Invoice reconciliation** — Match Mercury invoices with revenue in investor reports
- **AI-powered insights** — "Your burn rate increased 20% this month — here's why"

---

## Appendix A: Mercury API Reference

**Base URL:** `https://api.mercury.com/api/v1`
**Auth:** OAuth 2.0 or `Authorization: Bearer secret-token:mercury_<TOKEN>`
**Docs:** `https://docs.mercury.com`

Key endpoints:
- `GET /accounts` — List accounts
- `GET /accounts/{id}` — Account details + balance
- `GET /accounts/{id}/transactions` — Transaction list
- `GET /accounts/{id}/statements` — Statement list
- `POST /payments` — Create payment
- `POST /webhooks` — Register webhook
- `GET /recipients` — List recipients

---

## Appendix B: Backlog Issues

See GitHub issues created from this PRD below.
