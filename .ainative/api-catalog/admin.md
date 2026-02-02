# Admin APIs

**Endpoint Count:** 438

## Overview

This category contains 438 endpoints for admin operations.


## Active Projects Dashboard


### `GET /v1/active-projects/`

**Summary:** List active projects with Agent Swarm

Get a list of all projects with Agent Swarm running or recently active.

    Returns project summary including:
    - Project status and progress
    - Active agents count
    - Quick stats (issues, PRs, sprints)
    - Current stage information

    Supports pagination and sorting options.

**Parameters:**

- `page` (query): Page number
- `page_size` (query): Items per page
- `sort_by` (query): Sort order
- `status_filter` (query): Filter by status (multiple allowed)

**Success Response (200):** Successful Response

---

### `GET /v1/active-projects/activity/feed`

**Summary:** Get activity feed

Get recent activity feed for active projects.

    Shows:
    - Issue completions
    - PR creations and merges
    - Sprint completions
    - Agent activities
    - Errors and notifications

    Supports filtering by project IDs.

**Parameters:**

- `project_ids` (query): Filter by project IDs
- `limit` (query): Maximum items to return
- `offset` (query): Offset for pagination
- `hours_back` (query): Hours to look back

**Success Response (200):** Successful Response

---

### `GET /v1/active-projects/summary`

**Summary:** Get dashboard summary statistics

Get summary statistics for the Active Projects Dashboard.

    Returns:
    - Count of active, completed, failed, and paused projects
    - Average progress of active projects
    - Recent completions and failures (24h)

**Success Response (200):** Successful Response

---

### `GET /v1/active-projects/{project_id}`

**Summary:** Get project details

Get detailed status of a specific project with Agent Swarm.

    Returns complete project information including:
    - All agents and their current status
    - Detailed progress information
    - Full statistics
    - Error information (if any)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/active-projects/{project_id}/agents`

**Summary:** Get project agents

Get detailed information about all agents working on a project.

    Returns status, progress, and current task for each agent.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/active-projects/{project_id}/pause`

**Summary:** Pause project execution

Pause a running project's Agent Swarm execution.

    The project can be resumed later using the resume endpoint.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/active-projects/{project_id}/resume`

**Summary:** Resume paused project

Resume a paused project's Agent Swarm execution.

    Only projects that were paused (not stopped) can be resumed.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/active-projects/{project_id}/stop`

**Summary:** Stop project execution

Stop a project's Agent Swarm execution permanently.

    This action cannot be undone. The project execution will be cancelled.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

## Admin API


### `GET /admin/`

**Summary:** Get Admin Api Info

Get information about the admin API (admin users only)

**Success Response (200):** Successful Response

---

### `GET /admin/audit/compliance/report`

**Summary:** Generate Compliance Report

Generate compliance report for specified standard and period

**Parameters:**

- `standard` (query): No description
- `start_date` (query) *(required)*: No description
- `end_date` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/audit/compliance/standards`

**Summary:** Get Supported Compliance Standards

Get list of supported compliance standards and their requirements

**Success Response (200):** Successful Response

---

### `POST /admin/audit/export`

**Summary:** Export Audit Data

Export audit data for compliance or analysis

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/audit/log`

**Summary:** Log Audit Event

Log an audit event

**Parameters:**

- `action` (query) *(required)*: No description
- `resource_type` (query) *(required)*: No description
- `resource_id` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/audit/logs`

**Summary:** Get Audit Logs

Get paginated audit logs with filtering

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `action` (query): No description
- `user_id` (query): No description
- `resource_type` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/audit/summary`

**Summary:** Get Audit Summary

Get audit summary for specified period

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/audit/user/{user_id}`

**Summary:** Get User Audit Trail

Get complete audit trail for a specific user

**Parameters:**

- `user_id` (path) *(required)*: No description
- `limit` (query): No description
- `action_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/billing/summary`

**Summary:** Get Billing Summary

Get system-wide billing summary across all projects

**Admin Only** - Requires ADMIN or SUPERUSER role

Returns:
    - total_credits_used: System-wide credit usage
    - total_projects: Number of active projects
    - average_credits_per_project: Average credits per project
    - top_projects: Top 10 projects by credit usage
    - breakdown: System-wide breakdown by category

Issue #321 - System-wide billing analytics

**Parameters:**

- `time_range` (query): Time range for summary

**Success Response (200):** Successful Response

---

### `POST /admin/bootstrap/`

**Summary:** Setup Database

Set up the database with required tables

**Success Response (201):** Successful Response

---

### `POST /admin/bootstrap/create-dev-accounts`

**Summary:** Create Dev Accounts

Create development accounts for the team
This endpoint creates admin, sanket, and arkan accounts with API keys

**Success Response (201):** Successful Response

---

### `GET /admin/bootstrap/dev-accounts-info`

**Summary:** Get Dev Accounts Info

Get developer account information including API keys for testing

**Success Response (200):** Successful Response

---

### `POST /admin/bootstrap/fix-users-table`

**Summary:** Fix Users Table

Fix users table by adding missing columns

**Success Response (201):** Successful Response

---

### `POST /admin/bootstrap/generate-fresh-keys`

**Summary:** Generate Fresh Api Keys

Generate fresh API keys for developer accounts for testing

**Success Response (201):** Successful Response

---

### `GET /admin/caching/cache/analytics`

**Summary:** Get Cache Analytics

Get comprehensive cache analytics

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/caching/cache/health`

**Summary:** Get Cache Health Check

Perform comprehensive cache health check

**Success Response (200):** Successful Response

---

### `POST /admin/caching/cache/invalidate`

**Summary:** Invalidate Cache

Invalidate cache entries based on patterns or keys

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/caching/cache/keys`

**Summary:** Get Cache Key Analysis

Analyze cache keys and their usage patterns

**Parameters:**

- `pattern` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/caching/cache/optimize`

**Summary:** Optimize Cache Configuration

Optimize cache configuration based on usage patterns

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/caching/cache/status`

**Summary:** Get Cache Status

Get comprehensive cache system status

**Success Response (200):** Successful Response

---

### `POST /admin/caching/cache/warm`

**Summary:** Warm Cache

Warm cache with frequently accessed data

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/chat-test/test`

**Summary:** Test Chat Endpoint

Minimal chat test endpoint

**Success Response (200):** Successful Response

---

### `POST /admin/comprehensive-evaluation/batch-evaluate`

**Summary:** Batch Comprehensive Evaluation

Start multiple comprehensive evaluations in batch

**Request Body:**
List of evaluation requests

**Returns:**
List of evaluation IDs for tracking progress

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /admin/comprehensive-evaluation/evaluate`

**Summary:** Start Comprehensive Evaluation

Start a comprehensive code evaluation process

This endpoint initiates a comprehensive evaluation that includes:
- Static code analysis for quality, complexity, and style issues
- AI-powered evaluation using DeepEval and PromptFoo
- Meta LLAMA quality assessment using advanced models
- Security vulnerability scanning
- Performance analysis and optimization recommendations

The evaluation runs asynchronously and returns an evaluation_id for tracking progress.

**Request Body:**
- **generated_code**: The AI-generated code to evaluate
- **original_prompt**: Original user prompt/query
- **context**: Context used for generation (optional)
- **expected_output**: Expected/reference code (optional)
- **project_id**: Project context (optional)
- **file_path**: Virtual file path for the code
- **evaluation_options**: Custom evaluation configuration (optional)

**Returns:**
- **evaluation_id**: Unique identifier for tracking the evaluation
- **status**: Current status (should be 'started')
- **estimated_duration**: Estimated time to completion in seconds

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/comprehensive-evaluation/history`

**Summary:** Get Evaluation History

Get evaluation history for the current user

**Query Parameters:**
- **project_id**: Filter by project ID (optional)
- **limit**: Maximum number of records to return (default: 20, max: 100)

**Returns:**
List of evaluation summaries ordered by creation date (newest first)

**Parameters:**

- `project_id` (query): Filter by project ID
- `limit` (query): Maximum number of records to return

**Success Response (200):** Success

---

### `GET /admin/comprehensive-evaluation/results/{evaluation_id}`

**Summary:** Get Evaluation Results

Get the complete results of a comprehensive evaluation

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Query Parameters:**
- **include_detailed**: Include detailed analysis results from all components

**Returns:**
Complete evaluation results including:
- **integrated_score**: Overall quality score (0.0-1.0)
- **quality_grade**: Letter grade (A+ to F)
- **quality_components**: Scores from each evaluation component
- **recommendations**: Prioritized list of improvement recommendations
- **evaluation_summary**: Human-readable summary of results
- **static_analysis_results**: Code quality and complexity analysis
- **ai_evaluation_results**: DeepEval and PromptFoo results
- **meta_llama_assessment**: Meta LLAMA quality assessment
- **security_analysis_results**: Security vulnerability scan
- **performance_analysis_results**: Performance analysis and optimization

**Parameters:**

- `evaluation_id` (path) *(required)*: No description
- `include_detailed` (query): Include detailed analysis results

**Success Response (200):** Success

---

### `DELETE /admin/comprehensive-evaluation/results/{evaluation_id}`

**Summary:** Delete Evaluation Results

Delete evaluation results and cached data

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Returns:**
Confirmation of deletion

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /admin/comprehensive-evaluation/status/{evaluation_id}`

**Summary:** Get Evaluation Status

Get the current status of a comprehensive evaluation

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Returns:**
- **evaluation_id**: The evaluation identifier
- **status**: Current status (running, completed, failed)
- **progress**: Progress percentage (0-100)
- **current_step**: Description of current processing step
- **error**: Error message if status is 'failed'

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /admin/comprehensive-evaluation/summary/{evaluation_id}`

**Summary:** Get Evaluation Summary

Get a summary of evaluation results

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Returns:**
Summary of evaluation results with key metrics

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /admin/credits/balance`

**Summary:** Get Admin Credits Balance

Get credits balance information for admin dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/credits/grant`

**Summary:** Grant Credits To User

Grant credits to a specific user (admin only)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/credits/transactions`

**Summary:** Get Admin Credit Transactions

Get credit transaction history (admin view)

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `user_email` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/credits/users`

**Summary:** Get Users With Credits

Get list of users with their credit balances

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/dashboard/stats`

**Summary:** Get Admin Dashboard Stats

Get comprehensive dashboard statistics for admin users

**Admin Only** - Requires ADMIN or SUPERUSER role

**Performance**: Response cached for 5 minutes to ensure <500ms response time

Returns comprehensive statistics including:
- **users**: Total users, active today, new this week
- **api_usage**: Total requests, requests today, average response time
- **revenue**: MRR, monthly revenue, growth percentage
- **projects**: Total projects, created this week

**Query Parameters**:
- force_refresh: Set to true to bypass cache and fetch fresh data

**Response Time**: <500ms (cached), <2s (uncached)

**Rate Limit**: 100 requests per minute for admin users

**Parameters:**

- `force_refresh` (query): Force cache refresh (bypasses 5-minute cache)

**Success Response (200):** Successful Response

---

### `POST /admin/database/optimize`

**Summary:** Optimize Database

Perform database optimization operations

**Admin Only** - Requires ADMIN or SUPERUSER role

Operations:
    - **vacuum**: Reclaim storage and update statistics
    - **reindex**: Rebuild indexes for better performance
    - **analyze**: Update table statistics for query planning

Parameters:
    - optimization_type: Type of optimization (vacuum, reindex, analyze)
    - dry_run: If True, preview changes without applying (default: True)

Returns:
    - Optimization results including duration, tables affected, space freed

**Rate Limited**: 10 requests per hour for database optimization
**Security**: All operations are logged for audit trail

**Parameters:**

- `optimization_type` (query): Optimization type: vacuum, reindex, or analyze
- `dry_run` (query): Preview changes without applying them

**Success Response (200):** Successful Response

---

### `GET /admin/debug/check-password`

**Summary:** Check Password Security Status

SECURED: Check password security status (NO SENSITIVE DATA EXPOSED)
Previously exposed admin passwords and hash previews - NOW SECURED

**Success Response (200):** Successful Response

---

### `GET /admin/debug/check-users`

**Summary:** Check Users Secure

SECURED: Check user count and basic info (NO SENSITIVE DATA)
Requires superuser access and does NOT expose:
- Password hashes
- Database credentials
- Sensitive user information

**Success Response (200):** Successful Response

---

### `POST /admin/debug/fix-all-passwords`

**Summary:** Secure Password Management

SECURED: Password management endpoint (NO HARDCODED PASSWORDS)
Previously contained hardcoded admin passwords - NOW SECURED

**Success Response (200):** Successful Response

---

### `POST /admin/disaster-recovery/disaster-recovery/backup/create`

**Summary:** Create Backup

Create a new backup

**Parameters:**

- `backup_type` (query) *(required)*: No description
- `description` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/disaster-recovery/disaster-recovery/backups`

