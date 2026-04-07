# OpenCap Stack - Frontend Build Prompt for LLM/Coding Agent

> **Instructions:** Copy everything below the line into your LLM or coding agent as the system/task prompt. It contains the complete backend specification needed to build a fully integrated Next.js frontend.

---

## PROMPT START

You are building a **Next.js (App Router)** frontend for **OpenCap**, a cap table management and financial operations platform. The backend API already exists and is fully operational. Your job is to build a production-ready frontend that consumes every capability of this backend.

### Tech Stack Requirements
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context + TanStack Query (React Query) for server state
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts or Chart.js for financial visualizations
- **Real-time:** Native WebSocket client
- **Auth:** JWT stored in httpOnly cookies (use Next.js middleware for route protection)
- **API Client:** Axios or fetch wrapper with interceptors for token refresh

### Backend Connection
- **API Base URL:** Configurable via `NEXT_PUBLIC_API_URL` env var (default: `http://localhost:5000/api/v1`)
- **WebSocket URL:** Configurable via `NEXT_PUBLIC_WS_URL` env var (default: `ws://localhost:5000`)
- **Auth:** JWT Bearer token in Authorization header. Refresh token flow supported.
- **API Docs:** Swagger UI available at `{API_URL}/api-docs`

---

## COMPLETE API SPECIFICATION

### 1. AUTHENTICATION (`/auth`)

**Public endpoints (no auth required):**
```
POST /auth/register
  Body: { email, password, confirmPassword, firstName, lastName, role? }
  Password rules: 8+ chars, uppercase, lowercase, number, special char
  Returns: { user, token }

POST /auth/login
  Body: { email, password }
  Returns: { user, token, refreshToken }

POST /auth/oauth-login
  Body: { provider: "google", token: "<google-oauth-token>" }
  Returns: { user, token, refreshToken }

POST /auth/token/refresh
  Body: { refreshToken }
  Returns: { token, refreshToken }

POST /auth/password/reset-request
  Body: { email }

POST /auth/password/verify-token
  Body: { token }

POST /auth/password/reset
  Body: { token, newPassword, confirmPassword }

GET  /auth/verify/:token  (email verification callback)
```

**Protected endpoints (JWT required):**
```
POST /auth/logout
GET  /auth/profile
PUT  /auth/profile  Body: { firstName, lastName, email, ... }
POST /auth/verify/send  (resend verification email)
```

**RBAC Roles & Permissions:**
| Role | Permissions |
|------|-------------|
| admin | Full access to everything |
| manager | Read/write companies, reports, SPVs |
| user | Read companies, reports; manage own profile |
| client | Read own data only |

Build the frontend to show/hide UI elements based on the user's role and permissions.

---

### 2. COMPANIES (`/companies`) - All routes require JWT + permissions

```
POST   /companies           Permission: write:companies
GET    /companies           Permission: read:companies
GET    /companies/:id       Permission: read:companies
PUT    /companies/:id       Permission: write:companies
DELETE /companies/:id       Permission: delete:companies or admin:all
```

**Company object:**
```typescript
interface Company {
  _id: string;
  companyId: string;
  CompanyName: string;
  CompanyType: string;
  RegisteredAddress: string;
  TaxID: string;
  corporationDate: string; // ISO date
  incorporationCountry?: string;
  incorporationState?: string;
  industry?: string;
  website?: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Dissolved' | 'Suspended';
  founders?: string[]; // User IDs
  totalAuthorizedShares?: number;
  parValue?: number;
  fiscalYearEnd?: string;
}
```

---

### 3. SHARE CLASSES (`/share-classes`)

```
GET  /api/shareClasses
POST /api/shareClasses
```

**ShareClass object:**
```typescript
interface ShareClass {
  classId: string;
  ClassName: string;
  ClassType: string;
  PricePerShare: number;
  TotalShares: number;
  VotingRights: boolean;
  DividendRights: boolean;
  ConversionRights?: object;
  AntiDilutionProtection?: string;
  LiquidationPreference?: number;
  RedemptionRights?: object;
  CompanyID: string;
}
```

---

### 4. STAKEHOLDERS (`/stakeholders`)

```
GET  /api/stakeholders
POST /api/stakeholders
```

**Stakeholder object:**
```typescript
interface Stakeholder {
  stakeholderId: string;
  name: string;
  role: string;
  email: string;
  ContactNumber?: string;
  Address?: string;
  Type: 'Individual' | 'Entity' | 'Trust' | 'Other';
  documents?: string[];
  projectId?: string;
}
```

