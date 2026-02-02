# Load Testing APIs

**Endpoint Count:** 4

## Overview

This category contains 4 endpoints for load testing operations.


## Load Testing


### `GET /v1/load-testing/results`

**Summary:** Get Load Test Results

Get load test results for user

**Success Response (200):** Successful Response

---

### `POST /v1/load-testing/run`

**Summary:** Run Load Test

Run a load test scenario

This charges credits against the user's account based on test duration and load

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/load-testing/scenarios`

**Summary:** Get Load Test Scenarios

Get user's load testing scenarios

Load testing usage is charged against user credits

**Success Response (200):** Successful Response

---

### `POST /v1/load-testing/scenarios`

**Summary:** Create Load Test Scenario

Create a new load test scenario

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
