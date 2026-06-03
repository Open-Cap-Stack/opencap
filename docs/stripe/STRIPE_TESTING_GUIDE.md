# Stripe Connect & Payment Testing Guide

## Overview

OpenCap Stack uses Stripe Connect to enable accountants to receive payments for 409A valuation review services. This guide covers testing the Stripe integration end-to-end.

## Prerequisites

- `STRIPE_SECRET_KEY` set in `.env` (test mode key starting with `sk_test_`)
- Admin or accountant role JWT token
- Access to [Stripe Dashboard (Test Mode)](https://dashboard.stripe.com/test)

## Test Credentials

| Field | Value |
|-------|-------|
| Routing Number | `110000000` |
| Account Number | `000999999991` |
| SSN (last 4) | `0000` |
| Address | Any valid US address |

> These are Stripe's [test bank account numbers](https://docs.stripe.com/connect/testing#payouts).

## API Endpoints

### Stripe Connect Onboarding

```bash
# Get onboarding URL (creates Stripe Connect account if needed)
POST /api/v1/accountant/connect/onboard
Authorization: Bearer <token>

# Response:
{ "success": true, "url": "https://connect.stripe.com/setup/e/..." }
```

### Check Connect Status

```bash
GET /api/v1/accountant/connect/status
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "connected": true,
    "chargesEnabled": false,
    "payoutsEnabled": false,
    "stripeAccountId": "acct_...",
    "detailsSubmitted": false
  }
}
```

### Transfer History

```bash
GET /api/v1/accountant/transfers
Authorization: Bearer <token>
```

## End-to-End Testing Flow

### 1. Get a JWT Token

```bash
curl -X POST https://opencapstack.com/api/v1/auth/exchange-token \
  -H "Content-Type: application/json" \
  -d '{"ainativeToken":"<your-token>"}'
```

### 2. Start Stripe Connect Onboarding

```bash
curl -X POST https://opencapstack.com/api/v1/accountant/connect/onboard \
  -H "Authorization: Bearer <jwt>"
```

Open the returned URL in a browser. Complete the form with test data:
- Business type: Individual
- Use the test bank credentials above
- SSN last 4: `0000`

### 3. Verify Connect Status

```bash
curl https://opencapstack.com/api/v1/accountant/connect/status \
  -H "Authorization: Bearer <jwt>"
```

After completing onboarding, `detailsSubmitted` should be `true` and `chargesEnabled`/`payoutsEnabled` should become `true`.

### 4. Full 409A Review Flow with Payment

```bash
# Create queue item (admin only)
curl -X POST https://opencapstack.com/api/v1/accountant/queue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"valuationId":"<id>","companyId":"ainative-studio","priority":"high"}'

# Claim the queue item
curl -X POST https://opencapstack.com/api/v1/accountant/queue/<queueId>/claim \
  -H "Authorization: Bearer <jwt>"

# Start review
curl -X POST https://opencapstack.com/api/v1/accountant/queue/<queueId>/start-review \
  -H "Authorization: Bearer <jwt>"

# Add annotation
curl -X POST https://opencapstack.com/api/v1/accountant/valuations/<valuationId>/annotate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"section":"fairMarketValue","comment":"Review note","severity":"info"}'

# Approve and sign
curl -X POST https://opencapstack.com/api/v1/accountant/valuations/<valuationId>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"confirmApproval":true,"signatureData":"Name, CPA","notes":"Approved after review"}'

# Release to company
curl -X POST https://opencapstack.com/api/v1/accountant/valuations/<valuationId>/release \
  -H "Authorization: Bearer <jwt>"
```

## Stripe Link (Future Enhancement)

Stripe Link enables faster checkout with saved payment methods. Implementation tracked in opencap-frontend#249. Key considerations:

- Use Stripe's Payment Element (not legacy Card Element)
- Payment Element automatically shows Stripe Link when available
- Requires `@stripe/react-stripe-js` and `@stripe/stripe-js` in frontend
- Backend creates PaymentIntent, frontend renders Payment Element

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `detailsSubmitted: false` | Complete all onboarding steps in the Stripe Connect form |
| `chargesEnabled: false` | Stripe needs ~24h in test mode to enable charges after onboarding |
| Connect URL expired | Call `/connect/onboard` again to get a fresh URL |
| 500 on queue creation | Table auto-creates on first use; retry the request |

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...          # Required - Stripe test secret key
STRIPE_CONNECT_CLIENT_ID=ca_...        # Optional - for OAuth Connect flow
FRONTEND_URL=https://opencapstack.com  # Used for Connect return URLs
```
