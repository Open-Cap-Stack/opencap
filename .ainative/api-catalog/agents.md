# Agents APIs

**Endpoint Count:** 265

## Overview

This category contains 265 endpoints for agents operations.


## AI Feedback & RLHF


### `POST /v1/ai/feedback`

**Summary:** Create AI feedback

Submit feedback on AI-generated content for RLHF training

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/ai/feedback`

**Summary:** List AI feedback (Admin only)

Get paginated list of AI feedback with optional filtering

**Parameters:**

- `page` (query): Page number
- `size` (query): Page size
- `content_type` (query): Filter by content type

**Success Response (200):** Successful Response

---

### `GET /v1/ai/feedback/analytics/by-content-type`

**Summary:** Get feedback analytics by content type (Admin only)

Get aggregated feedback statistics grouped by content type

**Success Response (200):** Successful Response

---

## Admin API


### `GET /admin/agent-swarm/agent-types`

**Summary:** Get Available Agent Types

Get list of available agent types and their capabilities

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/configure-prompts`

**Summary:** Configure Agent Prompts

Configure optimized prompts for specific agent types and tasks

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/health`

**Summary:** Agent Swarms Health

Simple health check for agent swarms module

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/metrics`

**Summary:** Get Agent Swarm Metrics

Get overall agent swarm performance metrics

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/orchestrate`

**Summary:** Create Agent Swarm Project

Create a new multi-agent swarm project using real workflow system with database persistence

This endpoint creates both a Project record and AgentSwarmWorkflow record in the database,
ensuring projects persist across server restarts and can be tracked properly.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects`

**Summary:** List Agent Swarm Projects

List all agent swarm projects with real database records

Queries the Project model and enriches with workflow execution data from cache/memory.
Shows real specialized agents (ArchitectAgent, FrontendAgent, BackendAgent, etc.)

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}`

**Summary:** Get Agent Swarm Project

Get detailed information about a specific agent swarm project

Returns real project data from database with workflow execution details.
Includes specialized agent information, logs, and stage progress.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/agents`

**Summary:** Get Agent Statuses

Get real status of all agents in a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/ai/generate-backlog`

**Summary:** Ai Generate Backlog

Use Anthropic Claude to generate project backlog from PRD and data model

Request body:
{
    "prd_content": "Full PRD",
    "data_model": {...}  // Data model object
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/ai/generate-data-model`

**Summary:** Ai Generate Data Model

Use Anthropic Claude to generate ZeroDB-aligned data model from PRD

This endpoint aligns with Stage 3 of the AgentSwarm workflow specification.
It uses AI to analyze the PRD and generate contextually appropriate:
- SQL tables for relational data
- Vector collections for semantic search
- Memory tables for caching/sessions

