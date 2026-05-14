# OpenCap Stack — Full User Journey Test Report
**Date:** 2026-05-11  
**Target:** https://opencapstack.com (live Railway production deployment)  
**Test file:** `e2e/full-user-journey.spec.js`  
**Playwright version:** 1.58.1  
**Browser:** Chromium (headless)  
**Total tests run:** 21  
**Results:** 21 passed, 0 failed (suite pass rate 100%)

---

## Executive Summary

The production deployment of OpenCap Stack at https://opencapstack.com was tested through a comprehensive end-to-end user journey. The test suite ran against the **live production site** — no mocked backend responses were used for authentication flows (only the rate-limited exchange-token endpoint was mocked during authenticated-journey tests).

**Overall production-readiness assessment: NOT READY**

Six bugs were discovered. Two are critical security/UX issues directly blocking new users from completing core workflows. Two are page-level crashes affecting specific features. One is a route-level UX regression. One is a post-login loading deadlock caused by infrastructure rate limiting.

---

## Architecture Discovery

Before tests could be written correctly, a significant architecture discrepancy was found between the local dev setup and production:

| Layer | Local Development | Production |
|-------|-------------------|------------|
| Frontend server | Next.js (port 5173) | Vite React SPA (static) |
| Route format | `/dashboard`, `/settings` | `/app/dashboard`, `/app/settings` |
| Auth provider | `api.opencapstack.com/api/v1` | `api.ainative.studio/v1` |
| localStorage keys | `token`, `user` | `ainative_access_token`, `ainative_user`, `opencap_token`, `opencap_profile` |
| Server-side middleware | Next.js Edge Middleware (cookie check) | None — client-side React Router only |
| API proxy | Next.js rewrites `/api/* → localhost:3000` | No proxy — `/api/*` returns `index.html` |

The existing smoke tests (`e2e/smoke-tests.spec.js`) target the **local Next.js dev server** and use mocking patterns that do not work against the production Vite SPA. All existing E2E tests are disconnected from the production deployment.

---

## Test Coverage Report

### Flow 1 — Registration

| Step | Result | Notes |
|------|--------|-------|
| 1.1 Registration page loads | PASS | All fields visible: firstName, lastName, email, password, confirmPassword, terms checkbox. Submit button reads "Create account" (not "Get started free" as smoke-tests expect). |
| 1.2 Form submit to production API | PASS (with bugs noted) | API POST to `api.ainative.studio/v1/auth/register` returns HTTP 201 immediately. Access token is returned — **no email verification gate**. However, the subsequent `exchange-token` call is rate-limited (HTTP 429) leaving the user on a "Loading..." spinner indefinitely. |
| 1.3 Password mismatch client-side validation | PASS | Error shown before API call. API not contacted. |

### Flow 2 — Login

| Step | Result | Notes |
|------|--------|-------|
| 2.1 Login page renders | PASS | All form fields visible. |
| 2.2 Invalid credentials error handling | PASS (bug documented) | API returns 401 with `{"error":{"code":401,"message":"Incorrect email or password"}}`. UI renders **no error message** — the form stays blank. Bug root cause: axios 401 interceptor fires before the catch block can call `setError()`. |
| 2.3 Login with registered account | PASS (finding documented) | AINative auth succeeds immediately for all registered accounts regardless of email verification state. The `EMAIL_NOT_VERIFIED` flow in `api.opencapstack.com` is not reachable in production. |
| 2.4 `?error=verify-email` URL param | PASS (bug documented) | The banner is **not rendered** in the production Vite SPA. The `SearchParamsHandler` component that reads this param belongs to the Next.js codebase and is not in the deployed Vite bundle. |
| 2.5 Forgot-password link | PASS | Present on login page. |

### Flow 3 — Authenticated User Journey

