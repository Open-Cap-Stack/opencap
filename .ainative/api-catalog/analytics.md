# Analytics APIs

**Endpoint Count:** 110

## Overview

This category contains 110 endpoints for analytics operations.


## Admin API


### `GET /admin/deployment-analytics/compare`

**Summary:** Compare Deployments

Compare two deployments to identify differences.

GIVEN two deployment IDs
WHEN comparing deployments
THEN return detailed comparison including configuration and artifacts

**Parameters:**

- `deployment_id1` (query) *(required)*: First deployment ID
- `deployment_id2` (query) *(required)*: Second deployment ID

**Success Response (200):** Successful Response

---

### `GET /admin/deployment-analytics/configuration/{deployment_id}`

**Summary:** Get Deployment Configuration

Get detailed configuration for a deployment.

GIVEN a deployment ID
WHEN requesting configuration details
THEN return comprehensive configuration information

**Parameters:**

- `deployment_id` (path) *(required)*: Deployment ID

**Success Response (200):** Successful Response

---

### `PUT /admin/deployment-analytics/configuration/{deployment_id}`

**Summary:** Update Deployment Configuration

Update configuration for a pending deployment.

GIVEN a deployment ID and new configuration
WHEN updating the configuration
THEN store the updated configuration in the database

**Parameters:**

- `deployment_id` (path) *(required)*: Deployment ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/deployment-analytics/metrics`

**Summary:** Get Deployment Metrics

Get deployment performance metrics over time.

GIVEN optional filter criteria and time interval
WHEN requesting deployment metrics
THEN return time-series metrics

**Parameters:**

- `environment_id` (query): Environment ID to filter by
- `days` (query): Number of days to include in metrics
- `interval` (query): Time interval for aggregation (day, week, month)

**Success Response (200):** Successful Response

---

### `GET /admin/deployment-analytics/status/summary`

**Summary:** Get Deployment Status Summary

Get a summary of deployment statuses.

GIVEN optional filter criteria
WHEN requesting deployment status summary
THEN return aggregated status metrics

**Parameters:**

- `environment_id` (query): Environment ID to filter by
- `days` (query): Number of days to include in the summary

**Success Response (200):** Successful Response

---

### `GET /admin/monitoring-alerts/monitoring/alert-rules`

**Summary:** Get Alert Rules

Get configured alert rules

**Success Response (200):** Successful Response

---

### `POST /admin/monitoring-alerts/monitoring/alert-rules`

**Summary:** Create Alert Rule

Create a new alert rule

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/monitoring-alerts/monitoring/alerts`

**Summary:** Get Alerts

Get alerts with filtering options

**Parameters:**

- `status` (query): No description
- `severity` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/monitoring-alerts/monitoring/alerts/{alert_id}/acknowledge`

**Summary:** Acknowledge Alert

Acknowledge an alert

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/monitoring-alerts/monitoring/alerts/{alert_id}/resolve`

**Summary:** Resolve Alert

Resolve an alert

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/monitoring-alerts/monitoring/dashboard`

**Summary:** Get Monitoring Dashboard

Get comprehensive monitoring dashboard

**Success Response (200):** Successful Response

---

### `GET /admin/monitoring-alerts/monitoring/health`

**Summary:** Get Monitoring Health

Get monitoring system health status

**Success Response (200):** Successful Response

---

### `GET /admin/monitoring-alerts/monitoring/metrics`

**Summary:** Get Performance Metrics

Get detailed performance metrics

**Parameters:**

- `metric_type` (query): No description
- `time_range` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/monitoring-alerts/monitoring/notifications`

**Summary:** Get Notification Channels

Get notification channel configuration

**Success Response (200):** Successful Response

---

### `POST /admin/monitoring-alerts/monitoring/notifications/{channel_id}/test`

**Summary:** Test Notification Channel

Test a notification channel

**Parameters:**

- `channel_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/performance/database/health`

**Summary:** Get Database Health

Get comprehensive database health status

**Success Response (200):** Successful Response

---

### `GET /admin/performance/database/metrics`

**Summary:** Get Database Metrics