**Summary:** List Backups

List available backups

**Parameters:**

- `limit` (query): No description
- `offset` (query): No description
- `backup_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/disaster-recovery/disaster-recovery/compliance`

**Summary:** Get Compliance Status

Get disaster recovery compliance status

**Success Response (200):** Successful Response

---

### `GET /admin/disaster-recovery/disaster-recovery/dashboard`

**Summary:** Get Disaster Recovery Dashboard

Get comprehensive disaster recovery dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/disaster-recovery/disaster-recovery/restore`

**Summary:** Initiate Restore

Initiate disaster recovery restore operation

**Parameters:**

- `backup_id` (query) *(required)*: No description
- `recovery_type` (query) *(required)*: No description
- `recovery_point` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/enterprise/enterprise/audit-logs`

**Summary:** Get Audit Logs

Get audit logs for enterprise compliance

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `action` (query): No description
- `user_id` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/enterprise/enterprise/collaboration-data`

**Summary:** Get Collaboration Data

Get team collaboration metrics and activity

**Success Response (200):** Successful Response

---

### `GET /admin/enterprise/enterprise/performance-metrics`

**Summary:** Get Performance Metrics

Get system performance metrics for enterprise monitoring

**Success Response (200):** Successful Response

---

### `GET /admin/enterprise/enterprise/project-analytics`

**Summary:** Get Project Analytics

Get comprehensive project analytics for enterprise dashboard

**Parameters:**

- `timeframe` (query): 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `GET /admin/enterprise/enterprise/security-metrics`

**Summary:** Get Security Metrics

Get security metrics and compliance data

**Success Response (200):** Successful Response

---

### `POST /admin/enterprise/enterprise/security-scan`

**Summary:** Trigger Security Scan

Trigger a comprehensive security scan

**Success Response (200):** Successful Response

---

### `GET /admin/enterprise/enterprise/team-activity`

**Summary:** Get Team Activity

Get detailed team activity metrics

**Parameters:**

- `timeframe` (query): 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `POST /admin/error-analysis/analyze`

**Summary:** Analyze Error

Analyze an error and provide explanation and suggestions.

This endpoint parses stack traces, identifies error patterns, and provides
actionable recommendations for resolving the issue.

- **project_id**: ID of the project where the error occurred
- **error_message**: The error message text
- **error_type**: Type or class of the error
- **stack_trace**: Full stack trace of the error
- **source_code**: Optional source code files relevant to the error
- **context**: Optional additional context about the error
- **occurrence**: Optional details about when/where the error occurred

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /admin/error-analysis/errors`

**Summary:** Get error analyses for a user

Get a list of error analyses for the current user.

Returns summaries of error analyses that match the specified filters.

- **project_id**: Optional project ID to filter by
- **category**: Optional category to filter by
- **severity**: Optional severity to filter by
- **limit**: Maximum number of analyses to return (default: 10)

**Parameters:**

- `project_id` (query): Optional project ID to filter by
- `category` (query): Optional category to filter by
- `severity` (query): Optional severity to filter by
- `limit` (query): Maximum number of analyses to return

**Success Response (200):** Successful Response

---

### `GET /admin/error-analysis/errors/metrics/{project_id}`

**Summary:** Get error metrics for a project

Get error metrics for a specific project.

Returns aggregated error metrics including counts by severity, common categories,
affected files, and trends over time.

- **project_id**: ID of the project to get metrics for

**Parameters:**

- `project_id` (path) *(required)*: ID of the project

**Success Response (200):** Successful Response

---

### `GET /admin/error-analysis/errors/{analysis_id}`

**Summary:** Get detailed error analysis

Get detailed information about a specific error analysis.

Returns complete information about the error analysis, including root cause analysis,
suggestions, and stack trace details.

- **analysis_id**: ID of the analysis to retrieve

**Parameters:**

- `analysis_id` (path) *(required)*: ID of the analysis to retrieve

**Success Response (200):** Successful Response

---

### `POST /admin/evaluation/code/evaluate`

**Summary:** Evaluate Generated Code

Evaluate AI-generated code using comprehensive evaluation pipeline

Combines DeepEval and PromptFoo for enterprise-grade quality assessment

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/evaluation/code/evaluate/{evaluation_id}/results`

**Summary:** Get Evaluation Results

Get comprehensive evaluation results

**Parameters:**

- `evaluation_id` (path) *(required)*: No description
- `format_type` (query): Result format (json, summary, detailed)

**Success Response (200):** Successful Response

---

### `GET /admin/evaluation/code/evaluate/{evaluation_id}/status`

**Summary:** Get Evaluation Status

Get current status of a code evaluation

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/evaluation/deepeval/metrics`

**Summary:** List Available DeepEval Metrics

List available DeepEval evaluation metrics

**Success Response (200):** Successful Response

---

### `GET /admin/evaluation/history`

**Summary:** Get Evaluation History

Get evaluation history for the current user

**Parameters:**

- `project_id` (query): Filter by project ID
- `limit` (query): Maximum records to return

**Success Response (200):** Successful Response

---

### `GET /admin/evaluation/metrics/dashboard`

**Summary:** Get Evaluation Metrics Dashboard

Get evaluation metrics dashboard data

**Parameters:**

- `days` (query): Number of days to include

**Success Response (200):** Successful Response

---

### `GET /admin/evaluation/promptfoo/providers`

**Summary:** List Available PromptFoo Providers

List available PromptFoo AI providers

**Success Response (200):** Successful Response

---

### `POST /admin/evaluation/prompts/ab-test`

**Summary:** Create A/B Test

Create A/B test between two prompt variations

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/evaluation/prompts/ab-test/{test_id}/run`

**Summary:** Run A/B Test

Run A/B test and get comparison results

**Parameters:**

- `test_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/evaluation/prompts/test`

**Summary:** Create Prompt Test

Create and run prompt test using PromptFoo

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/evaluation/prompts/test/{config_id}/run`

**Summary:** Run Prompt Test

Run prompt test and get results

**Parameters:**

- `config_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/frontend-debug/debug/cors-test`

**Summary:** Test Cors Configuration

Test CORS configuration and headers

**Success Response (200):** Successful Response

---

### `GET /admin/frontend-debug/debug/frontend-test`

**Summary:** Test Frontend Connectivity

Debug endpoint to help diagnose frontend connectivity issues

**Success Response (200):** Successful Response

---

### `POST /admin/git-integration/auto-commit`

**Summary:** Auto Commit Project

Automatically commit all changes in a project

**Parameters:**

- `project_path` (query) *(required)*: No description
- `action` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/git-integration/branch`

**Summary:** Manage Branch

Manage Git branches (create, checkout, delete, merge)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/git-integration/commit`

**Summary:** Commit Changes

Commit changes to Git repository

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/git-integration/config`

**Summary:** Get Git Config

Get current Git configuration

**Success Response (200):** Successful Response

---

### `PUT /admin/git-integration/config`

**Summary:** Update Git Config

Update Git configuration

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/git-integration/dashboard`

**Summary:** Get Git Dashboard

Get Git integration dashboard

**Success Response (200):** Successful Response

---

### `GET /admin/git-integration/history/{project_path}`

**Summary:** Get Commit History

Get Git commit history

**Parameters:**

- `project_path` (path) *(required)*: No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/git-integration/push`

**Summary:** Push Changes

Push changes to remote repository

**Parameters:**

- `project_path` (query) *(required)*: No description
- `branch` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/git-integration/repositories`

**Summary:** List Repositories

List all Git repositories

**Success Response (200):** Successful Response

---

### `POST /admin/git-integration/repository/clone`

**Summary:** Clone Repository

Clone a Git repository

**Parameters:**

- `repository_url` (query) *(required)*: No description
- `destination` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/git-integration/repository/init`

**Summary:** Initialize Repository

Initialize a new Git repository

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/git-integration/status/{project_path}`

**Summary:** Get Repository Status

Get Git repository status

**Parameters:**

- `project_path` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/help-documentation/help-documentation/analytics`

**Summary:** Get Documentation Analytics

Get documentation analytics and insights

**Parameters:**

- `timeframe` (query): No description
- `category` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/help-documentation/help-documentation/categories`

**Summary:** Get Documentation Categories

Get documentation categories with content counts

**Success Response (200):** Successful Response

---

### `GET /admin/help-documentation/help-documentation/content`

**Summary:** List Documentation

List documentation with filtering options

**Parameters:**

- `category` (query): No description
- `doc_type` (query): No description
- `target_role` (query): No description
- `is_public` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/help-documentation/help-documentation/content`

**Summary:** Create Documentation

Create new documentation content

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/help-documentation/help-documentation/content/{doc_id}`

**Summary:** Get Documentation

Get specific documentation content

**Parameters:**

- `doc_id` (path) *(required)*: No description
- `track_view` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /admin/help-documentation/help-documentation/content/{doc_id}`

**Summary:** Update Documentation

Update documentation content

**Parameters:**

- `doc_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /admin/help-documentation/help-documentation/content/{doc_id}`

**Summary:** Delete Documentation

Delete documentation content

**Parameters:**

- `doc_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/help-documentation/help-documentation/dashboard`

**Summary:** Get Help Dashboard

Get comprehensive help and documentation dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/help-documentation/help-documentation/export`

**Summary:** Export Documentation

Export documentation in various formats

**Parameters:**

- `format` (query): No description
- `category` (query): No description
- `include_analytics` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/help-documentation/help-documentation/feedback`

**Summary:** Submit Documentation Feedback

Submit feedback for documentation

**Parameters:**

- `doc_id` (query) *(required)*: No description
- `rating` (query) *(required)*: No description
- `comment` (query): No description
- `helpful` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/help-documentation/help-documentation/search`

**Summary:** Search Documentation

Search documentation content

**Parameters:**

- `limit` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/help-documentation/help-documentation/upload`

**Summary:** Upload Documentation File

Upload documentation file (PDF, markdown, etc.)

**Parameters:**

- `doc_type` (query): No description
- `category` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/indexing/repositories/{project_id}`

**Summary:** Index Repository

Index a code repository for semantic search.

GIVEN a valid repository path and project ID
WHEN the indexing service processes the repository
THEN vectorized code embeddings are created for semantic search

Returns:
    JSON response with indexing operation details

**Parameters:**

