# OpenCap Stack - Complete Backend Capabilities Analysis

## Platform Overview

OpenCap is a **cap table management and financial operations platform** built for startups, venture-backed companies, and SPV (Special Purpose Vehicle) management. The backend is a Node.js/Express API backed by MongoDB (primary), Neo4j (graph relationships), PostgreSQL (relational), Redis (caching/sessions), and MinIO (file storage).

**Base URL:** `http://localhost:5000`
**API Prefix:** `/api/v1`
**Documentation:** Swagger UI at `/api-docs`

---

## 1. Authentication & Identity

### Endpoints (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Register user (email, password, firstName, lastName, role) |
| POST | `/login` | None | Login, returns JWT access + refresh tokens |
| POST | `/oauth-login` | None | Google OAuth login |
| POST | `/token/refresh` | None | Refresh expired access token |
| POST | `/logout` | JWT | Logout, blacklists token |
| POST | `/password/reset-request` | None | Send password reset email |
| POST | `/password/verify-token` | None | Verify reset token validity |
| POST | `/password/reset` | None | Complete password reset |
| GET | `/profile` | JWT | Get current user profile |
| PUT | `/profile` | JWT | Update current user profile |
| POST | `/verify/send` | JWT | Send email verification |
| GET | `/verify/:token` | None | Verify email address |

### Security Details
- **JWT tokens** with configurable expiration
- **Refresh token** flow for session continuity
- **Password requirements:** 8+ chars, uppercase, lowercase, number, special character
- **Token blacklisting** via Redis (falls back to in-memory)
- **bcrypt** hashing (10 rounds)
- **Google OAuth2** integration
- **Email verification** workflow via Nodemailer

### RBAC System
Four roles with hierarchical permissions:
- **admin** - Full access (`admin:all`, `read:*`, `write:*`, `delete:*`)
- **manager** - Read/write access (`read:companies`, `write:companies`, `read:reports`, `write:reports`)
- **user** - Read access + own profile (`read:companies`, `read:reports`, `read:own_profile`, `write:own_profile`)
- **client** - Limited read access (`read:own_data`, `read:own_profile`)

---

## 2. Company Management

### Endpoints (`/api/v1/companies`)
| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| POST | `/` | JWT | `write:companies` | Create company |
| GET | `/` | JWT | `read:companies` | List all companies |
| GET | `/:id` | JWT | `read:companies` | Get company by ID |
| PUT | `/:id` | JWT | `write:companies` | Update company |
| DELETE | `/:id` | JWT | `delete:companies` or `admin:all` | Delete company |

### Company Model Fields
- `companyId` (String, required, unique)
- `CompanyName` (String, required)
- `CompanyType` (String, required)
- `RegisteredAddress` (String, required)
- `TaxID` (String, required)
- `corporationDate` (Date, required)
- `incorporationCountry`, `incorporationState` (String)
- `industry`, `website`, `description` (String)
- `status` (Enum: Active, Inactive, Dissolved, Suspended)
- `founders` (Array of ObjectId refs to User)
- `totalAuthorizedShares`, `parValue` (Number)
- `fiscalYearEnd` (String)

---

## 3. Cap Table / Equity Management

### Share Classes (`/api/v1/share-classes`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/shareClasses` | None | List all share classes |
| POST | `/api/shareClasses` | None | Create share class |

**ShareClass Model:** `classId`, `ClassName`, `ClassType`, `PricePerShare`, `TotalShares`, `VotingRights`, `DividendRights`, `ConversionRights`, `AntiDilutionProtection`, `LiquidationPreference`, `RedemptionRights`, `CompanyID`

### Equity Plans (`/api/v1/equity-plans`)
Full CRUD. Fields: `planId`, `PlanName`, `PlanType`, `TotalSharesReserved`, `VestingSchedule`, `CompanyId`

### Stakeholders (`/api/v1/stakeholders`)
Full CRUD. Fields: `stakeholderId`, `name`, `role`, `email`, `ContactNumber`, `Address`, `Type` (Individual/Entity/Trust/Other), `documents[]`, `projectId`

### Investors (`/api/v1/investors`)
Full CRUD. Fields: `investorId`, `name`, `email`, `phone`, `investmentAmount`, `equityPercentage`, `investorType`, `relatedFundraisingRound`

---

## 4. Fundraising

### Endpoints (`/api/v1/fundraising-rounds`)
Full CRUD (POST, GET all, GET by ID, PUT, DELETE)