Get comprehensive database performance metrics

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/performance/database/optimize`

**Summary:** Optimize Database

Trigger database optimization tasks

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/performance/database/scaling`

**Summary:** Get Scaling Recommendations

Get database scaling recommendations

**Success Response (200):** Successful Response

---

### `GET /admin/performance/optimization/history`

**Summary:** Get Optimization History

Get history of database optimizations

**Parameters:**

- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/prompt-analytics/alerts/rules`

**Summary:** Create Alert Rule

Create a new alert rule for metric monitoring

**Features:**
- Custom threshold conditions
- Multiple severity levels
- Configurable time windows
- Real-time evaluation

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/prompt-analytics/analytics/summary`

**Summary:** Get Analytics Summary

Get high-level analytics summary

**Features:**
- Key performance indicators
- Period-over-period comparison
- Health status overview
- Usage statistics

**Parameters:**

- `days` (query): Number of days for summary

**Success Response (200):** Success

---

### `GET /admin/prompt-analytics/charts/time-series`

**Summary:** Get Time Series Chart

Get time series chart data for a specific metric

**Features:**
- Interactive chart data
- Multiple prompt comparison
- Trend lines and annotations
- Export-ready format

**Parameters:**

- `metric_name` (query) *(required)*: Metric to chart
- `time_window` (query): Time window
- `prompt_ids` (query): Filter by prompt IDs

**Success Response (200):** Success

---

### `POST /admin/prompt-analytics/dashboard`

**Summary:** Get Dashboard Data

Get comprehensive dashboard data

**Features:**
- Configurable time windows
- Multi-dimensional filtering
- Real-time aggregations
- Trend analysis and insights

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/prompt-analytics/export/data`

**Summary:** Export Analytics Data

Export analytics data in various formats

**Features:**
- Multiple export formats
- Comprehensive data inclusion
- Filtered exports
- Download-ready files

**Parameters:**

- `format` (query): Export format (json, csv, xlsx)
- `time_window` (query): Time window
- `metric_types` (query): Filter by metric types

**Success Response (200):** Success

---

### `GET /admin/prompt-analytics/health`

**Summary:** Health Check

Health check endpoint for analytics service

**Success Response (200):** Success

---

### `POST /admin/prompt-analytics/metrics`

**Summary:** Record Metric

Record a new metric data point

**Features:**
- Real-time metric ingestion
- Multiple metric type support
- Automatic alert checking
- Metadata enrichment

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/prompt-analytics/metrics/realtime`

**Summary:** Get Real Time Metrics

Get real-time metrics from buffer

**Features:**
- Live metric streaming
- Configurable time windows
- Metric filtering
- Trend indicators

**Parameters:**

- `metric_names` (query): Specific metrics to retrieve
- `last_n_minutes` (query): Time window for recent data

**Success Response (200):** Success

---

### `GET /admin/prompt-analytics/prompts/{prompt_id}/report`

**Summary:** Get Prompt Performance Report

Get detailed performance report for a specific prompt

**Features:**
- Version performance analysis
- A/B test integration
- Quality trend analysis
- Peer benchmarking

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `time_window` (query): Time window for analysis

**Success Response (200):** Success

---

### `GET /v1/admin/deployment-analytics/compare`

**Summary:** Compare Deployments

Compare two deployments to identify differences.

GIVEN two deployment IDs
WHEN comparing deployments
THEN return detailed comparison including configuration and artifacts

**Parameters:**

- `deployment_id1` (query) *(required)*: First deployment ID
- `deployment_id2` (query) *(required)*: Second deployment ID

**Success Response (200):** Successful Response

---

### `GET /v1/admin/deployment-analytics/configuration/{deployment_id}`

**Summary:** Get Deployment Configuration

Get detailed configuration for a deployment.

GIVEN a deployment ID
WHEN requesting configuration details
THEN return comprehensive configuration information

**Parameters:**

- `deployment_id` (path) *(required)*: Deployment ID

**Success Response (200):** Successful Response

---

### `PUT /v1/admin/deployment-analytics/configuration/{deployment_id}`

**Summary:** Update Deployment Configuration

Update configuration for a pending deployment.

GIVEN a deployment ID and new configuration
WHEN updating the configuration
THEN store the updated configuration in the database