- `project_id` (path) *(required)*: Project identifier

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/indexing/repositories/{project_id}/search`

**Summary:** Search Repository

Search an indexed repository using vector similarity.

GIVEN a search query and project ID
WHEN the search service processes the query
THEN semantically relevant code chunks are returned

Returns:
    JSON response with search results

**Parameters:**

- `project_id` (path) *(required)*: Project identifier
- `query` (query) *(required)*: Search query
- `limit` (query): Maximum number of results

**Success Response (200):** Successful Response

---

### `GET /admin/indexing/repositories/{project_id}/stats`

**Summary:** Get Indexing Statistics

Get indexing statistics for a repository.

GIVEN a project ID with an indexed repository
WHEN requesting indexing statistics
THEN detailed statistics about the indexed repository are returned

Returns:
    JSON response with indexing statistics

**Parameters:**

- `project_id` (path) *(required)*: Project identifier

**Success Response (200):** Successful Response

---

### `GET /admin/langflow-templates/base-templates`

**Summary:** Get Base Templates

Get available base template configurations

**Success Response (200):** Successful Response

---

### `GET /admin/langflow-templates/components`

**Summary:** Get Langchain Components

Get available LangChain components and their descriptions

**Success Response (200):** Successful Response

---

### `GET /admin/langflow-templates/dashboard`

**Summary:** Get Langflow Dashboard

Get Langflow templates dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/langflow-templates/export`

**Summary:** Export Template

Export a Langflow template

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/langflow-templates/generate`

**Summary:** Generate Langflow Template

Generate a new Langflow template

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/langflow-templates/templates`

**Summary:** List Templates

List all Langflow templates

**Success Response (200):** Successful Response

---

### `GET /admin/langflow-templates/templates/{template_id}`

**Summary:** Get Template

Get a specific Langflow template

**Parameters:**

- `template_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/analytics`

**Summary:** Get Onboarding Analytics

Get onboarding and tutorial analytics

**Parameters:**

- `timeframe` (query): No description
- `user_role` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/completion-rates`

**Summary:** Get Completion Rates

Get completion rates analysis

**Parameters:**

- `timeframe` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/dashboard`

**Summary:** Get Onboarding Dashboard

Get comprehensive onboarding and tutorial dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/onboarding-tutorials/onboarding-tutorials/feedback`

**Summary:** Submit Tutorial Feedback

Submit feedback for tutorial

**Parameters:**

- `tutorial_id` (query) *(required)*: No description
- `rating` (query) *(required)*: No description
- `feedback_text` (query): No description
- `helpful` (query): No description
- `difficulty_rating` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/flows`

**Summary:** List Onboarding Flows

List onboarding flows with filtering

**Parameters:**

- `target_role` (query): No description
- `is_mandatory` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/onboarding-tutorials/onboarding-tutorials/flows`

**Summary:** Create Onboarding Flow

Create new onboarding flow

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/tutorials`

**Summary:** List Tutorials

List tutorials with filtering

**Parameters:**

- `tutorial_type` (query): No description
- `target_role` (query): No description
- `difficulty_level` (query): No description
- `is_active` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/onboarding-tutorials/onboarding-tutorials/tutorials`

**Summary:** Create Tutorial

Create new tutorial

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/tutorials/{tutorial_id}`

**Summary:** Get Tutorial Details

Get detailed tutorial information

**Parameters:**

- `tutorial_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/onboarding-tutorials/onboarding-tutorials/tutorials/{tutorial_id}/steps`

**Summary:** Add Tutorial Step

Add step to tutorial

**Parameters:**

- `tutorial_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/onboarding-tutorials/onboarding-tutorials/user-progress/{user_id}`

**Summary:** Get User Progress

Get user's onboarding and tutorial progress

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/onboarding-tutorials/onboarding-tutorials/user-progress/{user_id}/update`

**Summary:** Update User Progress

Update user's progress

**Parameters:**

- `user_id` (path) *(required)*: No description
- `stage` (query): No description
- `tutorial_id` (query): No description
- `step_id` (query): No description
- `completed` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/projects/{project_id}/billing/usage`

**Summary:** Get Project Billing Usage

Get detailed credit usage breakdown for a project

**Admin Only** - Requires ADMIN or SUPERUSER role

Returns:
    - total_credits_used: Total credits consumed in time range
    - time_range: The requested time range
    - breakdown: Credits by category:
        - vector_operations: Vector search, upsert, delete operations
        - memory_operations: Agent memory store/retrieve operations
        - storage_operations: File upload/download operations
        - database_operations: NoSQL table operations
        - postgres_queries: Managed PostgreSQL query credits
    - top_endpoints: Top 10 endpoints by credit usage
    - daily_breakdown: Daily credit usage for the time range

Query Parameters:
    - time_range: last_24_hours | last_7_days | last_30_days

Issue #321 - Billing usage endpoint with ZeroDB integration

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `time_range` (query): Time range for usage data

**Success Response (200):** Successful Response

---

### `GET /admin/quality-improvement/analytics/patterns`

**Summary:** Analyze Recommendation Patterns

Analyze patterns in recommendations across all prompts

**Features:**
- Cross-prompt pattern recognition
- Frequency analysis
- Impact assessment
- Actionable insights for system-wide improvements

**Parameters:**

- `time_window_days` (query): Analysis time window
- `min_frequency` (query): Minimum pattern frequency

**Success Response (200):** Success

---

### `GET /admin/quality-improvement/health`

**Summary:** Get System Health

Get quality improvement engine health and status

**Features:**
- System performance metrics
- Cache efficiency monitoring
- ML model status
- Processing statistics

**Success Response (200):** Success

---

### `POST /admin/quality-improvement/prompts/{prompt_id}/recommendations`

**Summary:** Generate Recommendations

Generate quality improvement recommendations for a specific prompt

**Features:**
- AI-powered recommendation generation
- Pattern-based analysis
- ML model predictions
- Comparative analysis with high-performing prompts
- User feedback integration
- Customizable analysis window

**Parameters:**

- `prompt_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/quality-improvement/prompts/{prompt_id}/recommendations/summary`

**Summary:** Get Recommendation Summary

Get summary of recommendations for a prompt

**Features:**
- Recommendation count by priority
- Type distribution analysis
- Average confidence metrics
- Quick overview for dashboards

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `analysis_window_days` (query): Analysis window in days

**Success Response (200):** Success

---

### `POST /admin/quality-improvement/recommendations/bulk-analysis`

**Summary:** Bulk Prompt Analysis

Generate recommendations for multiple prompts in bulk

**Features:**
- Parallel processing of multiple prompts
- Batch optimization for performance
- Progress tracking
- Filtered results by confidence threshold

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/quality-improvement/recommendations/bulk-analysis/{task_id}/status`

**Summary:** Get Bulk Analysis Status

Get status of bulk analysis task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /admin/quality-improvement/recommendations/types`

**Summary:** Get Recommendation Types

Get available recommendation types and their descriptions

**Success Response (200):** Success

---

### `GET /admin/quality-improvement/recommendations/{recommendation_id}`

**Summary:** Get Recommendation Details

Get detailed information about a specific recommendation

**Features:**
- Complete recommendation details
- Implementation guidance
- Supporting evidence
- Impact analysis

**Parameters:**

- `recommendation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `POST /admin/quality-trending/alert-rules`

**Summary:** Create Alert Rule

Create a new quality alert rule

**Features:**
- Custom threshold alerts
- Trend-based alerts
- Anomaly detection alerts
- Configurable severity levels
- Notification channel routing
- Cooldown management

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/quality-trending/alerts`

**Summary:** Get Alert History

Get quality alert history with filtering

**Features:**
- Prompt-specific alert filtering
- Severity-based filtering
- Chronological ordering
- Alert status tracking
- Detailed alert metadata

**Parameters:**

- `prompt_id` (query): Filter by prompt ID
- `severity` (query): Filter by severity
- `limit` (query): Maximum number of alerts

**Success Response (200):** Success

---

### `PUT /admin/quality-trending/alerts/{alert_id}/acknowledge`

**Summary:** Acknowledge Alert

Acknowledge a quality alert

**Features:**
- Alert acknowledgment tracking
- User attribution
- Status updates
- Audit logging

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `PUT /admin/quality-trending/alerts/{alert_id}/resolve`

**Summary:** Resolve Alert

Resolve a quality alert

**Features:**
- Alert resolution tracking
- User attribution
- Automatic status updates
- Resolution timestamps

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /admin/quality-trending/config`

**Summary:** Get System Configuration

Get quality trending system configuration

**Success Response (200):** Success

---

### `GET /admin/quality-trending/health`

**Summary:** Get System Health

Get quality trending system health and status

**Features:**
- System status monitoring
- Data volume metrics
- Alert system health
- Performance indicators

**Success Response (200):** Success

---

### `GET /admin/quality-trending/insights/comparative`

**Summary:** Get Comparative Insights

Get comparative quality insights across prompts

**Features:**
- Cross-prompt comparison
- Relative performance analysis
- Best/worst performers identification
- Improvement opportunities

**Parameters:**

- `prompt_ids` (query) *(required)*: Prompt IDs to compare
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `GET /admin/quality-trending/prompts/{prompt_id}/trends`

**Summary:** Analyze Prompt Trends

Analyze quality trends for a specific prompt

**Features:**
- Statistical trend analysis with regression
- Confidence level calculation
- Anomaly detection
- Seasonality analysis
- Predictive forecasting
- Actionable recommendations

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `POST /admin/quality-trending/record`

**Summary:** Record Quality Score

Record a quality score for trending analysis

**Features:**
- Quality score tracking and storage
- Automatic trend analysis updates
- Real-time alert checking
- Historical data aggregation

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /admin/quality-trending/summary`

**Summary:** Get Quality Summary

Get comprehensive quality summary across prompts

**Features:**
- Cross-prompt quality analysis
- Trend distribution insights
- Alert summaries
- Statistical aggregations
- Performance benchmarking

**Parameters:**

- `prompt_ids` (query): Prompt IDs to analyze (empty = all)
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `GET /admin/quality-trending/trends/batch`

**Summary:** Analyze Multiple Prompt Trends

Analyze quality trends for multiple prompts in batch

**Features:**
- Batch trend analysis
- Parallel processing
- Comprehensive insights
- Performance optimization

**Parameters:**

- `prompt_ids` (query) *(required)*: List of prompt IDs to analyze
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `POST /admin/quantum-search/index`

**Summary:** Index Repository

Index repository files with quantum-enhanced vectors.

GIVEN repository files
WHEN indexing for search
THEN create quantum-enhanced vector representations

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /admin/quantum-search/metrics`

**Summary:** Get Search Metrics

Get search performance metrics.

GIVEN a date range
WHEN retrieving metrics
THEN return performance statistics

**Parameters:**

- `start_date` (query): Start date (YYYY-MM-DD)
- `end_date` (query): End date (YYYY-MM-DD)

**Success Response (200):** Successful Response

---

### `GET /admin/quantum-search/results/{search_id}`

**Summary:** Get Search Results

Retrieve search results by ID.

GIVEN a search ID
WHEN retrieving results
THEN return the search results

**Parameters:**

- `search_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/quantum-search/search`

**Summary:** Search

Perform quantum-enhanced semantic search.

GIVEN a search query and repository context
WHEN searching with quantum enhancement
THEN return semantically relevant results with quantum-enhanced ranking

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/quick-setup/`

**Summary:** Create Production Users

Create production users using direct database connection

**Success Response (201):** Successful Response

---

### `GET /admin/railway-deployment/cli-status`

**Summary:** Get Cli Status

Get Railway CLI status

**Success Response (200):** Successful Response

---

### `POST /admin/railway-deployment/cli/install`

**Summary:** Install Railway Cli

Install Railway CLI

**Success Response (200):** Successful Response

---

### `GET /admin/railway-deployment/dashboard`

**Summary:** Get Railway Dashboard

Get Railway deployment dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/railway-deployment/deploy`

**Summary:** Deploy To Railway

Deploy project to Railway

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/railway-deployment/deployment/{deployment_id}/logs`

**Summary:** Get Deployment Logs

Get deployment logs

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/railway-deployment/deployment/{deployment_id}/rollback`

**Summary:** Rollback Deployment

Rollback Railway deployment

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/railway-deployment/deployment/{deployment_id}/status`

**Summary:** Get Deployment Status

Get deployment status

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/railway-deployment/environments`

**Summary:** Get Supported Environments

Get supported deployment environments

**Success Response (200):** Successful Response

---

### `POST /admin/railway-deployment/initialize`

**Summary:** Initialize Railway Project

Initialize a new Railway project

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/railway-deployment/project/{project_name}/status`