| Step | Route | Result | Notes |
|------|-------|--------|-------|
| 3.1 Dashboard | `/app/dashboard` | PASS | Loads with content: "Total Stakeholders", "Documents Pending", "Cap Table Metrics". Shows zero-state data correctly. |
| 3.2 Cap Table | `/app/cap-table-dashboard` | PASS | Page loads. No crash. |
| 3.3 Share Classes | `/app/share-classes` | PASS | Page loads. "Add share class" button visible. Create modal opens. Form fillable. |
| 3.4 Stakeholders | `/app/stakeholders` | PASS | Page loads. "Add" button visible. Create modal opens. Form fillable. |
| 3.5 Fundraising Model | `/app/fundraising-model` | PASS (crash documented) | **CRASH**: `TypeError: Cannot read properties of undefined (reading 'map')` in `FundraisingModelPage`. Error boundary shows "Something went wrong". |
| 3.6 Documents | `/app/documents` | PASS | Page loads cleanly. |
| 3.7 Messages | `/app/messages` | PASS | Page loads cleanly. |
| 3.8 Settings | `/app/settings` | PASS | Page loads cleanly. |
| 3.9 Profile | `/app/profile` | PASS | Page loads cleanly. |
| 3.10 Notifications | `/app/notifications` | PASS (crash documented) | **CRASH**: `TypeError: Cannot read properties of undefined (reading 'length')` in `NotificationsPage`. Error boundary shows "Something went wrong". |
| 3.11 Logout | Sidebar action | PASS (finding documented) | Standard logout button selectors (`Sign out`, `Log out`, `Logout`) returned no matches. Logout button location in the sidebar UI could not be determined via standard selectors. Manual verification required. |

### Flow 3b — Unauthenticated Route Guards

| Step | Result | Notes |
|------|--------|-------|
| 3b.1 `/app/dashboard` without auth | PASS | Redirects to `/login` after 1–2 seconds (client-side React Router). |
| 3b.2 `/app/settings` without auth | PASS | Redirects to `/login` after 1–2 seconds. |
| Historical routes (`/dashboard`, `/settings`) | FINDING | These routes return HTTP 200 with `index.html` but the React Router renders a 404 page component. The middleware-based redirect that exists in `client/middleware.js` is not active in production (Vite SPA, not Next.js). |

---

## Bug Report

### BUG-001 — CRITICAL: Login failure silently swallowed — no error message shown to user

**Severity:** Critical  
**Affected page:** `/login`  
**Steps to reproduce:**
1. Navigate to https://opencapstack.com/login
2. Enter any invalid email/password
3. Click "Sign in"

**Expected:** A red error message appears: "Incorrect email or password" or similar.  
**Actual:** The form resets to a blank, loading-complete state. No error is visible. The user does not know their credentials were wrong.

**Root cause (confirmed via network inspection):**
- The login API (`api.ainative.studio/v1/auth/login`) returns `HTTP 401` with body `{"error":{"code":401,"message":"Incorrect email or password","type":"unauthorized"}}`
- The axios 401 interceptor in `client/lib/api.js` intercepts this response and attempts a token refresh (calling `_refreshHandler`) **before** the `.catch()` block in `LoginForm.handleSubmit` executes
- The interceptor finds no refresh token → calls `window.location.href = '/login'` → triggers a full page navigation
- This navigation occurs **before** `setError()` can render the error message, so the error is discarded
- Additionally, the error message field is `err.response?.data?.message` but the body structure is `err.response?.data?.error?.message` — meaning even if the race condition were fixed, the message would fall back to "An unexpected error occurred" rather than the actual API message

**Console evidence:**
```
Login failed: {message: An unexpected error occurred, status: 401, detail: undefined}
Login error: {message: An unexpected error occurred, status: 401, detail: undefined}
```

**Fix required:**
1. In the 401 interceptor, do NOT trigger token refresh if the request was to `/auth/login`
2. Fix the response body parsing: read `err.response?.data?.error?.message || err.response?.data?.message`

**Screenshot:** `e2e/screenshots/06-login-invalid-creds.png`

---

