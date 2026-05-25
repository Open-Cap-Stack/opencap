# OpenCapStack — Role-Based Access Control (RBAC)

**Last Updated**: 2026-05-25  
**Status**: Updated — employee role added, service_provider role added, user role renamed  
**Owner**: Platform Engineering

---

## 1. Authoritative Role System

The system uses **9 defined roles** declared in `models/User.js`. This is the single source of truth.

> The former `user` role has been renamed to `employee` to make role intent explicit. Any records with `role: 'user'` in existing databases must be migrated to `role: 'employee'`.

> A legacy `models/userModel.js` defines a separate 3-role system (Admin/Editor/Viewer). This is **not authoritative** and should be removed or migrated.

### Roles (highest to lowest privilege)

| Role | Description | Who Gets It |
|------|-------------|-------------|
| `super_admin` | Platform-level control — manages tenants, roles, audit logs | Internal platform operators only |
| `admin` | Full company-level control — all read/write/delete across all resources | Company admin users |
| `founder` | Full cap table management — equity, SPV, reports, compliance | Company founders |
| `accountant` | Financial review, 409A valuations, compliance docs, tax documents | Licensed accountants on the platform |
| `manager` | Read/write users, companies, reports, SPV, assets, compliance | Company managers |
| `investor` | Read-only across most resources | LP/investor stakeholders |
| `service_provider` | Read cap table/compliance/documents, write compliance — no equity grants, no user management | Law firms, auditors, external advisors |
| `employee` | Self-service only: their own equity grants and documents, valuation read | Company team members with equity |
| `client` | Read-only: reports, SPV, assets | External clients |

---

## 2. Permission Matrix

### Core Permissions by Role

| Permission | super_admin | admin | founder | accountant | manager | investor | service_provider | employee | client |
|------------|:-----------:|:-----:|:-------:|:----------:|:-------:|:--------:|:----------------:|:--------:|:------:|
| read:users | Y | Y | Y | Y | Y | Y | Y | — | — |
| write:users | Y | Y | Y | — | Y | — | — | — | — |
| delete:users | Y | Y | Y | — | — | — | — | — | — |
| read:companies | Y | Y | Y | Y | Y | Y | Y | Y | — |
| write:companies | Y | Y | Y | — | Y | — | — | — | — |
| delete:companies | Y | Y | Y | — | — | — | — | — | — |
| read:reports | Y | Y | Y | Y | Y | Y | Y | — | Y |
| write:reports | Y | Y | Y | — | Y | — | — | — | — |
| delete:reports | Y | Y | Y | — | — | — | — | — | — |
| read:spv | Y | Y | Y | — | Y | Y | Y | — | Y |
| write:spv | Y | Y | Y | — | Y | — | — | — | — |
| delete:spv | Y | Y | Y | — | — | — | — | — | — |
| read:assets | Y | Y | Y | — | Y | Y | Y | — | Y |
| write:assets | Y | Y | Y | — | Y | — | — | — | — |
| delete:assets | Y | Y | Y | — | — | — | — | — | — |
| read:compliance | Y | Y | Y | Y | Y | Y | Y | Y | — |
| write:compliance | Y | Y | Y | Y | Y | — | Y | — | — |
| delete:compliance | Y | Y | Y | — | — | — | — | — | — |
| read:equity | Y | Y | Y | — | — | Y | — | — | — |
| write:equity | Y | Y | Y | — | — | — | — | — | — |
| read:own_equity | Y | Y | Y | — | — | — | — | **Y** | — |
| read:own_documents | Y | Y | Y | — | — | — | — | **Y** | — |
| read:valuation | Y | Y | Y | — | — | — | — | **Y** | — |
| read:documents | Y | Y | Y | Y | — | — | Y | — | — |
| read:valuations | Y | Y | — | Y | — | — | — | — | — |
| write:valuations | Y | Y | — | Y | — | — | — | — | — |
| sign:valuations | Y | — | — | Y | — | — | — | — | — |
| admin:all | Y | Y | Y | — | — | — | — | — | — |
| platform:manage_roles | Y | — | — | — | — | — | — | — | — |
| platform:manage_tenants | Y | — | — | — | — | — | — | — | — |
| platform:view_audit_logs | Y | — | — | — | — | — | — | — | — |

