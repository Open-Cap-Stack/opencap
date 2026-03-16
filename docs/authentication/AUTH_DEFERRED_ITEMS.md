# Auth Module — Deferred Items

Tracked items from the auth flow audit (2026-03-15) that are not breaking but should be addressed.

---

## 1. Dead Code Cleanup

### `authenticateWithLogging` / `logAuthError` (authErrorLogger.js)
- **Location**: `middleware/authErrorLogger.js:15-71`
- **Status**: Never imported by any route or middleware. Only used in its own test file.
- **Action**: Delete `authenticateWithLogging` and `logAuthError`. Update `tests/unit/middleware/authErrorLogger.test.js` to remove those test blocks. Keep `debugTokenEndpoint` and `getTokenDebugInfo` which are actively used.

### `checkTokenBlacklist` deprecated sync version (authMiddleware.js)
- **Location**: `middleware/authMiddleware.js:431-435`
- **Status**: Superseded by `isTokenBlacklisted` (async). Only referenced in its own test.
- **Action**: Remove function and its export. Remove test block from `tests/unit/middleware/authMiddleware.test.js`.

---

## 2. Security

### `debugTokenEndpoint` unauthenticated in production
- **Location**: `routes/v1/authRoutes.js:9` — `GET /api/v1/auth/debug-token`
- **Status**: Decodes and displays JWT header, payload (userId, email, role, expiry) without any authentication. Useful for development, risky in production.
- **Action**: Gate behind `NODE_ENV !== 'production'` or add `authenticateToken` middleware. At minimum, return 404 in production.

---

## 3. Schema Gap

### `emailVerified` field missing from User model
- **Location**: Used in `authController.js` at lines ~796, ~859, ~903 (`updateUserProfile`, `sendVerificationEmail`, `verifyEmail`)
- **Status**: Not defined in `models/User.js` schema (line 15-57). ZeroDB stores it as an ad-hoc field but it's never validated or queried with a default.
- **Action**: Add `emailVerified: { type: 'boolean', default: false }` to the User model schema.

---

## 4. Missing Environment Variables

### `JWT_RESET_SECRET`
- **Used by**: `requestPasswordReset`, `verifyResetToken`, `resetPassword`
- **Status**: Not in `.env`. Password reset flow will 500 with `secretOrPrivateKey must have a value`.
- **Action**: Add to `.env` and `.env.example`:
  ```
  JWT_RESET_SECRET=your-secure-jwt-reset-secret-change-this
  ```

### `JWT_VERIFICATION_SECRET`
- **Used by**: `sendVerificationEmailToUser`, `verifyEmail`
- **Status**: Not in `.env`. Email verification flow will 500.
- **Action**: Add to `.env` and `.env.example`:
  ```
  JWT_VERIFICATION_SECRET=your-secure-jwt-verification-secret-change-this
  ```

---

## 5. OAuth Flow Gaps

### `oauthLogin` password for new users
- **Location**: `authController.js:369`
- **Status**: New OAuth users get `bcrypt.hash(Math.random().toString(36).slice(-8), 10)` — a random but short (8-char) password. Not as strong as `crypto.randomBytes(32)` used elsewhere for SSO users.
- **Action**: Align with `provisionAINativeUser` pattern — use `crypto.randomBytes(32).toString('hex')`.

### `oauthLogin` no rate limiting
- **Location**: `routes/v1/authRoutes.js:14`
- **Status**: `POST /oauth-login` has no rate limiter. Google/LinkedIn token verification provides some protection, but the endpoint itself is unprotected.
- **Action**: Add `createEndpointRateLimiter('/api/v1/auth/login')` to share the login rate limit.

---

## 6. Refresh Token Rotation

### No rotation on refresh
- **Location**: `authController.js` — `refreshToken` function
- **Status**: The same refresh token can be reused indefinitely until its 7-day TTL. If stolen, an attacker has 7 days of access.
- **Action**: Issue a new refresh token on each refresh call, and blacklist the old one. This is standard refresh token rotation per OAuth 2.0 best practices.

---

## 7. ZeroDB Remote API Dependency

### In-memory fallback masks production behavior
- **Status**: ZeroDB remote API is down (tokens expired / login broken since 2026-03-15). All operations run on `_localStore` in-memory fallback.
- **Risk**: HIGH — filtering, sorting, pagination, and concurrent writes may behave differently on the real API. No way to verify until API is restored.
- **Action**: When ZeroDB API comes back online, re-run the full smoke test (75 endpoints) and end-to-end workflow tests against the real API.

### `/files` and `/events` endpoints return 500
- **Location**: `fileStorageController.js:187`, `eventStreamingController.js:37`
- **Status**: These call `zerodbService.listFiles()` and `zerodbService.listEvents()` which hit the remote API directly with no in-memory fallback.
- **Action**: Add local fallback for file listing and event listing in `zerodbService.js`, or return empty arrays with a warning when the API is unreachable.

---