---

### 5. INVESTORS (`/investors`)

```
POST   /investors
GET    /investors
GET    /investors/:id
PUT    /investors/:id
DELETE /investors/:id
```

**Investor object:**
```typescript
interface Investor {
  investorId: string;
  name: string;
  email: string;
  phone?: string;
  investmentAmount: number;
  equityPercentage: number;
  investorType: string;
  relatedFundraisingRound?: string;
}
```

---

### 6. FUNDRAISING ROUNDS (`/fundraising-rounds`)

```
POST   /fundraising-rounds
GET    /fundraising-rounds
GET    /fundraising-rounds/:id
PUT    /fundraising-rounds/:id
DELETE /fundraising-rounds/:id
```

**FundraisingRound object:**
```typescript
interface FundraisingRound {
  roundId: string;
  RoundName: string;
  RoundType: string;
  TargetAmount: number;
  AmountRaised: number;
  StartDate: string;
  EndDate: string;
  Status: string;
  LeadInvestor?: string;
  Valuation?: number;
  Terms?: string;
  CompanyId: string;
  Investors?: string[];
}
```

---

### 7. EQUITY PLANS (`/equity-plans`)

```
POST   /equity-plans
GET    /equity-plans
GET    /equity-plans/:id
PUT    /equity-plans/:id
DELETE /equity-plans/:id
```

**EquityPlan object:**
```typescript
interface EquityPlan {
  planId: string;
  PlanName: string;
  PlanType: string;
  TotalSharesReserved: number;
  VestingSchedule: object;
  CompanyId: string;
}
```

---

### 8. EMPLOYEES (`/employees`)

```
POST   /employees
GET    /employees          (supports pagination)
GET    /employees/:id
PUT    /employees/:id
DELETE /employees/:id
```

**Employee object:**
```typescript
interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  Department?: string;
  Role?: string;
  StartDate: string;
  EndDate?: string;
  EquityOverview?: {
    TotalEquity: number;
    VestedEquity: number;
    UnvestedEquity: number;
    ExercisableOptions: number;
    StrikePrice: number;
    LastVestingDate: string;
  };
  SSN?: string;
  CompanyID: string;
}
```

---

### 9. SPV MANAGEMENT (`/spvs`)

```
POST   /spvs
GET    /spvs
GET    /spvs/status/:status              (Active | Pending | Closed)
GET    /spvs/compliance/:status          (Compliant | NonCompliant | PendingReview)
GET    /spvs/parent/:companyId
GET    /spvs/:id
PUT    /spvs/:id
DELETE /spvs/:id
```

**SPV object:**
```typescript
interface SPV {
  SPVID: string;
  Name: string;
  Purpose: string;
  CreationDate: string;
  Status: 'Active' | 'Pending' | 'Closed';
  ParentCompanyID: string;
  ComplianceStatus: 'Compliant' | 'NonCompliant' | 'PendingReview';
  NAV?: number;
  TotalCommitments?: number;
  FundedAmount?: number;
  InvestmentStrategy?: string;
  TargetReturn?: number;
  ManagementFee?: number;
  PerformanceFee?: number;
}
```

### SPV ASSETS (`/spv-assets`) - JWT required, admin for write ops

```
POST   /spv-assets                       (Admin only)
GET    /spv-assets
GET    /spv-assets/spv/:spvId
GET    /spv-assets/valuation/spv/:spvId  (returns total valuation)
GET    /spv-assets/valuation/type/:type  (returns valuation by asset type)
GET    /spv-assets/:id
PUT    /spv-assets/:id                   (Admin only)
DELETE /spv-assets/:id                   (Admin only)
```

**SPVAsset object:**
```typescript
interface SPVAsset {
  AssetID: string;
  SPVID: string;
  AssetType: string;
  Value: number;
  Description?: string;
  AcquisitionDate?: string;
  MaturityDate?: string;
  Status: 'Active' | 'Sold' | 'Written Off' | 'Pending';
  ReturnRate?: number;
}
```

---

### 10. FINANCIAL REPORTS (`/financial-reports`) - JWT required

```
POST   /financial-reports
GET    /financial-reports                 (paginated)
GET    /financial-reports/search
GET    /financial-reports/analytics
POST   /financial-reports/bulk
GET    /financial-reports/:id
PUT    /financial-reports/:id
DELETE /financial-reports/:id
```