**Summary:** Get Project Status

Get Railway project status

**Parameters:**

- `project_name` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/railway-deployment/projects`

**Summary:** List Railway Projects

List all Railway projects

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/dashboard`

**Summary:** Get Scaffolding Dashboard

Get scaffolding tools dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/scaffolding-tools/install/{tool}`

**Summary:** Install Scaffolding Tool

Install a scaffolding tool

**Parameters:**

- `tool` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/operations`

**Summary:** Get Scaffolding Operations

Get all scaffolding operations

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/operations/{request_id}`

**Summary:** Get Scaffolding Operation

Get details of a specific scaffolding operation

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /admin/scaffolding-tools/operations/{request_id}`

**Summary:** Delete Scaffolding Operation

Delete a scaffolding operation and its files

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/scaffolding-tools/operations/{request_id}/retry`

**Summary:** Retry Scaffolding Operation

Retry a failed scaffolding operation

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/scaffolding-tools/scaffold`

**Summary:** Create Scaffolded Project

Create a new project using scaffolding tools

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/templates`

**Summary:** Get Available Templates

Get available templates for all tools

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/templates/{tool}`

**Summary:** Get Tool Templates

Get available templates for a specific tool

**Parameters:**

- `tool` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/tools`

**Summary:** Get Available Tools

Get available scaffolding tools and their status

**Success Response (200):** Successful Response

---

### `GET /admin/scaffolding-tools/tools/{tool}/status`

**Summary:** Get Tool Status

Get detailed status of a specific tool

**Parameters:**

- `tool` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/scaling/infrastructure/status`

**Summary:** Get Infrastructure Status

Get comprehensive infrastructure status

**Success Response (200):** Successful Response

---

### `GET /admin/scaling/instances/{instance_id}/metrics`

**Summary:** Get Instance Metrics

Get detailed metrics for a specific instance

**Parameters:**

- `instance_id` (path) *(required)*: No description
- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/scaling/load-balancer/config`

**Summary:** Get Load Balancer Config

Get detailed load balancer configuration

**Success Response (200):** Successful Response

---

### `POST /admin/scaling/load-balancer/update`

**Summary:** Update Load Balancer Config

Update load balancer configuration

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/scaling/scaling/history`

**Summary:** Get Scaling History

Get scaling operation history

**Parameters:**

- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/scaling/scaling/manual`

**Summary:** Trigger Manual Scaling

Trigger manual scaling operation

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/scaling/scaling/policies`

**Summary:** Get Scaling Policies

Get auto-scaling policies

**Success Response (200):** Successful Response

---

### `POST /admin/scaling/scaling/policies/update`

**Summary:** Update Scaling Policies

Update auto-scaling policies

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/security/audit-event-types`

**Summary:** List Audit Event Types

List available audit event types

**Success Response (200):** Successful Response

---

### `GET /admin/security/audit/events`

**Summary:** List Audit Events

List audit events with filtering

**Parameters:**

- `event_type` (query): Filter by event type
- `user_id` (query): Filter by user ID
- `outcome` (query): Filter by outcome
- `start_date` (query): Start date filter
- `end_date` (query): End date filter
- `limit` (query): Maximum events to return

**Success Response (200):** Successful Response

---

### `POST /admin/security/audit/log`

**Summary:** Log Audit Event

Log security audit event for compliance tracking

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/security/compliance-frameworks`

**Summary:** List Compliance Frameworks

List supported compliance frameworks

**Success Response (200):** Successful Response

---

### `POST /admin/security/compliance/report`

**Summary:** Generate Compliance Report

Generate comprehensive compliance report

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/security/compliance/{framework}/status`

**Summary:** Check Compliance Status

Check compliance status for specific framework

**Parameters:**

- `framework` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/security/dashboard`

**Summary:** Security Dashboard

Get comprehensive security dashboard

**Success Response (200):** Successful Response

---

### `POST /admin/security/data/classify`

**Summary:** Classify Data

Classify data based on sensitivity and content

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/security/data/decrypt`

**Summary:** Decrypt Sensitive Data

Decrypt sensitive data with access control

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/security/data/encrypt`

**Summary:** Encrypt Sensitive Data

Encrypt sensitive data based on classification

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/security/incidents`

**Summary:** Create Security Incident

Create security incident for tracking and response

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/security/incidents`

**Summary:** List Security Incidents

List security incidents with filtering

**Parameters:**

- `status_filter` (query): Filter by status
- `severity` (query): Filter by severity
- `limit` (query): Maximum incidents to return

**Success Response (200):** Successful Response

---

### `GET /admin/security/security-levels`

**Summary:** List Security Levels

List available security classification levels

**Success Response (200):** Successful Response

---

### `GET /admin/snapshots/`

**Summary:** List Snapshots

List all snapshots

**Success Response (200):** Successful Response

---

### `POST /admin/snapshots/`

**Summary:** Create Snapshot

Create a new snapshot

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/system/stats`

**Summary:** Get System Stats

Get comprehensive system-wide statistics

**Admin Only** - Requires ADMIN or SUPERUSER role

Returns:
    - System metrics (users, projects, vectors, tables, storage)
    - Database performance metrics
    - API performance metrics
    - Active users in last 24 hours

**Rate Limited**: 100 requests per minute for admins

**Success Response (200):** Successful Response

---

### `GET /admin/users/{user_id}/usage`

**Summary:** Get User Usage Stats

Get detailed usage statistics for a specific user

**Admin Only** - Requires ADMIN or SUPERUSER role

Parameters:
    - user_id: UUID of the user to analyze
    - period_days: Number of days to analyze (default: 30, max: 365)

Returns:
    - User information and billing details
    - Usage metrics (projects, vectors, storage, API calls)
    - Tier limits and current usage
    - Last activity timestamp

**Rate Limited**: 100 requests per minute

**Parameters:**

- `user_id` (path) *(required)*: User ID to get usage statistics for
- `period_days` (query): Period in days (1-365)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/`

**Summary:** Get Admin Api Info

Get information about the admin API (admin users only)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/audit/compliance/report`

**Summary:** Generate Compliance Report

Generate compliance report for specified standard and period

**Parameters:**

- `standard` (query): No description
- `start_date` (query) *(required)*: No description
- `end_date` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/audit/compliance/standards`

**Summary:** Get Supported Compliance Standards

Get list of supported compliance standards and their requirements

**Success Response (200):** Successful Response

---

### `POST /v1/admin/audit/export`

**Summary:** Export Audit Data

Export audit data for compliance or analysis

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/audit/log`

**Summary:** Log Audit Event

Log an audit event

**Parameters:**

- `action` (query) *(required)*: No description
- `resource_type` (query) *(required)*: No description
- `resource_id` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/audit/logs`

**Summary:** Get Audit Logs

Get paginated audit logs with filtering

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `action` (query): No description
- `user_id` (query): No description
- `resource_type` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/audit/summary`

**Summary:** Get Audit Summary

Get audit summary for specified period

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/audit/user/{user_id}`

**Summary:** Get User Audit Trail

Get complete audit trail for a specific user

**Parameters:**

- `user_id` (path) *(required)*: No description
- `limit` (query): No description
- `action_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/billing/summary`

**Summary:** Get Billing Summary

Get system-wide billing summary across all projects

**Admin Only** - Requires ADMIN or SUPERUSER role

Returns:
    - total_credits_used: System-wide credit usage
    - total_projects: Number of active projects
    - average_credits_per_project: Average credits per project
    - top_projects: Top 10 projects by credit usage
    - breakdown: System-wide breakdown by category

Issue #321 - System-wide billing analytics

**Parameters:**

- `time_range` (query): Time range for summary

**Success Response (200):** Successful Response

---

### `POST /v1/admin/bootstrap/`

**Summary:** Setup Database

Set up the database with required tables

**Success Response (201):** Successful Response

---

### `POST /v1/admin/bootstrap/create-dev-accounts`

**Summary:** Create Dev Accounts

Create development accounts for the team
This endpoint creates admin, sanket, and arkan accounts with API keys

**Success Response (201):** Successful Response

---

### `GET /v1/admin/bootstrap/dev-accounts-info`

**Summary:** Get Dev Accounts Info

Get developer account information including API keys for testing

**Success Response (200):** Successful Response

---

### `POST /v1/admin/bootstrap/fix-users-table`

**Summary:** Fix Users Table

Fix users table by adding missing columns

**Success Response (201):** Successful Response

---

### `POST /v1/admin/bootstrap/generate-fresh-keys`

**Summary:** Generate Fresh Api Keys

Generate fresh API keys for developer accounts for testing

**Success Response (201):** Successful Response

---

### `GET /v1/admin/caching/cache/analytics`

**Summary:** Get Cache Analytics

Get comprehensive cache analytics

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/caching/cache/health`

**Summary:** Get Cache Health Check

Perform comprehensive cache health check

**Success Response (200):** Successful Response

---

### `POST /v1/admin/caching/cache/invalidate`

**Summary:** Invalidate Cache

Invalidate cache entries based on patterns or keys

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/caching/cache/keys`

**Summary:** Get Cache Key Analysis

Analyze cache keys and their usage patterns

**Parameters:**

- `pattern` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/caching/cache/optimize`

**Summary:** Optimize Cache Configuration

Optimize cache configuration based on usage patterns

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/caching/cache/status`

**Summary:** Get Cache Status

Get comprehensive cache system status

**Success Response (200):** Successful Response

---

### `POST /v1/admin/caching/cache/warm`

**Summary:** Warm Cache

Warm cache with frequently accessed data

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/chat-test/test`

**Summary:** Test Chat Endpoint

Minimal chat test endpoint

**Success Response (200):** Successful Response

---

### `POST /v1/admin/comprehensive-evaluation/batch-evaluate`

**Summary:** Batch Comprehensive Evaluation

Start multiple comprehensive evaluations in batch

**Request Body:**
List of evaluation requests

**Returns:**
List of evaluation IDs for tracking progress

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/admin/comprehensive-evaluation/evaluate`

**Summary:** Start Comprehensive Evaluation

Start a comprehensive code evaluation process

This endpoint initiates a comprehensive evaluation that includes:
- Static code analysis for quality, complexity, and style issues
- AI-powered evaluation using DeepEval and PromptFoo
- Meta LLAMA quality assessment using advanced models
- Security vulnerability scanning
- Performance analysis and optimization recommendations

The evaluation runs asynchronously and returns an evaluation_id for tracking progress.

**Request Body:**
- **generated_code**: The AI-generated code to evaluate
- **original_prompt**: Original user prompt/query
- **context**: Context used for generation (optional)
- **expected_output**: Expected/reference code (optional)
- **project_id**: Project context (optional)
- **file_path**: Virtual file path for the code
- **evaluation_options**: Custom evaluation configuration (optional)

**Returns:**
- **evaluation_id**: Unique identifier for tracking the evaluation
- **status**: Current status (should be 'started')
- **estimated_duration**: Estimated time to completion in seconds

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/comprehensive-evaluation/history`

**Summary:** Get Evaluation History

Get evaluation history for the current user

**Query Parameters:**
- **project_id**: Filter by project ID (optional)
- **limit**: Maximum number of records to return (default: 20, max: 100)

**Returns:**
List of evaluation summaries ordered by creation date (newest first)

**Parameters:**

- `project_id` (query): Filter by project ID
- `limit` (query): Maximum number of records to return

**Success Response (200):** Success

---

### `GET /v1/admin/comprehensive-evaluation/results/{evaluation_id}`

**Summary:** Get Evaluation Results

Get the complete results of a comprehensive evaluation

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Query Parameters:**
- **include_detailed**: Include detailed analysis results from all components

**Returns:**
Complete evaluation results including:
- **integrated_score**: Overall quality score (0.0-1.0)
- **quality_grade**: Letter grade (A+ to F)
- **quality_components**: Scores from each evaluation component
- **recommendations**: Prioritized list of improvement recommendations
- **evaluation_summary**: Human-readable summary of results
- **static_analysis_results**: Code quality and complexity analysis
- **ai_evaluation_results**: DeepEval and PromptFoo results
- **meta_llama_assessment**: Meta LLAMA quality assessment
- **security_analysis_results**: Security vulnerability scan
- **performance_analysis_results**: Performance analysis and optimization

**Parameters:**

- `evaluation_id` (path) *(required)*: No description
- `include_detailed` (query): Include detailed analysis results

**Success Response (200):** Success

---

### `DELETE /v1/admin/comprehensive-evaluation/results/{evaluation_id}`

**Summary:** Delete Evaluation Results

Delete evaluation results and cached data

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Returns:**
Confirmation of deletion

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/admin/comprehensive-evaluation/status/{evaluation_id}`

