# 📊 Conversion Tracking APIs

**Endpoint Count:** 6

## Overview

This category contains 6 endpoints for 📊 conversion tracking operations.


## 📊 Conversion Tracking


### `GET /v1/events/conversions`

**Summary:** Get Conversions

Get conversion data with attribution

Query parameters:
- start_date: YYYY-MM-DD (default: 30 days ago)
- end_date: YYYY-MM-DD (default: today)
- utm_source: Filter by traffic source
- utm_campaign: Filter by campaign
- event_type: Filter by event type

**Parameters:**

- `start_date` (query): No description
- `end_date` (query): No description
- `utm_source` (query): No description
- `utm_campaign` (query): No description
- `event_type` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/events/funnel`

**Summary:** Update Funnel Stage

Update conversion funnel stage

Alternative endpoint for explicit funnel stage updates

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `OPTIONS /v1/events/funnel`

**Summary:** Funnel Options

Handle CORS preflight for funnel endpoint

**Success Response (200):** Successful Response

---

### `GET /v1/events/reconcile`

**Summary:** Reconcile Ga Vs Database

Reconcile GA4 events vs database events

Compares Google Analytics data with database to identify discrepancies

**Parameters:**

- `start_date` (query): No description
- `end_date` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/events/track`

**Summary:** Track Conversion Event

Track conversion event server-side

This is the PRIMARY endpoint for all conversion tracking. It:
1. Records event in database with full attribution
2. Updates conversion funnel if applicable
3. Returns success/failure status

IMPORTANT: This endpoint is PUBLIC (no auth required) for frontend tracking

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `OPTIONS /v1/events/track`

**Summary:** Track Options

Handle CORS preflight for conversion tracking endpoint

This endpoint explicitly handles OPTIONS requests to fix CORS preflight
when Kong Gateway is in front of FastAPI. Without this, browsers using
withCredentials get 405 errors on preflight.

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
