# 409A Accountant Review Workflow

## Overview

OpenCap Stack offers AI-powered 409A valuations through an accountant marketplace. Companies pay $999/valuation; accountants receive $249.75 (25%) per completed review, paid weekly via Stripe Connect.

No cron jobs are needed for payouts — Stripe Connect handles the payout schedule natively once configured.

---

## End-to-End Flow

```
Company requests 409A
        ↓
AI generates valuation report (claude-sonnet-4-6 via AINative)
        ↓
Report enters AccountantQueue (status: unassigned)
        ↓
Accountant claims item → adds annotations → approves & signs
        ↓
Admin reviews → releases report to company dashboard
        ↓
Platform transfers $249.75 to accountant's Stripe Connect account
        ↓
Stripe automatically pays out to accountant's bank (weekly, every Monday)
```

---

## Accountant Registration

**Route**: `GET /register/accountant` (frontend, public)

Accountants register via a separate flow that requires an invite code (`ACCOUNTANT_INVITE_CODE` env var, set to `OCS-ACCT-2026` in Railway production).

**Backend**: `POST /api/v1/auth/register` with `role: 'accountant'` and `accountantInviteCode` in the payload. The auth controller validates the invite code before creating the user.

---

## Sidebar Access Control

Accountant users see **only** the "Accountant Dashboard" link in the sidebar — the full cap table/equity/fundraise navigation is hidden. This is enforced in `Sidebar.jsx`:

```jsx
{user?.role === 'accountant' ? (
  <Link href="/accountant">Accountant Dashboard</Link>
) : (
  NAV_GROUPS.map((group) => <NavGroup ... />)
)}
```

Admins see the "Accountant Review" link within the Fundraise nav group (role-gated via `roles: ['accountant', 'admin']` on the nav item).

---

## Payout Architecture: Stripe Connect Express

### Key Insight — No Platform Cron Job Needed

Stripe Connect handles payout scheduling natively. Once a connected account is configured with a weekly schedule, Stripe automatically sweeps the account's balance to the bank every Monday. The platform only needs to:

1. Create the Express account during onboarding
2. Set the payout schedule once (weekly, Monday anchor)
3. Send transfers when a review is completed

### Account Creation

When an accountant begins payout setup:

```javascript
// controllers/accountantController.js — createConnectOnboardingLink
const account = await stripe.accounts.create({
  type: 'express',
  email,
  capabilities: { transfers: { requested: true } },
  metadata: { userId },
});
```

### Payout Schedule Configuration

**Missing — needs implementation.** After the accountant completes onboarding (webhook `account.updated` with `payouts_enabled: true`), set the weekly schedule:

```javascript
await stripe.accounts.update(stripeAccountId, {
  settings: {
    payouts: {
      schedule: {
        interval: 'weekly',
        weekly_anchor: 'monday',
      },
    },
  },
});
```

This is a one-time call. Stripe handles all subsequent payouts automatically.

### Platform Transfer on Review Completion

**Missing — needs implementation.** When `approveAndSign` completes and admin releases the valuation, the platform must transfer the accountant's cut:

```javascript
await stripe.transfers.create({
  amount: 24975,           // $249.75 in cents
  currency: 'usd',
  destination: stripeAccountId,
  description: `409A review fee — valuation ${valuationId}`,
  metadata: { valuationId, accountantUserId: userId },
});
```

Stripe then pays this out to the bank automatically on the next Monday payout cycle.

### Stripe Webhook Handling

**Missing — needs implementation.** Events to handle:

| Event | Action |
|---|---|
| `account.updated` | Check `payouts_enabled` → set weekly payout schedule |
| `transfer.created` | Log transfer in TransferLog model |
| `payout.paid` | Mark accountant payout as disbursed |
| `payout.failed` | Alert accountant to fix bank account |

---

## Implementation Status

| Feature | Status | Location |
|---|---|---|
| Accountant registration page | ✅ Done | `frontend/app/register/accountant/page.jsx` |
| Invite code validation in auth | ✅ Done | `controllers/authController.js` |
| AccountantQueue model | ✅ Done | `models/AccountantQueue.js` |
| Queue API (get/claim/start/approve/release) | ✅ Done | `controllers/accountantController.js` |
| Accountant dashboard (frontend) | ✅ Done | `frontend/app/(dashboard)/accountant/page.jsx` |
| Sidebar role isolation for accountants | ✅ Done | `frontend/components/Layout/Sidebar.jsx` |
| Stripe Connect onboarding link | ✅ Done | `POST /api/v1/accountant/connect/onboard` |
| Stripe Connect status check | ✅ Done | `GET /api/v1/accountant/connect/status` |
| Marketing landing page `/accountants` | ✅ Done | `frontend/app/accountants/page.jsx` |
| Set weekly payout schedule post-onboarding | ❌ Missing | Needs `account.updated` webhook handler |
| Platform transfer on review completion | ❌ Missing | Needs call in `releaseToCompany` handler |
| Stripe webhook endpoint for Connect events | ❌ Missing | Needs new route + handler |
| TransferLog model for audit trail | ❌ Missing | Needs new ZeroDB model |
| Payout failure alerting | ❌ Missing | Needs email + webhook handler |

---

## Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # for Connect webhook verification
FRONTEND_URL=https://app.opencapstack.com
ACCOUNTANT_INVITE_CODE=OCS-ACCT-2026
```

---

## Pricing

| Item | Amount |
|---|---|
| Company pays per 409A | $999.00 |
| Accountant receives (25%) | $249.75 |
| Platform retains (75%) | $749.25 |
| Payout cadence | Weekly (every Monday) |

---

## Related Files

- `controllers/accountantController.js` — all queue and Stripe Connect logic
- `services/stripeService.js` — Stripe API wrapper
- `models/AccountantQueue.js` — review queue model
- `models/Valuation409A.js` — valuation model with accountant review fields
- `routes/v1/accountantRoutes.js` — all `/api/v1/accountant/*` routes
- `frontend/app/(dashboard)/accountant/page.jsx` — accountant dashboard
- `frontend/lib/accountantService.js` — frontend API calls
