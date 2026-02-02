# 📺 Cloudflare Stream Webhooks APIs

**Endpoint Count:** 1

## Overview

This category contains 1 endpoints for 📺 cloudflare stream webhooks operations.


## 📺 Cloudflare Stream Webhooks


### `POST /webhooks/cloudflare/stream`

**Summary:** Handle Cloudflare Stream Webhook

Handle Cloudflare Stream webhook events.

Events:
- live_input.connected: Stream started broadcasting
- live_input.disconnected: Stream stopped broadcasting
- video.ready: VOD recording is available

Security:
- Verifies webhook signature using CLOUDFLARE_WEBHOOK_SECRET
- Rejects requests with invalid signatures

**Parameters:**

- `Webhook-Signature` (header): No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
