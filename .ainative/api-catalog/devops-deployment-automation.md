# Devops Deployment Automation APIs

**Endpoint Count:** 15

## Overview

This category contains 15 endpoints for devops deployment automation operations.


## DevOps Deployment Automation


### `GET /v1/deployment/alert-rules`

**Summary:** Get Alert Rules

Get all configured alert rules

**Success Response (200):** Successful Response

---

### `POST /v1/deployment/alert-rules`

**Summary:** Add Alert Rule

Add a new alert rule to the automation system

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/deployment/deployments`

**Summary:** Record Deployment

Record a new deployment and start automated monitoring

This endpoint should be called by CI/CD systems after a successful deployment
to trigger automated health checks and performance validation.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/deployment/deployments/status`

**Summary:** Get Deployment Status

Get current deployment status and recent deployment history

**Success Response (200):** Successful Response

---

### `GET /v1/deployment/deployments/{deployment_id}`

**Summary:** Get Deployment Details

Get detailed information about a specific deployment

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/deployment/deployments/{deployment_id}/rollback`

**Summary:** Trigger Manual Rollback

Manually trigger a rollback for a specific deployment

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/deployment/health-checks`

**Summary:** Get Health Checks

Get all configured health checks and their current status

**Success Response (200):** Successful Response

---

### `POST /v1/deployment/health-checks`

**Summary:** Add Health Check

Add a new health check to the monitoring system

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/deployment/health-checks/run`

**Summary:** Run Health Checks

Manually trigger all health checks and return results

**Success Response (200):** Successful Response

---

### `DELETE /v1/deployment/health-checks/{health_check_name}`

**Summary:** Remove Health Check

Remove a health check from the monitoring system

**Parameters:**

- `health_check_name` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/deployment/monitoring/start`

**Summary:** Start Deployment Monitoring

Start the deployment automation monitoring system

**Success Response (200):** Successful Response

---

### `GET /v1/deployment/monitoring/status`

**Summary:** Get Monitoring Status

Get the current status of the deployment monitoring system

**Success Response (200):** Successful Response

---

### `POST /v1/deployment/monitoring/stop`

**Summary:** Stop Deployment Monitoring

Stop the deployment automation monitoring system

**Success Response (200):** Successful Response

---

### `GET /v1/deployment/performance/baseline`

**Summary:** Get Performance Baseline

Get current performance baselines and validation results

**Success Response (200):** Successful Response

---

### `PUT /v1/deployment/performance/baseline`

**Summary:** Update Performance Baseline

Update performance baseline thresholds

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
