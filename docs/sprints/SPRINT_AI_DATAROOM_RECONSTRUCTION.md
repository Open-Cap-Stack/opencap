# Sprint: AI Data Room Reconstruction

**Sprint Goal:** Build an AI-powered data room reconstruction system that lets founders initialize a due diligence data room by connecting source systems (Google Drive, Gmail, Carta, Stripe) and/or uploading unstructured files (ZIP, PDF, XLSX, CSV, DOCX). A 10-agent parallel pipeline extracts, classifies, normalizes, and organizes all data into a structured 63-document investor-ready data room with readiness scoring, gap analysis, and auto-generated missing documents.

**Inspired by:** `google-io-hackathon-data-room` (Python/FastAPI) — porting and enhancing the multi-agent pipeline into OpenCap Stack's Node.js/Express architecture.

---

## Sprint Issues

| Issue | Title | Type | Priority |
|-------|-------|------|----------|
| #100 | ReconstructionJob model | Backend | P0 |
| #101 | AINative agent service | Backend | P0 |
| #102 | ZIP extraction service | Backend | P0 |
| #103 | Intake normalizer service | Backend | P0 |
| #104 | Source connector stubs | Backend | P0 |
| #105 | Data room reconstructor service (10-agent pipeline) | Backend | P0 |
| #106 | Upload middleware | Backend | P0 |
| #107 | Reconstruct controller + routes | Backend | P0 |
| #108 | Register routes in app.js | Backend | P0 |
| #109 | Frontend: reconstruct wizard page | Frontend | P0 |
| #110 | Frontend: AI Reconstruct button on data-rooms page | Frontend | P1 |
| #111 | Extract zipUtils into shared lib | Frontend | P1 |
| #112 | Integration tests for reconstruction pipeline | Testing | P0 |
| #113 | Deploy and live verification | DevOps | P0 |

---

## Architecture

```
INTAKE (parallel)
├── OAuth Connectors (Drive, Gmail, Carta, Stripe) — stubbed in MVP
└── File Uploads (PDF, XLSX, CSV, DOCX, ZIP)
        └── ZIP extracted → each file processed individually
                │
                ▼
        intakeNormalizerService
        → uniform AgentInputDocument[] for all sources
                │
                ▼
4-PHASE AGENT PIPELINE (Promise.all within each phase)
├── Phase 1: Scout Gmail + Scout Drive + Scout Carta + Scout Stripe (parallel)
├── Phase 2: Classifier + Extractor (parallel)
├── Phase 3: Gap Analyzer + Synthesizer (parallel)
└── Phase 4: Gap Fixer + Cap Table Export (parallel)
                │
                ▼
        ReconstructionJob (ZeroDB) — polled by frontend every 3s
                │
                ▼
        Finalize → writes Documents, Stakeholders, ShareClasses,
                   Valuations into existing OpenCap models
```

---

## Data Schemas

### AgentInputDocument
```json
{
  "id": "uuid",
  "source": "gmail|drive|carta|stripe|upload_pdf|upload_xlsx|upload_csv|upload_zip_entry|upload_docx",
  "originalName": "string",
  "mimeType": "string",
  "textContent": "string (500-4000 chars extracted text)",
  "metadata": {
    "fileSize": "number",
    "pageCount": "number",
    "sheetNames": ["string"],
    "subject": "string",
    "sender": "string",
    "date": "string",
    "driveUrl": "string"
  }
}
```