**FundraisingRound Model:** `roundId`, `RoundName`, `RoundType`, `TargetAmount`, `AmountRaised`, `StartDate`, `EndDate`, `Status`, `LeadInvestor`, `Valuation`, `Terms`, `CompanyId`, `Investors[]`

---

## 5. SPV (Special Purpose Vehicle) Management

### SPV Endpoints (`/api/v1/spvs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | None | Create SPV |
| GET | `/` | None | List all SPVs |
| GET | `/status/:status` | None | Filter by status (Active/Pending/Closed) |
| GET | `/compliance/:status` | None | Filter by compliance (Compliant/NonCompliant/PendingReview) |
| GET | `/parent/:id` | None | Get SPVs by parent company |
| GET | `/:id` | None | Get SPV by ID |
| PUT | `/:id` | None | Update SPV |
| DELETE | `/:id` | None | Delete SPV |

**SPV Model:** `SPVID`, `Name`, `Purpose`, `CreationDate`, `Status`, `ParentCompanyID`, `ComplianceStatus`, `NAV`, `TotalCommitments`, `FundedAmount`, `InvestmentStrategy`, `TargetReturn`, `ManagementFee`, `PerformanceFee`

### SPV Asset Endpoints (`/api/v1/spv-assets`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT + Admin | Create asset |
| GET | `/` | JWT | List all assets |
| GET | `/spv/:spvId` | JWT | Get assets for specific SPV |
| GET | `/valuation/spv/:spvId` | JWT | Calculate total SPV valuation |
| GET | `/valuation/type/:type` | JWT | Valuation breakdown by asset type |
| GET | `/:id` | JWT | Get asset by ID |
| PUT | `/:id` | JWT + Admin | Update asset |
| DELETE | `/:id` | JWT + Admin | Delete asset |

**SPVAsset Model:** `AssetID`, `SPVID`, `AssetType`, `Value`, `Description`, `AcquisitionDate`, `MaturityDate`, `Status` (Active/Sold/Written Off/Pending), `ReturnRate`

**Calculations:**
- Total SPV valuation = SUM(asset.Value)
- Asset type aggregation with breakdown percentages

---

## 6. Financial Management

### Financial Reports (`/api/v1/financial-reports`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create report |
| GET | `/` | JWT | List reports (paginated) |
| GET | `/search` | JWT | Search reports |
| GET | `/analytics` | JWT | Analytics aggregation |
| POST | `/bulk` | JWT | Bulk create reports |
| GET | `/:id` | JWT | Get report by ID |
| PUT | `/:id` | JWT | Update report |
| DELETE | `/:id` | JWT | Delete report |

**FinancialReport Model:** `reportId`, `ReportName`, `ReportType`, `DateGenerated`, `ReportingPeriod` (Annual/Quarterly), `Data` (object: revenue, expenses, netIncome, assets, liabilities, equity, cashFlow), `CompanyID`, `Status`, `GeneratedBy`

**Validations:** Net income must equal revenue - expenses. No negative financial values.

### Financial Metrics (`/api/v1/metrics`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/companies/:companyId/metrics/profitability?period=YYYY-QX` | JWT + Permission | Gross, operating, net margins |
| GET | `/companies/:companyId/metrics/liquidity?period=YYYY-QX` | JWT + Permission | Current, quick, cash ratios |
| GET | `/companies/:companyId/metrics/solvency?period=YYYY-QX` | JWT + Permission | Debt-to-equity, debt-to-asset, interest coverage |
| GET | `/companies/:companyId/metrics/efficiency?period=YYYY-QX` | JWT + Permission | Asset/inventory/receivables turnover |
| GET | `/companies/:companyId/metrics/dashboard` | JWT + Permission | All metrics combined |

**Period format:** `YYYY-QX` (e.g., `2024-Q1`) or `YYYY-full`

### Financial Data Import/Export (`/api/v1/financial-data`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/import` | JWT + admin/financial_manager | Import data (CSV/JSON/XLSX, 50MB max) |
| GET | `/export` | JWT + admin/financial_manager/analyst | Export data (CSV/JSON/XLSX/PDF) |
| GET | `/templates/:importType` | JWT | Download import template |
| GET | `/import-status/:importId` | JWT | Check import job status |
| POST | `/validate` | JWT | Validate data without importing |

**Import types:** transactions, financial_reports, spv_data, chart_of_accounts
**Export types:** transactions, financial_reports, spv_performance, compliance_report

