# Public APIs

**Endpoint Count:** 337

## Overview

This category contains 337 endpoints for public operations.


## Public API


### `GET /v1/public/`

**Summary:** Get Public Api Info

Get information about the public API

**Success Response (200):** Successful Response

---

### `GET /v1/public/ab-testing/health`

**Summary:** Health Check

Health check endpoint for advanced A/B testing service

**Success Response (200):** Success

---

### `POST /v1/public/ab-testing/tests`

**Summary:** Create Ab Test

Create a new A/B test configuration

**Features:**
- Binary and multivariate testing
- Statistical power and significance configuration
- Custom success criteria
- Traffic allocation management

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/ab-testing/tests`

**Summary:** List Ab Tests

List A/B tests with optional filtering

**Features:**
- Team and status filtering
- Pagination support
- Test metadata summaries
- Performance previews

**Parameters:**

- `team_id` (query): Filter by team ID
- `status` (query): Filter by status
- `limit` (query): Number of tests to return

**Success Response (200):** Success

---

### `GET /v1/public/ab-testing/tests/{test_id}`

**Summary:** Get Ab Test

Get detailed A/B test information

**Features:**
- Complete test configuration
- Variant details and performance
- Statistical analysis results
- Optimization recommendations

**Parameters:**

- `test_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/public/ab-testing/tests/{test_id}/analyze`

**Summary:** Analyze Test Results

Perform statistical analysis of A/B test results

**Features:**
- Statistical significance testing
- Effect size calculation
- Confidence intervals
- Performance benchmarking

**Parameters:**

- `test_id` (path) *(required)*: No description
- `force_analysis` (query): Force analysis even with small sample size

**Success Response (200):** Success

---

### `GET /v1/public/ab-testing/tests/{test_id}/export`

**Summary:** Export Test Results

Export A/B test results in various formats

**Features:**
- Multiple export formats
- Complete data inclusion
- Statistical summaries
- Visualization-ready data

**Parameters:**

- `test_id` (path) *(required)*: No description
- `format` (query): Export format (json, csv, pdf)

**Success Response (200):** Success

---

### `POST /v1/public/ab-testing/tests/{test_id}/optimize`

**Summary:** Optimize Prompt Variants

Optimize prompt variants based on A/B test results

**Features:**
- Bayesian optimization
- Genetic algorithm optimization
- Gradient-based optimization
- Performance prediction

**Parameters:**

- `test_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/public/ab-testing/tests/{test_id}/start`

**Summary:** Start Ab Test

Start running an A/B test

**Features:**
- Parallel variant testing
- Custom test case support
- Multiple AI provider integration
- Real-time progress tracking

**Parameters:**

- `test_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/ab-testing/tests/{test_id}/statistics`

**Summary:** Get Test Statistics

Get detailed statistical analysis and metrics

**Features:**
- Statistical significance testing
- Confidence intervals
- Power analysis
- Sample size recommendations

**Parameters:**

- `test_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `PUT /v1/public/ab-testing/tests/{test_id}/status`

**Summary:** Update Test Status

Update A/B test status

**Features:**
- Status validation
- State transition rules
- Audit logging
- Notification triggers

**Parameters:**

- `test_id` (path) *(required)*: No description
- `status` (query) *(required)*: New status (running, paused, completed, cancelled)

**Success Response (200):** Success

---

### `POST /v1/public/ai-context/contexts`

**Summary:** Create Context

Create a new AI context entry.

Following Semantic Seed standards for direct SQL operations
with proper data validation.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/ai-context/contexts`

**Summary:** Get User Contexts

Get context entries for the current user.

Following Semantic Seed standards for direct SQL operations
with type and active filtering.

**Parameters:**

- `context_type` (query): No description
- `active_only` (query): No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/public/ai-context/contexts/{context_id}`

**Summary:** Update Context

Update an AI context entry.

Following Semantic Seed standards for direct SQL operations
with proper validation and authorization.

**Parameters:**

- `context_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/ai-context/conversations`

**Summary:** Create Conversation

Create a new AI conversation.

Following Semantic Seed standards for direct SQL operations
with proper transaction management.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/ai-context/conversations`

**Summary:** List Conversations

List AI conversations for the current user.

Following Semantic Seed standards for direct SQL operations
with proper pagination and filtering.

**Parameters:**

- `organization_id` (query): No description
- `active_only` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/ai-context/conversations/{conversation_id}`

**Summary:** Get Conversation

Get an AI conversation by ID with its messages.

Following Semantic Seed standards for direct SQL operations
with proper authorization checks.

**Parameters:**

- `conversation_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/public/ai-context/conversations/{conversation_id}`

**Summary:** Update Conversation

Update an AI conversation.

Following Semantic Seed standards for direct SQL operations
with proper validation and authorization.

**Parameters:**

- `conversation_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/ai-context/conversations/{conversation_id}/messages`

**Summary:** Add Message

Add a message to an AI conversation.

Following Semantic Seed standards for direct SQL operations
with proper conversation ownership validation.

**Parameters:**

- `conversation_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/ai-context/conversations/{conversation_id}/messages`

**Summary:** Get Conversation Messages

Get messages from an AI conversation.

Following Semantic Seed standards for direct SQL operations
with pagination and proper authorization.

**Parameters:**

- `conversation_id` (path) *(required)*: No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/ai-orchestration/orchestrate`

**Summary:** Create Ai Request

Create a new AI request and get a response.

Following SCSS V2.0 standards with direct database operations and real API calls.

- **model_id**: UUID of the AI model to use
- **prompt**: The prompt text to send to the model
- **parameters**: Additional parameters for the model (optional)
- **version_id**: UUID of the specific model version (optional)

Returns the AI response with metadata including the model used, timestamp, and response content.

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/ai-orchestration/requests`

**Summary:** List Ai Requests

Get a list of previous AI requests for the current user.

Following SCSS V2.0 standards with direct database operations.

- **limit**: Maximum number of requests to return (default: 10, max: 100)
- **model_id**: Filter by specific model (optional)

Returns a list of AI requests and responses ordered by creation date (newest first).

**Parameters:**

- `limit` (query): Maximum number of requests to return
- `model_id` (query): Filter by model ID

**Success Response (200):** Success

---

### `GET /v1/public/ai-orchestration/requests/{request_id}`

**Summary:** Get Ai Request

Get a previous AI request and its response by ID.

Following SCSS V2.0 standards with direct database operations.

- **request_id**: UUID of the request to retrieve

Returns the complete request and response data or 404 if not found.

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `DELETE /v1/public/ai-orchestration/requests/{request_id}`

**Summary:** Delete Ai Request

Delete a specific AI request and its response.

Following SCSS V2.0 standards with direct database operations.

- **request_id**: UUID of the request to delete

Returns no content on success or 404 if the request is not found.

**Parameters:**

- `request_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `POST /v1/public/ai-registry/`

**Summary:** Create Model Version

Create a new version for an existing AI model.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model
- **version**: Version data including version tag, parameters, etc.

Returns the created version information.

**Parameters:**

- `model_id` (query) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/ai-registry/models`

**Summary:** List Ai Models

Get a list of AI models based on filter criteria.

Following SCSS V2.0 standards with direct SQL operations.

- **provider**: Filter by provider
- **capability**: Filter by capability
- **is_public**: Filter by public/private status
- **limit**: Maximum number of models to return

Returns a list of AI models matching the filter criteria.

**Parameters:**

- `provider` (query): No description
- `capability` (query): No description
- `is_public` (query): No description
- `limit` (query): No description

**Success Response (200):** Success

---

### `GET /v1/public/ai-registry/models/{model_id}`

**Summary:** Get Ai Model

Get details of a specific AI model by ID.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model to retrieve

Returns the complete model information including versions.

**Parameters:**

- `model_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `PUT /v1/public/ai-registry/models/{model_id}`

**Summary:** Update Ai Model

Update an existing AI model.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model to update
- **model_update**: Updated model data

Returns the updated model information.

**Parameters:**

- `model_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `DELETE /v1/public/ai-registry/models/{model_id}`

**Summary:** Delete Ai Model

Delete an AI model.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model to delete

Returns no content on success.

**Parameters:**

- `model_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/public/ai-registry/models/{model_id}/versions`

**Summary:** List Model Versions

Get all versions of a specific AI model.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model

Returns a list of all versions for the model.

**Parameters:**

- `model_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/public/ai-registry/models/{model_id}/versions/{version_id}`

**Summary:** Get Model Version

Get details of a specific model version.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model
- **version_id**: UUID of the version

Returns detailed information about the specific model version.

**Parameters:**

- `model_id` (path) *(required)*: No description
- `version_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `PUT /v1/public/ai-registry/models/{model_id}/versions/{version_id}`

**Summary:** Update Model Version

Update a specific model version.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model
- **version_id**: UUID of the version to update
- **version_update**: Updated version data

Returns the updated version information.

**Parameters:**

- `model_id` (path) *(required)*: No description
- `version_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `DELETE /v1/public/ai-registry/models/{model_id}/versions/{version_id}`

**Summary:** Delete Model Version

Delete a specific model version.

Following SCSS V2.0 standards with direct SQL operations.

- **model_id**: UUID of the model
- **version_id**: UUID of the version to delete

Returns no content on success.

**Parameters:**

- `model_id` (path) *(required)*: No description
- `version_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/public/application-generation/agents`

**Summary:** Get Agent Status

Get the status of all agents in the swarm.

Returns information about each specialized agent including:
- Current status and activity
- Number of active tasks
- Capabilities and specializations
- Performance metrics

**Success Response (200):** Successful Response

---

### `POST /v1/public/application-generation/generate`

**Summary:** Generate Application

Generate a complete application from a natural language prompt.

This endpoint starts the end-to-end application generation workflow
using the multi-agent swarm system. The process includes:

- Requirements analysis and system architecture design
- Frontend component generation (React/Vue/Angular)
- Backend API development (FastAPI/Express/Spring)
- Security scanning and vulnerability assessment
- Automated test generation and quality assurance
- Infrastructure provisioning and deployment setup

The workflow runs asynchronously and can be monitored using the
returned workflow ID.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/application-generation/health`

**Summary:** Health Check

Health check endpoint for the application generation service.

Returns the operational status of the multi-agent system.

**Success Response (200):** Successful Response

---

### `GET /v1/public/application-generation/results/{workflow_id}`

**Summary:** Get Workflow Results

Get the complete results of a finished application generation workflow.

Returns all generated artifacts including:
- System architecture and design documents
- Frontend components (React/Vue/Angular code)
- Backend services (API code, database schemas)
- Security scan results and recommendations
- Generated test suites and quality metrics
- Infrastructure code (Terraform, Kubernetes manifests)
- CI/CD pipeline configuration

**Parameters:**

- `workflow_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/application-generation/status/{workflow_id}`

**Summary:** Get Workflow Status

Get the current status of an application generation workflow.

Returns detailed information about the workflow progress including:
- Current execution stage
- Overall progress percentage
- Completed stages
- Any errors or warnings
- Quality metrics (if available)

**Parameters:**

- `workflow_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/application-generation/workflows`

**Summary:** List Workflows

List application generation workflows.

Returns a paginated list of workflows with basic information.
Can be filtered by status (pending, in_progress, completed, failed).

**Parameters:**

- `status` (query): Filter workflows by status
- `limit` (query): Maximum number of workflows to return
- `offset` (query): Number of workflows to skip

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/application-generation/workflows/{workflow_id}`