**Parameters:**

- `deployment_id` (path) *(required)*: Deployment ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/deployment-analytics/metrics`

**Summary:** Get Deployment Metrics

Get deployment performance metrics over time.

GIVEN optional filter criteria and time interval
WHEN requesting deployment metrics
THEN return time-series metrics

**Parameters:**

- `environment_id` (query): Environment ID to filter by
- `days` (query): Number of days to include in metrics
- `interval` (query): Time interval for aggregation (day, week, month)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/deployment-analytics/status/summary`

**Summary:** Get Deployment Status Summary

Get a summary of deployment statuses.

GIVEN optional filter criteria
WHEN requesting deployment status summary
THEN return aggregated status metrics

**Parameters:**

- `environment_id` (query): Environment ID to filter by
- `days` (query): Number of days to include in the summary

**Success Response (200):** Successful Response

---

### `GET /v1/admin/monitoring-alerts/monitoring/alert-rules`

**Summary:** Get Alert Rules

Get configured alert rules

**Success Response (200):** Successful Response

---

### `POST /v1/admin/monitoring-alerts/monitoring/alert-rules`

**Summary:** Create Alert Rule

Create a new alert rule

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/monitoring-alerts/monitoring/alerts`

**Summary:** Get Alerts

Get alerts with filtering options

**Parameters:**

- `status` (query): No description
- `severity` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/monitoring-alerts/monitoring/alerts/{alert_id}/acknowledge`

**Summary:** Acknowledge Alert

Acknowledge an alert

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/monitoring-alerts/monitoring/alerts/{alert_id}/resolve`

**Summary:** Resolve Alert

Resolve an alert

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/monitoring-alerts/monitoring/dashboard`

**Summary:** Get Monitoring Dashboard

Get comprehensive monitoring dashboard

**Success Response (200):** Successful Response

---

### `GET /v1/admin/monitoring-alerts/monitoring/health`

**Summary:** Get Monitoring Health

Get monitoring system health status

**Success Response (200):** Successful Response

---

### `GET /v1/admin/monitoring-alerts/monitoring/metrics`

**Summary:** Get Performance Metrics

Get detailed performance metrics

**Parameters:**

- `metric_type` (query): No description
- `time_range` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/monitoring-alerts/monitoring/notifications`

**Summary:** Get Notification Channels

Get notification channel configuration

**Success Response (200):** Successful Response

---

### `POST /v1/admin/monitoring-alerts/monitoring/notifications/{channel_id}/test`

**Summary:** Test Notification Channel

Test a notification channel

**Parameters:**

- `channel_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/performance/database/health`

**Summary:** Get Database Health

Get comprehensive database health status

**Success Response (200):** Successful Response

---

### `GET /v1/admin/performance/database/metrics`

**Summary:** Get Database Metrics

Get comprehensive database performance metrics

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/performance/database/optimize`

**Summary:** Optimize Database

Trigger database optimization tasks

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/performance/database/scaling`

**Summary:** Get Scaling Recommendations

Get database scaling recommendations

**Success Response (200):** Successful Response

---

### `GET /v1/admin/performance/optimization/history`

**Summary:** Get Optimization History

Get history of database optimizations

**Parameters:**

- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/prompt-analytics/alerts/rules`

**Summary:** Create Alert Rule

Create a new alert rule for metric monitoring

**Features:**
- Custom threshold conditions
- Multiple severity levels
- Configurable time windows
- Real-time evaluation

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/prompt-analytics/analytics/summary`

**Summary:** Get Analytics Summary

Get high-level analytics summary

**Features:**
- Key performance indicators
- Period-over-period comparison
- Health status overview
- Usage statistics

**Parameters:**

- `days` (query): Number of days for summary

**Success Response (200):** Success

---

### `GET /v1/admin/prompt-analytics/charts/time-series`

**Summary:** Get Time Series Chart

Get time series chart data for a specific metric

**Features:**
- Interactive chart data
- Multiple prompt comparison
- Trend lines and annotations
- Export-ready format

**Parameters:**

- `metric_name` (query) *(required)*: Metric to chart
- `time_window` (query): Time window
- `prompt_ids` (query): Filter by prompt IDs

**Success Response (200):** Success

---

### `POST /v1/admin/prompt-analytics/dashboard`

**Summary:** Get Dashboard Data

Get comprehensive dashboard data

**Features:**
- Configurable time windows
- Multi-dimensional filtering
- Real-time aggregations
- Trend analysis and insights

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/prompt-analytics/export/data`