### Tax Calculator (`/api/v1/tax-calculations`)
Full CRUD + auto-calculation. Fields: `calculationId`, `SaleAmount`, `TaxRate` (0-1), `CalculatedTax` (auto: SaleAmount * TaxRate), `EquityType`, `TaxYear`, `Jurisdiction`

### Balance Sheet Model
`companyId`, `fiscalYear`, `quarter`, `totalAssets`, `currentAssets`, `nonCurrentAssets`, `totalLiabilities`, `currentLiabilities`, `nonCurrentLiabilities`, `shareholdersEquity`, `retainedEarnings`

### Cash Flow Statement Model
`companyId`, `fiscalYear`, `quarter`, `operatingCashFlow`, `investingCashFlow`, `financingCashFlow`, `netCashFlow` (auto-calculated), `beginningCash`, `endingCash`

---

## 7. Document Management

### Document Endpoints (`/api/v1/documents`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | List documents (with search, filter, paginate) |
| POST | `/` | None | Create document |

**Document Model (comprehensive):**
- Core: `documentId`, `name`, `title`, `content`, `path`, `metadata`
- File: `fileType`, `fileSize`, `mimeType`, `checksum`
- Access: `accessLevel` (public/private/shared), `sharedWith[]`, `accessLog[]`
- Versioning: `version`, `versionHistory[]`, `previousVersions[]`
- Organization: `category`, `tags[]`, `company` (ref)
- AI: `embeddings[]`, `embeddingModel`, `embeddingDimension`, `lastEmbeddedAt`
- Status: `status` (draft/active/archived/deleted), `retentionDate`, `isArchived`

**Search capabilities:**
- Vector-based semantic search (via ZeroDB)
- Text search fallback
- Filter by category, tags, access level, company
- Pagination and sorting

### Document Access Control (`/api/v1/document-accesses`)
Full CRUD for managing per-document access grants.

### Document AI Processing (`/api/v1/document-embeddings`)
Full CRUD for embeddings, plus:
- Text extraction from PDF, Word, plain text, images
- OCR processing via Tesseract.js
- AI-powered document classification (OpenAI)
- Automated summarization (extractive + AI-generated)
- Batch processing with parallel execution

---

## 8. Compliance & Audit

### Compliance Checks (`/api/v1/compliance-checks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | None | Create compliance check |
| GET | `/` | None | List all checks |
| GET | `/non-compliant` | None | Get non-compliant items |
| GET | `/:id` | None | Get check by ID |
| PUT | `/:id` | None | Update check |
| DELETE | `/:id` | None | Delete check |

**ComplianceCheck Model:** `CheckID`, `SPVID`, `RegulationType` (GDPR/HIPAA/SOX/CCPA/SEC/FinCEN), `Status` (Compliant/NonCompliant/PendingReview), `Details`, `Timestamp`, `LastCheckedBy`

### Security Audit Logs (`/api/v1/security-audits`)
All endpoints require JWT + admin/security_analyst role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Query audit logs (filter by eventType, level, userId, days) |
| GET | `/summary` | Audit summary statistics |
| GET | `/suspicious` | Suspicious activity detection |
| GET | `/user/:userId` | User-specific audit trail |
| GET | `/export` | Export as CSV |
| PATCH | `/:id/review` | Mark log as reviewed |

**SecurityAudit Model:** `eventType`, `level` (info/warning/error/critical), `userId`, `action`, `resource`, `resourceId`, `ipAddress`, `userAgent`, `details`, `riskScore`, `reviewed`, `reviewedBy`, `reviewNotes`

---

## 9. Analytics & AI

### Analytics Controller (internal, exposed via services)
- **Predictive financial modeling** - Linear regression trend analysis with confidence intervals
- **Risk assessment** - Multi-domain scoring (financial, operational, compliance, market)
- **Performance benchmarking** - Industry standard comparisons
- **Automated report generation** - Financial, risk, performance, compliance reports
- **Anomaly detection** - Statistical anomaly identification with severity levels (critical/high/medium/low)

### Graph Database (Neo4j)
Models for relationship analysis:
- Company-User employment relationships
- Ownership structures
- Document access patterns
- Compliance trails
- Financial transaction flows
- SPV-Stakeholder relationships
- Network centrality calculations
- Shortest path analysis
- Compliance violation tracking

---

## 10. Real-Time Features

### WebSocket Service
- JWT-authenticated WebSocket connections
- Room/channel management
- Document collaboration (real-time updates, cursor positions, typing indicators)
- User presence (online/offline status)
- Heartbeat health checks (30s interval)
- Event broadcasting (document events, SPV events, activity updates)