**Summary:** Cancel Workflow

Cancel a running application generation workflow.

Attempts to gracefully stop the workflow execution and cleanup resources.
Only workflows in 'pending' or 'in_progress' status can be cancelled.

**Parameters:**

- `workflow_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/audit/compliance/report`

**Summary:** Generate Compliance Report

Generate compliance report for specified standard and period

**Parameters:**

- `standard` (query): No description
- `start_date` (query) *(required)*: No description
- `end_date` (query) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/audit/compliance/standards`

**Summary:** Get Supported Compliance Standards

Get list of supported compliance standards and their requirements

**Success Response (200):** Successful Response

---

### `POST /v1/public/audit/export`

**Summary:** Export Audit Data

Export audit data for compliance or analysis

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/audit/log`

**Summary:** Log Audit Event

Log an audit event

**Parameters:**

- `action` (query) *(required)*: No description
- `resource_type` (query) *(required)*: No description
- `resource_id` (query): No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/audit/logs`

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

### `GET /v1/public/audit/summary`

**Summary:** Get Audit Summary

Get audit summary for specified period

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/audit/user/{user_id}`

**Summary:** Get User Audit Trail

Get complete audit trail for a specific user

**Parameters:**

- `user_id` (path) *(required)*: No description
- `limit` (query): No description
- `action_type` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/billing`

**Summary:** Get User Billing Information

Get authenticated user's billing information (public endpoint for all authenticated users).

    **GitHub Issue:** #323 - Public billing endpoint for non-admin users

    This endpoint returns billing information for the currently authenticated user.
    It is accessible to users with DEVELOPER, ADMIN, or SUPERUSER roles.

    **Security:**
    - Requires valid JWT token or API key authentication
    - Only returns the authenticated user's own billing data
    - Payment card information is masked (only last 4 digits shown)
    - No access to other users' billing information

    **Response includes:**
    - **payment_method**: Primary payment method with masked card details (last 4 digits only)
    - **next_billing_date**: When the next charge will occur (ISO 8601 format)
    - **amount_due**: Amount to be charged on next billing date (in dollars, not cents)
    - **currency**: Currency code (e.g., USD, EUR)
    - **billing_cycle**: Billing frequency (monthly, yearly, etc.)

    **Use Cases:**
    - Display billing summary on user dashboard
    - Show payment method on file
    - Inform user of upcoming charges
    - Help users track subscription costs

    **SCSS V2.0 compliant** with Stripe integration and comprehensive error handling.

    **Example Request:**
    ```bash
    curl -X GET "https://api.ainative.studio/billing" \
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```

    **Example Response (with subscription):**
    ```json
    {
      "success": true,
      "data": {
        "payment_method": {
          "type": "card",
          "last4": "4242",
          "exp_month": 12,
          "exp_year": 2025,
          "brand": "visa"
        },
        "next_billing_date": "2025-01-15T00:00:00Z",
        "amount_due": 99.00,
        "currency": "USD",
        "billing_cycle": "monthly"
      }
    }
    ```

    **Example Response (no subscription):**
    ```json
    {
      "success": true,
      "data": {
        "payment_method": null,
        "next_billing_date": null,
        "amount_due": 0.00,
        "currency": "USD",
        "billing_cycle": null
      }
    }
    ```

**Success Response (200):** Successfully retrieved billing information

---

### `GET /v1/public/billing/info`

**Summary:** Get Billing Info

Get user's billing information

SCSS V2.0 compliant endpoint with Stripe integration

**Success Response (200):** Successful Response

---

### `GET /v1/public/billing/invoices`

**Summary:** Get Invoices

Get user's invoice history

SCSS V2.0 compliant endpoint with Stripe integration

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/billing/invoices/download-bulk`

**Summary:** Download Bulk Invoices

Get download URLs for multiple invoices

SCSS V2.0 compliant endpoint for bulk invoice download
Request body: {"invoice_ids": ["inv_123", "inv_456"]}

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/billing/invoices/{invoice_id}`

**Summary:** Get Invoice

Get specific invoice by ID

SCSS V2.0 compliant endpoint with Stripe integration

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/billing/invoices/{invoice_id}/download`

**Summary:** Download Invoice

Get download URL for invoice PDF

SCSS V2.0 compliant endpoint with Stripe integration
Returns the Stripe-hosted PDF URL for download

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/billing/invoices/{invoice_id}/email`

**Summary:** Email Invoice

Email invoice to user (legacy endpoint - redirects to resend-email)

SCSS V2.0 compliant endpoint that sends invoice via email

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/billing/invoices/{invoice_id}/resend-email`

**Summary:** Resend Invoice Email

Resend invoice email to user with duplicate prevention

GitHub Issue: #92 - Invoice Email Tracking & Automation System

This endpoint allows manual resend of invoice emails with:
- Duplicate prevention (checks invoice_email_log)
- Force send option for support team
- Automatic email type detection (due vs paid)
- Comprehensive logging

SCSS V2.0 compliant endpoint with database tracking

Args:
    invoice_id: Stripe invoice ID
    force_send: Force send even if already sent (query param, default: False)

Returns:
    Dict with success status, message, and log details

**Parameters:**

- `invoice_id` (path) *(required)*: No description
- `force_send` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/billing/payment-methods`

**Summary:** Get Payment Methods

Get user's payment methods

SCSS V2.0 compliant endpoint with Stripe integration

**Success Response (200):** Successful Response

---

### `POST /v1/public/billing/payment-methods`

**Summary:** Add Payment Method

Add or update payment method

SCSS V2.0 compliant endpoint with Stripe integration

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/chat/completions`

**Summary:** Chat Completions

Chat completion endpoint with agentic tool calling support

Issue #623: Supports tool calling workflow for IDE and agentic applications

Features:
- Multi-provider support (Anthropic, Meta LLAMA, OpenAI)
- Agentic tool calling loop (up to max_iterations)
- Dynamic tool selection via tool_subset
- Token usage tracking
- Streaming support (future)

Returns:
    ChatCompletionResponse with final assistant message and metadata

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/chat/health`

**Summary:** Chat Health

Health check for chat service

**Success Response (200):** Successful Response

---

### `GET /v1/public/chat/info`

**Summary:** Chat Info

Get Chat API information

**Success Response (200):** Successful Response

---

### `GET /v1/public/chat/sessions`

**Summary:** Get Chat Sessions

Get user's chat sessions with pagination

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/chat/sessions`

**Summary:** Create Chat Session

Create a new chat session

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/chat/sessions/{session_id}`

**Summary:** Get Chat Session

Get specific chat session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/chat/sessions/{session_id}/history`

**Summary:** Get Chat History

Get chat history with cursor-based pagination

Issue #880: Implements efficient cursor-based pagination for chat history.

Cursor-based pagination is more efficient for real-time chat scrolling compared
to offset/limit pagination, especially with large message histories.

Query Parameters:
    - cursor: Opaque cursor string for next page (optional)
    - limit: Number of messages to return (default: 50, max: 100)
    - skip: Offset for backward compatibility (optional, uses offset pagination if provided)

Returns:
    ChatHistoryResponse with:
    - messages: List of chat messages
    - nextCursor: Cursor for next page (null if no more messages)
    - hasMore: Boolean indicating if more messages exist

Refs #880

**Parameters:**

- `session_id` (path) *(required)*: No description
- `cursor` (query): Cursor for pagination
- `limit` (query): Number of messages per page
- `skip` (query): Offset for backward compatibility

**Success Response (200):** Successful Response

---

### `GET /v1/public/chat/sessions/{session_id}/messages`

**Summary:** Get Chat Messages

Get messages from a chat session

**Parameters:**

- `session_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/chat/sessions/{session_id}/messages`

**Summary:** Send Chat Message

Send a message to a chat session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/code-context-engine/`

**Summary:** Get Code Context Status

Get Code Context Engine status and available operations.

**Success Response (200):** Successful Response

---

### `POST /v1/public/code-context-engine/chunk/directory`

**Summary:** Chunk Directory

Chunk all files in a directory.

GIVEN a directory of code files
WHEN chunking the directory
THEN break down all files into semantically meaningful segments

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/code-context-engine/chunk/file`

**Summary:** Chunk File

Chunk a single code file into semantic segments.

GIVEN a code file
WHEN chunking it
THEN break it down into semantically meaningful segments

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/code-context-engine/chunks/file/{project_id}`

**Summary:** Get File Chunks

Get chunks for a specific file.

GIVEN a file path in a project
WHEN retrieving chunks
THEN return all chunks for that file

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_path` (query) *(required)*: Path to the file

**Success Response (200):** Successful Response

---

### `GET /v1/public/code-context-engine/chunks/project/{project_id}`

**Summary:** Get Project Chunks

Get chunks for an entire project with pagination and filtering.

GIVEN a project ID
WHEN retrieving chunks
THEN return chunks with pagination and optional filtering

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `limit` (query): Maximum number of chunks to return
- `offset` (query): Offset for pagination
- `language` (query): Filter by language
- `chunk_type` (query): Filter by chunk type
- `file_path` (query): Filter by file path

**Success Response (200):** Successful Response

---

### `POST /v1/public/code-context-engine/embed/chunk`

**Summary:** Embed Chunk

Generate and store embedding for a specific chunk.

GIVEN a chunk ID
WHEN embedding the chunk
THEN generate and store vector representation

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/code-context-engine/embed/file`

**Summary:** Embed File Chunks

Generate and store embeddings for all chunks in a file.

GIVEN a file path
WHEN embedding all chunks in the file
THEN generate and store vector representations

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/code-context-engine/embeddings/{project_id}/{chunk_id}`

**Summary:** Get Embedding

Get embedding for a specific chunk.

GIVEN a chunk ID
WHEN retrieving its embedding
THEN return vector representation

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `chunk_id` (path) *(required)*: Chunk ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/code-context-engine/metadata/directory`

**Summary:** Track Directory Metadata

Track metadata for all files in a directory.

GIVEN a directory of files
WHEN tracking metadata
THEN analyze and store properties for all files

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/code-context-engine/metadata/file`

**Summary:** Track File Metadata

Track metadata for a single file.