---

## 3. Feature Access by Role

### Platform Features

| Feature | super_admin | admin | founder | accountant | manager | investor | service_provider | employee | client |
|---------|:-----------:|:-----:|:-------:|:----------:|:-------:|:--------:|:----------------:|:--------:|:------:|
| **Investor Database** | Y | Y | Y | Y | — | — | — | — | — |
| **Accountant Review Queue** | Y | Y | — | Y | — | — | — | — | — |
| **409A Valuations** | Y | Y | Y | Y | — | — | — | Y* | — |
| **Sign/Release Valuations** | Y | Y | — | Y | — | — | — | — | — |
| **Cap Table Management** | Y | Y | Y | — | Y | — | — | — | — |
| **SPV Management** | Y | Y | Y | — | Y | — | Y | — | — |
| **Equity Grants (all)** | Y | Y | Y | — | Y | — | — | — | — |
| **Own Equity Grants** | Y | Y | Y | — | — | — | — | **Y** | — |
| **Tax Documents** | Y | Y | Y | Y | — | — | — | — | — |
| **Data Room** | Y | Y | Y | Y | Y | Y | Y | — | — |
| **Compliance Checks** | Y | Y | Y | Y | Y | Y | Y | Y | — |
| **Reports** | Y | Y | Y | Y | Y | Y | Y | — | Y |
| **API Key Management** | Y | Y | — | — | — | — | — | — | — |
| **User Management** | Y | Y | Y | — | Y | — | — | — | — |
| **Cache Management** | Y | Y | — | — | — | — | — | — | — |
| **API Metrics** | Y | Y | — | — | — | — | — | — | — |
| **Platform Tenant Mgmt** | Y | — | — | — | — | — | — | — | — |
| **Audit Logs** | Y | — | — | — | — | — | — | — | — |

> *Employees can see the current 409A price per share (`read:valuation`) but cannot access the full valuation workflow.

### Frontend Navigation Visibility (Sidebar)

| Nav Item | super_admin | admin | founder | accountant | manager | investor | service_provider | employee | client |
|---------|:-----------:|:-----:|:-------:|:----------:|:-------:|:--------:|:----------------:|:--------:|:------:|
| Dashboard | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Cap Table | Y | Y | Y | — | Y | — | — | — | — |
| Equity (full) | Y | Y | Y | Y | Y | Y | — | — | — |
| My Equity (own only) | — | — | — | — | — | — | — | **Y** | — |
| Fundraise | Y | Y | Y | Y | Y | Y | Y | — | — |
| Investor Database | Y | Y | Y | Y* | — | — | — | — | — |
| Accountant Review | Y | Y | — | Y | — | — | — | — | — |
| SPV Management | Y | Y | Y | — | — | — | Y | — | — |
| Documents (full) | Y | Y | Y | Y | Y | Y | Y | — | — |
| My Documents (own) | — | — | — | — | — | — | — | **Y** | — |
| Board | Y | Y | Y | — | Y | — | — | — | — |
| Reports | Y | Y | Y | Y | Y | Y | Y | — | Y |
| Comms | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| Settings (full) | Y | Y | Y | — | — | — | — | — | — |
| Profile only | Y | Y | Y | Y | Y | Y | Y | Y | Y |

> *Investor Database: Fixed — accountant now correctly shown in sidebar nav.

---

## 4. Access Control Architecture

```
Request
   |
   v
[authenticateToken]           middleware/authMiddleware.js
  - Validates JWT/API key     - Reads role from JWT
  - Sets req.user             - Falls back to DB user
  - Checks token blacklist    - Default role: 'employee' (was 'user')
   |
   v
[Route-level RBAC]            middleware/rbacMiddleware.js
  hasRole([...roles])         - All 9 roles defined
  hasPermission('perm')       - Consistent permission lookup
   |
   v
[Controller-level check]      controllers/*.js
  req.user.role === 'x'       - Inline ad-hoc checks
  ALLOWED_ROLES.includes()    - Applied where needed
   |
   v
[Company-scope check]         app.js (company middleware)
  req.user.companyId          - Limits data to own company
  matches resource
```