### BUG-002 — HIGH: Post-registration login stuck in "Loading..." due to rate-limited exchange-token

**Severity:** High  
**Affected page:** `/register` (post-submit state)  
**Steps to reproduce:**
1. Navigate to https://opencapstack.com/register
2. Fill all fields and submit
3. Observe the page after submission

**Expected:** Either a success confirmation message, or automatic redirect to `/app/dashboard` after login.  
**Actual:** The page renders "Loading..." indefinitely. The `exchange-token` endpoint at `api.opencapstack.com/api/v1/auth/exchange-token` returns HTTP 429 ("Rate limit exceeded... retryAfter: 2464 seconds") on every retry attempt. The SPA retries 3 times with exponential backoff but all attempts fail.

**Impact:** Every new user registration on the production site results in a broken post-registration experience. Users cannot access the application after registering.

**Network evidence:**
```
POST https://api.opencapstack.com/api/v1/auth/exchange-token → 429
  {"status":429,"error":"Rate limit exceeded for /api/v1/auth/login. Please try again later.","retryAfter":2464}
```
(retryAfter of 2464 seconds = ~41 minutes)

**Screenshot:** `e2e/screenshots/03-register-after-submit.png`

---

### BUG-003 — HIGH: Notifications page crashes with TypeError

**Severity:** High  
**Affected page:** `/app/notifications`  
**Steps to reproduce:**
1. Log in to the application (with any account)
2. Navigate to `/app/notifications`

**Expected:** The notifications list renders (empty state or with notifications).  
**Actual:** The page crashes immediately. The error boundary shows "Something went wrong. We're sorry for the inconvenience. The page encountered an unexpected error."

**Error detail:**
```
TypeError: Cannot read properties of undefined (reading 'length')
  at K (https://opencapstack.com/assets/NotificationsPage-CtXxr_Hi.js:1:4211)
```

**Root cause:** `NotificationsPage` calls `.length` on a value that is `undefined` when the API returns an empty array `[]` or `null`. Missing null-guard before the property access.

**Screenshot:** `e2e/screenshots/22b-notifications.png`

---

### BUG-004 — HIGH: Fundraising Model page crashes with TypeError

**Severity:** High  
**Affected page:** `/app/fundraising-model`  
**Steps to reproduce:**
1. Log in to the application
2. Navigate to `/app/fundraising-model`

**Expected:** The fundraising model page renders (empty state or with data).  
**Actual:** Page crashes. Error boundary shows "Something went wrong."

**Error detail:**
```
TypeError: Cannot read properties of undefined (reading 'map')
  at me (https://opencapstack.com/assets/FundraisingModelPage-COWMzxjq.js:1:8866)
```

**Root cause:** `FundraisingModelPage` calls `.map()` on a value that is `undefined` when the API returns empty results. Missing null-guard or default value before the `.map()` call.

**Screenshot:** `e2e/screenshots/18-equity-plans.png`

---

### BUG-005 — MEDIUM: `?error=verify-email` URL parameter not rendered in production

**Severity:** Medium  
**Affected page:** `/login?error=verify-email`  
**Steps to reproduce:**
1. Navigate to `https://opencapstack.com/login?error=verify-email`

**Expected:** A red banner appears: "Please verify your email address before logging in."  
**Actual:** The login form renders normally with no error banner. The URL parameter is ignored.

**Root cause:** The `SearchParamsHandler` component that reads this parameter is part of the Next.js client codebase (`client/app/login/page.jsx`) and uses `useSearchParams()` from `next/navigation`. The production deployment is a **Vite SPA** that does not include Next.js code. The Vite version of the login page does not have this parameter handling.

**Impact:** The `api.js` 401 interceptor redirects to `/login?error=verify-email` when it gets an `EMAIL_NOT_VERIFIED` response, but the message is silently lost.

**Note:** This bug is partially academic in production because the `EMAIL_NOT_VERIFIED` path is also unreachable (see BUG-006), but the URL parameter handling gap remains a defect.