**Summary:** Get Evaluation Status

Get the current status of a comprehensive evaluation

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Returns:**
- **evaluation_id**: The evaluation identifier
- **status**: Current status (running, completed, failed)
- **progress**: Progress percentage (0-100)
- **current_step**: Description of current processing step
- **error**: Error message if status is 'failed'

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/admin/comprehensive-evaluation/summary/{evaluation_id}`

**Summary:** Get Evaluation Summary

Get a summary of evaluation results

**Path Parameters:**
- **evaluation_id**: Unique identifier for the evaluation

**Returns:**
Summary of evaluation results with key metrics

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/admin/credits/balance`

**Summary:** Get Admin Credits Balance

Get credits balance information for admin dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/credits/grant`

**Summary:** Grant Credits To User

Grant credits to a specific user (admin only)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/credits/transactions`

**Summary:** Get Admin Credit Transactions

Get credit transaction history (admin view)

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `user_email` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/credits/users`

**Summary:** Get Users With Credits

Get list of users with their credit balances

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/dashboard/stats`

**Summary:** Get Admin Dashboard Stats

Get comprehensive dashboard statistics for admin users

**Admin Only** - Requires ADMIN or SUPERUSER role

**Performance**: Response cached for 5 minutes to ensure <500ms response time

Returns comprehensive statistics including:
- **users**: Total users, active today, new this week
- **api_usage**: Total requests, requests today, average response time
- **revenue**: MRR, monthly revenue, growth percentage
- **projects**: Total projects, created this week

**Query Parameters**:
- force_refresh: Set to true to bypass cache and fetch fresh data

**Response Time**: <500ms (cached), <2s (uncached)

**Rate Limit**: 100 requests per minute for admin users

**Parameters:**

- `force_refresh` (query): Force cache refresh (bypasses 5-minute cache)

**Success Response (200):** Successful Response

---

### `POST /v1/admin/database/optimize`

**Summary:** Optimize Database

Perform database optimization operations

**Admin Only** - Requires ADMIN or SUPERUSER role

Operations:
    - **vacuum**: Reclaim storage and update statistics
    - **reindex**: Rebuild indexes for better performance
    - **analyze**: Update table statistics for query planning

Parameters:
    - optimization_type: Type of optimization (vacuum, reindex, analyze)
    - dry_run: If True, preview changes without applying (default: True)

Returns:
    - Optimization results including duration, tables affected, space freed

**Rate Limited**: 10 requests per hour for database optimization
**Security**: All operations are logged for audit trail

**Parameters:**

- `optimization_type` (query): Optimization type: vacuum, reindex, or analyze
- `dry_run` (query): Preview changes without applying them

**Success Response (200):** Successful Response

---

### `GET /v1/admin/debug/check-password`

**Summary:** Check Password Security Status

SECURED: Check password security status (NO SENSITIVE DATA EXPOSED)
Previously exposed admin passwords and hash previews - NOW SECURED

**Success Response (200):** Successful Response

---

### `GET /v1/admin/debug/check-users`

**Summary:** Check Users Secure

SECURED: Check user count and basic info (NO SENSITIVE DATA)
Requires superuser access and does NOT expose:
- Password hashes
- Database credentials
- Sensitive user information

**Success Response (200):** Successful Response

---

### `POST /v1/admin/debug/fix-all-passwords`

**Summary:** Secure Password Management

SECURED: Password management endpoint (NO HARDCODED PASSWORDS)
Previously contained hardcoded admin passwords - NOW SECURED

**Success Response (200):** Successful Response

---

### `POST /v1/admin/disaster-recovery/disaster-recovery/backup/create`

**Summary:** Create Backup

Create a new backup

**Parameters:**

- `backup_type` (query) *(required)*: No description
- `description` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/disaster-recovery/disaster-recovery/backups`

**Summary:** List Backups

List available backups

**Parameters:**

- `limit` (query): No description
- `offset` (query): No description
- `backup_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/disaster-recovery/disaster-recovery/compliance`

**Summary:** Get Compliance Status

Get disaster recovery compliance status

**Success Response (200):** Successful Response

---

### `GET /v1/admin/disaster-recovery/disaster-recovery/dashboard`

**Summary:** Get Disaster Recovery Dashboard

Get comprehensive disaster recovery dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/disaster-recovery/disaster-recovery/restore`

**Summary:** Initiate Restore

Initiate disaster recovery restore operation

**Parameters:**

- `backup_id` (query) *(required)*: No description
- `recovery_type` (query) *(required)*: No description
- `recovery_point` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/enterprise/enterprise/audit-logs`

**Summary:** Get Audit Logs

Get audit logs for enterprise compliance

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `action` (query): No description
- `user_id` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/enterprise/enterprise/collaboration-data`

**Summary:** Get Collaboration Data

Get team collaboration metrics and activity

**Success Response (200):** Successful Response

---

### `GET /v1/admin/enterprise/enterprise/performance-metrics`

**Summary:** Get Performance Metrics

Get system performance metrics for enterprise monitoring

**Success Response (200):** Successful Response

---

### `GET /v1/admin/enterprise/enterprise/project-analytics`

**Summary:** Get Project Analytics

Get comprehensive project analytics for enterprise dashboard

**Parameters:**

- `timeframe` (query): 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `GET /v1/admin/enterprise/enterprise/security-metrics`

**Summary:** Get Security Metrics

Get security metrics and compliance data

**Success Response (200):** Successful Response

---

### `POST /v1/admin/enterprise/enterprise/security-scan`

**Summary:** Trigger Security Scan

Trigger a comprehensive security scan

**Success Response (200):** Successful Response

---

### `GET /v1/admin/enterprise/enterprise/team-activity`

**Summary:** Get Team Activity

Get detailed team activity metrics

**Parameters:**

- `timeframe` (query): 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `POST /v1/admin/error-analysis/analyze`

**Summary:** Analyze Error

Analyze an error and provide explanation and suggestions.

This endpoint parses stack traces, identifies error patterns, and provides
actionable recommendations for resolving the issue.

- **project_id**: ID of the project where the error occurred
- **error_message**: The error message text
- **error_type**: Type or class of the error
- **stack_trace**: Full stack trace of the error
- **source_code**: Optional source code files relevant to the error
- **context**: Optional additional context about the error
- **occurrence**: Optional details about when/where the error occurred

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/admin/error-analysis/errors`

**Summary:** Get error analyses for a user

Get a list of error analyses for the current user.

Returns summaries of error analyses that match the specified filters.

- **project_id**: Optional project ID to filter by
- **category**: Optional category to filter by
- **severity**: Optional severity to filter by
- **limit**: Maximum number of analyses to return (default: 10)

**Parameters:**

- `project_id` (query): Optional project ID to filter by
- `category` (query): Optional category to filter by
- `severity` (query): Optional severity to filter by
- `limit` (query): Maximum number of analyses to return

**Success Response (200):** Successful Response

---

### `GET /v1/admin/error-analysis/errors/metrics/{project_id}`

**Summary:** Get error metrics for a project

Get error metrics for a specific project.

Returns aggregated error metrics including counts by severity, common categories,
affected files, and trends over time.

- **project_id**: ID of the project to get metrics for

**Parameters:**

- `project_id` (path) *(required)*: ID of the project

**Success Response (200):** Successful Response

---

### `GET /v1/admin/error-analysis/errors/{analysis_id}`

**Summary:** Get detailed error analysis

Get detailed information about a specific error analysis.

Returns complete information about the error analysis, including root cause analysis,
suggestions, and stack trace details.

- **analysis_id**: ID of the analysis to retrieve

**Parameters:**

- `analysis_id` (path) *(required)*: ID of the analysis to retrieve

**Success Response (200):** Successful Response

---

### `POST /v1/admin/evaluation/code/evaluate`

**Summary:** Evaluate Generated Code

Evaluate AI-generated code using comprehensive evaluation pipeline

Combines DeepEval and PromptFoo for enterprise-grade quality assessment

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/evaluation/code/evaluate/{evaluation_id}/results`

**Summary:** Get Evaluation Results

Get comprehensive evaluation results

**Parameters:**

- `evaluation_id` (path) *(required)*: No description
- `format_type` (query): Result format (json, summary, detailed)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/evaluation/code/evaluate/{evaluation_id}/status`

**Summary:** Get Evaluation Status

Get current status of a code evaluation

**Parameters:**

- `evaluation_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/evaluation/deepeval/metrics`

**Summary:** List Available DeepEval Metrics

List available DeepEval evaluation metrics

**Success Response (200):** Successful Response

---

### `GET /v1/admin/evaluation/history`

**Summary:** Get Evaluation History

Get evaluation history for the current user

**Parameters:**

- `project_id` (query): Filter by project ID
- `limit` (query): Maximum records to return

**Success Response (200):** Successful Response

---

### `GET /v1/admin/evaluation/metrics/dashboard`

**Summary:** Get Evaluation Metrics Dashboard

Get evaluation metrics dashboard data

**Parameters:**

- `days` (query): Number of days to include

**Success Response (200):** Successful Response

---

### `GET /v1/admin/evaluation/promptfoo/providers`

**Summary:** List Available PromptFoo Providers

List available PromptFoo AI providers

**Success Response (200):** Successful Response

---

### `POST /v1/admin/evaluation/prompts/ab-test`

**Summary:** Create A/B Test

Create A/B test between two prompt variations

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/evaluation/prompts/ab-test/{test_id}/run`

**Summary:** Run A/B Test

Run A/B test and get comparison results

**Parameters:**

- `test_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/evaluation/prompts/test`

**Summary:** Create Prompt Test

Create and run prompt test using PromptFoo

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/evaluation/prompts/test/{config_id}/run`

**Summary:** Run Prompt Test

Run prompt test and get results

**Parameters:**

- `config_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/frontend-debug/debug/cors-test`

**Summary:** Test Cors Configuration

Test CORS configuration and headers

**Success Response (200):** Successful Response

---

### `GET /v1/admin/frontend-debug/debug/frontend-test`

**Summary:** Test Frontend Connectivity

Debug endpoint to help diagnose frontend connectivity issues

**Success Response (200):** Successful Response

---

### `POST /v1/admin/git-integration/auto-commit`

**Summary:** Auto Commit Project

Automatically commit all changes in a project

**Parameters:**

- `project_path` (query) *(required)*: No description
- `action` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/git-integration/branch`

**Summary:** Manage Branch

Manage Git branches (create, checkout, delete, merge)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/git-integration/commit`

**Summary:** Commit Changes

Commit changes to Git repository

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/git-integration/config`

**Summary:** Get Git Config

Get current Git configuration

**Success Response (200):** Successful Response

---

### `PUT /v1/admin/git-integration/config`

**Summary:** Update Git Config

Update Git configuration

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/git-integration/dashboard`

**Summary:** Get Git Dashboard

Get Git integration dashboard

**Success Response (200):** Successful Response

---

### `GET /v1/admin/git-integration/history/{project_path}`

**Summary:** Get Commit History

Get Git commit history

**Parameters:**

- `project_path` (path) *(required)*: No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/git-integration/push`