GIVEN a file in a project
WHEN tracking its metadata
THEN analyze and store its properties

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/code-context-engine/metadata/file/{project_id}`

**Summary:** Get File Metadata

Get metadata for a specific file.

GIVEN a file path in a project
WHEN retrieving metadata
THEN return all stored metadata for that file

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `file_path` (query) *(required)*: Path to the file

**Success Response (200):** Successful Response

---

### `GET /v1/public/code-context-engine/metadata/stats/{project_id}`

**Summary:** Get Project File Stats

Get aggregated file statistics for a project.

GIVEN a project ID
WHEN retrieving file statistics
THEN return aggregated metrics across all files

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/code-context-engine/optimize`

**Summary:** Optimize Code Context Engine

Optimize the Code Context Engine for large repositories.

GIVEN a project ID
WHEN optimizing the Code Context Engine
THEN perform database optimization and analysis

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (201):** Successful Response

---

### `POST /v1/public/code-context-engine/search/files`

**Summary:** Find Files By Criteria

Find files matching specific criteria.

GIVEN a set of criteria
WHEN searching for files
THEN return files that match all criteria

**Parameters:**

- `project_id` (path) *(required)*: Project ID

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/code-context-engine/search/similarity`

**Summary:** Find Similar Chunks

Find code chunks similar to a query text.

GIVEN a query text
WHEN searching for semantic similarity
THEN return code chunks with similarity scores

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/code-quality/`

**Summary:** List Analyses

Get a list of code quality analyses for the current user.

- **project_id** (optional): Filter by project ID
- **limit** (optional): Maximum number of records to return (default: 10, max: 100)

Returns a list of analysis summaries ordered by creation date (newest first).

**Parameters:**

- `project_id` (query): Filter by project ID
- `limit` (query): Maximum number of records to return

**Success Response (200):** Success

---

### `POST /v1/public/code-quality/analyze`

**Summary:** Create Code Analysis

Create a new code quality analysis for the given code content.

- **project_id**: ID of the project being analyzed
- **file_path**: Path to the file being analyzed
- **code_content**: Content of the file to analyze

Returns the analysis results including issues and metrics.

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/public/code-quality/analyze/agent`

**Summary:** Create Agent Code Analysis

Create a new code quality analysis using the Cody agent's selected LLM.

**Status:** Coming Soon - This endpoint is planned but not yet implemented.

- **project_id**: ID of the project being analyzed
- **file_path**: Path to the file being analyzed
- **code_content**: Content of the file to analyze
- **agent_session_id**: ID of the agent session to use for analysis

Returns the analysis results including issues and metrics, with LLM information.

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/public/code-quality/fixes`

**Summary:** Generate Quick Fixes

Generate fix suggestions for code quality issues using the agent's LLM.

**Status:** Coming Soon - This endpoint is planned but not yet implemented.

- **analysis_id**: ID of the analysis containing the issues
- **issue_ids**: List of issue IDs to generate fixes for
- **agent_session_id**: ID of the agent session to use for fix generation

Returns suggested fixes for each issue with original and improved code.

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/public/code-quality/fixes/direct`

**Summary:** Generate Quick Fixes Direct

Generate fix suggestions using real direct LLM API calls (OpenAI, Anthropic, Ollama).

GIVEN a user with an active agent session and code analysis with issues
WHEN the endpoint is called with valid data
THEN it returns successful results with fix suggestions

Following SCSS V2.0 standards with real database operations and direct API calls.

- **analysis_id**: ID of the analysis containing the issues
- **issue_ids**: List of issue IDs to generate fixes for
- **agent_session_id**: ID of the agent session to use for fix generation

Returns suggested fixes for each issue with original and improved code.

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/code-quality/{analysis_id}`

**Summary:** Get Analysis

Get detailed results of a specific code quality analysis.

- **analysis_id**: ID of the analysis to retrieve

Returns the complete analysis with all issues and metrics.

**Parameters:**

- `analysis_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `GET /v1/public/collaboration/analytics`

**Summary:** Get Platform Analytics

Get platform-wide collaboration analytics

**Success Response (200):** Successful Response

---

### `POST /v1/public/collaboration/cleanup`

**Summary:** Cleanup Expired Sessions

Manually trigger cleanup of expired sessions (admin only)

**Success Response (200):** Successful Response

---

### `GET /v1/public/collaboration/event-types`

**Summary:** List Event Types

List available collaboration event types

**Success Response (200):** Successful Response

---

### `POST /v1/public/collaboration/sessions`

**Summary:** Create Collaboration Session

Create a new real-time collaboration session

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/collaboration/sessions`

**Summary:** List Collaboration Sessions

List collaboration sessions

**Parameters:**

- `project_id` (query): Filter by project ID
- `active_only` (query): Only return active sessions

**Success Response (200):** Successful Response

---

### `GET /v1/public/collaboration/sessions/{session_id}`

**Summary:** Get Session Details

Get details of a specific collaboration session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/collaboration/sessions/{session_id}`

**Summary:** Close Session

Close a collaboration session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/collaboration/sessions/{session_id}/agents`

**Summary:** Spawn Agent

Spawn an agent in a collaboration session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/collaboration/sessions/{session_id}/agents/{agent_id}/inference`

**Summary:** Agent Inference

Execute inference using a session agent

**Parameters:**

- `session_id` (path) *(required)*: No description
- `agent_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/collaboration/sessions/{session_id}/analytics`

**Summary:** Get Session Analytics

Get analytics for a collaboration session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/collaboration/user-roles`

**Summary:** List User Roles

List available user roles for collaboration

**Success Response (200):** Successful Response

---

### `GET /v1/public/debug/router-status`

**Summary:** Get Router Registration Status

Get the status of router registration for debugging

**Success Response (200):** Successful Response

---

### `POST /v1/public/debugging/sessions`

**Summary:** Create Debugging Session

Create a new debugging session.

Given a user who wants to start debugging an issue
When they provide the necessary session details
Then a new debugging session is created and returned

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/debugging/sessions`

**Summary:** Get Debugging Sessions

Get debugging sessions for the current user.

Given a user who wants to view their debugging sessions
When they request their debugging sessions with optional filters
Then a list of debugging sessions is returned

**Parameters:**

- `project_id` (query): Filter by project ID
- `status` (query): Filter by session status
- `limit` (query): Maximum number of sessions to return
- `offset` (query): Offset for pagination

**Success Response (200):** Successful Response

---

### `POST /v1/public/debugging/sessions/analyze`

**Summary:** Analyze And Suggest Fixes

Analyze an error and suggest potential fixes.

Given a user who wants to analyze an error and get fixing suggestions
When they provide the error details
Then a new debugging session is created with suggestions and returned

**Parameters:**

- `project_id` (query) *(required)*: ID of the project
- `error_analysis_id` (query): ID of an existing error analysis
- `error_message` (query): Error message if not using analysis
- `error_stack_trace` (query): Stack trace if not using analysis

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/debugging/sessions/{session_id}`

**Summary:** Get Debugging Session

Get a specific debugging session.

Given a user who wants to view a specific debugging session
When they provide the session ID
Then the debugging session details are returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Success Response (200):** Successful Response

---

### `PUT /v1/public/debugging/sessions/{session_id}`

**Summary:** Update Debugging Session

Update a debugging session.

Given a user who wants to update a debugging session
When they provide the session ID and update data
Then the debugging session is updated and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/debugging/sessions/{session_id}/details`

**Summary:** Get Debugging Session With Details

Get a debugging session with all details.

Given a user who wants to view a complete debugging session
When they provide the session ID
Then the debugging session with all steps, suggestions, and test cases is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Success Response (200):** Successful Response

---

### `POST /v1/public/debugging/sessions/{session_id}/steps`

**Summary:** Add Debugging Step

Add a new debugging step.

Given a user who wants to add a step to a debugging session
When they provide the step details
Then a new debugging step is created and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/debugging/sessions/{session_id}/steps`

**Summary:** Get Debugging Steps

Get steps for a debugging session.

Given a user who wants to view steps in a debugging session
When they provide the session ID
Then a list of debugging steps is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session
- `status` (query): Filter by step status

**Success Response (200):** Successful Response

---

### `POST /v1/public/debugging/sessions/{session_id}/suggestions`

**Summary:** Add Debugging Suggestion

Add a new debugging suggestion.

Given a user who wants to add a suggestion to a debugging session
When they provide the suggestion details
Then a new debugging suggestion is created and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/debugging/sessions/{session_id}/suggestions`

**Summary:** Get Debugging Suggestions

Get suggestions for a debugging session.

Given a user who wants to view suggestions in a debugging session
When they provide the session ID
Then a list of debugging suggestions is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session
- `suggestion_type` (query): Filter by suggestion type

**Success Response (200):** Successful Response

---

### `POST /v1/public/debugging/sessions/{session_id}/test-cases`

**Summary:** Add Test Case Suggestion

Add a new test case suggestion.

Given a user who wants to add a test case to a debugging session
When they provide the test case details
Then a new test case suggestion is created and returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/debugging/sessions/{session_id}/test-cases`

**Summary:** Get Test Case Suggestions

Get test case suggestions for a debugging session.

Given a user who wants to view test cases in a debugging session
When they provide the session ID
Then a list of test case suggestions is returned

**Parameters:**

- `session_id` (path) *(required)*: ID of the debugging session
- `test_type` (query): Filter by test type

**Success Response (200):** Successful Response

---

### `PUT /v1/public/debugging/steps/{step_id}`

**Summary:** Update Debugging Step

Update a debugging step.

Given a user who wants to update a debugging step
When they provide the step ID and update data
Then the debugging step is updated and returned

**Parameters:**

- `step_id` (path) *(required)*: ID of the debugging step

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/documents/`

**Summary:** Read Documents

Retrieve documents with pagination and optional filtering
Following Semantic Seed standards for multi-tenancy

Returns only documents in the current organization

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `status` (query): No description
- `project_id` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/documents/`

**Summary:** Search Documents

Search documents using vector search
Following Semantic Seed standards for search functionality

Returns only documents in the current organization matching the search query

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/documents/{document_id}`

**Summary:** Read Document

Get document by ID
Following Semantic Seed standards for multi-tenancy

Users can only access documents in their current organization

**Parameters:**

- `document_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/documents/{document_id}`

**Summary:** Update Document

Update document
Following Semantic Seed standards for multi-tenancy

Users can only update documents in their current organization

**Parameters:**

- `document_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/documents/{document_id}`

**Summary:** Delete Document

Soft delete document (mark as archived)
Following Semantic Seed standards for data retention

Users can only archive documents in their current organization

**Parameters:**

- `document_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/emails/health`

**Summary:** Email Service Health Check

Check if email service is operational

**Success Response (200):** Successful Response

---

### `POST /v1/public/emails/welcome`

**Summary:** Send Welcome Email

Send a welcome email to a new user with organization branding

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/git/`

**Summary:** Connect Repository

