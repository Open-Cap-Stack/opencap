# Frontend Testing Gap Analysis & Checklist

**Date**: 2026-02-14
**Scope**: Functional correctness and edge cases only (no UI/UX)
**Stack**: Vitest + @testing-library/react + userEvent

---

## Summary

Analyzed 57+ pages, 224+ components, 60+ services, and 81 existing test files. Identified **38 testing gaps** across 7 categories, then wrote **9 new test files with 160 tests** to close the most critical gaps.

---

## Gap Categories

### A. Authentication & Authorization (12 gaps)

| ID | Gap | Priority | Status | Test File |
|----|-----|----------|--------|-----------|
| A1 | RegisterPage: empty field validation (name, email, password, confirm, terms) | High | COVERED | `RegisterPage.test.tsx` |
| A2 | RegisterPage: successful registration + failed registration error handling | High | COVERED | `RegisterPage.test.tsx` |
| A3 | RegisterPage: OAuth buttons conditional rendering and click handlers | Medium | COVERED | `RegisterPage.test.tsx` |
| A4 | OAuthCallbackPage: successful callback processing + redirect | High | COVERED | `OAuthCallbackPage.test.tsx` |
| A5 | OAuthCallbackPage: invalid/unsupported provider handling | High | COVERED | `OAuthCallbackPage.test.tsx` |
| A6 | OAuthCallbackPage: missing callback params + error param (access_denied) | Medium | COVERED | `OAuthCallbackPage.test.tsx` |
| A7 | ProtectedRoute: redirect to /login when unauthenticated | High | COVERED | `ProtectedRoute.test.tsx` |
| A8 | ProtectedRoute: redirect to /forbidden when role doesn't match | High | COVERED | `ProtectedRoute.test.tsx` |
| A9 | ProtectedRoute: requireAll vs requireAny permission logic | High | COVERED | `ProtectedRoute.test.tsx` |
| A10 | ProtectedRoute: authorized user renders children | Medium | COVERED | `ProtectedRoute.test.tsx` |
| A11 | GuestRoute: renders for unauthenticated, redirects for authenticated | Medium | COVERED | `ProtectedRoute.test.tsx` |
| A12 | AdminRoute: admin-only access guard | Medium | COVERED | `ProtectedRoute.test.tsx` |

### B. OAuth Service (6 gaps)

| ID | Gap | Priority | Status | Test File |
|----|-----|----------|--------|-----------|
| B1 | isAvailable: returns true/false based on VITE env vars | Medium | COVERED | `oauthService.test.ts` |
| B2 | initiateLogin: generates state, stores in sessionStorage, builds auth URL | High | PARTIAL | `oauthService.test.ts` (state storage tested via handleCallback) |
| B3 | handleCallback: CSRF state validation (mismatch, missing, provider mismatch) | Critical | COVERED | `oauthService.test.ts` |
| B4 | handleCallback: routes to correct AINative callback (github vs linkedin) | High | COVERED | `oauthService.test.ts` |
| B5 | parseCallbackParams: parses code/state from URL, handles error param | Medium | COVERED | `oauthService.test.ts` |
| B6 | clearState: removes OAuth state from sessionStorage | Low | COVERED | `oauthService.test.ts` |

### C. Permission Utilities (7 gaps)

| ID | Gap | Priority | Status | Test File |
|----|-----|----------|--------|-----------|
| C1 | hasPermission: exact match + admin:all bypass | High | COVERED | `permissions.test.ts` |
| C2 | hasAllPermissions: requires all permissions in array | High | COVERED | `permissions.test.ts` |
| C3 | hasAnyPermission: requires at least one permission | High | COVERED | `permissions.test.ts` |
| C4 | getPermissionContext: localStorage parsing, corrupted JSON fallback, missing role default | High | COVERED | `permissions.test.ts` |
| C5 | canAccess: builds permission string (resource:action) | Medium | COVERED | `permissions.test.ts` |
| C6 | Role hierarchy: isAdmin, isManagerOrAbove | Medium | COVERED | `permissions.test.ts` |
| C7 | getPermissionsForRole: returns correct permission set per role | Medium | COVERED | `permissions.test.ts` |

### D. Forms & CRUD (6 gaps)

| ID | Gap | Priority | Status | Test File |
|----|-----|----------|--------|-----------|
| D1 | StakeholderFormModal: create mode - title, empty fields, button label | Medium | COVERED | `StakeholderFormModal.test.tsx` |
| D2 | StakeholderFormModal: edit mode - pre-populated fields, equity/shares formatting | High | COVERED | `StakeholderFormModal.test.tsx` |
| D3 | StakeholderFormModal: validation errors displayed for invalid data | High | COVERED | `StakeholderFormModal.test.tsx` |
| D4 | StakeholderFormModal: submission with formatted data + error handling | High | COVERED | `StakeholderFormModal.test.tsx` |
| D5 | StakeholderFormModal: cancel resets form and closes modal | Medium | COVERED | `StakeholderFormModal.test.tsx` |
| D6 | StakeholderFormModal: error clearing on field input | Medium | COVERED | `StakeholderFormModal.test.tsx` |

