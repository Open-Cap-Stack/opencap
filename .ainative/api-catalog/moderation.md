# Moderation APIs

**Endpoint Count:** 6

## Overview

This category contains 6 endpoints for moderation operations.


## Moderation


### `GET /v1/blocked-keywords/`

**Summary:** Get blocked keywords

Get the authenticated user's list of blocked keywords

**Success Response (200):** Successful Response

---

### `POST /v1/blocked-keywords/`

**Summary:** Add blocked keyword

Add a single keyword to the user's blocked list

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `DELETE /v1/blocked-keywords/`

**Summary:** Remove blocked keyword

Remove a keyword from the user's blocked list

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/blocked-keywords/all`

**Summary:** Clear all blocked keywords

Remove all blocked keywords from the user's list

**Success Response (200):** Successful Response

---

### `POST /v1/blocked-keywords/bulk`

**Summary:** Add multiple blocked keywords

Add multiple keywords to the user's blocked list at once

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/blocked-keywords/filter`

**Summary:** Check if content contains blocked keywords

Check if given content should be filtered based on user's blocked keywords

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