Connect a new Git repository

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/git/branches/{repo_id}`

**Summary:** List Branches

List branches for repository

**Parameters:**

- `repo_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/git/context/{repo_id}`

**Summary:** Get Repository Context

Get repository context and metadata

**Parameters:**

- `repo_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/git/repositories`

**Summary:** List Repositories

List connected Git repositories

**Success Response (200):** Successful Response

---

### `GET /v1/public/github/connection-status`

**Summary:** Get Connection Status

Check GitHub connection status

Returns whether user has connected their GitHub account and basic connection info.
This is a simplified endpoint that returns connection status without full settings.

**Success Response (200):** Successful Response

---

### `GET /v1/public/github/repositories`

**Summary:** Get Github Repositories

Get GitHub repositories for user using stored OAuth token

Fetches real repository data from api.github.com using the user's
stored GitHub access token.

**Parameters:**

- `limit` (query): No description
- `include_private` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/github/settings`

**Summary:** Get Github Settings

Get GitHub integration settings - now properly integrated with GitHubSettingsService

**Success Response (200):** Successful Response

---

### `POST /v1/public/github/token`

**Summary:** Save Github Token

Save GitHub token - now properly integrated with GitHubSettingsService

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/github/user`

**Summary:** Get Github User

Get GitHub user information using stored OAuth token

Fetches real GitHub user data from api.github.com using the user's
stored GitHub access token (saved during OAuth callback).

**Success Response (200):** Successful Response

---

### `GET /v1/public/health/`

**Summary:** Basic Health Check

Fast health check for load balancers and monitoring systems

**Success Response (200):** Successful Response

---

### `GET /v1/public/health/dashboard`

**Summary:** Health Dashboard

Real-time health monitoring dashboard with trends and alerts

**Success Response (200):** Successful Response

---

### `GET /v1/public/health/detailed`

**Summary:** Detailed Health Check

Comprehensive health check with component analysis and performance metrics

**Success Response (200):** Successful Response

---

### `GET /v1/public/health/report`

**Summary:** Health Report

Comprehensive health report with executive summary and recommendations

**Success Response (200):** Successful Response

---

### `GET /v1/public/health/status`

**Summary:** System Status

Returns overall system status for monitoring dashboards

**Success Response (200):** Successful Response

---

### `POST /v1/public/invoices`

**Summary:** Create Invoice

Create a new invoice (draft status)

Creates invoice in local database with:
- Unique invoice number (INV-YYYY-NNNN format)
- Line items with descriptions, quantities, prices
- Calculated totals
- Initial status: 'draft'

Permissions:
- Admins can create invoices for any user
- Regular users can only create invoices for themselves

Cost Savings:
- No Stripe invoicing fee (0.4% saved)
- Only pay Stripe payment processing when customer pays (2.9% + $0.30)

Args:
    invoice_data: Invoice creation data
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Created invoice with ID, number, totals, status

Raises:
    HTTPException 400: Invalid line items or data
    HTTPException 403: Forbidden (trying to create for another user)
    HTTPException 500: Database error

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/invoices`

**Summary:** List Invoices

List invoices with pagination and filtering

Permissions:
- Regular users: See only their own invoices
- Admins: Can filter by any user_id or see all invoices

Filters:
- status: Filter by status (draft, sent, paid, overdue, void)
- user_id: Filter by user (admin only)
- skip/limit: Pagination

Args:
    status_filter: Invoice status filter
    user_id: User ID filter (admin only)
    skip: Records to skip for pagination
    limit: Maximum records to return
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceListResponse: List of invoices with pagination metadata