**Summary:** Export Analytics Data

Export analytics data in various formats

**Features:**
- Multiple export formats
- Comprehensive data inclusion
- Filtered exports
- Download-ready files

**Parameters:**

- `format` (query): Export format (json, csv, xlsx)
- `time_window` (query): Time window
- `metric_types` (query): Filter by metric types

**Success Response (200):** Success

---

### `GET /v1/admin/prompt-analytics/health`

**Summary:** Health Check

Health check endpoint for analytics service

**Success Response (200):** Success

---

### `POST /v1/admin/prompt-analytics/metrics`

**Summary:** Record Metric

Record a new metric data point

**Features:**
- Real-time metric ingestion
- Multiple metric type support
- Automatic alert checking
- Metadata enrichment

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/prompt-analytics/metrics/realtime`

**Summary:** Get Real Time Metrics

Get real-time metrics from buffer

**Features:**
- Live metric streaming
- Configurable time windows
- Metric filtering
- Trend indicators

**Parameters:**

- `metric_names` (query): Specific metrics to retrieve
- `last_n_minutes` (query): Time window for recent data

**Success Response (200):** Success

---

### `GET /v1/admin/prompt-analytics/prompts/{prompt_id}/report`

**Summary:** Get Prompt Performance Report

Get detailed performance report for a specific prompt

**Features:**
- Version performance analysis
- A/B test integration
- Quality trend analysis
- Peer benchmarking

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `time_window` (query): Time window for analysis

**Success Response (200):** Success

---

## DevOps Performance Monitoring


### `GET /v1/monitoring/alerts`

**Summary:** Get Performance Alerts

Get performance alerts with filtering options

Returns:
- Active and historical alerts
- Alert statistics and trends
- Alert resolution tracking

**Parameters:**

- `hours` (query): Hours of alert history
- `severity` (query): No description
- `resolved` (query): Filter by resolution status

**Success Response (200):** Successful Response

---

### `POST /v1/monitoring/alerts/{alert_id}/resolve`

**Summary:** Resolve Alert

Mark a performance alert as resolved

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/monitoring/dashboard`

**Summary:** Get Monitoring Dashboard

Get comprehensive real-time monitoring dashboard data

Returns:
- System health overview
- Current performance metrics
- Historical trends (CPU, memory, response times)
- Active alerts and notifications
- Top performing/problematic endpoints
- Automated performance recommendations

**Parameters:**

- `hours` (query): Hours of historical data to include

**Success Response (200):** Successful Response

---

### `GET /v1/monitoring/endpoints/performance`

**Summary:** Get Endpoint Performance Analysis

Get detailed endpoint performance analysis

**Parameters:**

- `hours` (query): Hours of performance data
- `limit` (query): Number of endpoints to return
- `sort_by` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/monitoring/health-check`

**Summary:** Monitoring Health Check

Health check for the monitoring system itself

**Success Response (200):** Successful Response

---

### `GET /v1/monitoring/metrics/current`

**Summary:** Get Current Metrics

Get current real-time system performance metrics

Returns:
- Current CPU, memory, disk usage
- Network activity and connections
- Process information
- Load averages

**Success Response (200):** Successful Response

---

### `GET /v1/monitoring/recommendations`

**Summary:** Get Performance Recommendations

Get automated performance optimization recommendations

**Success Response (200):** Successful Response

---

### `POST /v1/monitoring/start`

**Summary:** Start Monitoring

Start the performance monitoring system

**Success Response (200):** Successful Response

---

### `POST /v1/monitoring/stop`

**Summary:** Stop Monitoring

Stop the performance monitoring system

**Success Response (200):** Successful Response

---

### `GET /v1/monitoring/trends/response-time`

**Summary:** Get Response Time Trends

Get detailed response time trend analysis

**Parameters:**

- `hours` (query): Hours of trend data
- `endpoint` (query): Filter by specific endpoint

**Success Response (200):** Successful Response

---

## DevOps Security Monitoring


### `GET /v1/security/blocked-ips`

**Summary:** Get Blocked Ips

Get all currently blocked IP addresses with details

**Success Response (200):** Successful Response

---

### `POST /v1/security/blocked-ips/clear-all`

**Summary:** Clear All Blocked Ips

Clear all blocked IP addresses (for development/debugging)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/security/blocked-ips/{ip_address}/block`