**FinancialReport object:**
```typescript
interface FinancialReport {
  reportId: string;
  ReportName: string;
  ReportType: string;
  DateGenerated: string;
  ReportingPeriod: 'Annual' | 'Quarterly';
  Data: {
    revenue: number;
    expenses: number;
    netIncome: number;    // Must equal revenue - expenses
    assets: number;
    liabilities: number;
    equity: number;
    cashFlow: object;
  };
  CompanyID: string;
  Status?: string;
  GeneratedBy?: string;
}
```

---

### 11. FINANCIAL METRICS (`/metrics`) - JWT + financialReports.view permission

```
GET /companies/:companyId/metrics/profitability?period=2024-Q1
    Returns: { grossProfitMargin, operatingProfitMargin, netProfitMargin }

GET /companies/:companyId/metrics/liquidity?period=2024-Q1
    Returns: { currentRatio, quickRatio, cashRatio }

GET /companies/:companyId/metrics/solvency?period=2024-Q1
    Returns: { debtToEquity, debtToAsset, interestCoverage }

GET /companies/:companyId/metrics/efficiency?period=2024-Q1
    Returns: { assetTurnover, inventoryTurnover, receivablesTournover }

GET /companies/:companyId/metrics/dashboard
    Returns: all metrics combined
```

**Period format:** `YYYY-QX` (e.g., `2024-Q1`) or `YYYY-full`

---

### 12. FINANCIAL DATA IMPORT/EXPORT (`/financial-data`) - JWT required

```
POST /financial-data/import
  Content-Type: multipart/form-data
  Fields: file (max 50MB), importType, companyId?, format?
  importType: transactions | financial_reports | spv_data | chart_of_accounts
  Formats: csv, json, xlsx, xls

GET  /financial-data/export?exportType=X&format=Y&companyId=Z&startDate=A&endDate=B
  exportType: transactions | financial_reports | spv_performance | compliance_report
  format: csv, json, xlsx, pdf

GET  /financial-data/templates/:importType
GET  /financial-data/import-status/:importId
POST /financial-data/validate  (dry-run validation)
```

---

### 13. TAX CALCULATOR (`/tax-calculations`)

```
POST   /tax-calculations/calculate
GET    /tax-calculations
GET    /tax-calculations/:id
PUT    /tax-calculations/:id
DELETE /tax-calculations/:id
```

**TaxCalculation object:**
```typescript
interface TaxCalculation {
  calculationId: string;
  SaleAmount: number;
  TaxRate: number;          // 0 to 1
  CalculatedTax: number;    // Auto: SaleAmount * TaxRate
  EquityType?: string;
  TaxYear?: number;
  Jurisdiction?: string;
}
```

---

### 14. DOCUMENTS (`/documents`)

```
GET  /documents   (supports search, filter by category/tags/accessLevel, pagination)
POST /documents
```

**Document object:**
```typescript
interface Document {
  documentId: string;
  name: string;
  title?: string;
  content?: string;
  path?: string;
  fileType?: string;
  fileSize?: number;
  mimeType?: string;
  accessLevel: 'public' | 'private' | 'shared';
  sharedWith?: string[];
  category?: string;
  tags?: string[];
  status: 'draft' | 'active' | 'archived' | 'deleted';
  version?: number;
  company?: string;
  uploadedBy?: string;
  metadata?: object;
}
```

### Document Access Control (`/document-accesses`)
Full CRUD for managing per-document access grants.

### Document Embeddings/AI (`/document-embeddings`)
Full CRUD. Backend supports:
- Text extraction (PDF, Word, plain text, images via OCR)
- AI-powered classification with confidence scores
- Automated summarization
- Semantic vector search

---

### 15. COMPLIANCE (`/compliance-checks`)

```
POST   /compliance-checks
GET    /compliance-checks
GET    /compliance-checks/non-compliant
GET    /compliance-checks/:id
PUT    /compliance-checks/:id
DELETE /compliance-checks/:id
```

**ComplianceCheck object:**
```typescript
interface ComplianceCheck {
  CheckID: string;
  SPVID: string;
  RegulationType: 'GDPR' | 'HIPAA' | 'SOX' | 'CCPA' | 'SEC' | 'FinCEN';
  Status: 'Compliant' | 'NonCompliant' | 'PendingReview';
  Details?: string;
  Timestamp: string;
  LastCheckedBy?: string;
}
```