Raises:
    HTTPException 403: Forbidden (non-admin trying to access others' invoices)
    HTTPException 500: Database error

**Parameters:**

- `status` (query): Filter by invoice status
- `user_id` (query): Filter by user ID (admin only)
- `skip` (query): Number of records to skip
- `limit` (query): Maximum number of records

**Success Response (200):** Successful Response

---

### `GET /v1/public/invoices/{invoice_id}`

**Summary:** Get Invoice

Get invoice details by ID

Permissions:
- Users can only view their own invoices
- Admins can view any invoice

Args:
    invoice_id: Invoice ID (UUID)
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Complete invoice details

Raises:
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/public/invoices/{invoice_id}`

**Summary:** Update Invoice

Update a draft invoice

Only draft invoices can be updated. Once finalized, invoices are immutable.

Updatable fields:
- line_items: Update items, quantities, prices
- due_date: Change payment due date
- period_start/period_end: Update billing period
- metadata: Add/update custom fields

Permissions:
- Users can only update their own invoices
- Admins can update any invoice

Args:
    invoice_id: Invoice ID
    updates: Fields to update
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Updated invoice

Raises:
    HTTPException 400: Invalid updates or invoice not in draft status
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/invoices/{invoice_id}/finalize`

**Summary:** Finalize Invoice

Finalize invoice (change status from draft to sent)

Finalizing an invoice:
1. Changes status from 'draft' to 'sent'
2. Generates PDF invoice
3. Sends email notification to customer
4. Makes invoice immutable (no further edits allowed)

Permissions:
- Users can only finalize their own invoices
- Admins can finalize any invoice

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Finalized invoice

Raises:
    HTTPException 400: Invoice not in draft status or invalid
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database or processing error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/invoices/{invoice_id}/mark-paid`

**Summary:** Mark Invoice Paid

Manually mark invoice as paid

Use this endpoint for non-Stripe payments:
- Wire transfers
- ACH payments
- Cash payments
- Checks
- Other payment methods

For Stripe payments, use the payment intent webhook (automatic).

Updates:
- status = 'paid'
- paid_at = provided timestamp or now
- amount_paid = amount_total
- metadata updated with payment details

Permissions:
- Only admins can manually mark invoices as paid
- Regular users cannot mark their own invoices as paid (fraud prevention)

Args:
    invoice_id: Invoice ID
    payment_data: Payment method, reference, notes
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Updated invoice marked as paid

Raises:
    HTTPException 400: Invoice already paid or void
    HTTPException 403: Forbidden (non-admin user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/invoices/{invoice_id}/payment-intent`

**Summary:** Create Invoice Payment Intent

Create Stripe Payment Intent for invoice payment

This endpoint creates a Payment Intent for collecting payment on an invoice.
Returns the client_secret needed for Stripe.js frontend payment form.

Cost Savings:
- Uses Stripe Payment Intent (2.9% + $0.30 fee)
- NO Stripe Invoicing (saves 0.4% fee)
- Example: $10,000 invoice = $40 saved per transaction

Flow:
1. Customer views invoice
2. Clicks "Pay Now"
3. Frontend calls this endpoint to get client_secret
4. Frontend uses Stripe.js to collect payment
5. Stripe processes payment
6. Webhook marks invoice as paid

Permissions:
- Users can only create payment intents for their own invoices
- Admins can create payment intents for any invoice

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    PaymentIntentResponse: Contains client_secret for Stripe.js

Raises:
    HTTPException 400: Invoice already paid or invalid
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Payment Intent creation failed

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/invoices/{invoice_id}/pdf`

**Summary:** Get Invoice Pdf

Get invoice PDF URL or generate if not exists

Returns the PDF URL if already generated, otherwise generates it on-demand.

Permissions:
- Users can only access their own invoice PDFs
- Admins can access any invoice PDF

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    dict: PDF URL and metadata

Raises:
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: PDF generation error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/invoices/{invoice_id}/void`

**Summary:** Void Invoice

Void/cancel an invoice

Voiding an invoice:
- Changes status to 'void'
- Invoice cannot be paid
- Invoice cannot be un-voided

Use cases:
- Customer cancelled order
- Invoice sent in error
- Duplicate invoice created

Permissions:
- Users can only void their own invoices
- Admins can void any invoice

Args:
    invoice_id: Invoice ID
    current_user: Authenticated user
    db: Database session

Returns:
    InvoiceResponse: Voided invoice

Raises:
    HTTPException 400: Invoice already paid or void
    HTTPException 403: Forbidden (invoice belongs to another user)
    HTTPException 404: Invoice not found
    HTTPException 500: Database error

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/load-testing/results`

**Summary:** Get Load Test Results

Get load test results for user

**Success Response (200):** Successful Response

---

### `POST /v1/public/load-testing/run`

**Summary:** Run Load Test

Run a load test scenario

This charges credits against the user's account based on test duration and load

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/load-testing/scenarios`

**Summary:** Get Load Test Scenarios

Get user's load testing scenarios

Load testing usage is charged against user credits

**Success Response (200):** Successful Response

---

### `POST /v1/public/load-testing/scenarios`

**Summary:** Create Load Test Scenario

Create a new load test scenario

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/billing/summary`

**Summary:** Get Mcp Billing Summary

Get MCP billing summary for user

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/catalog`

**Summary:** Get Mcp Server Catalog

Get available MCP servers from catalog
Query Parameters:
- category: Filter by category (e.g., 'Development Tools', 'AI Tools') or use 'all' to see all servers
- status: Filter by status (e.g., 'available', 'beta', 'deprecated')

**Parameters:**

- `category` (query): Filter by category. Use 'all' to see all servers.
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/categories`

**Summary:** Get Mcp Categories

Get all available MCP server categories for filtering

**Success Response (200):** Successful Response

---

### `POST /v1/public/mcp/instances`

**Summary:** Create Mcp Instance

Create and deploy a new MCP server instance

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/instances`

**Summary:** Get User Mcp Instances

Get user's MCP server instances - returns data in format frontend expects
Now includes container registry information

**Parameters:**

- `status` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/instances/{instance_id}`

**Summary:** Get Mcp Instance

Get specific MCP server instance details with container registry information

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/mcp/instances/{instance_id}`

**Summary:** Update Mcp Instance

Update MCP server instance configuration

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/mcp/instances/{instance_id}`

**Summary:** Delete Mcp Instance

Terminate and delete MCP server instance

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/instances/{instance_id}/endpoint`

**Summary:** Get Instance Endpoint Info

Get detailed endpoint information for MCP instance with container registry data

**Parameters:**

- `instance_id` (path) *(required)*: No description
- `force_refresh` (query): Force refresh endpoint cache

**Success Response (200):** Successful Response

---

### `POST /v1/public/mcp/instances/{instance_id}/refresh-endpoint`

**Summary:** Refresh Instance Endpoint

Force refresh container endpoint resolution for MCP instance

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/mcp/instances/{instance_id}/start`

**Summary:** Start Mcp Instance

Start a stopped MCP server instance

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/mcp/instances/{instance_id}/stop`

**Summary:** Stop Mcp Instance

Stop a running MCP server instance

**Parameters:**

- `instance_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/instances/{instance_id}/usage`

**Summary:** Get Instance Usage

Get usage logs for an MCP instance

**Parameters:**

- `instance_id` (path) *(required)*: No description
- `days` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/mcp/registry/clear-cache`

**Summary:** Clear Container Registry Cache

Clear container registry cache (admin function or user-specific)

**Parameters:**

- `instance_id` (query): Clear cache for specific instance only

**Success Response (200):** Successful Response

---

### `GET /v1/public/mcp/registry/statistics`

**Summary:** Get Container Registry Statistics

Get comprehensive container registry statistics and performance metrics

**Success Response (200):** Successful Response

---

### `POST /v1/public/mcp/track-api-call`

**Summary:** Track Mcp Api Call

Track individual MCP API call for billing and analytics
This endpoint is called by MCP servers to report usage

**Parameters:**

- `instance_id` (query) *(required)*: No description
- `method` (query) *(required)*: No description
- `endpoint` (query) *(required)*: No description
- `duration_ms` (query) *(required)*: No description
- `status_code` (query) *(required)*: No description
- `request_size` (query): No description
- `response_size` (query): No description
- `error_message` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/me/invoices/me/invoices`

**Summary:** List My Invoices

List invoices for authenticated user

NO admin role required - automatically filtered to current user

Query Parameters:
- status: Filter by status (draft, sent, paid, overdue, void)
- limit: Number of results (max 100)
- offset: Pagination offset

Returns:
- List of user's invoices
- Total count
- Pagination info

Security:
- Automatically filters by current user ID
- User can only see their own invoices

**Parameters:**

- `status_filter` (query): No description
- `limit` (query): No description
- `offset` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/me/invoices/me/invoices/{invoice_id}`

**Summary:** Get My Invoice

Get specific invoice details

Verifies invoice belongs to current user
Returns 404 if not found or doesn't belong to user

Args:
- invoice_id: Invoice ID (UUID)

Returns:
- Invoice details with line items

Security:
- Verifies invoice belongs to current user
- Returns 404 (not 403) if doesn't belong to user (don't reveal it exists)

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/me/invoices/me/invoices/{invoice_id}/payment-intent`

**Summary:** Create Payment Intent For My Invoice

Create Stripe Payment Intent to pay invoice

Verifies invoice belongs to current user
Returns client_secret for frontend Stripe Elements

Args:
- invoice_id: Invoice ID

Returns:
- client_secret: Stripe client secret for payment
- amount: Amount in cents
- currency: Currency code

Security:
- Verifies invoice belongs to current user
- Prevents payment of already-paid invoices

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/me/invoices/me/invoices/{invoice_id}/pdf`

**Summary:** Download My Invoice Pdf

Download invoice PDF

Verifies invoice belongs to current user
Returns PDF URL or generates on-demand

Args:
- invoice_id: Invoice ID

Returns:
- PDF URL and metadata

Security:
- Verifies invoice belongs to current user
- Returns 404 if doesn't belong to user

**Parameters:**

- `invoice_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/analytics`

**Summary:** Get Performance Analytics

Get comprehensive performance analytics for the inference engine

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/analytics/zerodb/{project_id}`

**Summary:** Get ZeroDB Analytics

Get inference analytics from ZeroDB event logs

**Parameters:**

- `project_id` (path) *(required)*: No description
- `days` (query): Number of days to analyze

**Success Response (200):** Successful Response

---

### `POST /v1/public/multi-model/inference`

**Summary:** Execute Inference

Execute inference request with intelligent model routing

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/memory/{project_id}`

**Summary:** List Inference Memory

List inference memory records stored in ZeroDB

**Parameters:**

- `project_id` (path) *(required)*: No description
- `session_id` (query): Filter by session ID
- `model_id` (query): Filter by model ID
- `limit` (query): Maximum results

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/model-types`

**Summary:** List Model Types

List available model types

**Success Response (200):** Successful Response

---

### `POST /v1/public/multi-model/models`

**Summary:** Register Model

Register a new model with the inference engine

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/models`

**Summary:** List Models

List all registered models with their configurations and metrics

**Parameters:**

- `enabled_only` (query): Only return enabled models
- `model_type` (query): Filter by model type
- `provider` (query): Filter by provider

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/models/{model_id}/health`

**Summary:** Check Model Health

Check health status of a specific model

**Parameters:**

- `model_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/multi-model/models/{model_id}/toggle`

**Summary:** Toggle Model Status

Enable or disable a specific model

**Parameters:**

- `model_id` (path) *(required)*: No description
- `enable` (query) *(required)*: Enable or disable the model

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/providers`

**Summary:** List Model Providers

List available model providers

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/recommendations`

**Summary:** Get Model Recommendations

Get model recommendations for specific requirements

**Parameters:**

- `model_type` (query) *(required)*: Type of model needed
- `requirements` (query): Required capabilities

**Success Response (200):** Successful Response

---

### `GET /v1/public/multi-model/routing-strategies`

**Summary:** List Routing Strategies

List available routing strategies with descriptions

**Success Response (200):** Successful Response

---

### `POST /v1/public/multi-model/search-similar`

**Summary:** Search Similar Inferences

Search for similar inference results using ZeroDB vector search

**Parameters:**

- `query` (query) *(required)*: Search query
- `project_id` (query) *(required)*: Project ID
- `model_type` (query): Filter by model type
- `provider` (query): Filter by provider
- `limit` (query): Maximum results

**Success Response (200):** Successful Response

---

### `GET /v1/public/organizations/`

**Summary:** List Organizations

List all organizations

Returns a list of organizations that the authenticated user has access to.

**Success Response (200):** Successful Response

---

### `POST /v1/public/organizations/`

**Summary:** Create Organization

Create new organization

Creates a new organization with the authenticated user as the owner.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/organizations/chat-sessions`

**Summary:** Get Chat Sessions Nuclear

Get organization chat sessions

Returns a list of chat sessions for the current organization context.

**Success Response (200):** Successful Response

---

### `GET /v1/public/organizations/nuclear-chat-proof-endpoint-12345`

**Summary:** Nuclear Chat Proof Never Existed Before

🚀 Nuclear proof endpoint for chat functionality

Development endpoint that demonstrates chat sessions are working correctly.

**Success Response (200):** Successful Response

---

### `GET /v1/public/organizations/{organization_id}`

**Summary:** Get Organization

Get organization by ID

Returns detailed information about a specific organization.

Raises:
    HTTPException: 404 if organization not found

**Parameters:**

- `organization_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/organizations/{organization_id}`

**Summary:** Update Organization

Update organization

Updates organization information such as name, description, or status.

Raises:
    HTTPException: 404 if organization not found

**Parameters:**

- `organization_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/organizations/{organization_id}/members`

**Summary:** Add Organization Member

Add member to organization

Adds a new member to the organization with the specified role.

Raises:
    HTTPException: 404 if organization not found

**Parameters:**

- `organization_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/organizations/{organization_id}/members/{user_id}`

**Summary:** Remove Organization Member

Remove member from organization

Removes a member from the organization.

Raises:
    HTTPException: 404 if organization or member not found

**Parameters:**

- `organization_id` (path) *(required)*: No description
- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/pr-analysis/api/v1/pr-analysis/health`

**Summary:** Health check

Get health status of the PR analysis service

**Success Response (200):** Successful Response

---

### `POST /v1/public/pr-analysis/api/v1/pr-analysis/repositories/{repository_id}/pull-requests/{pull_request_id}/analyze`

**Summary:** Start PR analysis

Start analysis for a GitHub pull request

**Parameters:**

- `repository_id` (path) *(required)*: GitHub repository ID
- `pull_request_id` (path) *(required)*: GitHub pull request ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/pr-analysis/api/v1/pr-analysis/repositories/{repository_id}/pull-requests/{pull_request_id}/results`

**Summary:** Get PR analysis results

Get analysis results for a pull request

**Parameters:**

- `repository_id` (path) *(required)*: GitHub repository ID
- `pull_request_id` (path) *(required)*: GitHub pull request ID
- `analysis_type` (query): Type of analysis to filter by

**Success Response (200):** Successful Response

---

### `GET /v1/public/pr-analysis/api/v1/pr-analysis/repositories/{repository_id}/pull-requests/{pull_request_id}/status`

**Summary:** Get PR analysis status

Get the status of PR analysis

**Parameters:**

- `repository_id` (path) *(required)*: GitHub repository ID
- `pull_request_id` (path) *(required)*: GitHub pull request ID

**Success Response (200):** Successful Response

---

### `GET /v1/public/pr-analysis/api/v1/pr-analysis/results/{analysis_id}/suggestions`

**Summary:** Get analysis suggestions

Get suggestions for an analysis result

**Parameters:**

- `analysis_id` (path) *(required)*: Analysis result ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/pr-analysis/api/v1/pr-analysis/suggestions/{suggestion_id}/apply`

**Summary:** Apply suggestion

Apply a code suggestion to the pull request

**Parameters:**

- `suggestion_id` (path) *(required)*: Suggestion ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/pr-analysis/api/v1/pr-analysis/suggestions/{suggestion_id}/feedback`

**Summary:** Provide feedback on a suggestion

Track the effectiveness of a code suggestion

**Parameters:**

- `suggestion_id` (path) *(required)*: Suggestion ID

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/pr-analysis/api/v1/pr-analysis/suggestions/{suggestion_id}/generate`

**Summary:** Generate suggestions

Generate code suggestions for a pull request

**Parameters:**

- `suggestion_id` (path) *(required)*: Suggestion ID

**Success Response (200):** Successful Response

---

### `POST /v1/public/pricing/checkout`

**Summary:** Create Checkout Session

Create Stripe checkout session (public endpoint)

SCSS V2.0 compliant - no authentication required for checkout creation

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/pricing/config`

**Summary:** Get Pricing Config

Get pricing configuration and settings (public endpoint)

SCSS V2.0 compliant - no authentication required

**Success Response (200):** Successful Response

---

### `GET /v1/public/pricing/plans`

**Summary:** Get Pricing Plans

Get all available pricing plans (public endpoint)

SCSS V2.0 compliant - no authentication required

**Success Response (200):** Successful Response

---

### `GET /v1/public/pricing/plans/{plan_id}`

**Summary:** Get Pricing Plan

Get specific pricing plan by ID (public endpoint)

SCSS V2.0 compliant - no authentication required

**Parameters:**

- `plan_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/profile/`

**Summary:** Get Profile

Legacy endpoint for getting profile
Redirects to /me endpoint

DEPRECATED: Use GET /v1/profiles/me instead

**Success Response (200):** Successful Response

---

### `PUT /v1/public/profile/`

**Summary:** Update User Profile

Legacy endpoint for updating profile

DEPRECATED: Use PATCH /v1/profiles/me instead

**Success Response (200):** Successful Response

---

### `GET /v1/public/profile/me`

**Summary:** Get Own Profile

Get current user's profile information

Returns complete profile data including:
- Personal information
- Community profile fields
- Privacy settings
- Social statistics (followers, following, friends)

Requires authentication.

Refs #915

**Success Response (200):** Successful Response

---

### `PATCH /v1/public/profile/me`

**Summary:** Update Own Profile

Update current user's profile

Allows updating:
- Bio
- Avatar URL
- Cover photo URL
- Location
- Website
- Ask Me Anything section
- Privacy settings (profile_visibility, show_online_status, allow_messages_from)

All fields are optional - only provided fields will be updated.
Empty strings are converted to None.
URLs are validated for proper format.

Requires authentication.

Args:
    profile_data: Profile update data (all fields optional)

Returns:
    Updated profile data

Refs #915

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `PATCH /v1/public/profile/me/privacy`

**Summary:** Update Privacy Settings

Update current user's privacy settings

Allows updating:
- profile_visibility: 'public', 'friends', or 'private'
- show_online_status: boolean
- allow_messages_from: 'everyone', 'friends', or 'none'

All fields are optional - only provided fields will be updated.

Requires authentication.

Args:
    privacy_data: Privacy settings update data

Returns:
    Updated profile data with new privacy settings

Refs #915

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/profile/stats`

**Summary:** Get Profile Stats

Get detailed user statistics with real GitHub analytics

Legacy endpoint maintained for backward compatibility.

DEPRECATED: Stats are now included in GET /v1/profiles/me

**Success Response (200):** Successful Response

---

### `GET /v1/public/profile/{user_id}`

**Summary:** Get User Profile

Get user profile by ID with privacy enforcement

Privacy logic:
- Public profiles: visible to everyone
- Friends-only profiles: visible to friends only
- Private profiles: only visible to the user themselves
- Blocked users: cannot view the profile

Returns minimal profile data if viewer doesn't have access.

Args:
    user_id: UUID of the user whose profile to retrieve

Returns:
    Full profile or minimal profile based on privacy settings

Refs #915

**Parameters:**

- `user_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/project-context/`

**Summary:** Detect Project Dependencies

Detect dependencies between projects.

GIVEN a project
WHEN detecting dependencies
THEN identify dependencies based on imports and references

**Parameters:**

- `project_id` (path) *(required)*: Project ID to analyze

**Success Response (201):** Successful Response

---

### `GET /v1/public/project-context/relationships/{project_id}`

**Summary:** Get Project Relationships

Get relationships for a project.

GIVEN a project ID
WHEN requesting relationships
THEN return relationships with other projects

**Parameters:**

- `project_id` (path) *(required)*: Project ID
- `relationship_type` (query): Optional relationship type filter
- `direction` (query): Relationship direction: outgoing, incoming, or both

**Success Response (200):** Successful Response

---

### `GET /v1/public/project-context/similarities/{project_id}`

**Summary:** Find Semantic Similarities

Find semantically similar code across projects.

GIVEN one or more projects
WHEN finding semantic similarities
THEN identify code chunks with similar meaning or functionality

**Parameters:**

- `project_id` (path) *(required)*: Primary project ID
- `other_project_id` (query): Optional project ID to compare with
- `min_similarity` (query): Minimum similarity score (0.0 to 1.0)

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects`

**Summary:** List Projects

List all projects for the current user with pagination and filtering

This endpoint provides comprehensive project listing with:
- Pagination support (skip/limit)
- Status and tier filtering 
- Soft-delete awareness
- Usage metrics included

**Parameters:**

- `skip` (query): Number of projects to skip
- `limit` (query): Max projects to return
- `status` (query): Filter by status
- `tier` (query): Filter by tier
- `include_deleted` (query): Include soft-deleted projects

**Success Response (200):** Successful Response

---

### `POST /v1/public/projects`

**Summary:** Create Project

Create a new project with unified database features

This endpoint creates a project with:
- Tier-based feature enablement
- Automatic quantum/MCP configuration
- Usage limit validation
- Database feature initialization

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/projects/bulk-stats`

**Summary:** Get Bulk Project Stats

Get statistics for multiple projects in a single API call

This endpoint significantly reduces API calls by returning stats for multiple
projects at once. It uses a single optimized database query with JOINs.

**Performance Benefits:**
- Single database query instead of N queries
- Batch processing for large project lists
- Pagination support for results

**Returns:**
- table_count: Number of NoSQL tables in project
- row_count: Total rows across all tables (placeholder, requires table query)
- vector_count: Number of vectors stored
- memory_count: Number of memory entries (stored in events_count)
- event_count: Number of events
- storage_used_bytes: Storage used in bytes (memory_usage_mb * 1024 * 1024)

**Example:**
```json
{
  "project_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Parameters:**

- `page` (query): Page number
- `page_size` (query): Items per page (max 100)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/stats/summary`

**Summary:** Get Projects Summary

Get summary statistics for all user projects

Returns:
- Total projects by tier
- Total usage across all projects  
- Overall tier limits

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}`

**Summary:** Get Project

Get a specific project by ID

Returns detailed project information including:
- All configuration settings
- Usage metrics
- Database features status
- Tier limits

**Parameters:**

- `project_id` (path) *(required)*: No description
- `include_deleted` (query): Include soft-deleted project

**Success Response (200):** Successful Response

---

### `PATCH /v1/public/projects/{project_id}`

**Summary:** Update Project

Update a project

Supports updating:
- Basic project information (name, description)
- Tier (with automatic feature reconfiguration)
- Status (ACTIVE, SUSPENDED, DELETED)
- Database settings

Security:
- Users can only update their own projects
- Input validation prevents SQL injection
- Audit log created for all update operations

**Parameters:**

- `project_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/projects/{project_id}`

**Summary:** Delete Project

Delete a project (soft delete by default)

- Soft delete: Sets status to DELETED and deleted_at timestamp
- Hard delete: Permanently removes from database
- Cascade delete: Removes all related project data (vectors, tables, files, events)
- Soft deleted projects can be restored

Security:
- Users can only delete their own projects
- Audit log created for all delete operations
- Rate limiting applied to prevent abuse

**Parameters:**

- `project_id` (path) *(required)*: No description
- `hard_delete` (query): Permanently delete (cannot be restored)
- `cascade` (query): Cascade delete related data (vectors, tables, files, events)

---

### `POST /v1/public/projects/{project_id}/restore`

**Summary:** Restore Project

Restore a soft-deleted project

Sets status back to ACTIVE and clears deleted_at timestamp.
Only works on soft-deleted projects.

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/projects/{project_id}/usage`