**Summary:** Block Ip Address

Manually block an IP address

**Parameters:**

- `ip_address` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/security/blocked-ips/{ip_address}/unblock`

**Summary:** Unblock Ip Address

Manually unblock an IP address

**Parameters:**

- `ip_address` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/security/configuration`

**Summary:** Get Security Configuration

Get current security monitoring configuration

**Success Response (200):** Successful Response

---

### `GET /v1/security/dashboard`

**Summary:** Get Security Dashboard

Get comprehensive security monitoring dashboard data

Returns:
- Security event overview and statistics
- Top threat sources and attack patterns
- Blocked IP addresses and reputation data
- Recent security events and alerts
- Security monitoring system status

**Parameters:**

- `hours` (query): Hours of security data to include

**Success Response (200):** Successful Response

---

### `GET /v1/security/events`

**Summary:** Get Security Events

Get filtered security events with detailed information

**Parameters:**

- `hours` (query): Hours of event history
- `event_type` (query): Filter by event type
- `threat_level` (query): Filter by threat level
- `source_ip` (query): Filter by source IP
- `limit` (query): Maximum number of events to return

**Success Response (200):** Successful Response

---

### `GET /v1/security/health-check`

**Summary:** Security Monitoring Health Check

Health check for the security monitoring system

**Success Response (200):** Successful Response

---

### `GET /v1/security/ip-reputation`

**Summary:** Get Ip Reputation

Get IP reputation data with sorting and filtering

**Parameters:**

- `limit` (query): Number of IPs to return
- `sort_by` (query): No description
- `order` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/security/start`

**Summary:** Start Security Monitoring

Start the security monitoring system

**Success Response (200):** Successful Response

---

### `POST /v1/security/stop`

**Summary:** Stop Security Monitoring

Stop the security monitoring system

**Success Response (200):** Successful Response

---

### `GET /v1/security/threat-statistics`

**Summary:** Get Threat Statistics

Get detailed threat statistics and analysis

**Parameters:**

- `hours` (query): Hours of data to analyze

**Success Response (200):** Successful Response

---

## MCP Proxy Metrics


### `GET /v1/mcp/proxy/health`

**Summary:** Get overall proxy health status

Get overall MCP proxy health status including:
- Overall health (healthy/degraded/unhealthy)
- Individual component status (Kong, WebSocket, containers, billing)
- Health score (0-100)
- Uptime percentage
- Last incident timestamp

Available to all authenticated users.

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/metrics`

**Summary:** Get current MCP proxy metrics

Get comprehensive current proxy metrics including:
- Kong Gateway metrics (requests, response times, errors, rate limiting)
- WebSocket statistics (connections, throughput, bytes transferred)  
- Container health data (status, response times, availability)
- Billing integration metrics (API costs, credit usage, user activity)

Requires authentication. Admins get full system metrics, users get filtered view.

**Parameters:**

- `include_historical` (query): Include historical trend data
- `time_range` (query): Time range for metrics (1h, 24h, 7d)

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/metrics/billing`

**Summary:** Billing-specific metrics

Get billing system specific metrics including:
- Total API calls and credits consumed
- Active user counts
- Average credits per user
- Peak usage analysis
- Cost breakdown by service

Admin-only endpoint for billing system monitoring.

**Success Response (200):** Successful Response

---

### `POST /v1/mcp/proxy/metrics/clear-cache`

**Summary:** Clear metrics cache

Clear all cached metrics to force fresh collection.
Useful for debugging or after configuration changes.

Admin-only endpoint.

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/metrics/containers`