Request body:
{
    "prd_content": "Full PRD text",
    "project_name": "Project name",
    "features": ["list", "of", "features"],
    "technology_preferences": {"database": "zerodb"}
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/ai/generate-prd`

**Summary:** Ai Generate Prd

Use Anthropic Claude to generate a comprehensive PRD from a project idea

Request body:
{
    "project_idea": "Brief description of the project",
    "target_audience": "Who will use this",
    "key_features": ["feature1", "feature2"],
    "business_goals": ["goal1", "goal2"]
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/ai/generate-sprint-plan`

**Summary:** Ai Generate Sprint Plan

Use Anthropic Claude to generate sprint plan from backlog

Request body:
{
    "backlog": {...},  // Backlog object
    "sprint_length_weeks": 2,
    "team_velocity": 20  // story points per sprint
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/artifacts`

**Summary:** Get Project Artifacts

Get generated artifacts (code, files, documentation) for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/code`

**Summary:** List Project Code Files

List all code files for a project

Returns a list of all files stored in MinIO for the project with metadata.
Use the 'prefix' parameter to filter files by directory (e.g., prefix='src/' for only src files).

**Parameters:**

- `project_id` (path) *(required)*: No description
- `prefix` (query): Filter files by path prefix (e.g., 'src/')

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/code/download`

**Summary:** Download Project Code File

Download a single code file from the project

Downloads a specific file from MinIO storage with the correct Content-Type header.
Set as_attachment=false to view files in browser instead of downloading.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_path` (query) *(required)*: Path to the file to download (e.g., 'src/index.ts')
- `as_attachment` (query): Download as attachment (true) or inline (false)

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/code/download-zip`

**Summary:** Download Project Code Zip

Download entire project as ZIP archive

Creates a ZIP file containing all code files from the project and streams it to the client.
Handles projects with 100+ files efficiently using streaming.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/code/presigned-url`

**Summary:** Generate Presigned Download Url

Generate presigned URL for direct file download

Creates a temporary presigned URL that allows direct download from MinIO without authentication.
The URL expires after the specified time (default 1 hour, max 24 hours).
Useful for sharing files or embedding in external applications.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_path` (query) *(required)*: Path to the file (e.g., 'src/index.ts')
- `expires_in` (query): URL expiration time in seconds (60-86400)

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/download`

**Summary:** Download Project Artifacts

Download project artifacts as ZIP file

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/files`

**Summary:** Get Project Files

Get project files for viewing

**Parameters:**

- `project_id` (path) *(required)*: No description
- `path` (query): File or directory path

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/logs`

**Summary:** Get Project Logs

Get logs for a specific agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): No description
- `level` (query): info, warning, error

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/restart`

**Summary:** Restart Agent Swarm Project

Restart a failed or stopped agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/projects/{project_id}/status`

**Summary:** Get Agent Swarm Project Status

Get real status of a specific agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/stop`

**Summary:** Stop Agent Swarm Project

Stop a running agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/projects/{project_id}/test-websocket`

**Summary:** Test Websocket Broadcast

Test WebSocket broadcasting for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/prompt-analytics`

**Summary:** Get Agent Prompt Analytics

Get analytics for agent prompt usage and performance

**Parameters:**

- `agent_type` (query): Filter by agent type
- `days` (query): Number of days to analyze

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/rules`

**Summary:** List Rules Files

List all custom rules files uploaded by the user

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/rules/upload`

**Summary:** Upload Rules File

Upload and validate a custom rules file for agent swarm projects
Enforces coding standards, testing requirements, and architectural patterns

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/rules/{rule_id}`

**Summary:** Get Rules File

Get a specific rules file by ID

**Parameters:**

- `rule_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /admin/agent-swarm/rules/{rule_id}`

**Summary:** Delete Rules File

Delete a custom rules file

**Parameters:**

- `rule_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/rules/{rule_id}/activate`

**Summary:** Activate Rules File

Activate a rules file - will be applied to all new agent swarm projects
Deactivates any previously active rules

**Parameters:**

- `rule_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/start`

**Summary:** Start Agent Swarm Project

Start a new agent swarm project (alias for orchestrate)
Customer-facing endpoint compatibility

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/{project_id}/agent-memory`

**Summary:** Get Agent Memory Context

Get agent memory context from ZeroDB for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): Filter by specific agent ID

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/{project_id}/agents`

**Summary:** Get Agent Swarm Agents Alias

Get agent statuses (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/{project_id}/database-schema`

**Summary:** Get Project Database Schema

Get existing database schema for a project from ZeroDB

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/{project_id}/generate-database`

**Summary:** Generate Database With Zerodb

Generate database schema using ZeroDB integration for a specific project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/{project_id}/optimize-prompts`

**Summary:** Optimize Prompts For Project

Optimize prompts for a specific project based on performance data

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/{project_id}/status`

**Summary:** Get Agent Swarm Status Alias

Get agent swarm status (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/agent-swarm/{project_id}/stop`

**Summary:** Stop Agent Swarm Project Alias

Stop agent swarm project (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/agent-swarm/{project_id}/stop`

**Summary:** Stop Agent Swarm Project Alias

Stop agent swarm project (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/dashboard/agent/{agent_type}`

**Summary:** Get Agent Dashboard

Get detailed dashboard for a specific agent

**Parameters:**

- `agent_type` (path) *(required)*: No description
- `time_range_hours` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/dashboard/deployments`

**Summary:** Get Deployments Dashboard

Get deployment dashboard with monitoring data

**Parameters:**

- `status` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/dashboard/experiments/create`

**Summary:** Create Optimization Experiment

Create a new optimization experiment

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/dashboard/overview`

**Summary:** Get Dashboard Overview

Get comprehensive overview of the RLHF learning system

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/dashboard/quality/insights`

**Summary:** Get Quality Insights

Get quality insights and recommendations

**Parameters:**

- `agent_type` (query): No description
- `days_back` (query): No description

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/dashboard/realtime/status`

**Summary:** Get Realtime Monitoring Status

Get real-time monitoring system status

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/agent`

**Summary:** Collect Agent Feedback

Collect specific feedback about agent performance

This is called when users rate agent responses or provide
feedback about agent-generated content.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/collection/start`

**Summary:** Start Feedback Collection

Start RLHF feedback collection system (Admin only)

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/collection/stop`

**Summary:** Stop Feedback Collection

Stop RLHF feedback collection system (Admin only)

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/error`

**Summary:** Collect Error Report

Collect user error reports for learning

This is called when users encounter errors or unexpected behavior
and want to report it for improvement.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/interaction`

**Summary:** Collect User Interaction

Collect a user interaction for RLHF learning

This endpoint captures any user interaction in the frontend:
- Button clicks
- Page navigation
- Form submissions  
- UI element interactions

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/feedback/interactions/{session_id}`

**Summary:** Get Session Interactions

Get all interactions for a specific user session (Admin only)

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/feedback/status`

**Summary:** Get Feedback Collection Status

Get status of RLHF feedback collection system

**Success Response (200):** Successful Response

---

### `GET /admin/rlhf/feedback/summary`

**Summary:** Get Feedback Summary

Get summary of collected feedback for analysis (Admin only)

**Parameters:**

- `hours_back` (query): No description

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/websocket/broadcast`

**Summary:** Broadcast Feedback Event

Broadcast feedback event via WebSocket for real-time monitoring

This can be used by frontend to broadcast feedback events
to administrators and monitoring systems.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/rlhf/feedback/workflow`

**Summary:** Collect Workflow Feedback

Collect feedback on completed workflow

This is called when users complete a project workflow
and provide overall satisfaction feedback.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/analytics`

**Summary:** Get Wordpress Analytics

Get WordPress management analytics

**Parameters:**

- `timeframe` (query): 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/automation-rules`

**Summary:** Get Automation Rules

Get WordPress automation rules and scheduled tasks

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/content-generator`

**Summary:** Get Content Generator Status

Get status of WordPress content generation features

**Success Response (200):** Successful Response

---

### `POST /admin/wordpress/wordpress-agent/content-generator/generate`

**Summary:** Generate Content

Generate WordPress content using AI

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /admin/wordpress/wordpress-agent/generate`

**Summary:** Generate Wordpress Project

Generate WordPress project (theme, plugin, or Gutenberg block)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/metrics`

**Summary:** Get Wordpress Metrics

Get WordPress management metrics (alias for analytics for frontend compatibility)

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/sites`

**Summary:** Get Managed Sites

Get list of WordPress sites managed by the agent

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `status` (query): active, maintenance, offline

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/sites/{site_id}`

**Summary:** Get Site Details

Get detailed information about a specific WordPress site

**Parameters:**

- `site_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /admin/wordpress/wordpress-agent/sites/{site_id}/backup`

**Summary:** Create Site Backup

Create a backup of a WordPress site

**Parameters:**

- `site_id` (path) *(required)*: No description
- `backup_type` (query): full, database, files

**Success Response (200):** Successful Response

---

### `POST /admin/wordpress/wordpress-agent/sites/{site_id}/update`

**Summary:** Update Site

Update WordPress core, themes, or plugins

**Parameters:**

- `site_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /admin/wordpress/wordpress-agent/templates`

**Summary:** Get Wordpress Templates

Get available WordPress templates

**Parameters:**

- `template_type` (query): theme, plugin, block

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/agent-types`

**Summary:** Get Available Agent Types

Get list of available agent types and their capabilities

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/configure-prompts`

**Summary:** Configure Agent Prompts

Configure optimized prompts for specific agent types and tasks

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/health`

**Summary:** Agent Swarms Health

Simple health check for agent swarms module

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/metrics`

**Summary:** Get Agent Swarm Metrics

Get overall agent swarm performance metrics

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/orchestrate`

**Summary:** Create Agent Swarm Project

Create a new multi-agent swarm project using real workflow system with database persistence

This endpoint creates both a Project record and AgentSwarmWorkflow record in the database,
ensuring projects persist across server restarts and can be tracked properly.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects`

**Summary:** List Agent Swarm Projects

List all agent swarm projects with real database records

Queries the Project model and enriches with workflow execution data from cache/memory.
Shows real specialized agents (ArchitectAgent, FrontendAgent, BackendAgent, etc.)

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}`

**Summary:** Get Agent Swarm Project

Get detailed information about a specific agent swarm project

Returns real project data from database with workflow execution details.
Includes specialized agent information, logs, and stage progress.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/agents`

**Summary:** Get Agent Statuses

Get real status of all agents in a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/ai/generate-backlog`

**Summary:** Ai Generate Backlog

Use Anthropic Claude to generate project backlog from PRD and data model

Request body:
{
    "prd_content": "Full PRD",
    "data_model": {...}  // Data model object
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/ai/generate-data-model`

**Summary:** Ai Generate Data Model

Use Anthropic Claude to generate ZeroDB-aligned data model from PRD

This endpoint aligns with Stage 3 of the AgentSwarm workflow specification.
It uses AI to analyze the PRD and generate contextually appropriate:
- SQL tables for relational data
- Vector collections for semantic search
- Memory tables for caching/sessions

Request body:
{
    "prd_content": "Full PRD text",
    "project_name": "Project name",
    "features": ["list", "of", "features"],
    "technology_preferences": {"database": "zerodb"}
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/ai/generate-prd`

**Summary:** Ai Generate Prd

Use Anthropic Claude to generate a comprehensive PRD from a project idea

Request body:
{
    "project_idea": "Brief description of the project",
    "target_audience": "Who will use this",
    "key_features": ["feature1", "feature2"],
    "business_goals": ["goal1", "goal2"]
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/ai/generate-sprint-plan`

**Summary:** Ai Generate Sprint Plan

Use Anthropic Claude to generate sprint plan from backlog

Request body:
{
    "backlog": {...},  // Backlog object
    "sprint_length_weeks": 2,
    "team_velocity": 20  // story points per sprint
}

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/artifacts`

**Summary:** Get Project Artifacts

Get generated artifacts (code, files, documentation) for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/code`

**Summary:** List Project Code Files

List all code files for a project

Returns a list of all files stored in MinIO for the project with metadata.
Use the 'prefix' parameter to filter files by directory (e.g., prefix='src/' for only src files).

**Parameters:**

- `project_id` (path) *(required)*: No description
- `prefix` (query): Filter files by path prefix (e.g., 'src/')

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/code/download`

**Summary:** Download Project Code File

Download a single code file from the project

Downloads a specific file from MinIO storage with the correct Content-Type header.
Set as_attachment=false to view files in browser instead of downloading.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_path` (query) *(required)*: Path to the file to download (e.g., 'src/index.ts')
- `as_attachment` (query): Download as attachment (true) or inline (false)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/code/download-zip`

**Summary:** Download Project Code Zip

Download entire project as ZIP archive

Creates a ZIP file containing all code files from the project and streams it to the client.
Handles projects with 100+ files efficiently using streaming.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/code/presigned-url`

**Summary:** Generate Presigned Download Url

Generate presigned URL for direct file download

Creates a temporary presigned URL that allows direct download from MinIO without authentication.
The URL expires after the specified time (default 1 hour, max 24 hours).
Useful for sharing files or embedding in external applications.

**Parameters:**

- `project_id` (path) *(required)*: No description
- `file_path` (query) *(required)*: Path to the file (e.g., 'src/index.ts')
- `expires_in` (query): URL expiration time in seconds (60-86400)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/download`

**Summary:** Download Project Artifacts

Download project artifacts as ZIP file

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/files`

**Summary:** Get Project Files

Get project files for viewing

**Parameters:**

- `project_id` (path) *(required)*: No description
- `path` (query): File or directory path

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/logs`

**Summary:** Get Project Logs

Get logs for a specific agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `limit` (query): No description
- `level` (query): info, warning, error

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/restart`

**Summary:** Restart Agent Swarm Project

Restart a failed or stopped agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/projects/{project_id}/status`

**Summary:** Get Agent Swarm Project Status

Get real status of a specific agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/stop`

**Summary:** Stop Agent Swarm Project

Stop a running agent swarm project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/projects/{project_id}/test-websocket`

**Summary:** Test Websocket Broadcast

Test WebSocket broadcasting for a project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/prompt-analytics`

**Summary:** Get Agent Prompt Analytics

Get analytics for agent prompt usage and performance

**Parameters:**

- `agent_type` (query): Filter by agent type
- `days` (query): Number of days to analyze

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/rules`

**Summary:** List Rules Files

List all custom rules files uploaded by the user

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/rules/upload`

**Summary:** Upload Rules File

Upload and validate a custom rules file for agent swarm projects
Enforces coding standards, testing requirements, and architectural patterns

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/rules/{rule_id}`

**Summary:** Get Rules File

Get a specific rules file by ID

**Parameters:**

- `rule_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/admin/agent-swarm/rules/{rule_id}`

**Summary:** Delete Rules File

Delete a custom rules file

**Parameters:**

- `rule_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/rules/{rule_id}/activate`

**Summary:** Activate Rules File

Activate a rules file - will be applied to all new agent swarm projects
Deactivates any previously active rules

**Parameters:**

- `rule_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/start`

**Summary:** Start Agent Swarm Project

Start a new agent swarm project (alias for orchestrate)
Customer-facing endpoint compatibility

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/{project_id}/agent-memory`

**Summary:** Get Agent Memory Context

Get agent memory context from ZeroDB for a project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `agent_id` (query): Filter by specific agent ID

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/{project_id}/agents`

**Summary:** Get Agent Swarm Agents Alias

Get agent statuses (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/{project_id}/database-schema`

**Summary:** Get Project Database Schema

Get existing database schema for a project from ZeroDB

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/{project_id}/generate-database`

**Summary:** Generate Database With Zerodb

Generate database schema using ZeroDB integration for a specific project

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/{project_id}/optimize-prompts`

**Summary:** Optimize Prompts For Project

Optimize prompts for a specific project based on performance data

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/{project_id}/status`

**Summary:** Get Agent Swarm Status Alias

Get agent swarm status (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/agent-swarm/{project_id}/stop`

**Summary:** Stop Agent Swarm Project Alias

Stop agent swarm project (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/agent-swarm/{project_id}/stop`

**Summary:** Stop Agent Swarm Project Alias

Stop agent swarm project (alias for existing endpoint)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/dashboard/agent/{agent_type}`

**Summary:** Get Agent Dashboard

Get detailed dashboard for a specific agent

**Parameters:**

- `agent_type` (path) *(required)*: No description
- `time_range_hours` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/dashboard/deployments`

**Summary:** Get Deployments Dashboard

Get deployment dashboard with monitoring data

**Parameters:**

- `status` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/dashboard/experiments/create`

**Summary:** Create Optimization Experiment

Create a new optimization experiment

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/dashboard/overview`

**Summary:** Get Dashboard Overview

Get comprehensive overview of the RLHF learning system

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/dashboard/quality/insights`

**Summary:** Get Quality Insights

Get quality insights and recommendations

**Parameters:**

- `agent_type` (query): No description
- `days_back` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/dashboard/realtime/status`

**Summary:** Get Realtime Monitoring Status

Get real-time monitoring system status

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/agent`

**Summary:** Collect Agent Feedback

Collect specific feedback about agent performance

This is called when users rate agent responses or provide
feedback about agent-generated content.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/collection/start`

**Summary:** Start Feedback Collection

Start RLHF feedback collection system (Admin only)

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/collection/stop`

**Summary:** Stop Feedback Collection

Stop RLHF feedback collection system (Admin only)

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/error`

**Summary:** Collect Error Report

Collect user error reports for learning

This is called when users encounter errors or unexpected behavior
and want to report it for improvement.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/interaction`

**Summary:** Collect User Interaction

Collect a user interaction for RLHF learning

This endpoint captures any user interaction in the frontend:
- Button clicks
- Page navigation
- Form submissions  
- UI element interactions

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/feedback/interactions/{session_id}`

**Summary:** Get Session Interactions

Get all interactions for a specific user session (Admin only)

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/feedback/status`

**Summary:** Get Feedback Collection Status

Get status of RLHF feedback collection system

**Success Response (200):** Successful Response

---

### `GET /v1/admin/rlhf/feedback/summary`

**Summary:** Get Feedback Summary

Get summary of collected feedback for analysis (Admin only)

**Parameters:**

- `hours_back` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/websocket/broadcast`

**Summary:** Broadcast Feedback Event

Broadcast feedback event via WebSocket for real-time monitoring

This can be used by frontend to broadcast feedback events
to administrators and monitoring systems.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/rlhf/feedback/workflow`

**Summary:** Collect Workflow Feedback

Collect feedback on completed workflow

This is called when users complete a project workflow
and provide overall satisfaction feedback.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/analytics`

**Summary:** Get Wordpress Analytics

Get WordPress management analytics

**Parameters:**

- `timeframe` (query): 7d, 30d, 90d

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/automation-rules`

**Summary:** Get Automation Rules

Get WordPress automation rules and scheduled tasks

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/content-generator`

**Summary:** Get Content Generator Status

Get status of WordPress content generation features

**Success Response (200):** Successful Response

---

### `POST /v1/admin/wordpress/wordpress-agent/content-generator/generate`

**Summary:** Generate Content

Generate WordPress content using AI

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/admin/wordpress/wordpress-agent/generate`

**Summary:** Generate Wordpress Project

Generate WordPress project (theme, plugin, or Gutenberg block)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/metrics`

**Summary:** Get Wordpress Metrics

Get WordPress management metrics (alias for analytics for frontend compatibility)

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/sites`

**Summary:** Get Managed Sites

Get list of WordPress sites managed by the agent

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `status` (query): active, maintenance, offline

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/sites/{site_id}`

**Summary:** Get Site Details

Get detailed information about a specific WordPress site

**Parameters:**

- `site_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/admin/wordpress/wordpress-agent/sites/{site_id}/backup`

**Summary:** Create Site Backup

Create a backup of a WordPress site

**Parameters:**

- `site_id` (path) *(required)*: No description
- `backup_type` (query): full, database, files

**Success Response (200):** Successful Response

---

### `POST /v1/admin/wordpress/wordpress-agent/sites/{site_id}/update`

**Summary:** Update Site

Update WordPress core, themes, or plugins

**Parameters:**

- `site_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/admin/wordpress/wordpress-agent/templates`

**Summary:** Get Wordpress Templates

Get available WordPress templates

**Parameters:**

- `template_type` (query): theme, plugin, block

**Success Response (200):** Successful Response

---

## Public API


### `GET /v1/public/agent-bridge/agents`

**Summary:** Get Connected Agents

Get list of connected agents (Admin only)

Returns real agent instances from database.

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-bridge/connect`

**Summary:** Connect Agent

Connect an agent to the bridge (Admin only)

Creates or updates an agent instance in the database.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-bridge/disconnect`

**Summary:** Disconnect Agent

Disconnect an agent from the bridge (Admin only)

Updates agent status to inactive in the database.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-bridge/endpoints`

**Summary:** Get Bridge Endpoints

Get available bridge endpoints

Returns API endpoint documentation for authenticated users.

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-bridge/message`

**Summary:** Send Agent Message

Send message to agent through bridge

Creates a message record and validates agent exists.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-bridge/metrics`

**Summary:** Get Bridge Metrics

Get agent bridge performance metrics (Admin only)

Returns real metrics calculated from database.

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-bridge/status`

**Summary:** Get Bridge Status

Get agent bridge status - Public endpoint

Returns real-time bridge status with actual agent counts from database.

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-bridge/validate`

**Summary:** Validate Bridge Endpoint

Validate bridge endpoint configuration

Performs health and accessibility checks on specified endpoint.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-coordination/agents/workload`

**Summary:** Get Agent Workload

Get workload statistics for agents

GIVEN a request to get agent workload
WHEN providing an optional agent ID
THEN return workload statistics for the requested agents

**Parameters:**

- `agent_id` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-coordination/messages`

**Summary:** Create Message

Create a new message between agents

GIVEN a request to create an inter-agent message
WHEN providing valid sender, recipient, and message content
THEN create the message and return the created message data

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-coordination/messages/{agent_id}`

**Summary:** Get Agent Messages

Get messages for a particular agent

GIVEN a request to get messages for an agent
WHEN providing a valid agent ID
THEN return a list of messages sent to or from the agent

**Parameters:**

- `agent_id` (path) *(required)*: No description
- `project_id` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/agent-coordination/messages/{message_id}/read`

**Summary:** Mark Message Read

Mark a message as read

GIVEN a request to mark a message as read
WHEN providing valid message ID and agent ID
THEN update the message read status and return the updated message

**Parameters:**

- `message_id` (path) *(required)*: No description
- `agent_id` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-coordination/sequences`

**Summary:** Create Sequence

Create a new task sequence

GIVEN a request to create a task sequence
WHEN providing a valid sequence name and description
THEN create the sequence and return the created sequence data

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-coordination/sequences/{sequence_id}`

**Summary:** Get Sequence Status

Get status of a sequence

GIVEN a request to get sequence status
WHEN providing a valid sequence ID
THEN return sequence status data with tasks

**Parameters:**

- `sequence_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-coordination/sequences/{sequence_id}/execute`

**Summary:** Execute Sequence

Execute a task sequence

GIVEN a request to execute a sequence
WHEN providing a valid sequence ID
THEN start execution of the sequence and return updated sequence data

**Parameters:**

- `sequence_id` (path) *(required)*: Sequence ID to execute

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-coordination/sequences/{sequence_id}/status`

**Summary:** Get Sequence Status Detailed

Get detailed sequence status by ID
NUCLEAR FIX: Added missing endpoint that was returning 404

**Parameters:**

- `sequence_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-coordination/sequences/{sequence_id}/tasks`

**Summary:** Add Task To Sequence

Add a task to a sequence

GIVEN a request to add a task to a sequence
WHEN providing valid sequence ID, task ID, and order position
THEN add the task to the sequence and return the sequence task data

**Parameters:**

- `sequence_id` (path) *(required)*: Sequence ID to add task to

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-framework/memories`

**Summary:** Create Agent Memory

Create a new agent memory entry

Stores memory content with associated metadata in database.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-framework/memories/search`

**Summary:** Search Agent Memories

Search memories using content similarity

Returns memories matching search query with similarity scores.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-framework/memory/{memory_id}`

**Summary:** Get Agent Memory

Retrieve a memory by ID

Returns memory entry from database if user has access.

**Parameters:**

- `memory_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/agent-framework/memory/{memory_id}`

**Summary:** Update Agent Memory

Update a memory entry

Updates memory content and metadata if user has access.

**Parameters:**

- `memory_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/agent-framework/memory/{memory_id}`

**Summary:** Delete Agent Memory

Delete a memory entry

Removes memory from database if user has access.

**Parameters:**

- `memory_id` (path) *(required)*: No description

---

### `GET /v1/public/agent-learning/feedback/user/{user_id}`

**Summary:** Get User Feedback

Get feedback statistics for a user

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-learning/insights`

**Summary:** Get Learning Insights

Get learning insights for model improvement

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-learning/interactions`

**Summary:** Record Interaction

Record a new agent interaction

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-learning/interactions/{interaction_id}/feedback`

**Summary:** Submit Feedback

Submit feedback for an interaction

**Parameters:**

- `interaction_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-learning/learning-tasks`

**Summary:** Create Learning Task

Create a learning task for an agent (admin or special permission)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-learning/performance/agent/{agent_id}`

**Summary:** Get Agent Performance

Get performance metrics for an agent

**Parameters:**

- `agent_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-learning/tasks/agent/{agent_id}`

**Summary:** Get Agent Learning History

Get learning history for an agent

**Parameters:**

- `agent_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/agent-learning/tasks/{task_id}`

**Summary:** Update Learning Task

Update the status of a learning task

**Parameters:**

- `task_id` (path) *(required)*: No description
- `status` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-orchestration/agents`

**Summary:** List Agents

List all agent instances

Returns agent instances the user has access to.

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-orchestration/agents`

**Summary:** Create Agent

Create a new agent instance (Admin only)

Creates a new agent with specified name, type, and capabilities.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-orchestration/tasks`

**Summary:** Create Task

Create a new task

Creates a new task with specified parameters and assigns it to an agent.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-orchestration/tasks`

**Summary:** List Tasks

List tasks with optional filtering

Returns tasks the user has access to with optional filters.

**Parameters:**

- `status_filter` (query): No description
- `agent_id` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-orchestration/tasks/{task_id}`

**Summary:** Get Task Status

Get the status of a task

Returns detailed status information for the specified task.

**Parameters:**

- `task_id` (path) *(required)*: Task ID to check

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-orchestration/tasks/{task_id}/execute`

**Summary:** Execute Task

Execute a specific task

Marks task as running and initiates execution.

**Parameters:**

- `task_id` (path) *(required)*: Task ID to execute

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-resources/capacity`

**Summary:** Get agent capacity report

Retrieve current capacity information for agent types

**Parameters:**

- `agent_type` (query): Filter by agent type
- `func` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-resources/events`

**Summary:** Get scaling events

Retrieve agent scaling events with optional filtering

**Parameters:**

- `agent_type` (query): Filter by agent type
- `start_time` (query): Start time for filtering
- `end_time` (query): End time for filtering
- `limit` (query): Maximum number of events to return
- `func` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-resources/metrics`

**Summary:** Get agent resource metrics

Retrieve resource utilization metrics for agents

**Parameters:**

- `agent_id` (query): Filter by agent ID
- `agent_type` (query): Filter by agent type
- `start_time` (query): Start time for filtering
- `end_time` (query): End time for filtering
- `limit` (query): Maximum number of metrics to return

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-resources/monitoring/start`

**Summary:** Start Monitoring

Start agent resource monitoring.

GIVEN a collection interval
WHEN starting monitoring
THEN begin collecting metrics at the specified interval

**Parameters:**

- `func` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-resources/monitoring/stop`

**Summary:** Stop Monitoring

Stop agent resource monitoring.

GIVEN a running monitoring process
WHEN stopping monitoring
THEN cease collecting metrics

**Parameters:**

- `func` (query) *(required)*: No description

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-resources/policies`

**Summary:** Create Scaling Policy

Create a new scaling policy.

GIVEN valid scaling policy parameters
WHEN creating a policy
THEN create and return the new policy

**Parameters:**

- `func` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-resources/policies`

**Summary:** List scaling policies

List agent scaling policies with optional filtering

**Parameters:**

- `agent_type` (query): Filter by agent type
- `enabled_only` (query): Only return enabled policies
- `func` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-resources/policies/{policy_id}`

**Summary:** Get scaling policy

Get a specific agent scaling policy by ID

**Parameters:**

- `policy_id` (path) *(required)*: No description
- `func` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/agent-resources/policies/{policy_id}`

**Summary:** Update scaling policy

Update an existing agent scaling policy

**Parameters:**

- `policy_id` (path) *(required)*: No description
- `func` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/agent-resources/policies/{policy_id}`

**Summary:** Delete scaling policy

Delete an agent scaling policy

**Parameters:**

- `policy_id` (path) *(required)*: No description
- `func` (query) *(required)*: No description

---

### `POST /v1/public/agent-resources/scale`

**Summary:** Manual Scale

Manually scale agent instances.

GIVEN valid scaling parameters
WHEN manually scaling
THEN scale to the specified instance count and return the event

**Parameters:**

- `func` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-resources/scaling/start`

**Summary:** Start Scaling Evaluation

Start automatic scaling policy evaluation.

GIVEN an evaluation interval
WHEN starting scaling evaluation
THEN begin evaluating policies at the specified interval

**Parameters:**

- `func` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-resources/scaling/stop`

**Summary:** Stop Scaling Evaluation

Stop automatic scaling policy evaluation.

GIVEN a running evaluation process
WHEN stopping evaluation
THEN cease evaluating policies

**Parameters:**

- `func` (query) *(required)*: No description

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-state/checkpoints/{checkpoint_id}/restore`

**Summary:** Restore From Checkpoint

Restore state from checkpoint

**Parameters:**

- `checkpoint_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-state/states`

**Summary:** Create Agent State

Create a new agent state

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-state/states`

**Summary:** List Agent States

List agent states with optional filtering

**Parameters:**

- `agent_id` (query): No description
- `is_active` (query): No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/agent-state/states/{state_id}`

**Summary:** Update Agent State

Update an existing agent state

**Parameters:**

- `state_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-state/states/{state_id}`

**Summary:** Get Agent State

Get an agent state by ID

**Parameters:**

- `state_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/agent-state/states/{state_id}`

**Summary:** Delete Agent State

Delete an agent state

**Parameters:**

- `state_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-state/states/{state_id}/checkpoints`

**Summary:** Create Checkpoint

Create a checkpoint for agent state

**Parameters:**

- `state_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-state/states/{state_id}/checkpoints`

**Summary:** List Checkpoints

List checkpoints for agent state

**Parameters:**

- `state_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-state/states/{state_id}/deactivate`

**Summary:** Deactivate Agent State

Deactivate an agent state

**Parameters:**

- `state_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-state/states/{state_id}/transfer`

**Summary:** Transfer Agent State

Transfer state to new session/agent

**Parameters:**

- `state_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarm/feedback`

**Summary:** Submit Feedback

Submit feedback on AI-generated content at a specific workflow stage

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/agent-swarm/feedback/batch`

**Summary:** Submit Batch Feedback

Submit multiple feedback items in a single request

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/agent-swarm/feedback/projects/{project_id}`

**Summary:** Get Project Feedback

Get all feedback entries for a specific project

**Parameters:**

- `project_id` (path) *(required)*: No description
- `stage` (query): Filter by stage
- `limit` (query): Maximum results
- `offset` (query): Results offset

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarm/feedback/stages`

**Summary:** Get Available Stages

Get list of available feedback stages

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarm/feedback/stats`

**Summary:** Get Feedback Statistics

Get aggregated feedback statistics with optional filters

**Parameters:**

- `project_id` (query): Filter by project ID
- `workflow_id` (query): Filter by workflow ID
- `stage` (query): Filter by stage
- `start_date` (query): Start date (ISO format)
- `end_date` (query): End date (ISO format)
- `agent_id` (query): Filter by agent ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarm/feedback/sync`

**Summary:** Sync Pending Feedback

Manually trigger sync of pending feedback to ZeroDB

**Parameters:**

- `batch_size` (query): Max items to sync

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/`

**Summary:** List Agent Swarms

List all active agent swarms

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/`

**Summary:** Create Agent Swarm

Create a new agent swarm with specified configuration

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/artifacts`

**Summary:** Create Artifact

Upload a new artifact.

Stores the artifact and returns its metadata.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/batch-create`

**Summary:** Batch Create Resources

Create multiple resources in a single batch operation.

More efficient than individual create calls for large sets of resources.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/executions`

**Summary:** List Executions

List all orchestration executions with pagination.

Supports filtering by status, swarm_id, and creation date.

**Parameters:**

- `page` (query): Page number
- `page_size` (query): Items per page
- `status` (query): Filter by status
- `swarm_id` (query): Filter by swarm ID
- `created_after` (query): Filter by creation date

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/orchestrate`

**Summary:** Create Agent Swarm Project

Create a new multi-agent swarm project using REAL 11-stage workflow system with database persistence

This is the REAL implementation that:
- Creates Project and AgentSwarmWorkflow database records
- Creates MinIO bucket for file storage
- Launches the actual 11-stage workflow (PRD, backlog, sprint plan, repo creation, code generation, etc.)
- Returns project_id for tracking

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/projects`

**Summary:** List Agent Swarm Projects

List all agent swarm projects for the current user

Queries the Project model and enriches with workflow execution data.
Shows real specialized agents (ArchitectAgent, FrontendAgent, BackendAgent, etc.)

**Query Parameters**:
- limit: Maximum number of projects to return (1-100, default 50)
- skip: Number of projects to skip for pagination (default 0)
- status: Filter by project status (running, completed, failed, pending)

**Authentication**: Requires valid user token

**Returns**: List of projects with workflow details

**Parameters:**

- `limit` (query): No description
- `skip` (query): No description
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/projects`

**Summary:** Create Agent Swarm Project

Create a new agent swarm project WITHOUT starting the workflow.

This endpoint creates only the Project and AgentSwarmWorkflow database records,
allowing the user to review generated artifacts (data model, backlog, sprint plan)
before launching the full workflow.

**Authentication**: Requires valid user token

**Request body**:
- name: Project name
- description: PRD content or project description
- project_type: Type of project (web_app, mobile_app, api, etc.)
- technologies: List of technologies to use
- features: List of features to implement
- zerodb_project_id: Optional ZeroDB project ID for storage

**Returns**: Project ID and status

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/projects/{project_id}/ai/generate-backlog`

**Summary:** Generate Backlog

Generate a development backlog from PRD and data model using AI.

This endpoint calls the PM Agent to analyze the PRD and data model,
generating a structured backlog with epics, stories, and tasks.

**Authentication**: Requires valid user token

**Request body**:
- prd_content: Full PRD text
- data_model: Previously generated data model

**Returns**: Generated backlog

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/projects/{project_id}/ai/generate-data-model`

**Summary:** Generate Data Model

Generate a data model from PRD using AI.

This endpoint calls the Architect Agent to analyze the PRD and generate
a ZeroDB-aligned data model including SQL tables, vector collections,
and memory tables.

**Authentication**: Requires valid user token

**Request body**:
- prd_content: Full PRD text
- project_name: Optional project name
- features: Optional list of features
- technology_preferences: Optional technology preferences

**Returns**: Generated data model

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/projects/{project_id}/ai/generate-sprint-plan`

**Summary:** Generate Sprint Plan

Generate a sprint plan from backlog using AI.

This endpoint calls the PM Agent to analyze the backlog and generate
a sprint plan with task distribution across sprints.

**Authentication**: Requires valid user token

**Request body**:
- prd_content: Full PRD text
- backlog: Previously generated backlog

**Returns**: Generated sprint plan

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/projects/{project_id}/github`

**Summary:** Get Project GitHub Integration Status

Get GitHub integration status and statistics for an AgentSwarm project.

This endpoint retrieves GitHub repository data including:
- Repository URL and name
- Issues created and closed
- Pull requests (total, merged, open)
- Last commit timestamp
- Build status from GitHub Actions

**Authentication**: Requires valid user token (JWT or API key)

**Caching**: Response is cached for 5 minutes to avoid GitHub API rate limits.
Use `refresh=true` query parameter to bypass cache.

**Performance**: Response time typically < 500ms

**Error Responses**:
- 404: Project not found
- 403: Unauthorized access to project
- 500: Internal server error

**Parameters:**

- `project_id` (path) *(required)*: No description
- `refresh` (query): If true, bypass cache and fetch fresh data from GitHub API

**Success Response (200):** GitHub integration status retrieved successfully

---

### `POST /v1/public/agent-swarms/projects/{project_id}/github/refresh`

**Summary:** Refresh Project GitHub Status Cache

Invalidate the cached GitHub status for a project and fetch fresh data.

This endpoint forces a cache refresh and returns the updated GitHub status.
Use this when you know the GitHub data has changed and need immediate updates.

**Authentication**: Requires valid user token

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** GitHub status refreshed successfully

---

### `GET /v1/public/agent-swarms/projects/{project_id}/status`

**Summary:** Get Project Status

Get real-time status of an agent swarm project (public endpoint).

Returns workflow progress, current stage, completed stages, and generated documents
(Data Model, Backlog, Sprint Plan) in the metadata field.

**Authentication**: Requires valid user token

**Response includes**:
- project_id: Unique identifier
- status: Workflow status (in_progress, completed, failed)
- current_stage: Current workflow stage
- progress: Completion percentage (0-100)
- message: Human-readable status message
- stages_completed: List of completed stage names
- metadata: Generated documents (data_model, backlog, sprint_plan)
- errors: List of errors (if any)
- warnings: List of warnings (if any)

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/rules/upload`

**Summary:** Upload Custom Rules File

Upload and validate a custom rules file for agent swarm projects

**Request Body**:
- filename: Name of the rules file (must be .md or .txt)
- content: Content of the rules file

**Returns**: Validated rules file with parsed rules

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/agent-swarms/rules/{file_id}`

**Summary:** Delete Rules File

Delete a rules file

**Path Parameters**:
- file_id: ID of the rules file to delete

**Returns**: Success message

**Parameters:**

- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/rules/{file_id}/activate`

**Summary:** Activate Rules File

Activate a rules file to be used for all new agent swarm projects

**Path Parameters**:
- file_id: ID of the rules file to activate

**Returns**: Success message

**Parameters:**

- `file_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/{swarm_id}`

**Summary:** Get Swarm Details

Get detailed information about a specific swarm

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/agent-swarms/{swarm_id}`

**Summary:** Delete Swarm

Delete an agent swarm and clean up resources

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/{swarm_id}/agents`

**Summary:** Spawn Agent

Spawn a new agent in the specified swarm

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/{swarm_id}/agents`

**Summary:** List Swarm Agents

List all agents in the specified swarm

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/{swarm_id}/analytics`

**Summary:** Get Swarm Analytics

Get comprehensive analytics for the specified swarm

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-swarms/{swarm_id}/executions/{execution_id}`

**Summary:** Get Execution Status

Get the status of a specific task execution

**Parameters:**

- `swarm_id` (path) *(required)*: No description
- `execution_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/{swarm_id}/scale`

**Summary:** Scale Swarm

Manually scale the swarm to target number of agents

**Parameters:**

- `swarm_id` (path) *(required)*: No description
- `target_agents` (query) *(required)*: Target number of agents

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/{swarm_id}/tasks`

**Summary:** Execute Task

Execute a task on the specified swarm

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-swarms/{swarm_id}/tasks/parallel`

**Summary:** Execute Parallel Tasks

Execute multiple tasks in parallel on the specified swarm

**Parameters:**

- `swarm_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-tasks/`

**Summary:** List Agent Tasks

List agent tasks with optional filtering

**Parameters:**

- `status` (query): Filter by task status
- `agent_id` (query): Filter by assigned agent
- `task_type` (query): Filter by task type
- `limit` (query): Maximum number of tasks to return
- `offset` (query): Number of tasks to skip

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-tasks/`

**Summary:** Create Agent Task

Create a new agent task

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-tasks/{task_id}`

**Summary:** Get Agent Task

Get details of a specific agent task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/agent-tasks/{task_id}`

**Summary:** Update Agent Task

Update agent task status and progress (typically called by agents)

**Parameters:**

- `task_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/agent-tasks/{task_id}/cancel`

**Summary:** Cancel Agent Task

Cancel a running agent task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/agent-tasks/{task_id}/logs`

**Summary:** Get Task Logs

Get execution logs for a task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/ai/feedback`

**Summary:** Create AI feedback

Submit feedback on AI-generated content for RLHF training

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/ai/feedback`

**Summary:** List AI feedback (Admin only)

Get paginated list of AI feedback with optional filtering

**Parameters:**

- `page` (query): Page number
- `size` (query): Page size
- `content_type` (query): Filter by content type

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai/feedback/analytics/by-content-type`

**Summary:** Get feedback analytics by content type (Admin only)

Get aggregated feedback statistics grouped by content type

**Success Response (200):** Successful Response

---

### `GET /v1/public/backup-agent-tasks/`

**Summary:** List Agent Tasks

List agent tasks with optional filtering

**Parameters:**

- `status` (query): Filter by task status
- `agent_id` (query): Filter by assigned agent
- `task_type` (query): Filter by task type
- `limit` (query): Maximum number of tasks to return
- `offset` (query): Number of tasks to skip

**Success Response (200):** Successful Response

---

### `POST /v1/public/backup-agent-tasks/`

**Summary:** Create Agent Task

Create a new agent task

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/backup-agent-tasks/{task_id}`

**Summary:** Get Agent Task

Get details of a specific agent task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/backup-agent-tasks/{task_id}`

**Summary:** Update Agent Task

Update agent task status and progress (typically called by agents)

**Parameters:**

- `task_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/backup-agent-tasks/{task_id}/cancel`

**Summary:** Cancel Agent Task

Cancel a running agent task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/backup-agent-tasks/{task_id}/logs`

**Summary:** Get Task Logs

Get execution logs for a task

**Parameters:**

- `task_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/memory/`

**Summary:** Create memory

Create a new memory entry

**Request Body:** JSON

**Success Response (201):** Created

---

### `GET /v1/public/memory/`

**Summary:** List memories

List all memories for the authenticated user with pagination

**Parameters:**

- `skip` (query): Number of memories to skip
- `limit` (query): Maximum number of memories to return

**Success Response (200):** Success

---

### `POST /v1/public/memory/batch`

**Summary:** Batch create memories

Create multiple memories in a single request

**Request Body:** JSON

**Success Response (201):** Created

---

### `GET /v1/public/memory/history`

**Summary:** Get memory interaction history

Get history of memory access and modifications

**Parameters:**

- `limit` (query): Maximum number of history entries to return

**Success Response (200):** Success

---

### `POST /v1/public/memory/search`

**Summary:** Search memories

Search memories using semantic similarity or filters

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/memory/statistics`

**Summary:** Get memory statistics

Get comprehensive statistics about user's memories including counts, tags, and usage patterns

**Success Response (200):** Success

---

### `GET /v1/public/memory/tags`

**Summary:** Get memory tags

Get a list of all unique tags used in memories with usage counts

**Success Response (200):** Success

---

### `GET /v1/public/memory/{memory_id}`

**Summary:** Get a memory by ID

Retrieve a specific memory by its ID

**Parameters:**

- `memory_id` (path) *(required)*: ID of the memory to retrieve

**Success Response (200):** Success

---

### `PUT /v1/public/memory/{memory_id}`

**Summary:** Update a memory

Update an existing memory with the provided data

**Parameters:**

- `memory_id` (path) *(required)*: ID of the memory to update

**Request Body:** JSON

**Success Response (200):** Success

---

### `DELETE /v1/public/memory/{memory_id}`

**Summary:** Delete a memory

Delete a memory by its ID

**Parameters:**

- `memory_id` (path) *(required)*: ID of the memory to delete

**Success Response (200):** Success

---

## RLHF Feedback


### `POST /v1/rlhf/feedback`

**Summary:** Collect user feedback

Collect user feedback on an AI interaction

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/rlhf/interactions`

**Summary:** Log AI interaction

Log an AI interaction for RLHF tracking

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/rlhf/recommendations/{feature}`

**Summary:** Get feature recommendations

Get RLHF-based recommendations for a specific feature

**Parameters:**

- `feature` (path) *(required)*: No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/rlhf/reports/generate`

**Summary:** Generate improvement report

Generate improvement report based on feedback analysis

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/rlhf/sessions/{session_id}`

**Summary:** Get session interactions

Get all interactions for a session

**Parameters:**

- `session_id` (path) *(required)*: No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/rlhf/summary`

**Summary:** Get feedback summary

Get aggregate feedback statistics for organization

**Parameters:**

- `start_date` (query): Start date (ISO format)
- `end_date` (query): End date (ISO format)

**Success Response (200):** Successful Response

---

## 🤖 RLHF Export


### `GET /v1/rlhf/feedback/export`

**Summary:** Export Rlhf Feedback

Export RLHF feedback data in specified format

**Admin only endpoint**

Exports collected RLHF feedback data in formats compatible with ML training pipelines:

- **JSONL**: Newline-delimited JSON (recommended for ML training)
- **CSV**: Comma-separated values (for spreadsheet analysis)
- **Parquet**: Columnar format (for big data pipelines with Spark/Dask)

Supports filtering by:
- Date range (date_from, date_to)
- Feedback type (positive, negative, mixed)
- Reward range (reward_min, reward_max)
- Model name
- Project ID

Supports pagination with limit and offset parameters.

Returns the export file as a streaming download.

**Parameters:**

- `format` (query): Export format: jsonl (ML training), csv (spreadsheet), or parquet (big data)
- `project_id` (query): Filter by project ID
- `date_from` (query): Start date for filtering (ISO 8601 format)
- `date_to` (query): End date for filtering (ISO 8601 format)
- `feedback` (query): Filter by feedback type (positive, negative, mixed)
- `reward_min` (query): Minimum reward value
- `reward_max` (query): Maximum reward value
- `model` (query): Filter by model name (e.g., gpt-3.5, gpt-4)
- `limit` (query): Maximum number of results (default: no limit)
- `offset` (query): Number of results to skip (for pagination)

**Success Response (200):** Successful Response

---

### `GET /v1/rlhf/feedback/export/stats`

**Summary:** Get Rlhf Export Stats

Get statistics about available RLHF feedback data for export

**Admin only endpoint**

Returns statistics about the available RLHF feedback data:
- Total count of interactions
- Breakdown by feedback type
- Date range of available data
- Models represented in data

Useful for understanding dataset characteristics before export.

**Parameters:**

- `project_id` (query): Filter by project ID
- `date_from` (query): Start date
- `date_to` (query): End date

**Success Response (200):** Successful Response

---

## 🧠 Agent Memory


### `POST /v1/memory/context`

**Summary:** Get AI context

Retrieve context for AI assistants based on user history

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/memory/judge-preferences`

**Summary:** Store judge preferences

Store judge scoring preferences and patterns for AI context

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/memory/judges/{judge_id}/history`

**Summary:** Get judge scoring history

Retrieve judge's historical scoring patterns

**Parameters:**

- `judge_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/memory/organizer-workflows`

**Summary:** Store organizer workflows

Store organizer workflow patterns for AI context

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/memory/organizers/{organizer_id}/patterns`

**Summary:** Get organizer patterns

Retrieve organizer's workflow patterns

**Parameters:**

- `organizer_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/memory/search`

**Summary:** Search memories

Semantic search across user's memories

**Request Body:** JSON

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