**Summary:** Get Project Usage

Get detailed usage metrics for a project

Returns:
- Current usage counts (vectors, tables, events, etc.)
- Tier-based limits
- Usage percentages

**Parameters:**

- `project_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/prompt-versioning/health`

**Summary:** Health Check

Health check endpoint for prompt versioning service

**Success Response (200):** Success

---

### `POST /v1/public/prompt-versioning/templates`

**Summary:** Create Prompt Template

Create a new prompt template with initial version

**Features:**
- Creates prompt template with version 1.0.0
- Supports template variables and metadata
- Team-based organization
- Automatic versioning initialization

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/prompt-versioning/templates`

**Summary:** List Prompt Templates

List prompt templates with optional filtering

**Features:**
- Category and team filtering
- Pagination support
- Template metadata
- Version summaries

**Parameters:**

- `category` (query): Filter by category
- `team_id` (query): Filter by team
- `limit` (query): Number of templates to return

**Success Response (200):** Success

---

### `GET /v1/public/prompt-versioning/templates/{prompt_id}`

**Summary:** Get Prompt Template

Get detailed prompt template information

**Features:**
- Complete template details
- All version information
- Performance metrics
- Deployment history

**Parameters:**

- `prompt_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `POST /v1/public/prompt-versioning/templates/{prompt_id}/rollback`

**Summary:** Rollback Version

Rollback to a previous version

**Features:**
- Automatic previous version detection
- Manual version targeting
- Rollback validation
- Production safety checks

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `target_version` (query): Specific version to rollback to

**Success Response (200):** Success

---

### `POST /v1/public/prompt-versioning/templates/{prompt_id}/versions`

**Summary:** Create New Version

Create a new version of an existing prompt template

**Features:**
- Semantic versioning (major.minor.patch)
- Automatic testing integration
- Tag-based organization
- Template variable validation

**Parameters:**

- `prompt_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/prompt-versioning/templates/{prompt_id}/versions`

**Summary:** List Template Versions

List all versions for a prompt template

**Features:**
- Status filtering
- Version sorting
- Performance summaries
- Test result previews

**Parameters:**

- `prompt_id` (path) *(required)*: No description
- `status` (query): Filter by status
- `limit` (query): Number of versions to return

**Success Response (200):** Success

---

### `GET /v1/public/prompt-versioning/versions/{version_id}`

**Summary:** Get Prompt Version

Get detailed prompt version information

**Features:**
- Complete version details
- Test results and metrics
- Deployment status
- Performance data

**Parameters:**

- `version_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `POST /v1/public/prompt-versioning/versions/{version_id}/deploy`

**Summary:** Deploy Version

Deploy a prompt version to production

**Features:**
- Multiple deployment strategies
- Rollback capability
- Deployment validation
- Production monitoring integration

**Parameters:**

- `version_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/prompt-versioning/versions/{version_id}/metrics`

**Summary:** Get Version Metrics

Get performance metrics for a prompt version

**Features:**
- Time-range performance data
- Usage statistics
- Test result history
- Deployment tracking

**Parameters:**

- `version_id` (path) *(required)*: No description
- `days` (query): Number of days for metrics

**Success Response (200):** Success

---

### `POST /v1/public/prompt-versioning/versions/{version_id}/test`

**Summary:** Test Prompt Version

Test a prompt version using PromptFoo integration

**Features:**
- A/B testing with comparison versions
- Multiple AI provider testing
- Custom test case support
- Performance metrics collection

**Parameters:**

- `version_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/quantum/devices`

**Summary:** List Quantum Devices

List available quantum devices

**Parameters:**

- `provider` (query): No description
- `device_type` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/quantum/execute`

**Summary:** Execute Circuit

Legacy execute quantum circuit endpoint

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/quantum/health`

**Summary:** Quantum Health

Get Quantum Computing API health status

**Success Response (200):** Successful Response

---

### `GET /v1/public/quantum/info`

**Summary:** Quantum Info

Get Quantum Computing API information

**Success Response (200):** Successful Response

---

### `POST /v1/public/quantum/jobs`

**Summary:** Create Quantum Job

Submit a quantum job for execution

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/quantum/jobs`

**Summary:** Get Quantum Jobs