**Summary:** Container-specific metrics

Get container registry specific metrics including:
- Total, healthy, and unhealthy container counts
- Average response times
- Container uptime statistics
- Resource usage by container

Admin-only endpoint for debugging container health issues.

**Success Response (200):** Successful Response

---

### `POST /v1/mcp/proxy/metrics/export`

**Summary:** Export metrics for external monitoring systems

Export metrics in various formats for external monitoring systems:
- JSON: Structured data for APIs and dashboards
- Prometheus: Time-series format for Prometheus/Grafana
- InfluxDB: Line protocol for InfluxDB/Telegraf

Admin-only endpoint for security and resource protection.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/metrics/kong`

**Summary:** Kong-specific metrics

Get Kong Gateway specific metrics including:
- Request counts and response times
- Error rates and status codes
- Rate limiting statistics
- Bandwidth usage
- Active connections

Admin-only endpoint for debugging Kong gateway issues.

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/metrics/prometheus`

**Summary:** Prometheus metrics endpoint

Direct Prometheus metrics endpoint for external scraping.
Returns metrics in Prometheus text format.

Admin-only for security. External monitoring systems should use this endpoint.

**Success Response (200):** Successful Response

---

### `GET /v1/mcp/proxy/metrics/websocket`

**Summary:** WebSocket-specific metrics

Get WebSocket proxy specific metrics including:
- Active and total connections
- Message throughput (sent/received)
- Bytes transferred
- Connection errors and average duration

Admin-only endpoint for debugging WebSocket proxy issues.

**Success Response (200):** Successful Response

---

## Monitoring


### `GET /metrics`

**Summary:** Application metrics

Prometheus-style metrics endpoint for monitoring

**Success Response (200):** Successful Response

---

### `GET /v1/metrics/health`

**Summary:** Metrics Health Check

Check if metrics collection is operational

**Success Response (200):** Successful Response

---

### `GET /v1/metrics/json`

**Summary:** JSON Metrics

Returns metrics in JSON format for dashboards and monitoring tools

**Parameters:**

- `include_system` (query): Include system metrics (CPU, memory, etc.)
- `include_app` (query): Include application metrics

**Success Response (200):** Successful Response

---

### `GET /v1/metrics/prometheus`

**Summary:** Prometheus Metrics

Returns metrics in Prometheus exposition format for scraping

**Success Response (200):** Successful Response

---

### `POST /v1/metrics/record/agent`

**Summary:** Record Agent Metrics

Manually record agent execution metrics

**Parameters:**

- `agent_role` (query) *(required)*: Agent role
- `agent_type` (query): Agent type
- `status` (query) *(required)*: Execution status (success, failure)
- `duration` (query) *(required)*: Execution duration in seconds

**Success Response (200):** Successful Response

---

### `POST /v1/metrics/record/feedback`

**Summary:** Record RLHF Feedback Metrics

Manually record RLHF feedback metrics

**Parameters:**

- `feedback_type` (query) *(required)*: Feedback type
- `rating` (query) *(required)*: Rating (positive, negative, neutral)
- `agent_role` (query) *(required)*: Agent role that received feedback
- `response_time` (query): Time to receive feedback in seconds

**Success Response (200):** Successful Response

---

### `POST /v1/metrics/record/workflow`

**Summary:** Record Workflow Metrics

Manually record workflow execution metrics

**Parameters:**

- `workflow_type` (query) *(required)*: Type of workflow
- `status` (query) *(required)*: Workflow status (success, failure)
- `duration` (query) *(required)*: Execution duration in seconds
- `steps_executed` (query): Number of steps executed

**Success Response (200):** Successful Response

---

### `GET /v1/metrics/summary`

**Summary:** Metrics Summary

Returns a high-level summary of key metrics

**Success Response (200):** Successful Response

---

## Monitoring Health


### `GET /v1/monitoring/health`

**Summary:** Get Health Status

Get comprehensive health status for all critical services

Performs real connectivity tests for:
- PostgreSQL Database (SELECT 1 query)
- Redis Cache (PING command)
- API Gateway (self-check)
- ZeroDB Core (table existence check)

Each check has a 5-second timeout for reliability.

