# Webhooks APIs

**Endpoint Count:** 1

## Overview

This category contains 1 endpoints for webhooks operations.


## Webhooks


### `POST /v1/webhooks/sila`

**Summary:** Handle Sila Webhook

Handle Sila webhook events

Processes webhook events from Sila for transaction status updates.
Supports the following event types:
- transaction.success: Transaction completed successfully
- transaction.failed: Transaction failed
- transaction.queued: Transaction queued for processing
- transaction.review: Transaction under review

Args:
    payload: Sila webhook payload
    request: FastAPI request object
    db: Database session

Returns:
    WebhookResponse: Processing confirmation

Raises:
    HTTPException 400: If webhook validation fails
    HTTPException 500: If webhook processing fails

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