---

## 5. Investor Database — Specific Rules

**Backend** (`controllers/investorDatabaseController.js`):
```
Allowed: admin, founder, accountant, super_admin
Denied:  manager, investor, employee, service_provider, client
```

**Frontend** (`client/components/Layout/Sidebar.jsx`):
```
Shown to: admin, founder, accountant, super_admin  ← Fixed (accountant was missing before)
```

---

## 6. Employee Role — Tightened Permissions

The `employee` role (renamed from `user`) has significantly tighter permissions than the former `user` role:

| Permission | Former `user` | Current `employee` |
|-----------|:-----------:|:-----------------:|
| read:users | Y | — |
| read:companies | Y | Y |
| write:companies | Y | — |
| read:reports | Y | — |
| read:spv | Y | — |
| read:assets | Y | — |
| read:compliance | Y | Y |
| write:compliance | Y | — |
| read:own_equity | — | **Y** |
| read:own_documents | — | **Y** |
| read:valuation | — | **Y** |

Controllers serving equity grant data must enforce `resource.userId === req.user.userId` for `employee` role requests. See `docs/rbac/EMPLOYEE_ROLE_SPEC.md` for full specification.

---

## 7. Service Provider Role

The `service_provider` role is designed for external parties (law firms, auditors, compliance vendors) who need read access to company documents and compliance state but must not access equity grants, user management, or investor data.

**Permissions**:
```javascript
service_provider: [
  'read:users',
  'read:companies',
  'read:reports',
  'read:compliance', 'write:compliance',
  'read:documents',
  'read:spv',
  'read:assets'
]
```

**What service_provider cannot access**: equity grants, valuations, investor database, user write/delete, company write/delete, admin functions.

---

## 8. Known Gaps & Remediation Status

| Gap | Status | Notes |
|-----|--------|-------|
| Frontend/Backend mismatch — Investor Database | **Fixed** | Accountant added to sidebar |
| Incomplete rbacMiddleware role coverage | **Fixed** | All 9 roles now defined |
| `user` role renamed to `employee` | **Fixed** | Enum and permissions updated |
| `service_provider` role added | **Fixed** | New role with defined permissions |
| Default role fallback was `'user'` | **Fixed** | Now defaults to `'employee'` |
| Duplicate role system (`userModel.js`) | **Pending** | Legacy file still exists |
| 30+ controllers without role checks | **Pending** | Gap 4 — needs audit pass |
| Agent token bypass | **Pending** | Gap 5 — needs capability gates |
| Cross-tenant isolation | **Pending** | Gap 6 — company-scoped checks needed |

---

## 9. Where Role Checks Live in Code

| File | Purpose |
|------|---------|
| `models/User.js` | **Authoritative** role enum (9 roles) + rolePermissions map |
| `middleware/authMiddleware.js` | JWT validation, sets `req.user.role`, default: `'employee'` |
| `middleware/rbacMiddleware.js` | `hasRole()` and `hasPermission()` — all 9 roles defined |
| `middleware/jwtAuth.js` | Legacy JWT middleware (uses `roles` array — inconsistent) |
| `controllers/investorDatabaseController.js` | ALLOWED_ROLES = ['admin', 'founder', 'accountant', 'super_admin'] |
| `controllers/accountantController.js` | Accountant/admin role checks per method |
| `controllers/taxDocumentController.js` | Admin + finance role checks |
| `controllers/cacheController.js` | Admin-only checks |
| `controllers/adminController.js` | Admin-only checks |
| `client/components/Layout/Sidebar.jsx` | Frontend nav visibility per role — employee and service_provider gated |
| `lib/AuthContext.jsx` | Stores `user.role` from JWT for frontend use |
| `docs/rbac/EMPLOYEE_ROLE_SPEC.md` | Full employee role design spec |