### ReconstructionJob
```json
{
  "jobId": "rj_<uuid>",
  "companyId": "string",
  "userId": "string",
  "status": "queued|intake|running|complete|failed",
  "phase": 0,
  "intakeConfig": {
    "companyName": "string",
    "founderEmail": "string",
    "targetDataRoomId": "string|null",
    "sources": {
      "gmail": { "enabled": false, "oauthCode": null },
      "drive": { "enabled": false, "oauthCode": null },
      "carta": { "enabled": false, "oauthCode": null },
      "stripe": { "enabled": false, "oauthCode": null }
    }
  },
  "uploadedFiles": [],
  "progress": {
    "scoutComplete": false,
    "classifyComplete": false,
    "gapAnalysisComplete": false,
    "finalizeComplete": false,
    "agentsRun": []
  },
  "result": null,
  "error": null,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### ReconstructionResult
```json
{
  "founderEmail": "string",
  "companyName": "string",
  "timestamp": "ISO8601",
  "agentsExecuted": [{ "name": "string", "status": "complete|error", "documentCount": 0 }],
  "dataRoom": {
    "documents": [],
    "classification": {},
    "financialMetrics": {},
    "synthesis": {},
    "gapFixes": {},
    "capTableExport": {}
  },
  "gapAnalysis": {
    "criticalGaps": [],
    "redFlags": [],
    "dueDiligenceRisk": "high|medium|low"
  },
  "summary": {
    "documentsFound": 0,
    "sourcesCovered": 0,
    "investorReadinessScore": 0,
    "finalReadinessScore": 0,
    "redFlagsCount": 0,
    "criticalGaps": 0,
    "gapsClosed": 0,
    "capTableExportReady": false
  }
}
```

---

## API Endpoints

```
POST   /api/v1/reconstruct/start              — create job, return jobId
POST   /api/v1/reconstruct/:jobId/upload      — attach files (multipart, before pipeline starts)
GET    /api/v1/reconstruct/status/:jobId      — poll job status + result
POST   /api/v1/reconstruct/:jobId/finalize    — push result into DataRoom/Stakeholders/etc
GET    /api/v1/reconstruct/jobs               — list all jobs for company
DELETE /api/v1/reconstruct/:jobId             — cancel/delete job
```

---

## New Files

### Backend
- `models/ReconstructionJob.js`
- `services/ainativeAgentService.js`
- `services/zipExtractionService.js`
- `services/intakeNormalizerService.js`
- `services/sourceConnectors/gmailConnector.js`
- `services/sourceConnectors/driveConnector.js`
- `services/sourceConnectors/cartaConnector.js`
- `services/sourceConnectors/stripeConnector.js`
- `services/dataRoomReconstructorService.js`
- `middleware/dataRoomUpload.js`
- `controllers/dataRoomReconstructController.js`
- `routes/v1/dataRoomReconstructRoutes.js`

### Frontend
- `app/(dashboard)/data-rooms/reconstruct/page.jsx`
- `lib/zipUtils.js` (extracted from documents/page.jsx)

### Modified
- `app.js` — register route
- `app/(dashboard)/data-rooms/page.jsx` — add AI Reconstruct button
- `app/(dashboard)/documents/page.jsx` — import from lib/zipUtils.js

---

## 63-Document Investor Checklist

| Category | Documents |
|----------|-----------|
| Legal (10) | Certificate of Incorporation, Bylaws, Board Consents (Org + Equity), IP Assignment Agreements, Founder Restricted Stock Agreements, Corporate Minute Book, Subsidiary/Foreign Qualification Docs, Amendment History |
| Equity (13) | Cap Table (current, fully-diluted), 409A Valuation, Stock Option Plan, Option Grant Agreements (sample), Form D (if filed), Investor Rights Agreement, ROFR/Co-Sale Agreement, Voting Agreement, Anti-Dilution Provisions, Warrant Agreements, Convertible Notes, SAFE Agreements, Pro-Rata Rights |
| HR (5) | Offer Letters (key employees), CIAA/PIIA Agreements, Contractor Agreements, Org Chart, Employee Handbook |
| Tax (6) | 83(b) Elections, Federal Tax Returns (2yr), State Tax Returns, EIN/Tax ID, QSBS Attestation, R&D Tax Credit Studies |
| Agreements (10) | Master Service Agreement, NDAs (key), Customer Contracts (top 3), D&O Insurance Policy, E&O Insurance Policy, Vendor Contracts (material), Office Lease, Trademark Registrations, Patent Filings, Domain/IP Ownership |
| Fundraising (6) | Pitch Deck, Executive Summary, Financial Model, Term Sheet (if any), Prior Round Documents, Fundraising History |
| Financial (7) | P&L Statement (2yr), Balance Sheet, Cash Flow Statement, KPI Dashboard, Revenue Breakdown, Accounts Receivable Aging, Debt Schedule |
| Technical (4) | System Architecture Doc, Product Roadmap, Security/Compliance Certifications, Data Privacy Policy |

---

## Dependencies

- `adm-zip` — ZIP extraction
- `xlsx` — Excel/spreadsheet text extraction
- `multer` — already in package.json (verify)
- AINative API (`AINATIVE_API_TOKEN` env var) — already configured
- Anthropic SDK — already in package.json

---

**Last Updated:** 2026-05-24
**Status:** Sprint Active
