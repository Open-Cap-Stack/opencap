# Sprint: Browser Automation Connectors

**Sprint Goal:** Replace mock source connectors with real browser automation using Playwright headless Chromium. Founders provide Carta (and later Stripe, Drive, Gmail) credentials once — a Playwright agent logs in, exports their data, and feeds it directly into the reconstruction pipeline. No OAuth app approval, no API keys, no maintenance burden.

**Inspired by:** TenKeyLabs/tracewright — perception-action retry loop pattern. We use raw Playwright (CJS) directly rather than the Tracewright ESM package to avoid the ESM/CJS bridge problem.

---

## Sprint Issues

| Issue | Title | Type | Priority |
|-------|-------|------|----------|
| #700 | Install Playwright prod dependency + Docker config | DevOps | P0 |
| #701 | credentialVault.js — ephemeral in-memory store with TTL | Backend | P0 |
| #702 | browserAutomationService.js — Playwright wrapper for Carta | Backend | P0 |
| #703 | Update cartaConnector.js — automation mode with mock fallback | Backend | P0 |
| #704 | Extend dataRoomReconstructorService to pass options to scout agents | Backend | P0 |
| #705 | Extend startJob controller — extract credentials, call credentialVault | Backend | P0 |
| #706 | Frontend: Carta credential fields in reconstruct wizard Step 1 | Frontend | P1 |
| #707 | Integration tests — browser automation path with mocked Playwright | Testing | P1 |
| #708 | Railway deployment verification + smoke test | DevOps | P1 |

---

## Architecture

```
[Wizard Step 1]
  Founder enters: email + password  OR  session cookie
        │
        ▼
POST /api/v1/reconstruct/start
  { sources: { carta: { enabled: true, credentials: { email, password } } } }
        │
        ▼
[startJob controller]
  1. Pre-generate jobId = rj_<uuid>
  2. credentialVault.store(jobId, credentials, TTL=5min)
  3. Strip credentials from body
  4. Set sources.carta.automationMode = 'browser'
  5. Save job to ZeroDB — NO credentials in DB
        │
        ▼
POST /api/v1/reconstruct/:jobId/run → 202 Accepted
        │
  setImmediate (async pipeline)
        │
        ▼
[scoutCartaAgent] → cartaConnector.fetchDocuments(token, name, email, { jobId, automationMode })
        │
        ▼
  automationMode === 'browser'?
  YES → browserAutomationService.automateCartaFetch(jobId, companyName)
          1. credentialVault.consume(jobId) → creds (deleted immediately)
          2. Promise.race([doAutomation(creds), timeout(3min)])
          3. chromium.launch({ headless: true, --no-sandbox })
          4. Login (email+pass) OR inject session cookie
          5. fetchCapTable() → AgentInputDocument
          6. fetchOptionGrants() → AgentInputDocument
          7. fetchValuations() → AgentInputDocument
          8. finally: browser.close()
          Returns AgentInputDocument[] or null
  NULL/error → fall back to mock data
        │
        ▼
  Pipeline continues phases 2-4 with real or mock docs
```

---

## Security Model

| Concern | Mitigation |
|---------|-----------|
| Credentials in DB | Stripped before createJob(); vault uses in-process Map only |
| Credentials in logs | Never log credential objects; log jobId only |
| Credentials in Morgan | Verify Morgan doesn't log request bodies on /reconstruct/start |
| Credentials persisting in memory | consume() deletes immediately; 5-min TTL as backstop |
| Credentials in browser client state | Frontend clears state immediately after POST response |
| HTTPS enforcement | Railway HTTPS_ONLY + Helmet HSTS |
| Zombie Chromium processes | finally: browser.close() + Promise.race timeout cleanup |
| Memory exhaustion | One browser per job; ~200MB peak; verify Railway RAM tier |

---

## New Files

### Backend
- `services/credentialVault.js`
- `services/browserAutomationService.js`

### Modified
- `services/sourceConnectors/cartaConnector.js`
- `services/dataRoomReconstructorService.js`
- `controllers/dataRoomReconstructController.js`
- `Dockerfile`
- `package.json`

### Frontend
- `app/(dashboard)/data-rooms/reconstruct/page.jsx` (add credential fields to Step 1)

---

## Future Connectors (same pattern, different automation scripts)

| Connector | Target Pages | Priority |
|-----------|-------------|----------|
| Google Drive | drive.google.com — navigate to folders, download files | P1 |
| Gmail | mail.google.com — search for financial emails, download attachments | P1 |
| Stripe Dashboard | dashboard.stripe.com — export MRR report, revenue breakdown | P2 |

---

## Playwright Container Requirements

```dockerfile
# Add to Dockerfile after npm install:
RUN npx playwright install chromium --with-deps
```

Launch flags required in Railway container:
```js
chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',  // critical: /dev/shm is only 64MB in Railway
  ]
})
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "playwright": "^1.50.0"
  }
}
```

`@playwright/test` stays in devDependencies (test runner). `playwright` (the Node API) moves to prod dependencies.

---

**Last Updated:** 2026-05-24
**Status:** Sprint Planning
