# 💰 Payment Webhooks APIs

**Endpoint Count:** 2

## Overview

This category contains 2 endpoints for 💰 payment webhooks operations.


## 💰 Payment Webhooks


### `POST /v1/webhooks/stripe/payment-intent`

**Summary:** Handle Payment Intent Webhook

Handle Stripe Payment Intent webhook events

This endpoint processes payment intent events for the custom invoicing system.

Supported Events:
- payment_intent.succeeded: Payment successful, mark invoice as paid
- payment_intent.payment_failed: Payment failed, log error

Webhook Flow:
1. Verify webhook signature (CRITICAL for security)
2. Extract payment_intent.metadata.invoice_id
3. Look up invoice in database
4. Mark invoice as paid OR log failure
5. Send receipt email (for successful payments)
6. Return 200 OK to Stripe

Security Notes:
- ALWAYS verify webhook signature before processing
- Return 200 OK even on processing errors (prevents Stripe retries)
- Log all events for audit trail

Returns:
    dict: Status message and event details

Raises:
    HTTPException: 400 if signature verification fails

**Parameters:**

- `stripe-signature` (header): No description

**Success Response (200):** Successful Response

---

### `GET /v1/webhooks/stripe/payment-intent/test`

**Summary:** Test Payment Webhook Endpoint

Test endpoint to verify payment webhook is accessible

Returns basic configuration status for debugging.

Use this to verify:
- Webhook endpoint is reachable
- Stripe API key is configured
- Webhook secret is configured

Returns:
    dict: Configuration status

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