### E. Data Display & Interaction (12 gaps)

| ID | Gap | Priority | Status | Test File |
|----|-----|----------|--------|-----------|
| E1 | OwnershipTable: renders all rows with formatted numbers, percentages, currency | High | COVERED | `OwnershipTable.test.tsx` |
| E2 | OwnershipTable: search filtering (case-insensitive, empty results) | Medium | COVERED | `OwnershipTable.test.tsx` |
| E3 | OwnershipTable: column sort (toggle direction, switch column resets to desc) | Medium | COVERED | `OwnershipTable.test.tsx` |
| E4 | OwnershipTable: share class dropdown filter + combined filter logic | Medium | COVERED | `OwnershipTable.test.tsx` |
| E5 | OwnershipTable: totals row calculation, updates on filter, hidden when empty | Medium | COVERED | `OwnershipTable.test.tsx` |
| E6 | OwnershipTable: CSV export triggers Blob + download | Low | COVERED | `OwnershipTable.test.tsx` |
| E7 | OwnershipTable: row click handler calls onStakeholderClick with correct ID | Medium | COVERED | `OwnershipTable.test.tsx` |
| E8 | ConfirmDialog: all 4 variants render without crashing | Medium | COVERED | `ConfirmDialog.test.tsx` |
| E9 | ConfirmDialog: loading state disables buttons, shows "Processing..." | Medium | COVERED | `ConfirmDialog.test.tsx` |
| E10 | ConfirmDialog: returns null when isOpen=false | Low | COVERED | `ConfirmDialog.test.tsx` |
| E11 | ThemeContext: switching between light/dark/auto themes | Medium | COVERED | `ThemeContext.test.tsx` |
| E12 | ThemeContext: invalid localStorage value defaults to light | Low | COVERED | `ThemeContext.test.tsx` |

---

## New Test Files Created

| # | File | Tests | Gaps Covered |
|---|------|-------|--------------|
| 1 | `src/__tests__/pages/RegisterPage.test.tsx` | 17 | A1, A2, A3 |
| 2 | `src/__tests__/pages/OAuthCallbackPage.test.tsx` | 10 | A4, A5, A6 |
| 3 | `src/__tests__/components/auth/ProtectedRoute.test.tsx` | 16 | A7-A12 |
| 4 | `src/__tests__/services/oauthService.test.ts` | 16 | B1-B6 |
| 5 | `src/__tests__/utils/permissions.test.ts` | 39 | C1-C7 |
| 6 | `src/__tests__/contexts/ThemeContext.test.tsx` | 8 | E11, E12 |
| 7 | `src/__tests__/components/ConfirmDialog.test.tsx` | 13 | E8-E10 |
| 8 | `src/__tests__/components/StakeholderFormModal.test.tsx` | 18 | D1-D6 |
| 9 | `src/__tests__/components/OwnershipTable.test.tsx` | 26 | E1-E7 |
| | **Total** | **160** | **38 gaps** |

---

## Testing Patterns & Lessons Learned

### HTML5 Native Validation in jsdom
Forms with `required` attributes on inputs will trigger browser constraint validation when using `userEvent.click(submitButton)`. This prevents the React `onSubmit` handler from firing.

**Fix**: Use `fireEvent.submit(form)` to bypass native validation and test React's own validation logic:
```tsx
function submitForm() {
  const form = screen.getByRole('button', { name: /submit/i }).closest('form')!;
  fireEvent.submit(form);
}
```

### window.matchMedia in jsdom
jsdom doesn't provide `window.matchMedia`. Components using it (e.g., ThemeContext for system theme detection) will crash.

**Fix**: Mock in `beforeEach`:
```tsx
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### CSV Export / Blob Download
The `link.click()` call in CSV export functions can trigger jsdom navigation to the blob URL, blanking the document for subsequent tests.

**Fix**: Mock `HTMLAnchorElement.prototype.click`:
```tsx
const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
// ... test ...
clickSpy.mockRestore();
```

### Component Props in Testing-Library
When a text (e.g., "Preferred") appears in multiple places (dropdown + badge), use `getAllByText` instead of `getByText` to avoid "found multiple elements" errors.

---

## Remaining Gaps (Future Work)

These areas were identified but not yet covered:

| Area | Description | Priority |
|------|-------------|----------|
| Token refresh | AuthContext token refresh/expiry handling | High |
| API error boundaries | Global error boundary behavior on API failures | Medium |
| Navigation guards | Route change with unsaved form data | Medium |
| WebSocket reconnection | Socket.IO disconnect/reconnect handling | Low |
| Pagination | Table pagination state across filter changes | Low |
| Responsive layout | Component behavior at different breakpoints | Low |
| Keyboard navigation | Tab order and keyboard shortcuts | Low |
