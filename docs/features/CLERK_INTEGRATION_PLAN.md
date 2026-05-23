# Clerk Integration Plan

**Issue**: #613  
**Status**: Phase 1 in progress  
**Last updated**: 2026-05-22

---

## Why

Customers (especially early-stage startups) manage their team identity in Clerk. Today there is no way to bring that data into OCS — users must re-enter everything manually. This creates friction and data quality issues.

The broader vision:
1. Sync identity from Clerk → OCS stakeholders
2. User uploads formation docs to an OCS data room
3. AI agent analyzes docs, identifies gaps vs. a complete cap table
4. Structured extraction creates draft stakeholders/share classes/grants for user review
5. User approves → committed to ZeroDB

---

## Phases

### Phase 1 — Identity Sync (this PR) ✅

**Backend**
- `POST /api/v1/webhooks/clerk` — Svix-signed webhook receiver
  - Handles `user.created`, `user.updated`, `user.deleted`
  - Soft-deletes to preserve audit trail
  - Raw body before JSON parser (same pattern as Stripe)
- `GET /api/v1/integrations/clerk/status` — configured + synced state for current user
- `POST /api/v1/integrations/clerk/sync` — manual pull via Clerk Admin API

**Frontend**
- Settings → Integrations tab
- Clerk card: connected/not-connected badge + manual sync form
- Deep-link fix: `?tab=api-keys` / `?tab=integrations` now works

**Env vars required**
| Variable | Where | Value |
|---|---|---|
| `CLERK_SECRET_KEY` | Backend Railway + local `.env` | `sk_test_Zy...` |
| `CLERK_WEBHOOK_SECRET` | Backend Railway + local `.env` | `whsec_TFZK...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Frontend Railway | `pk_test_YXNz...` |

**Clerk Dashboard setup**
- Add webhook endpoint: `https://api.opencapstack.com/api/v1/webhooks/clerk`
- Subscribe to events: `user.created`, `user.updated`, `user.deleted`
- Copy signing secret → `CLERK_WEBHOOK_SECRET`

---

### Phase 2 — Formation Doc Ingestion (next)

**What**
- User connects to their Clerk account (OAuth or API key)
- OCS fetches their Clerk org metadata (company name, team members)
- User uploads formation docs to an OCS Data Room
- Trigger: "Analyze this data room for cap table data"

**Backend tasks**
- `POST /api/v1/data-rooms/:id/analyze` — runs AI gap analysis agent
- `POST /api/v1/data-rooms/:id/extract` — structured extraction from PDFs/docs
- Gap analysis agent: uses LangChain + existing PDF/OCR tools (mammoth, tesseract, pdf.js-extract already in package.json)

**Frontend tasks**
- Data Rooms page: "Analyze for cap table data" button
- Gap analysis results panel: lists what's missing (no founders? no share class? no vesting?)
- Extraction preview: shows draft records before committing

---

### Phase 3 — Cap Table Auto-build (future)

**What**
- From extracted data, agent creates draft: stakeholders, share classes, equity grants
- User reviews each record in a "pending imports" queue
- Approve → committed to ZeroDB; reject → discarded

**Dependencies**
- Phase 2 complete
- Data room document extraction working
- Review/approval UI

---

## Data model changes

Fields added to `users` ZeroDB table:

| Field | Type | Description |
|---|---|---|
| `clerkId` | string | Clerk `user_xxx` ID |
| `clerkSynced` | boolean | Whether record came from Clerk |
| `clerkMetadata` | JSON string | Clerk public_metadata |
| `clerkDeleted` | boolean | Soft-delete flag |
| `clerkDeletedAt` | ISO timestamp | When Clerk deletion was received |

---

## Open questions / decisions needed

1. **Org-level sync**: Clerk Organizations feature not enabled in this instance. Enable at dashboard.clerk.com to sync team/org data. Worth doing for multi-user company accounts.
2. **Automatic vs. manual**: Phase 1 is manual (user enters their Clerk ID). Phase 2 should be OAuth so user just clicks "Connect" and we pull their data automatically.
3. **Formation doc sources**: Clerk has no document storage. Docs come from: user upload to OCS data room, Google Drive (already connected via MCP), or email attachments. Scope for Phase 2.
4. **Gap analysis output format**: What does "your cap table is 60% complete" look like? Need product design before building Phase 3.

---

## Issues created

| Issue | Title | Phase |
|---|---|---|
| #613 | Clerk integration — identity sync, data room ingestion, cap table extraction | All |

**Sub-issues needed** (to be created):
- Phase 2: Formation doc ingestion + gap analysis endpoint
- Phase 3: Cap table auto-build from extracted data
- Clerk OAuth flow (replace manual ID entry)