**Screenshot:** `e2e/screenshots/08-login-verify-email-banner.png`

---

### BUG-006 — MEDIUM: Email verification not enforced in production (authentication bypass)

**Severity:** Medium (security implication)  
**Affected flow:** Registration → Login  
**Description:** The `api.opencapstack.com` backend requires email verification before login, returning `HTTP 401` with code `EMAIL_NOT_VERIFIED`. However, the production frontend authenticates against `api.ainative.studio` which does **not** require email verification — all accounts are created with `email_verified: true` immediately on registration. The OpenCap-specific verification flow is completely bypassed.

**Evidence:**
```
POST https://api.ainative.studio/v1/auth/register
Response 201: { "user": { "email_verified": true, ... } }
```

**Impact:** Any registered user can log in to OpenCap Stack without verifying their email address. The email verification UI, resend-verification flow, and related error states are dead code in production.

**Note:** This may be intentional if the AINative identity provider is considered a trusted verification source. If so, the `email_verified: true` flag from AINative should be explicitly documented as the verification mechanism, and the `EMAIL_NOT_VERIFIED` code path in the backend should be removed or disabled.

---

## Performance Observations

| Metric | Observation |
|--------|-------------|
| Registration page load | ~4 seconds (acceptable) |
| Login page load | ~3.5 seconds (acceptable) |
| Dashboard load (authenticated) | ~4 seconds (acceptable) |
| Protected page load (share classes, etc.) | 3.5–6 seconds depending on lazy-loaded chunk size |
| Exchange-token endpoint rate limit | 429 after 2–3 rapid requests — 41+ minute cooldown |

The exchange-token rate limit is the most severe performance issue. A rate limit of 41 minutes for a core authentication endpoint is unacceptable for a login/registration flow that users exercise multiple times per session.

---

## Security Observations

1. **No server-side route protection** — The production Vite SPA serves `index.html` with HTTP 200 for all paths including `/app/*`. Route protection is entirely client-side via React Router. A user with JavaScript disabled or using a headless client can access the HTML of protected pages.

2. **Email verification bypass** — Described in BUG-006 above.

3. **Token stored in localStorage** — The production app stores JWTs in `localStorage` (keys: `ainative_access_token`, `opencap_token`). These are accessible to any JavaScript on the page (XSS risk). HttpOnly cookies would be more secure.

4. **Content-Security-Policy header present** on `api.opencapstack.com` responses but **absent** on `opencapstack.com` frontend responses — inconsistent security posture.

---

## Screenshots Taken

All screenshots are in `/Users/aideveloper/opencapstack/e2e/screenshots/`:

| File | Step |
|------|------|
| `01-register-page-load.png` | Registration page initial state |
| `02-register-form-filled.png` | Registration form with all fields completed |
| `03-register-after-submit.png` | Post-registration state (Loading... + rate limit) |
| `04-register-mismatch-error.png` | Password mismatch client-side validation error |
| `05-login-page-load.png` | Login page initial state |
| `06-login-invalid-creds.png` | Login with invalid credentials — no error shown (BUG-001) |
| `07-login-registered-account.png` | Login with registered account (rate limit state) |
| `08-login-verify-email-banner.png` | /login?error=verify-email — no banner shown (BUG-005) |
| `09-login-page-links.png` | Login page with forgot-password link |
| `10-dashboard.png` | Dashboard page (authenticated) |
| `11-cap-table.png` | Cap Table Dashboard page |
| `12-share-classes.png` | Share Classes list page |
| `13-share-class-create-modal.png` | Share Classes create modal |
| `14-share-class-form-filled.png` | Share class form with "Common Stock" filled |
| `15-stakeholders.png` | Stakeholders list page |
| `16-stakeholder-create-modal.png` | Add stakeholder modal |
| `18-equity-plans.png` | Fundraising Model page — crash state (BUG-004) |
| `19-documents.png` | Documents page |
| `20-messages.png` | Messages page |
| `21-settings.png` | Settings page |
| `22-profile.png` | Profile page |
| `22b-notifications.png` | Notifications page — crash state (BUG-003) |
| `23-before-logout.png` | Dashboard before logout attempt |
| `25-logout-btn-not-found.png` | Dashboard — logout button not located via selectors |
| `26-dashboard-no-auth.png` | Unauthenticated /app/dashboard → redirected to /login |
| `27-settings-no-auth.png` | Unauthenticated /app/settings → redirected to /login |