Get user's quantum jobs

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/quantum/jobs/{job_id}`

**Summary:** Get Quantum Job

Get specific quantum job

**Parameters:**

- `job_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/realtime-feedback/config`

**Summary:** Get System Configuration

Get real-time feedback system configuration

**Success Response (200):** Success

---

### `GET /v1/public/realtime-feedback/health`

**Summary:** Get System Health

Get real-time feedback system health and status

**Features:**
- Active connection monitoring
- Processing status
- Queue health metrics
- System uptime

**Success Response (200):** Success

---

### `GET /v1/public/realtime-feedback/history`

**Summary:** Get Feedback History

Get filtered feedback history

**Features:**
- Prompt-specific filtering
- Feedback type filtering
- Severity level filtering
- Pagination support

**Parameters:**

- `prompt_id` (query): Filter by prompt ID
- `feedback_type` (query): Filter by feedback type
- `severity` (query): Filter by severity level
- `limit` (query): Maximum number of items

**Success Response (200):** Success

---

### `PUT /v1/public/realtime-feedback/prompts/{prompt_id}/thresholds`

**Summary:** Set Prompt Thresholds

Set custom quality and performance thresholds for a prompt

**Features:**
- Custom quality score thresholds
- Performance metric limits
- Threshold-based alerting
- Per-prompt configuration

**Parameters:**

- `prompt_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/realtime-feedback/statistics`

**Summary:** Get Feedback Statistics

Get feedback system statistics and metrics

**Features:**
- Feedback volume metrics
- Type and severity distribution
- Processing performance
- Trend analysis

**Parameters:**

- `time_window` (query): Time window (1h, 6h, 24h, 7d)

**Success Response (200):** Success

---

### `POST /v1/public/realtime-feedback/submit`

**Summary:** Submit Evaluation Feedback

Submit evaluation results for real-time feedback processing

**Features:**
- Immediate quality score feedback
- Performance alert generation
- Threshold breach detection
- Optimization suggestions

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/public/realtime-feedback/system/start`

**Summary:** Start Feedback Processing

Start the real-time feedback processing system

**Features:**
- Background processing activation
- System health monitoring
- Processing loop management

**Success Response (200):** Success

---

### `POST /v1/public/realtime-feedback/system/stop`

**Summary:** Stop Feedback Processing

Stop the real-time feedback processing system

**Features:**
- Graceful shutdown
- Connection cleanup
- Processing loop termination

**Success Response (200):** Success

---

### `POST /v1/public/refactoring/`

**Summary:** Generate Refactoring Suggestions

Generate refactoring suggestions for the provided code.

This endpoint analyzes the provided code and generates refactoring suggestions
to improve code quality, readability, and maintainability.

- **project_id**: ID of the project being analyzed
- **file_path**: Path to the file being analyzed
- **code_content**: Content of the file to analyze
- **analysis_id**: Optional ID of previous code quality analysis

**Request Body:** JSON

**Success Response (200):** Success

---

### `POST /v1/public/refactoring/apply/{suggestion_id}`

**Summary:** Apply Refactoring Suggestion

Apply a refactoring suggestion to the codebase.

This endpoint applies the selected refactoring suggestion to the code,
making the suggested changes and returning the updated code.

- **suggestion_id**: ID of the suggestion to apply
- **modifications**: Optional modifications to the suggestion

**Parameters:**

- `suggestion_id` (path) *(required)*: ID of the suggestion to apply

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/refactoring/suggestions/project/{project_id}`

**Summary:** Get refactoring suggestions for a project

Get a list of refactoring suggestions for a specific project.

Returns a summary of the most recent refactoring suggestions for the project,
ordered by creation date (most recent first).

- **project_id**: ID of the project to get suggestions for
- **limit**: Maximum number of suggestions to return (default: 10)

**Parameters:**

- `project_id` (path) *(required)*: ID of the project
- `limit` (query): Maximum number of suggestions to return

**Success Response (200):** Success

---

### `GET /v1/public/refactoring/suggestions/{suggestion_id}`

**Summary:** Get refactoring suggestion details

Get detailed information about a specific refactoring suggestion.

Returns complete information about the suggestion, including the suggested code changes
and explanation of the refactoring.

- **suggestion_id**: ID of the suggestion to retrieve

**Parameters:**

- `suggestion_id` (path) *(required)*: ID of the suggestion to retrieve

**Success Response (200):** Success

---

### `GET /v1/public/sandbox/environments`

**Summary:** Get Sandbox Environments

Get user's sandbox environments

Each developer account gets sandbox environments based on their plan.
This replaces mock data with real user plan-based allocation.

**Success Response (200):** Successful Response

---

### `POST /v1/public/sandbox/environments`

**Summary:** Create Sandbox Environment

Create a new sandbox environment (if user plan allows)

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/search/`

**Summary:** Search Content

Search through content using semantic search

SCSS V2.0 compliant endpoint

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/search/history`

**Summary:** Get Search History

Get user's search history

SCSS V2.0 compliant endpoint

**Parameters:**

- `limit` (query): Number of search history items to return

**Success Response (200):** Successful Response

---

### `GET /v1/public/search/suggestions`

**Summary:** Get Search Suggestions

Get search suggestions based on query

SCSS V2.0 compliant endpoint

**Parameters:**

- `query` (query) *(required)*: Search query for suggestions
- `limit` (query): Number of suggestions to return

**Success Response (200):** Successful Response

---

### `GET /v1/public/sessions/`

**Summary:** List User Sessions

List all active sessions for the current user

**Success Response (200):** Successful Response

---

### `POST /v1/public/sessions/`

**Summary:** Create Session

Create a new user session with preferences and metadata

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/sessions/analytics/summary`

**Summary:** Get Session Analytics

Get session analytics summary (admin only)

**Success Response (200):** Successful Response

---

### `GET /v1/public/sessions/{session_id}`

**Summary:** Get Session

Get session details by session ID

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/sessions/{session_id}`

**Summary:** Update Session

Update session preferences and metadata

**Parameters:**

- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/sessions/{session_id}`

**Summary:** Terminate Session

Terminate a session (logout)

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/sessions/{session_id}/events`

**Summary:** Get Session Events

Get all events for a session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/sessions/{session_id}/valid`

**Summary:** Check Session Validity

Check if a session is valid and active

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/settings/api-keys`

**Summary:** Get User Api Keys

Get user's AINative API keys

Fix for Issue #271: Returns real API keys instead of mocked data
SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `POST /v1/public/settings/api-keys`

**Summary:** Create Api Key

Create a new AINative API key for the user

Fix for Issue #271: Creates real API keys instead of mocked data
SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/settings/api-keys/{key_id}`

**Summary:** Delete Api Key

Delete an API key

Fix for Issue #271: Implements real API key deletion
SCSS V2.0 compliant endpoint using direct SQL

**Parameters:**

- `key_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/settings/api-keys/{key_id}/regenerate`

**Summary:** Regenerate Api Key

Regenerate an existing API key

Fix for Issue #271: Implements real API key regeneration
SCSS V2.0 compliant endpoint using direct SQL

**Parameters:**

- `key_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/settings/communication`

**Summary:** Get Communication Settings

Get user's communication settings

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `PUT /v1/public/settings/communication`

**Summary:** Update Communication Settings

Update user's communication settings

SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/settings/notifications/preferences`

**Summary:** Get Notification Preferences

Get user's notification preferences

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `PUT /v1/public/settings/notifications/preferences`

**Summary:** Update Notification Preferences

Update user's notification preferences

SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/settings/provider-keys`

**Summary:** Get Provider Keys

Get user's provider API keys (BYOK - Bring Your Own Keys)

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `PUT /v1/public/settings/provider-keys`

**Summary:** Update Provider Keys

Update user's provider API keys (BYOK - Bring Your Own Keys)

SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/settings/rate-limits`

**Summary:** Get Rate Limit Settings

Get rate limiting settings for the user

Fix for Issue #271: Returns real rate limit configuration
NOTE: Full functionality requires Kong Gateway integration
SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/settings/usage-limits`

**Summary:** Get Usage And Limits

Get user's current usage and tier-based limits

Fix for Issue #272: Returns real usage data instead of hardcoded values
SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/subscription`

**Summary:** Get Subscription

Get current user's subscription details

SCSS V2.0 compliant endpoint using direct SQL
Returns subscription in format compatible with SubscriptionService

**Success Response (200):** Successful Response

---

### `PUT /v1/public/subscription`

**Summary:** Update Subscription

Update user's subscription

SCSS V2.0 compliant endpoint using direct SQL

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/subscription/plans`

**Summary:** Get Plans

Get all available subscription plans

SCSS V2.0 compliant endpoint

**Success Response (200):** Successful Response

---

### `GET /v1/public/subscription/public`

**Summary:** Get Public Subscription

Get current user's subscription details (public endpoint - no admin required)

GitHub Issue: #322 - /v1/public/subscription endpoint

This endpoint returns the authenticated user's subscription information
without requiring admin privileges. Any authenticated user can view their
own subscription details.

Returns:
    {
        "success": true,
        "data": {
            "plan_name": "Professional",
            "tier": "pro",
            "status": "active",
            "renewal_date": "2025-01-15T00:00:00Z",
            "current_period_start": "2024-12-15T00:00:00Z",
            "current_period_end": "2025-01-15T00:00:00Z",
            "billing_cycle": "monthly",
            "credits_remaining": 4500,
            "credits_total": 5000,
            "features": [
                "5,000 AI credits",
                "Priority support",
                "Faster response time",
                "Advanced features"
            ],
            "limits": {
                "api_credits": 5000,
                "llm_tokens": 1000000,
                "max_users": 5,
                "max_projects": 10
            }
        }
    }

Raises:
    401 Unauthorized: If user is not authenticated
    500 Internal Server Error: If there's a database or system error

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/subscription/usage`

**Summary:** Get Usage

Get detailed usage analytics

SCSS V2.0 compliant endpoint using direct SQL

**Success Response (200):** Successful Response

---

### `GET /v1/public/ui/dashboard`

**Summary:** Unified Dashboard

Unified dashboard providing access to all open source UIs

**Features:**
- Links to all available open source UIs
- Status indicators for each service
- Quick access to documentation and tools
- Responsive design with service health checks

**Available UIs:**
- DeepEval: AI evaluation dashboard
- PromptFoo: Prompt testing and analytics
- FastAPI Docs: Interactive API documentation
- Redis Tools: Database management interfaces

**Success Response (200):** Success

---

### `GET /v1/public/ui/deepeval`

**Summary:** Deepeval Dashboard Proxy

Proxy to DeepEval dashboard
Preserves the original DeepEval UI while integrating with our system

**Success Response (200):** Success

---

### `GET /v1/public/ui/deepeval/login`

**Summary:** Deepeval Login Instructions

Instructions for accessing DeepEval dashboard

**Success Response (200):** Success

---

### `GET /v1/public/ui/evaluation`

**Summary:** Evaluation Interface

Comprehensive evaluation interface
Provides a form to start evaluations and view results

**Success Response (200):** Success

---

### `GET /v1/public/ui/promptfoo`

**Summary:** Promptfoo Interface Proxy

Proxy to PromptFoo web interface
Preserves the original PromptFoo UI

**Success Response (200):** Success

---

### `GET /v1/public/ui/promptfoo/view`

**Summary:** Promptfoo View Redirect

Direct access to PromptFoo view interface

**Success Response (200):** Success

---

### `GET /v1/public/ui/redis`

**Summary:** Redis Management Interface

Redis management interface options
Provides access to various Redis UI tools

**Success Response (200):** Success

---

### `GET /v1/public/ui/redis/monitor`

**Summary:** Redis Monitor Info

Redis monitoring information and commands

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/analytics/trends`