**Summary:** Push Changes

Push changes to remote repository

**Parameters:**

- `project_path` (query) *(required)*: No description
- `branch` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/git-integration/repositories`

**Summary:** List Repositories

List all Git repositories

**Success Response (200):** Successful Response

---

### `POST /v1/admin/git-integration/repository/clone`

**Summary:** Clone Repository

Clone a Git repository

**Parameters:**

- `repository_url` (query) *(required)*: No description
- `destination` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/git-integration/repository/init`

**Summary:** Initialize Repository

Initialize a new Git repository

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/git-integration/status/{project_path}`

**Summary:** Get Repository Status

Get Git repository status

**Parameters:**

- `project_path` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/help-documentation/help-documentation/analytics`

**Summary:** Get Documentation Analytics

Get documentation analytics and insights

**Parameters:**

- `timeframe` (query): No description
- `category` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/help-documentation/help-documentation/categories`

**Summary:** Get Documentation Categories

Get documentation categories with content counts

**Success Response (200):** Successful Response

---

### `GET /v1/admin/help-documentation/help-documentation/content`

**Summary:** List Documentation

List documentation with filtering options

**Parameters:**

- `category` (query): No description
- `doc_type` (query): No description
- `target_role` (query): No description
- `is_public` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/help-documentation/help-documentation/content`

**Summary:** Create Documentation

Create new documentation content

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/help-documentation/help-documentation/content/{doc_id}`

**Summary:** Get Documentation

Get specific documentation content

**Parameters:**

- `doc_id` (path) *(required)*: No description
- `track_view` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /v1/admin/help-documentation/help-documentation/content/{doc_id}`

**Summary:** Update Documentation

Update documentation content

**Parameters:**

- `doc_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/admin/help-documentation/help-documentation/content/{doc_id}`

**Summary:** Delete Documentation

Delete documentation content

**Parameters:**

- `doc_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/help-documentation/help-documentation/dashboard`

**Summary:** Get Help Dashboard

Get comprehensive help and documentation dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/help-documentation/help-documentation/export`

**Summary:** Export Documentation

Export documentation in various formats

**Parameters:**

- `format` (query): No description
- `category` (query): No description
- `include_analytics` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/help-documentation/help-documentation/feedback`

**Summary:** Submit Documentation Feedback

Submit feedback for documentation

**Parameters:**

- `doc_id` (query) *(required)*: No description
- `rating` (query) *(required)*: No description
- `comment` (query): No description
- `helpful` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/help-documentation/help-documentation/search`

**Summary:** Search Documentation

Search documentation content

**Parameters:**

- `limit` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/help-documentation/help-documentation/upload`

**Summary:** Upload Documentation File

Upload documentation file (PDF, markdown, etc.)

**Parameters:**

- `doc_type` (query): No description
- `category` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/indexing/repositories/{project_id}`

**Summary:** Index Repository

Index a code repository for semantic search.

GIVEN a valid repository path and project ID
WHEN the indexing service processes the repository
THEN vectorized code embeddings are created for semantic search

Returns:
    JSON response with indexing operation details

**Parameters:**

- `project_id` (path) *(required)*: Project identifier

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/indexing/repositories/{project_id}/search`

**Summary:** Search Repository

Search an indexed repository using vector similarity.

GIVEN a search query and project ID
WHEN the search service processes the query
THEN semantically relevant code chunks are returned

Returns:
    JSON response with search results

**Parameters:**

- `project_id` (path) *(required)*: Project identifier
- `query` (query) *(required)*: Search query
- `limit` (query): Maximum number of results

**Success Response (200):** Successful Response

---

### `GET /v1/admin/indexing/repositories/{project_id}/stats`

**Summary:** Get Indexing Statistics

Get indexing statistics for a repository.

GIVEN a project ID with an indexed repository
WHEN requesting indexing statistics
THEN detailed statistics about the indexed repository are returned

Returns:
    JSON response with indexing statistics

**Parameters:**

- `project_id` (path) *(required)*: Project identifier

**Success Response (200):** Successful Response

---

### `GET /v1/admin/langflow-templates/base-templates`

**Summary:** Get Base Templates

Get available base template configurations

**Success Response (200):** Successful Response

---

### `GET /v1/admin/langflow-templates/components`

**Summary:** Get Langchain Components

Get available LangChain components and their descriptions

**Success Response (200):** Successful Response

---

### `GET /v1/admin/langflow-templates/dashboard`

**Summary:** Get Langflow Dashboard

Get Langflow templates dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/langflow-templates/export`

**Summary:** Export Template

Export a Langflow template

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/langflow-templates/generate`

**Summary:** Generate Langflow Template

Generate a new Langflow template

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/langflow-templates/templates`

**Summary:** List Templates

List all Langflow templates

**Success Response (200):** Successful Response

---

### `GET /v1/admin/langflow-templates/templates/{template_id}`

**Summary:** Get Template

Get a specific Langflow template

**Parameters:**

- `template_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/analytics`

**Summary:** Get Onboarding Analytics

Get onboarding and tutorial analytics

**Parameters:**

- `timeframe` (query): No description
- `user_role` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/completion-rates`

**Summary:** Get Completion Rates

Get completion rates analysis

**Parameters:**

- `timeframe` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/dashboard`

**Summary:** Get Onboarding Dashboard

Get comprehensive onboarding and tutorial dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/onboarding-tutorials/onboarding-tutorials/feedback`

**Summary:** Submit Tutorial Feedback

Submit feedback for tutorial

**Parameters:**

- `tutorial_id` (query) *(required)*: No description
- `rating` (query) *(required)*: No description
- `feedback_text` (query): No description
- `helpful` (query): No description
- `difficulty_rating` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/flows`

**Summary:** List Onboarding Flows

List onboarding flows with filtering

**Parameters:**

- `target_role` (query): No description
- `is_mandatory` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/onboarding-tutorials/onboarding-tutorials/flows`

**Summary:** Create Onboarding Flow

Create new onboarding flow

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/tutorials`

**Summary:** List Tutorials

List tutorials with filtering

**Parameters:**

- `tutorial_type` (query): No description
- `target_role` (query): No description
- `difficulty_level` (query): No description
- `is_active` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/onboarding-tutorials/onboarding-tutorials/tutorials`

**Summary:** Create Tutorial

Create new tutorial

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/tutorials/{tutorial_id}`

**Summary:** Get Tutorial Details

Get detailed tutorial information

**Parameters:**

- `tutorial_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/onboarding-tutorials/onboarding-tutorials/tutorials/{tutorial_id}/steps`

**Summary:** Add Tutorial Step

Add step to tutorial

**Parameters:**

- `tutorial_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/onboarding-tutorials/onboarding-tutorials/user-progress/{user_id}`

**Summary:** Get User Progress

Get user's onboarding and tutorial progress

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/onboarding-tutorials/onboarding-tutorials/user-progress/{user_id}/update`

**Summary:** Update User Progress

Update user's progress

**Parameters:**

- `user_id` (path) *(required)*: No description
- `stage` (query): No description
- `tutorial_id` (query): No description
- `step_id` (query): No description
- `completed` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/projects/{project_id}/billing/usage`

**Summary:** Get Project Billing Usage

Get detailed credit usage breakdown for a project

**Admin Only** - Requires ADMIN or SUPERUSER role

Returns:
    - total_credits_used: Total credits consumed in time range
    - time_range: The requested time range
    - breakdown: Credits by category:
        - vector_operations: Vector search, upsert, delete operations
        - memory_operations: Agent memory store/retrieve operations
        - storage_operations: File upload/download operations
        - database_operations: NoSQL table operations
        - postgres_queries: Managed PostgreSQL query credits
    - top_endpoints: Top 10 endpoints by credit usage
    - daily_breakdown: Daily credit usage for the time range

Query Parameters:
    - time_range: last_24_hours | last_7_days | last_30_days

Issue #321 - Billing usage endpoint with ZeroDB integration

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `time_range` (query): Time range for usage data

**Success Response (200):** Successful Response

---

### `GET /v1/admin/quality-improvement/analytics/patterns`

**Summary:** Analyze Recommendation Patterns

Analyze patterns in recommendations across all prompts

**Features:**
- Cross-prompt pattern recognition
- Frequency analysis
- Impact assessment
- Actionable insights for system-wide improvements

**Parameters:**

- `time_window_days` (query): Analysis time window
- `min_frequency` (query): Minimum pattern frequency

**Success Response (200):** Success

---

### `GET /v1/admin/quality-improvement/health`

**Summary:** Get System Health

Get quality improvement engine health and status

**Features:**
- System performance metrics
- Cache efficiency monitoring
- ML model status
- Processing statistics

**Success Response (200):** Success

---

### `POST /v1/admin/quality-improvement/prompts/{prompt_id}/recommendations`

**Summary:** Generate Recommendations

Generate quality improvement recommendations for a specific prompt

**Features:**
- AI-powered recommendation generation
- Pattern-based analysis
- ML model predictions
- Comparative analysis with high-performing prompts
- User feedback integration
- Customizable analysis window

**Parameters:**

- `prompt_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/quality-improvement/prompts/{prompt_id}/recommendations/summary`

**Summary:** Get Recommendation Summary

Get summary of recommendations for a prompt

**Features:**
- Recommendation count by priority
- Type distribution analysis
- Average confidence metrics
- Quick overview for dashboards

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `analysis_window_days` (query): Analysis window in days

**Success Response (200):** Success

---

### `POST /v1/admin/quality-improvement/recommendations/bulk-analysis`

**Summary:** Bulk Prompt Analysis

Generate recommendations for multiple prompts in bulk

**Features:**
- Parallel processing of multiple prompts
- Batch optimization for performance
- Progress tracking
- Filtered results by confidence threshold

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/quality-improvement/recommendations/bulk-analysis/{task_id}/status`

**Summary:** Get Bulk Analysis Status

Get status of bulk analysis task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/admin/quality-improvement/recommendations/types`

**Summary:** Get Recommendation Types

Get available recommendation types and their descriptions

**Success Response (200):** Success

---

### `GET /v1/admin/quality-improvement/recommendations/{recommendation_id}`

**Summary:** Get Recommendation Details

Get detailed information about a specific recommendation

**Features:**
- Complete recommendation details
- Implementation guidance
- Supporting evidence
- Impact analysis

**Parameters:**

- `recommendation_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `POST /v1/admin/quality-trending/alert-rules`

**Summary:** Create Alert Rule

Create a new quality alert rule

**Features:**
- Custom threshold alerts
- Trend-based alerts
- Anomaly detection alerts
- Configurable severity levels
- Notification channel routing
- Cooldown management

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/alerts`

**Summary:** Get Alert History

Get quality alert history with filtering

**Features:**
- Prompt-specific alert filtering
- Severity-based filtering
- Chronological ordering
- Alert status tracking
- Detailed alert metadata

**Parameters:**

- `prompt_id` (query): Filter by prompt ID
- `severity` (query): Filter by severity
- `limit` (query): Maximum number of alerts

**Success Response (200):** Success

---

### `PUT /v1/admin/quality-trending/alerts/{alert_id}/acknowledge`

**Summary:** Acknowledge Alert

Acknowledge a quality alert

**Features:**
- Alert acknowledgment tracking
- User attribution
- Status updates
- Audit logging

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `PUT /v1/admin/quality-trending/alerts/{alert_id}/resolve`

**Summary:** Resolve Alert

Resolve a quality alert

**Features:**
- Alert resolution tracking
- User attribution
- Automatic status updates
- Resolution timestamps

**Parameters:**

- `alert_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/config`

**Summary:** Get System Configuration

Get quality trending system configuration

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/health`

**Summary:** Get System Health

Get quality trending system health and status