---

### 16. SECURITY AUDIT LOGS (`/security-audits`) - JWT + admin/security_analyst role

```
GET   /security-audits?eventType=X&level=Y&userId=Z&days=7&page=1&limit=50&reviewed=false
GET   /security-audits/summary?days=7
GET   /security-audits/suspicious?days=1
GET   /security-audits/user/:userId?days=30
GET   /security-audits/export?days=30&level=X    (CSV download)
PATCH /security-audits/:id/review  Body: { notes: "..." }
```

---

### 17. COMMUNICATIONS (`/communications`)

```
POST   /communications                   (send message)
POST   /communications/thread            (reply in thread)
GET    /communications
GET    /communications/thread/:threadId
GET    /communications/user/:userId
GET    /communications/:id
PUT    /communications/:id
DELETE /communications/:id
```

**Communication object:**
```typescript
interface Communication {
  communicationId: string;
  MessageType: string;
  Sender: string;
  Recipient: string;
  Timestamp?: string;
  Content: string;
  ThreadId?: string;
}
```

---

### 18. NOTIFICATIONS (`/notifications`)

```
POST   /notifications
GET    /notifications
GET    /notifications/:id
DELETE /notifications/:id
```

---

### 19. INVITES (`/invites`)
Full CRUD for stakeholder/investor invitations.

---

### 20. ACTIVITIES (`/activities`)
Full CRUD for activity/audit logging. Fields: `activityId`, `ActivityType`, `Description`, `UserInvolved`, `Timestamp`, `RelatedObjects`, `IPAddress`, `Device`

---

### 21. INVESTMENTS (`/investments`) - JWT required

```
POST /investments  Body: { TrackID, Company, EquityPercentage, CurrentValue }
```

---

### 22. ADMINS (`/admins`)

```
POST   /admins
GET    /admins
GET    /admins/:id
PUT    /admins/:id
DELETE /admins/:id
POST   /admins/login
POST   /admins/logout
PUT    /admins/:id/change-password
```

---

### 23. INTEGRATION MODULES (`/integration-modules`)

```
POST /integration-modules  Body: { IntegrationID, ToolName, Description, Link }
```

---

### 24. WEBSOCKET EVENTS

Connect to `ws://localhost:5000` with JWT token for auth.

**Client-to-server messages:**
```typescript
{ type: 'ping' }
{ type: 'join_room', roomId: string }
{ type: 'leave_room', roomId: string }
{ type: 'document_update', roomId: string, data: object }
{ type: 'cursor_position', roomId: string, position: object }
{ type: 'user_typing', roomId: string, isTyping: boolean }
```

**Server-to-client events:**
- User presence (online/offline)
- Document updates (real-time collaboration)
- Notifications
- SPV events
- Activity updates

---

## FRONTEND PAGES TO BUILD

Based on the backend capabilities, build these pages/routes:

### Public Pages
- `/login` - Login form with email/password + Google OAuth button
- `/register` - Registration form with password strength indicator
- `/forgot-password` - Password reset request
- `/reset-password/:token` - Password reset form
- `/verify-email/:token` - Email verification callback

### Protected Pages (require auth)

**Dashboard (`/dashboard`)**
- Overview cards: total companies, active SPVs, pending compliance, recent activity
- Financial metrics summary charts
- Recent notifications
- Quick action buttons

**Company Management (`/companies`)**
- Company list with search/filter
- `/companies/new` - Create company form
- `/companies/:id` - Company detail view with tabs:
  - Overview (company info)
  - Cap Table (share classes, stakeholders, investors)
  - Fundraising (rounds, investors)
  - Equity Plans
  - Employees (with equity overview)
  - Documents
  - Financial Reports
  - Compliance
  - Settings

**Cap Table (`/companies/:id/cap-table`)**
- Visual cap table showing ownership breakdown (pie chart)
- Share class list with details
- Stakeholder table with equity percentages
- Investor table
- Waterfall analysis visualization

**SPV Management (`/spvs`)**
- SPV list with status/compliance filters
- `/spvs/new` - Create SPV form
- `/spvs/:id` - SPV detail view with:
  - Asset portfolio table
  - Total valuation display
  - Asset type breakdown chart
  - Compliance status
  - Performance metrics (NAV, returns, fees)