Returns:
    Health status with service-level details and overall system status

**Success Response (200):** Successful Response

---

## Public API


### `GET /v1/public/ai-usage/aggregate`

**Summary:** Get Usage Aggregate

Get aggregated usage statistics with progress bars

Enhanced with real-time data and plan limits
Issue #166: Adds progress bars, limits, and status indicators

**Parameters:**

- `period` (query): current, last_30_days, all_time

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/cache/metrics`

**Summary:** Get Cache Metrics

Get cache metrics

Currently returns stub data - can be enhanced with real cache metrics later

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/costs`

**Summary:** Get Usage Costs

Get usage costs with breakdown and projections

Enhanced with real billing data from Issue #163

**Parameters:**

- `period` (query): current, last_30_days

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/debug/aggregate-raw`

**Summary:** Debug Aggregate Raw

Debug endpoint to test aggregate logic without exception handling

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/debug/version`

**Summary:** Debug Version

Debug endpoint to verify deployed code version

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/export`

**Summary:** Export Usage Report

Export usage report

NEW in Issue #166: Export capability for usage data

**Parameters:**

- `format` (query): csv or json
- `period` (query): current, last_30_days

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/logs`

**Summary:** Get Usage Logs

Get usage logs for current user

Enhanced with real data from usage tracking tables

**Parameters:**

- `days` (query): No description
- `resource_type` (query): all, api_credits, llm_tokens, storage, mcp

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-usage/requests`

**Summary:** Get Ai Requests

Get AI requests for current user

Enhanced with real data from llm_token_usage table

**Parameters:**

- `page` (query): No description
- `per_page` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/api/public/users/{username}/analytics`

**Summary:** Get Public User Analytics

Get public analytics for a user's streaming profile.

    Returns aggregate statistics including:
    - Total stream views
    - Total followers
    - Average concurrent viewers
    - Total stream hours
    - Most popular streaming category
    - Partner/affiliate status

    **No authentication required** - this is a public endpoint.

    **Privacy**: Only returns publicly visible data. Does not expose:
    - Email addresses
    - Internal UUIDs
    - Private user information
    - Sensitive account details

    **Access**: Only active users are visible. Inactive or deleted accounts return 404.

**Parameters:**

- `username` (path) *(required)*: No description

**Success Response (200):** User analytics retrieved successfully

---

## Tool Analytics


### `GET /v1/tools/analytics/by-tool`

**Summary:** Get Analytics By Tool

Get per-tool analytics breakdown

Returns detailed metrics for each tool:
- Call counts
- Success/error rates
- Execution time percentiles (p50, p95, p99)
- Common error types

User-scoped by default. Admins can use admin=true to see all users.

**Issue #640**: Per-tool analytics endpoint

**Parameters:**

- `start_date` (query): Start date (ISO format)
- `end_date` (query): End date (ISO format)
- `tool_name` (query): Filter by specific tool name
- `admin` (query): Admin mode - see all users (admin only)

**Success Response (200):** Successful Response

---

### `GET /v1/tools/analytics/recent`

**Summary:** Get Recent Executions

Get recent tool executions

Returns the most recent tool execution logs with full details.
Default limit is 50, maximum is 100.

User-scoped by default. Admins can use admin=true to see all users.

**Issue #640**: Recent executions endpoint

**Parameters:**

- `limit` (query): Number of recent executions to return
- `start_date` (query): Start date (ISO format)
- `end_date` (query): End date (ISO format)
- `tool_name` (query): Filter by specific tool name
- `admin` (query): Admin mode - see all users (admin only)

**Success Response (200):** Successful Response

---

### `GET /v1/tools/analytics/summary`

**Summary:** Get Analytics Summary

Get overall tool usage statistics

Returns aggregated metrics:
- Total calls
- Success rate
- Average execution time
- Total errors

User-scoped by default. Admins can use admin=true to see all users.

**Issue #640**: Analytics summary endpoint

**Parameters:**

- `start_date` (query): Start date (ISO format)
- `end_date` (query): End date (ISO format)
- `tool_name` (query): Filter by specific tool name
- `admin` (query): Admin mode - see all users (admin only)

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