**Features:**
- System status monitoring
- Data volume metrics
- Alert system health
- Performance indicators

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/insights/comparative`

**Summary:** Get Comparative Insights

Get comparative quality insights across prompts

**Features:**
- Cross-prompt comparison
- Relative performance analysis
- Best/worst performers identification
- Improvement opportunities

**Parameters:**

- `prompt_ids` (query) *(required)*: Prompt IDs to compare
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/prompts/{prompt_id}/trends`

**Summary:** Analyze Prompt Trends

Analyze quality trends for a specific prompt

**Features:**
- Statistical trend analysis with regression
- Confidence level calculation
- Anomaly detection
- Seasonality analysis
- Predictive forecasting
- Actionable recommendations

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `POST /v1/admin/quality-trending/record`

**Summary:** Record Quality Score

Record a quality score for trending analysis

**Features:**
- Quality score tracking and storage
- Automatic trend analysis updates
- Real-time alert checking
- Historical data aggregation

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/summary`

**Summary:** Get Quality Summary

Get comprehensive quality summary across prompts

**Features:**
- Cross-prompt quality analysis
- Trend distribution insights
- Alert summaries
- Statistical aggregations
- Performance benchmarking

**Parameters:**

- `prompt_ids` (query): Prompt IDs to analyze (empty = all)
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `GET /v1/admin/quality-trending/trends/batch`

**Summary:** Analyze Multiple Prompt Trends

Analyze quality trends for multiple prompts in batch

**Features:**
- Batch trend analysis
- Parallel processing
- Comprehensive insights
- Performance optimization

**Parameters:**

- `prompt_ids` (query) *(required)*: List of prompt IDs to analyze
- `time_window_days` (query): Analysis time window

**Success Response (200):** Success

---

### `POST /v1/admin/quantum-search/index`

**Summary:** Index Repository

Index repository files with quantum-enhanced vectors.

GIVEN repository files
WHEN indexing for search
THEN create quantum-enhanced vector representations

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/admin/quantum-search/metrics`

**Summary:** Get Search Metrics

Get search performance metrics.

GIVEN a date range
WHEN retrieving metrics
THEN return performance statistics

**Parameters:**

- `start_date` (query): Start date (YYYY-MM-DD)
- `end_date` (query): End date (YYYY-MM-DD)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/quantum-search/results/{search_id}`

**Summary:** Get Search Results

Retrieve search results by ID.

GIVEN a search ID
WHEN retrieving results
THEN return the search results

**Parameters:**

- `search_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/quantum-search/search`

**Summary:** Search

Perform quantum-enhanced semantic search.

GIVEN a search query and repository context
WHEN searching with quantum enhancement
THEN return semantically relevant results with quantum-enhanced ranking

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/quick-setup/`

**Summary:** Create Production Users

Create production users using direct database connection

**Success Response (201):** Successful Response

---

### `GET /v1/admin/railway-deployment/cli-status`

**Summary:** Get Cli Status

Get Railway CLI status

**Success Response (200):** Successful Response

---

### `POST /v1/admin/railway-deployment/cli/install`

**Summary:** Install Railway Cli

Install Railway CLI

**Success Response (200):** Successful Response

---

### `GET /v1/admin/railway-deployment/dashboard`

**Summary:** Get Railway Dashboard

Get Railway deployment dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/railway-deployment/deploy`

**Summary:** Deploy To Railway

Deploy project to Railway

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/railway-deployment/deployment/{deployment_id}/logs`

**Summary:** Get Deployment Logs

Get deployment logs

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/railway-deployment/deployment/{deployment_id}/rollback`

**Summary:** Rollback Deployment

Rollback Railway deployment

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/railway-deployment/deployment/{deployment_id}/status`

**Summary:** Get Deployment Status

Get deployment status

**Parameters:**

- `deployment_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/railway-deployment/environments`

**Summary:** Get Supported Environments

Get supported deployment environments

**Success Response (200):** Successful Response

---

### `POST /v1/admin/railway-deployment/initialize`

**Summary:** Initialize Railway Project

Initialize a new Railway project

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/railway-deployment/project/{project_name}/status`

**Summary:** Get Project Status

Get Railway project status

**Parameters:**

- `project_name` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/railway-deployment/projects`

**Summary:** List Railway Projects

List all Railway projects

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/dashboard`

**Summary:** Get Scaffolding Dashboard

Get scaffolding tools dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/scaffolding-tools/install/{tool}`

**Summary:** Install Scaffolding Tool

Install a scaffolding tool

**Parameters:**

- `tool` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/operations`

**Summary:** Get Scaffolding Operations

Get all scaffolding operations

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/operations/{request_id}`

**Summary:** Get Scaffolding Operation

Get details of a specific scaffolding operation

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/admin/scaffolding-tools/operations/{request_id}`

**Summary:** Delete Scaffolding Operation

Delete a scaffolding operation and its files

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/scaffolding-tools/operations/{request_id}/retry`

**Summary:** Retry Scaffolding Operation

Retry a failed scaffolding operation

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/scaffolding-tools/scaffold`

**Summary:** Create Scaffolded Project

Create a new project using scaffolding tools

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/templates`

**Summary:** Get Available Templates

Get available templates for all tools

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/templates/{tool}`

**Summary:** Get Tool Templates

Get available templates for a specific tool

**Parameters:**

- `tool` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/tools`

**Summary:** Get Available Tools

Get available scaffolding tools and their status

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaffolding-tools/tools/{tool}/status`

**Summary:** Get Tool Status

Get detailed status of a specific tool

**Parameters:**

- `tool` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaling/infrastructure/status`

**Summary:** Get Infrastructure Status

Get comprehensive infrastructure status

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaling/instances/{instance_id}/metrics`

**Summary:** Get Instance Metrics

Get detailed metrics for a specific instance

**Parameters:**

- `instance_id` (path) *(required)*: No description
- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaling/load-balancer/config`

**Summary:** Get Load Balancer Config

Get detailed load balancer configuration

**Success Response (200):** Successful Response

---

### `POST /v1/admin/scaling/load-balancer/update`

**Summary:** Update Load Balancer Config

Update load balancer configuration

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaling/scaling/history`

**Summary:** Get Scaling History

Get scaling operation history

**Parameters:**

- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/scaling/scaling/manual`

**Summary:** Trigger Manual Scaling

Trigger manual scaling operation

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/scaling/scaling/policies`

**Summary:** Get Scaling Policies

Get auto-scaling policies

**Success Response (200):** Successful Response

---

### `POST /v1/admin/scaling/scaling/policies/update`

**Summary:** Update Scaling Policies

Update auto-scaling policies

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/audit-event-types`

**Summary:** List Audit Event Types

List available audit event types

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/audit/events`

**Summary:** List Audit Events

List audit events with filtering

**Parameters:**

- `event_type` (query): Filter by event type
- `user_id` (query): Filter by user ID
- `outcome` (query): Filter by outcome
- `start_date` (query): Start date filter
- `end_date` (query): End date filter
- `limit` (query): Maximum events to return

**Success Response (200):** Successful Response

---

### `POST /v1/admin/security/audit/log`

**Summary:** Log Audit Event

Log security audit event for compliance tracking

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/compliance-frameworks`

**Summary:** List Compliance Frameworks

List supported compliance frameworks

**Success Response (200):** Successful Response

---

### `POST /v1/admin/security/compliance/report`

**Summary:** Generate Compliance Report

Generate comprehensive compliance report

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/compliance/{framework}/status`

**Summary:** Check Compliance Status

Check compliance status for specific framework

**Parameters:**

- `framework` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/dashboard`

**Summary:** Security Dashboard

Get comprehensive security dashboard

**Success Response (200):** Successful Response

---

### `POST /v1/admin/security/data/classify`

**Summary:** Classify Data

Classify data based on sensitivity and content

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/security/data/decrypt`

**Summary:** Decrypt Sensitive Data

Decrypt sensitive data with access control

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/security/data/encrypt`

**Summary:** Encrypt Sensitive Data

Encrypt sensitive data based on classification

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/security/incidents`

**Summary:** Create Security Incident

Create security incident for tracking and response

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/incidents`

**Summary:** List Security Incidents

List security incidents with filtering

**Parameters:**

- `status_filter` (query): Filter by status
- `severity` (query): Filter by severity
- `limit` (query): Maximum incidents to return

**Success Response (200):** Successful Response

---

### `GET /v1/admin/security/security-levels`

**Summary:** List Security Levels

List available security classification levels

**Success Response (200):** Successful Response

---

### `GET /v1/admin/snapshots/`

**Summary:** List Snapshots

List all snapshots

**Success Response (200):** Successful Response

---

### `POST /v1/admin/snapshots/`

**Summary:** Create Snapshot

Create a new snapshot

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/system/stats`

**Summary:** Get System Stats

Get comprehensive system-wide statistics

**Admin Only** - Requires ADMIN or SUPERUSER role

Returns:
    - System metrics (users, projects, vectors, tables, storage)
    - Database performance metrics
    - API performance metrics
    - Active users in last 24 hours

**Rate Limited**: 100 requests per minute for admins

**Success Response (200):** Successful Response

---

### `GET /v1/admin/users/{user_id}/usage`

**Summary:** Get User Usage Stats

Get detailed usage statistics for a specific user

**Admin Only** - Requires ADMIN or SUPERUSER role

Parameters:
    - user_id: UUID of the user to analyze
    - period_days: Number of days to analyze (default: 30, max: 365)

Returns:
    - User information and billing details
    - Usage metrics (projects, vectors, storage, API calls)
    - Tier limits and current usage
    - Last activity timestamp

**Rate Limited**: 100 requests per minute

**Parameters:**

- `user_id` (path) *(required)*: User ID to get usage statistics for
- `period_days` (query): Period in days (1-365)

**Success Response (200):** Successful Response

---

## Dashboard


### `GET /v1/dashboard`

**Summary:** Get dashboard overview

Get comprehensive dashboard overview with aggregated metrics, recent activity, and quick stats

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/`

**Summary:** Dashboard Information

Get information about the dashboard API

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/activity`

**Summary:** Get activity feed

Get recent activity feed showing new followers, stream starts/ends, and other events

**Parameters:**

- `limit` (query): Maximum number of activities to return
- `offset` (query): Offset for pagination

**Success Response (200):** Successful Response

---

### `POST /v1/dashboard/ai/chat`

**Summary:** AI Chat Interaction

Interact with AI tools (requires USE_AI_TOOLS permission)

**Parameters:**

- `message` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/analytics`

**Summary:** View Dashboard Analytics

View analytics data for projects and usage (requires VIEW_ANALYTICS permission)

**Parameters:**

- `timeframe` (query): Timeframe: 1d, 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/goals`

**Summary:** Get streamer goals and milestones

Get goal tracking with progress for follower milestones, stream hours, and viewer targets

**Success Response (200):** Successful Response

---

### `POST /v1/dashboard/goals`

**Summary:** Create custom goal

Create a custom goal for tracking streamer milestones

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/dashboard/logs`

**Summary:** View Application Logs

View application logs for debugging (requires VIEW_LOGS permission)

**Parameters:**

- `level` (query): Log level filter: DEBUG, INFO, WARNING, ERROR
- `limit` (query): Number of log entries to return

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/me`

**Summary:** Get Current User Info

Get detailed information about the current authenticated user

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/notifications`

**Summary:** Get streamer notifications

Get notification center for streamer with unread count and pagination

**Parameters:**

- `limit` (query): Maximum number of notifications to return
- `offset` (query): Offset for pagination
- `unread_only` (query): Return only unread notifications

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/permissions`

**Summary:** Get User Permissions

Get detailed list of user permissions

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/projects`

**Summary:** List User Projects

List all projects for the current user (requires MANAGE_OWN_PROJECTS permission)

**Parameters:**

- `skip` (query): Number of records to skip
- `limit` (query): Number of records to return

**Success Response (200):** Successful Response

---

### `GET /v1/dashboard/quick-stats`

**Summary:** Get quick statistics

Get key metrics at a glance for dashboard widgets

**Success Response (200):** Successful Response