**Financial Reports (`/reports`)**
- Report list with search
- Create/edit report forms
- Report detail view with:
  - Revenue vs expenses chart
  - Balance sheet visualization
  - Cash flow statement
  - Key financial ratios
- Bulk import interface
- Export options (CSV, JSON, XLSX, PDF)

**Financial Metrics Dashboard (`/companies/:id/metrics`)**
- Profitability metrics (margin charts)
- Liquidity ratios (gauge charts)
- Solvency metrics
- Efficiency metrics
- Period selector (quarterly/annual)
- Trend analysis over time

**Document Management (`/documents`)**
- Document list with search, category filter, tag filter
- Upload interface (drag & drop)
- Document viewer
- Access control management (share with users)
- Version history
- AI features: classification results, summaries

**Compliance (`/compliance`)**
- Compliance dashboard with status overview
- Check list filtered by regulation type
- Non-compliant items highlighted
- Compliance check creation form
- SPV compliance drill-down

**Security & Audit (`/admin/security`)** - Admin only
- Audit log table with filters (event type, level, date range)
- Suspicious activity alerts
- Per-user audit trail
- Audit summary statistics
- CSV export button
- Review/acknowledge workflow

**Communications (`/messages`)**
- Inbox/outbox view
- Thread view
- Compose message
- Real-time updates via WebSocket

**Notifications (`/notifications`)**
- Notification list
- Mark as read
- Real-time notification bell in header via WebSocket

**Employee Management (`/employees`)**
- Employee directory with search/pagination
- Employee detail view with equity overview
- Vesting schedule visualization

**Data Import/Export (`/admin/data`)**
- Import wizard (select type, upload file, validate, confirm)
- Import status tracking
- Export interface with format/type selection
- Template downloads

**Tax Calculator (`/tools/tax-calculator`)**
- Input form (sale amount, tax rate, equity type, jurisdiction)
- Auto-calculated results
- History of calculations

**Invite Management (`/invites`)**
- Invite list
- Send invite form
- Invite status tracking

**Admin Panel (`/admin`)**
- User management (list, create, edit, delete users)
- Admin management
- System activity log
- Integration module management
- Rate limiting status

**Settings (`/settings`)**
- User profile edit
- Password change
- Notification preferences
- API key management

---

## UI/UX REQUIREMENTS

1. **Responsive design** - Mobile-first, works on desktop, tablet, mobile
2. **Dark/light mode** toggle
3. **Sidebar navigation** with collapsible sections grouped by domain:
   - Dashboard
   - Companies > Cap Table, Fundraising, Equity Plans
   - SPV Management > Assets, Compliance
   - Financial > Reports, Metrics, Data Import/Export, Tax Calculator
   - Documents
   - People > Employees, Stakeholders, Investors
   - Communications > Messages, Notifications
   - Admin > Users, Security Audit, Settings (role-gated)
4. **Global search** bar in header
5. **Notification bell** with real-time count via WebSocket
6. **User avatar menu** with profile, settings, logout
7. **Breadcrumb navigation**
8. **Loading skeletons** for all data-fetching states
9. **Error boundaries** with retry options
10. **Toast notifications** for CRUD operations
11. **Confirmation dialogs** for destructive actions (delete)
12. **Data tables** with sorting, filtering, pagination
13. **Charts and visualizations** for all financial data
14. **Form validation** matching backend requirements (e.g., password strength)
15. **Empty states** with call-to-action for all list views

---

## AUTHENTICATION FLOW

1. User logs in -> receives JWT + refreshToken
2. Store JWT in httpOnly cookie (set via Next.js API route proxy)
3. Next.js middleware checks cookie on every protected route
4. Axios interceptor catches 401 -> attempts token refresh -> retries request
5. If refresh fails -> redirect to login
6. On logout -> call `/auth/logout` + clear cookies

---

## API ERROR HANDLING

All endpoints return errors in this format:
```json
{
  "error": "Error message string"
}
```

HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 403 (Forbidden), 404 (Not Found), 500 (Server Error)

Handle all error states in the UI with user-friendly messages.

---

## RATE LIMITING

The API has rate limits. Handle 429 (Too Many Requests) responses with:
- Retry-After header respect
- User-facing "please wait" message
- Exponential backoff on API client

Tiers: Basic (100/15min), Standard (500), Premium (1000), Enterprise (5000)

---

## END OF PROMPT

The above specification covers 100% of the OpenCap backend's capabilities. Build every page, every form, every data visualization to fully utilize this API.