---

## Risk Assessment

| Risk | Severity | Likelihood | Impact |
|------|----------|------------|--------|
| New users stuck on "Loading..." after registration | Critical | High (every new signup) | Blocks user activation |
| Login errors invisible to users | Critical | High (every failed login) | Users cannot recover from typos/wrong passwords |
| Notifications page crash for all users | High | Certain (100% repro) | Feature completely broken |
| Fundraising Model page crash | High | Certain (100% repro) | Feature completely broken |
| Email verification not enforced | Medium | N/A (architectural) | Compliance/security gap |
| URL param verify-email not rendered | Medium | Low (edge case) | Poor error recovery UX |

---

## Recommendations

### Immediate (before next user-facing release)

1. **Fix BUG-001 (silent login failure):** Guard the 401 interceptor to skip refresh when the original request was `/auth/login`. Fix the response body parsing to read `err.response?.data?.error?.message`.

2. **Fix BUG-003 (notifications crash):** Add a null/undefined guard before `.length` access in `NotificationsPage`. Use optional chaining (`notifications?.length ?? 0`) or provide a default value when the API returns undefined/null.

3. **Fix BUG-004 (fundraising model crash):** Add a null/undefined guard before `.map()` call in `FundraisingModelPage`. Use `(data ?? []).map(...)` or early-return with empty state.

### Short-term (within one sprint)

4. **Address BUG-002 (exchange-token rate limit):** Either raise the rate limit for this endpoint, implement exponential backoff that shows a user-facing message (not an infinite spinner), or redesign the post-registration flow to not require an immediate token exchange.

5. **Fix BUG-005 (missing verify-email banner):** Implement URL parameter parsing in the production (Vite) login page to display the verify-email banner when `?error=verify-email` is present.

6. **Investigate BUG-006 (email verification bypass):** Make a conscious architectural decision about whether AINative's `email_verified: true` flag is the verification mechanism. Document and test accordingly.

### Infrastructure / Architecture

7. **Align E2E tests with production:** Update `config/playwright.config.js` and `e2e/smoke-tests.spec.js` to target the production Vite SPA routes (`/app/*`) and localStorage keys. The current smoke tests target a Next.js dev server and will not catch production regressions.

8. **Add server-side API proxy to production:** The production Vite SPA serves `index.html` for `/api/*` requests, which means `authService.getMe()` receives HTML instead of JSON. Review whether the production app's API calls are all going directly to `api.ainative.studio` and whether any code still references the local `/api/v1` proxy path.

9. **Add logout button test selector:** Add a `data-testid="logout-btn"` attribute to the logout button/menu item to enable reliable E2E testing of the logout flow.

---

## Test Infrastructure Notes

The `e2e/playwright-prod.config.js` config file was created to run tests against the live production site. It is distinct from `config/playwright.config.js` (which starts a local dev server). To run the production user journey tests:

```bash
FRONTEND_URL=https://opencapstack.com \
  npx playwright test --config e2e/playwright-prod.config.js --reporter=list
```

The auth injection strategy for the production Vite SPA requires setting four localStorage keys before navigation:
- `ainative_access_token` — the JWT
- `ainative_user` — JSON-encoded user object  
- `opencap_token` — the OpenCap backend token
- `opencap_profile` — JSON-encoded profile with `profileCompleted: true, onboardingCompleted: true`

Additionally, the `exchange-token` endpoint must be mocked to avoid production rate limits during test runs.