## 8. Race Conditions

### Read-modify-write patterns without locking
- **Locations** (10 identified):
  - `stakeholderController.js:157`
  - `SPV.js:60, 198`
  - `SPVasset.js:247`
  - `userController.js:281`
  - `vestingScheduleController.js:238`
  - `investorCommunicationController.js:137`
  - `bulkMessageController.js:348`
  - `waterfallAnalysisController.js:134`
  - `authController.js:382`
- **Status**: These fetch a document, modify it in memory, then write back. Under concurrent requests, a second read could see stale data before the first write completes.
- **Mitigation**: Equity grant exercise already has an invariant check (`exercisedShares <= grantedShares`). The ZeroDBModel has `__v` version-based optimistic locking, but not all controllers use it.
- **Action**: For critical operations (equity exercise, status transitions), ensure version checks are enabled. For lower-risk operations, accept eventual consistency.

---

## 9. Performance Concerns

### `limit: 1000` fetch-all patterns
- **Locations**: `documentController.js:234`, `findDocumentById` fallback at line 337, multiple search helpers in `searchController.js`
- **Status**: Several list endpoints fetch up to 1000 rows then filter/sort/paginate in JavaScript. Works fine for small datasets but will degrade with scale.
- **Action**: When ZeroDB API is back, push filtering/sorting/pagination to the server. Remove client-side `limit: 1000` fallbacks.

### `findOne` client-side fallback
- **Location**: `models/base/ZeroDBModel.js:206-213`
- **Status**: When server-side filtering fails, `findOne` falls back to loading 200 rows and scanning in memory. O(n) per lookup.
- **Action**: Investigate why ZeroDB server-side filtering sometimes fails and fix root cause. Remove or limit the fallback.

---

## 10. Input Validation Gaps

### XSS payloads stored as-is
- **Status**: Text fields (stakeholder name, document title, etc.) accept raw HTML including `<script>` tags. Stored without sanitization.
- **Risk**: LOW for API-only backend (frontend must escape on render). MEDIUM if any server-side rendering is added.
- **Action**: Consider adding server-side HTML sanitization (e.g., `sanitize-html` or `xss` package) as defense-in-depth on user-facing text fields.

### No field length limits on most endpoints
- **Status**: A 100KB stakeholder name or 10KB companyId is accepted and stored. No per-field size validation.
- **Action**: Add `maxLength` validation on string fields in models or input validation middleware.

---

## 11. Legacy / Dead Code

### 3 legacy controllers with Mongoose patterns
- **Files**: `backup.js`, `financialReportCrudController.js`, `financialReportingController.js`
- **Status**: These use `new Model()` + `.save()` (Mongoose patterns) that will crash with ZeroDB models. They appear unmounted in `app.js` but may be referenced dynamically.
- **Action**: Delete or migrate. Verify no dynamic `require()` references them.

### 14 unmounted route files
- **Files**: `aiDocumentRoutes`, `apiMetricsRoutes`, `dataProcessingRoutes`, `digitalSignatureRoutes`, `documentVersionRoutes`, `graphAnalyticsRoutes`, `investmentSimilarityRoutes`, `monitoringRoutes`, `paymentRoutes`, `similarityRoutes`, `subscriptionRoutes`, `subscriptionTierRoutes`, `tenderOfferRoutes`, `webhookRoutes`
- **Status**: Route files exist in `routes/v1/` but are not mounted in `app.js`. Code is unreachable.
- **Action**: Either mount them or delete them to reduce confusion.

---

## 12. Missing Automated Integration Tests

### No CI gate for runtime behavior
- **Status**: All 2812 tests are unit tests with mocked dependencies. The smoke test (75 endpoints) and workflow tests (39 assertions) were run manually.
- **Risk**: A future code change could break runtime behavior without any test catching it, since unit tests mock the data layer.
- **Action**: Add automated integration tests that start the real server and hit endpoints. Run in CI alongside unit tests.

---

## 13. npm Vulnerabilities

### 3 remaining vulnerabilities (require major version bumps)
- **Status**: `npm audit fix` resolved 7/10 vulnerabilities. Remaining 3 are in `nodemailer` and require breaking changes.
- **Action**: Run `npm audit fix --force` in a dedicated PR with regression testing, or pin to a patched minor version when available.

---

## 14. `findByIdAndUpdate` Response Format

### Returns metadata instead of updated document
- **Location**: `databaseAdapter.findByIdAndUpdate` → delegates to `ZeroDBModel.findOneAndUpdate`
- **Status**: Several update endpoints return `{ acknowledged: true, modifiedCount: 1 }` instead of the updated document. The `{ new: true }` option is passed but the model's `findOneAndUpdate` re-fetches only when `new: true` is set.
- **Risk**: Frontend may expect the full updated document in the response.
- **Action**: Verify `findOneAndUpdate` with `{ new: true }` consistently re-fetches and returns the updated doc. Add integration tests for update response shapes.