### Streaming Service
Event topics:
- `FINANCIAL_TRANSACTION` - Real-time financial events
- `USER_ACTIVITY` - User action tracking
- `DOCUMENT_ACTIVITY` - Document operations
- `COMPLIANCE_EVENT` - Compliance status changes
- `WORKFLOW_STATE` - Workflow transitions
- `SPV_ACTIVITY` - SPV operations
- `SYSTEM_ALERT` - System notifications
- `NOTIFICATION` - User notifications

Batch processing with buffering (1000 max, 10 per flush, 5s interval).

---

## 11. Communication & Notifications

### Communications (`/api/v1/communications`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Send message |
| POST | `/thread` | Reply in thread |
| GET | `/` | List all communications |
| GET | `/thread/:threadId` | Get thread messages |
| GET | `/user/:userId` | Get user's messages |
| GET | `/:id` | Get message by ID |
| PUT | `/:id` | Update message |
| DELETE | `/:id` | Delete message |

### Notifications (`/api/v1/notifications`)
Create, list all, get by ID, delete. Fields: `notificationId`, `notificationType`, `title`, `message`, `recipient`, `Timestamp`, `RelatedObjects`, `UserInvolved`

### Invite Management (`/api/v1/invites`)
Full CRUD for stakeholder/investor invitations.

---

## 12. Employee Management

### Endpoints (`/api/v1/employees`)
Full CRUD with pagination.

**Employee Model:** `EmployeeID`, `FirstName`, `LastName`, `Email`, `Phone`, `Department`, `Role`, `StartDate`, `EndDate`, `EquityOverview` (object: TotalEquity, VestedEquity, UnvestedEquity, ExercisableOptions, StrikePrice, LastVestingDate), `SSN`, `CompanyID`

---

## 13. Administration

### Admin Endpoints (`/api/v1/admins`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admins` | Create admin |
| GET | `/admins` | List all admins |
| GET | `/admins/:id` | Get admin by ID |
| PUT | `/admins/:id` | Update admin |
| DELETE | `/admins/:id` | Delete admin |
| POST | `/admins/login` | Admin login |
| POST | `/admins/logout` | Admin logout |
| PUT | `/admins/:id/change-password` | Change password |

---

## 14. Infrastructure & Middleware

### Rate Limiting
- **Default:** 100 requests / 15 min per IP
- **Auth routes:** 10 requests / hour (brute-force protection)
- **Tiered plans:** Basic (100), Standard (500), Premium (1000), Enterprise (5000) per 15 min

### Security Headers
CSP directives, HSTS (1 year), X-Frame-Options DENY, XSS protection, no-sniff, referrer-policy

### API Versioning
All routes prefixed with `/api/v1`. Version header validation middleware.

### Databases
| Database | Purpose |
|----------|---------|
| MongoDB | Primary data store (all models) |
| Neo4j | Graph relationships, compliance trails, network analysis |
| PostgreSQL | Relational data |
| Redis | Token blacklisting, session cache |
| MinIO | S3-compatible file/object storage |
| ZeroDB | Vector embeddings, semantic search, event streaming |

### Required Environment Variables
```
# Core
NODE_ENV, PORT, JWT_SECRET, JWT_EXPIRATION

# MongoDB
MONGODB_URI

# Neo4j
NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

# PostgreSQL
DATABASE_URL

# Redis (optional)
REDIS_URL

# Email
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD

# OAuth
GOOGLE_CLIENT_ID

# File Storage
MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET

# AI
OPENAI_API_KEY

# ZeroDB
ZERODB_API_KEY, ZERODB_PROJECT_ID
```

### Docker Deployment
Two Docker Compose configurations:
- `docker-compose.yml` - Full stack (all databases + services)
- `docker-compose.simple.yml` - Minimal (MongoDB only)

Requirements: Node.js >= 18.0.0, npm >= 9.0.0

---

## 15. Activity Logging

### Endpoints (`/api/v1/activities`)
Full CRUD. Fields: `activityId`, `ActivityType`, `Description`, `UserInvolved`, `Timestamp`, `RelatedObjects`, `IPAddress`, `Device`

---

## 16. Investment Tracking

### Endpoints (`/api/v1/investments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Track new investment |

**Fields:** `TrackID`, `Company`, `EquityPercentage`, `CurrentValue`

---

## 17. Integration Modules

### Endpoints (`/api/v1/integration-modules`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/integration-modules` | Register external integration |

**Fields:** `IntegrationID`, `ToolName`, `Description`, `Link`
