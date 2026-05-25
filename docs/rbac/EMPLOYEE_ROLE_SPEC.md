# Employee Role — Design Specification

**Role name**: `employee`  
**Replaces**: former `user` role  
**Status**: Active — enforced in `models/User.js`, `middleware/rbacMiddleware.js`, and `client/components/Layout/Sidebar.jsx`  
**Last Updated**: 2026-05-25

---

## Purpose

The `employee` role represents a company team member who holds equity grants but has no administrative, financial, or cap table responsibilities. This is the most restricted authenticated role on the platform.

The rename from `user` to `employee` makes the role intent explicit: these are employees who need self-service access to their own equity and documents, nothing more.

---

## Permissions

```javascript
employee: [
  'read:own_equity',      // Their equity grants only — no other employees' grants
  'read:own_documents',   // Their offer letter, grant agreements, tax forms
  'read:valuation',       // Current 409A price per share (read-only)
  'read:companies',       // Basic company info (name, logo) — no financials
  'read:compliance',      // Read compliance items that apply to them
]
```

### What employees cannot do

| Capability | Reason |
|-----------|--------|
| `read:users` | Cannot view other employees, stakeholders, or investors |
| `write:*` | No write access to any platform resource |
| `read:reports` | No access to financial or investor reports |
| `read:spv` | No SPV visibility |
| `read:assets` | No asset records |
| `read:equity` (broad) | Cannot read all equity — only their own via `read:own_equity` |
| `admin:all` | No admin capabilities |

---

## Frontend Sidebar Visibility

Employees see a minimal, self-service sidebar. All administrative and financial navigation groups are hidden.

### Visible to employees

| Section | Nav Items |
|---------|-----------|
| Dashboard | Dashboard (always visible) |
| My Equity | My Equity (`/my-equity`), My Documents (`/documents`) |
| Comms | Messages, Notifications, Announcements |
| Settings | Profile only (Billing, Integrations, Company Assets, Settings are hidden) |

### Hidden from employees

- Cap Table (Cap Table, Stakeholders, Share Classes, Securities, Dilution, Scenarios)
- Equity group (Equity Plans, Employee Equity overview, Vesting overview, SAFE Notes, Tax Center)
- Fundraise (Fundraise, 409A Valuations, Investor Database, Accountant Review, SPVs)
- Documents full group (employees only see their own documents via My Equity group)
- Board (Meetings, Members, Resolutions, Board Documents)
- Reports (Investor Reports, Custom Reports, Analytics, Compliance overview)

---

## Backend Enforcement

Backend controllers must scope all data access for `employee` role to the requesting user's own records. The `read:own_equity` and `read:own_documents` permissions signal this intent; controllers should verify `resource.userId === req.user.userId` before returning data.

### Recommended controller pattern

```javascript
// In equityGrantController.js — getGrant
if (req.user.role === 'employee' && grant.userId !== req.user.userId) {
  return res.status(403).json({ message: 'Access denied: You may only view your own equity grants' });
}
```

---

## Role Comparison

| Role | Sees Cap Table | Sees All Equity | Sees Own Equity | Writes Compliance | Investor DB |
|------|:--------------:|:---------------:|:---------------:|:-----------------:|:-----------:|
| admin | Yes | Yes | Yes | Yes | Yes |
| founder | Yes | Yes | Yes | Yes | Yes |
| accountant | No | No | No | Yes | Yes |
| manager | Yes | No | No | Yes | No |
| investor | No | Read-only | No | No | No |
| service_provider | No | No | No | Yes | No |
| **employee** | **No** | **No** | **Yes** | **No** | **No** |
| client | No | No | No | No | No |

---

## Migration Notes

The `user` role was renamed to `employee` on 2026-05-25. Any existing users with `role: 'user'` in the database should be migrated to `role: 'employee'`. The permissions set was also tightened — the old `user` role had broader access (`read:reports`, `read:spv`, `write:compliance`) which has been removed.

### Migration query (ZeroDB)

```javascript
// Migrate existing 'user' role records to 'employee'
await zerodbService.updateRows('users', 
  { role: 'user' }, 
  { role: 'employee', permissions: rolePermissions.employee }
);
```

---

## Related Files

| File | Role |
|------|------|
| `models/User.js` | Authoritative enum and `rolePermissions.employee` definition |
| `middleware/rbacMiddleware.js` | `rolePermissions.employee` for middleware permission lookup |
| `middleware/authMiddleware.js` | Default role fallback changed from `'user'` to `'employee'` |
| `client/components/Layout/Sidebar.jsx` | Employee sidebar group and visibility gates |
| `docs/security/RBAC_ROLES_AND_PERMISSIONS.md` | Full role matrix including employee |