---

## Dashboard Aggregation


### `GET /v1/dashboard/agent-swarm`

**Summary:** Get Agent Swarm dashboard data

Get Agent Swarm metrics including agents, tasks, and performance

**Parameters:**

- `status_filter` (query): Filter by agent status (active, idle, error)

**Success Response (200):** Agent Swarm metrics and task statistics

---

### `GET /v1/dashboard/aikit`

**Summary:** Get AIKit dashboard data

Get AIKit metrics including models, requests, and performance

**Success Response (200):** AIKit metrics and model statistics

---

### `GET /v1/dashboard/billing`

**Summary:** Get billing dashboard data

Get billing and usage metrics including credits, costs, and payment info

**Success Response (200):** Billing metrics and usage breakdown

---

### `GET /v1/dashboard/overview`

**Summary:** Get dashboard overview

Get comprehensive dashboard overview with aggregated metrics from all platforms

**Success Response (200):** Dashboard overview with projects, API usage, credits, and activity

---

### `GET /v1/dashboard/qnn`

**Summary:** Get QNN dashboard data

Get Quantum Neural Network metrics including circuits, jobs, and performance

**Success Response (200):** QNN metrics and circuit statistics

---

### `GET /v1/dashboard/tools/actions`

**Summary:** Get available actions

Get list of available quick actions for dashboard tools

**Parameters:**

- `category` (query): Filter by category (aikit, zerodb, qnn, agent-swarm)

**Success Response (200):** Available actions list

---

### `POST /v1/dashboard/tools/actions/{action_id}`

**Summary:** Execute action

Execute a dashboard action with optional parameters

**Parameters:**

- `action_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Action execution result

---

### `GET /v1/dashboard/zerodb`

**Summary:** Get ZeroDB dashboard data

Get ZeroDB metrics including databases, tables, and query performance

**Success Response (200):** ZeroDB metrics and database statistics

---

## Public API


### `GET /v1/public/api-keys/`

**Summary:** List Api Keys

Unified API Key listing endpoint
- Regular users: See only their own API keys
- Admin users: See all API keys (with optional filtering)

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `user_id` (query): No description
- `is_active` (query): No description
- `search` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/api-keys/`

**Summary:** Create Api Key

Create a new API key for the current user

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/api-keys/{key_id}`

**Summary:** Get Api Key

Get a specific API key
- Regular users: Can only access their own keys
- Admin users: Can access any key

**Parameters:**

- `key_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/api-keys/{key_id}`

**Summary:** Update Api Key

Update an API key
- Regular users: Can only update their own keys
- Admin users: Can update any key

**Parameters:**

- `key_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/api-keys/{key_id}`

**Summary:** Delete Api Key

Delete an API key
- Regular users: Can only delete their own keys
- Admin users: Can delete any key

**Parameters:**

- `key_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/api-keys/{key_id}/rotate`

**Summary:** Rotate Api Key

Rotate an API key (generate new key value)
- Regular users: Can only rotate their own keys
- Admin users: Can rotate any key

**Parameters:**

- `key_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/campaign/activate-gift`

**Summary:** Activate Gift Trial

Activate gift trial for a user

Called after user logs in or registers with gift param.

Args:
    campaign_id: Campaign identifier
    user_id: User UUID

Returns:
    Subscription activation status

**Parameters:**

- `campaign_id` (query) *(required)*: No description
- `user_id` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/campaign/clicks/{campaign_id}`

**Summary:** Get Campaign Clicks

Get individual campaign clicks with user information (admin endpoint)

Args:
    campaign_id: Campaign identifier
    limit: Maximum number of results (max 500)
    offset: Pagination offset
    converted_only: Show only converted clicks

Returns:
    List of clicks with user details

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `limit` (query): No description
- `offset` (query): No description
- `converted_only` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/campaign/fix-conversions/{campaign_id}`

**Summary:** Fix Campaign Conversions

Retroactively fix campaign conversions (admin endpoint)

For users who clicked but didn't convert due to frontend bug,
this will activate their trials and mark them as converted.

Args:
    campaign_id: Campaign identifier
    dry_run: If true, only simulate without making changes

Returns:
    Summary of conversions fixed

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `dry_run` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/campaign/gift/{campaign_id}`

**Summary:** Claim Gift

Handle gift claim link click from email

Flow:
1. Validate campaign
2. Log the click with email
3. Check if user exists
4. Redirect appropriately (login or register)

Args:
    campaign_id: Campaign identifier (e.g., "ny2026")
    email: Recipient email address
    track: Click source (cta_button, events_link, etc.)
    utm_*: UTM tracking parameters

Returns:
    RedirectResponse to login (existing user) or register (new user)

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `email` (query) *(required)*: Recipient email address
- `track` (query): Click source tracking
- `utm_source` (query): No description
- `utm_medium` (query): No description
- `utm_campaign` (query): No description
- `utm_content` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/campaign/stats/{campaign_id}`

**Summary:** Get Campaign Stats

Get campaign statistics (admin endpoint)

Args:
    campaign_id: Campaign identifier

Returns:
    Campaign statistics including clicks, conversions, etc.

**Parameters:**

- `campaign_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/campaign/track`

**Summary:** Track Click

Track a click and redirect to target URL

Used for tracking Luma events link clicks and other CTA buttons.

Args:
    campaign: Campaign identifier
    email: User email
    action: Action type (events_click, etc.)
    redirect: Target URL to redirect to

Returns:
    RedirectResponse to target URL

**Parameters:**

- `campaign` (query) *(required)*: Campaign ID
- `email` (query) *(required)*: User email
- `action` (query) *(required)*: Action type (e.g., events_click)
- `redirect` (query) *(required)*: URL to redirect to after tracking

**Success Response (200):** Successful Response

---

### `GET /v1/public/credits/api-keys/count`

**Summary:** Get Api Keys Count

Get count of active API keys for the current user

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/credits/auto-refill-settings`

**Summary:** Get Auto Refill Settings

Get user's auto-refill settings

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `PUT /v1/public/credits/auto-refill-settings`

**Summary:** Update Auto Refill Settings

Update user's auto-refill settings

SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/credits/balance`

**Summary:** Get Credits Balance

Get user's current credit balance

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/credits/packages`

**Summary:** Get Credit Packages

Get available credit packages for purchase

Now reads from database instead of hardcoded values
SCSS V2.0 compliant endpoint

**Success Response (200):** Successful Response

---

### `POST /v1/public/credits/payment-intent`

**Summary:** Create Credit Payment Intent

Create Stripe Payment Intent for credit package purchase

This endpoint creates a secure payment intent on the backend and returns
the client_secret for the frontend to complete the payment using Stripe.js

Flow:
1. Customer selects credit package
2. Frontend calls this endpoint with package_id and amount
3. Backend creates Payment Intent with Stripe
4. Returns client_secret to frontend
5. Frontend uses Stripe.js to collect payment
6. Webhook processes successful payment and adds credits

SCSS V2.0 compliant endpoint

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/credits/purchase`

**Summary:** Purchase Credits

Purchase additional credits (placeholder for Stripe integration)

SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/credits/transactions`

**Summary:** Get Credits Transactions

Get user's credit transaction history

SCSS V2.0 compliant endpoint using direct SQL

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/credits/usage/current`

**Summary:** Get Current Usage

Get current period usage statistics

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/dashboard/stats`

**Summary:** Get Developer Dashboard Stats

Get dashboard statistics for the current developer.

Returns user-specific stats including:
- Total API requests
- Active API keys
- Projects count
- Recent activity

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/database/admin/health`

**Summary:** Get System Health Status

Get system health status including database, Redis, disk space, and memory checks (admin only)

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/database/admin/metrics`

**Summary:** Get System Metrics

Get real-time system metrics including CPU, memory, disk usage, active connections, and request rates (admin only)

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/database/admin/performance`

**Summary:** Get Performance Metrics

Get historical performance metrics and charts data (admin only)

**Parameters:**

- `hours` (query): Number of hours of historical data

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/database/events/activity`

**Summary:** Get Recent Activity Feed

Get recent activity events for audit and monitoring (developer and admin)

**Parameters:**

- `hours` (query): Number of hours to look back (1-168)
- `limit` (query): Maximum number of activities to return

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/projects/{project_id}/stats`

**Summary:** Get Project Statistics

Get comprehensive statistics for a specific project including vectors, tables, files, events, storage usage, and API calls

**Parameters:**

- `project_id` (path) *(required)*: Project UUID

**Success Response (200):** Successful Response

---

### `GET /v1/public/version/`

**Summary:** Get version management info

Get information about the version management system.

**Success Response (200):** Successful Response

---

### `POST /v1/public/version/{model_id}/versions`

**Summary:** Create Model Version

Create a new version for an AI model.

Requires admin or developer role.

**Parameters:**

- `model_id` (path) *(required)*: The ID of the AI model
- `user` (query): No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/version/{model_id}/versions`

**Summary:** Get all versions of a model

Retrieve all versions for an AI model in descending order by version number

**Parameters:**

- `model_id` (path) *(required)*: The ID of the AI model
- `skip` (query): Number of versions to skip
- `limit` (query): Maximum number of versions to return

**Success Response (200):** Success

---

### `GET /v1/public/version/{model_id}/versions/latest`

**Summary:** Get the latest version of a model

Retrieve the latest version for an AI model based on semantic versioning

**Parameters:**

- `model_id` (path) *(required)*: The ID of the AI model

**Success Response (200):** Success

---

### `GET /v1/public/version/{model_id}/versions/{version_id}`

**Summary:** Get a specific model version

Retrieve a specific version of an AI model by its ID

**Parameters:**

- `model_id` (path) *(required)*: The ID of the AI model
- `version_id` (path) *(required)*: The ID of the model version

**Success Response (200):** Success

---

### `PATCH /v1/public/version/{model_id}/versions/{version_id}`

**Summary:** Update a model version

Update a specific version of an AI model

**Parameters:**

- `model_id` (path) *(required)*: The ID of the AI model
- `version_id` (path) *(required)*: The ID of the model version
- `user` (query): No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `DELETE /v1/public/version/{model_id}/versions/{version_id}`

**Summary:** Delete a model version

Delete a specific version of an AI model

**Parameters:**

- `model_id` (path) *(required)*: The ID of the AI model
- `version_id` (path) *(required)*: The ID of the model version
- `user` (query): No description

---

## Tenant Management


### `GET /v1/tenant-management/tenants`

**Summary:** List Tenants

List all available tenants.

GIVEN an authenticated admin user
WHEN requesting a list of tenants
THEN return all tenants in the system

Following SCSS V2.0 standards with real database operations.
Requires admin permission.

**Success Response (200):** Successful Response

---

### `POST /v1/tenant-management/tenants`

**Summary:** Create Tenant

Create a new tenant.

GIVEN an authenticated admin user and valid tenant data
WHEN creating a new tenant
THEN create the tenant and return its details

Following SCSS V2.0 standards with real database operations.
Requires admin permission.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/tenant-management/tenants/{tenant_id}`

**Summary:** Get Tenant

Get details of a specific tenant.

GIVEN an authenticated admin user and a valid tenant ID
WHEN requesting details of a specific tenant
THEN return the tenant details

Following SCSS V2.0 standards with real database operations.
Requires admin permission.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/tenant-management/tenants/{tenant_id}`

**Summary:** Update Tenant

Update a tenant.

GIVEN an authenticated admin user, a valid tenant ID, and valid update data
WHEN updating a tenant
THEN update the tenant and return its updated details

Following SCSS V2.0 standards with real database operations.
Requires admin permission.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/tenant-management/tenants/{tenant_id}`

**Summary:** Delete Tenant

Delete a tenant.

GIVEN an authenticated admin user and a valid tenant ID
WHEN deleting a tenant
THEN mark the tenant as deleted

Following SCSS V2.0 standards with real database operations.
Requires admin permission.

**Parameters:**

- `tenant_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