**Summary:** Get Feedback Trends

Get feedback trends and analytics

**Features:**
- Time-based trend analysis
- Sentiment tracking over time
- Category distribution trends
- Rating progression

**Parameters:**

- `days` (query): Number of days for trend analysis
- `category` (query): Filter by category

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/config`

**Summary:** Get System Configuration

Get user feedback system configuration

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/feedback/{feedback_id}`

**Summary:** Get Feedback

Get specific feedback by ID

**Features:**
- Detailed feedback information
- Analysis results (sentiment, category, keywords)
- Processing status and responses

**Parameters:**

- `feedback_id` (path) *(required)*: No description

**Success Response (200):** Success

---

### `PUT /v1/public/user-feedback/feedback/{feedback_id}/status`

**Summary:** Update Feedback Status

Update feedback status and response (admin only)

**Features:**
- Status management (pending, reviewed, implemented, rejected, in_progress)
- Admin responses to feedback
- Audit tracking

**Parameters:**

- `feedback_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/health`

**Summary:** Get System Health

Get user feedback system health and status

**Features:**
- System status monitoring
- Feedback volume metrics
- Processing statistics
- ML model status

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/insights`

**Summary:** Get Feedback Insights

Get actionable insights from user feedback

**Features:**
- AI-generated insights from feedback patterns
- Categorized recommendations
- Priority-based filtering
- Confidence scoring
- Affected prompts tracking

**Parameters:**

- `category` (query): Filter by category
- `priority` (query): Filter by priority (high, medium, low)
- `limit` (query): Maximum number of insights

**Success Response (200):** Success

---

### `POST /v1/public/user-feedback/submit`

**Summary:** Submit Feedback

Submit user feedback for analysis and integration

**Features:**
- Multiple feedback types support
- Automatic sentiment analysis
- Category classification
- Keyword extraction
- Real-time integration

**Request Body:** JSON

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/summary`

**Summary:** Get Feedback Summary

Get feedback summary with optional filtering

**Features:**
- Comprehensive feedback analytics
- Sentiment and category distributions
- Keyword analysis
- Recent insights
- Performance metrics

**Parameters:**

- `prompt_id` (query): Filter by prompt ID
- `category` (query): Filter by category
- `time_window_days` (query): Time window in days

**Success Response (200):** Success

---

### `GET /v1/public/user-feedback/user/feedback`

**Summary:** Get User Feedback

Get feedback submitted by the current user

**Features:**
- User's feedback history
- Optional filtering by type and status
- Analysis results included
- Response tracking

**Parameters:**

- `limit` (query): Maximum number of feedback items
- `feedback_type` (query): Filter by feedback type
- `status` (query): Filter by status

**Success Response (200):** Success

---

### `GET /v1/public/users/`

**Summary:** List Users

List users

Returns a list of users (requires authentication).
Note: Only admins should see other users in production.

**Success Response (200):** Successful Response

---

### `POST /v1/public/users/`

**Summary:** Create User

Create new user (Admin only)

Creates a new user account. Only administrators can create users.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/users/chat-sessions`

**Summary:** Get Chat Sessions

Get user's chat sessions

Returns a list of chat sessions for the authenticated user.

**Success Response (200):** Successful Response

---

### `GET /v1/public/users/me`

**Summary:** Get Current User Info

Get current user information

Returns detailed information about the authenticated user including chat sessions.

**Success Response (200):** Successful Response

---

### `POST /v1/public/v1/checkpoints/`

**Summary:** Restore Code Checkpoint

Restore project state from a specific checkpoint.

GIVEN a project ID and checkpoint ID
WHEN this endpoint is called
THEN the project state is restored to the specified checkpoint

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/v1/checkpoints/projects/{project_id}/checkpoints`

**Summary:** List Code Checkpoints

List checkpoints for a specific project.

GIVEN a project ID
WHEN this endpoint is called
THEN a list of checkpoints for that project is returned

**Parameters:**

- `project_id` (path) *(required)*: The ID of the project whose checkpoints to list.
- `limit` (query): Maximum number of checkpoints to return.
- `offset` (query): Offset for pagination.

**Success Response (200):** Successful Response

---

### `POST /v1/public/v1/comments`

**Summary:** Create Comment

Create a new comment (authenticated users only)

Stores comment in ZeroDB NoSQL table with user information

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/v1/comments/{comment_id}`

**Summary:** Delete Comment

Delete a comment (authenticated users only)

Users can only delete their own comments unless they are admins

**Parameters:**

- `comment_id` (path) *(required)*: Comment UUID to delete

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/comments/{content_type}/{content_id}`

**Summary:** Get Comments

Get comments for a specific content item (public endpoint, no auth required)

Returns paginated list of comments sorted by creation date (newest first)

**Parameters:**

- `content_type` (path) *(required)*: Content type (e.g., 'video', 'article')
- `content_id` (path) *(required)*: Content ID
- `limit` (query): Number of comments to return
- `offset` (query): Number of comments to skip

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/communication`

**Summary:** Get Communication Settings

Get current user's communication settings. Auto-creates default settings if none exist.

**Success Response (200):** Successful Response

---

### `PUT /v1/public/v1/communication`

**Summary:** Update Communication Settings

Update user's communication settings with validation for language, timezone, and email frequency.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/v1/notifications`

**Summary:** Create Notification

Create a new in-app notification for a user

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/v1/notifications`

**Summary:** List Notifications

Get paginated list of user's notifications with optional filtering

**Parameters:**

- `unread_only` (query): Show only unread notifications
- `type` (query): Filter by notification type (INFO, WARNING, ERROR, SUCCESS)
- `limit` (query): Number of notifications to return
- `offset` (query): Number of notifications to skip

**Success Response (200):** Successful Response

---

### `POST /v1/public/v1/notifications/bulk/create`

**Summary:** Bulk Create Notifications

Create multiple notifications in a single request (max 100). Supports partial success.

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/public/v1/notifications/bulk/delete`

**Summary:** Bulk Delete Notifications

Delete multiple notifications in a single request (max 100). Supports partial success.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/v1/notifications/bulk/mark-read`

**Summary:** Bulk Mark as Read

Mark multiple notifications as read in a single request (max 100). Supports partial success.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/v1/notifications/delete-all-read`

**Summary:** Delete All Read

Delete all read notifications for the user

**Success Response (200):** Successful Response

---

### `POST /v1/public/v1/notifications/mark-all-read`

**Summary:** Mark All as Read

Mark all user's notifications as read

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/notifications/unread-count`

**Summary:** Get Unread Count

Get count of unread notifications for the current user

**Success Response (200):** Successful Response

---

### `GET /v1/public/v1/notifications/{notification_id}`

**Summary:** Get Notification

Get specific notification by ID. Automatically marks as read when fetched.

**Parameters:**

- `notification_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/v1/notifications/{notification_id}`

**Summary:** Update Notification

Update notification read status (mark as read/unread)

**Parameters:**

- `notification_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/v1/notifications/{notification_id}`

**Summary:** Delete Notification

Delete a specific notification

**Parameters:**

- `notification_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/videos/{video_id}/chapters`

**Summary:** List video chapters

Get all chapters for a video with optional filtering

**Parameters:**

- `video_id` (path) *(required)*: No description
- `source` (query): Filter by source: 'manual' or 'ai'
- `search` (query): Search in title and description
- `min_confidence` (query): Minimum confidence score

**Success Response (200):** Successful Response

---

### `POST /v1/public/videos/{video_id}/chapters`

**Summary:** Create manual chapter

Create a new chapter manually

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/public/videos/{video_id}/chapters/at-time`

**Summary:** Find chapter at timestamp

Find the active chapter at a specific video timestamp

**Parameters:**

- `video_id` (path) *(required)*: No description
- `timestamp` (query) *(required)*: Timestamp in seconds

**Success Response (200):** Successful Response

---

### `POST /v1/public/videos/{video_id}/chapters/generate`

**Summary:** Generate AI chapters from transcript

Automatically generate chapter markers using AI analysis of video transcript

**Parameters:**

- `video_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/public/videos/{video_id}/chapters/{chapter_id}`

**Summary:** Get chapter details

Get detailed information about a specific chapter

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/videos/{video_id}/chapters/{chapter_id}`

**Summary:** Update chapter

Update an existing chapter

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/videos/{video_id}/chapters/{chapter_id}`

**Summary:** Delete chapter

Delete a chapter

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

---

### `GET /v1/public/videos/{video_id}/chapters/{chapter_id}/next`

**Summary:** Get next chapter

Get the next chapter in sequence

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/videos/{video_id}/chapters/{chapter_id}/previous`

**Summary:** Get previous chapter

Get the previous chapter in sequence

**Parameters:**

- `video_id` (path) *(required)*: No description
- `chapter_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/webhooks/`

**Summary:** List Webhooks

Get all webhooks for the current user

**Success Response (200):** Successful Response

---

### `POST /v1/public/webhooks/`

**Summary:** Create Webhook

Create a new webhook

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/public/webhooks/handle`

**Summary:** Handle Webhook

Generic webhook handler for receiving webhook events

**Success Response (200):** Successful Response

---

### `POST /v1/public/webhooks/payment/webhooks/stripe/payment-intent`

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

### `GET /v1/public/webhooks/payment/webhooks/stripe/payment-intent/test`

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

### `POST /v1/public/webhooks/stripe/webhook`

**Summary:** Stripe Webhook Handler

Stripe webhook endpoint handler

Handles the following events:
- checkout.session.completed: Create subscription when user completes payment (NEW - CONVERSION FIX)
- invoice.finalized: Send due invoice email
- invoice.payment_succeeded: Send paid invoice email
- payment_intent.succeeded: Handle automated billing & credit purchase payments
- payment_intent.payment_failed: Handle automated billing payment failures

SCSS V2.0 compliant with idempotent processing and comprehensive logging

**Parameters:**

- `stripe-signature` (header): No description

**Success Response (200):** Successful Response

---

### `GET /v1/public/webhooks/stripe/webhook/test`

**Summary:** Test Webhook Endpoint

Test endpoint to verify webhook is accessible

Returns basic configuration status

**Success Response (200):** Successful Response

---

### `GET /v1/public/webhooks/{webhook_id}`

**Summary:** Get Webhook

Get a specific webhook

**Parameters:**

- `webhook_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PUT /v1/public/webhooks/{webhook_id}`

**Summary:** Update Webhook

Update a webhook

**Parameters:**

- `webhook_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `DELETE /v1/public/webhooks/{webhook_id}`

**Summary:** Delete Webhook

Delete a webhook

**Parameters:**

- `webhook_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/public/webhooks/{webhook_id}/test`

**Summary:** Test Webhook

Test a webhook by sending a sample payload

**Parameters:**

- `webhook_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
