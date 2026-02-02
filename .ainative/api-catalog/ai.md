# Ai APIs

**Endpoint Count:** 50

## Overview

This category contains 50 endpoints for ai operations.


## AI Models


### `GET /v1/models`

**Summary:** List Models

List available AI models (OpenAI compatible)

**Success Response (200):** Successful Response

---

## Chat Completion


### `POST /v1/chat/completions`

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

### `GET /v1/chat/health`

**Summary:** Chat Health

Health check for chat service

**Success Response (200):** Successful Response

---

### `GET /v1/chat/info`

**Summary:** Chat Info

Get Chat API information

**Success Response (200):** Successful Response

---

### `GET /v1/chat/sessions`

**Summary:** Get Chat Sessions

Get user's chat sessions with pagination

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description
- `status` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/chat/sessions`

**Summary:** Create Chat Session

Create a new chat session

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/chat/sessions/{session_id}`

**Summary:** Get Chat Session

Get specific chat session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `GET /v1/chat/sessions/{session_id}/history`

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

### `GET /v1/chat/sessions/{session_id}/messages`

**Summary:** Get Chat Messages

Get messages from a chat session

**Parameters:**

- `session_id` (path) *(required)*: No description
- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `POST /v1/chat/sessions/{session_id}/messages`

**Summary:** Send Chat Message

Send a message to a chat session

**Parameters:**

- `session_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

## Managed Chat


### `POST /v1/managed/chat/completions`

**Summary:** Managed Chat Completion

Execute chat completion using AINative's API keys. Credits are consumed based on model and token usage. Available models depend on subscription tier. Set stream=true to receive SSE events during tool execution.

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/managed/estimate`

**Summary:** Estimate Credit Cost

Estimate credit cost for a request before execution

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/managed/models`

**Summary:** Get Model Distribution

Get distribution of models used in a period

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/managed/usage`

**Summary:** Get Current Chat Usage

Get current usage statistics for managed chat completions

**Parameters:**

- `period` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/managed/usage/history`

**Summary:** Get Usage History

Get historical usage data aggregated by day

**Parameters:**

- `days` (query): No description

**Success Response (200):** Successful Response

---

## 🎁 Campaigns


### `POST /v1/campaign/activate-gift`

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

### `GET /v1/campaign/clicks/{campaign_id}`

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

### `POST /v1/campaign/fix-conversions/{campaign_id}`

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

### `GET /v1/campaign/gift/{campaign_id}`

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

### `GET /v1/campaign/stats/{campaign_id}`

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

### `GET /v1/campaign/track`

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

## 🎁 Gift Campaigns


### `POST /v1/campaigns/admin/create`

**Summary:** Create Campaign Admin

Create a new gift campaign (Admin only)

Allows admins to create promotional gift campaigns with custom codes,
durations, and access levels.

Requires: Admin authentication

Returns:
    {
        "success": true,
        "data": {
            "id": "uuid",
            "code": "NY2026-XXXXX",
            "name": "New Year 2026 Gift",
            ...
        }
    }

Raises:
    401: Not authenticated or not admin
    400: Validation error or code already exists

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `POST /v1/campaigns/admin/generate-codes`

**Summary:** Generate Gift Codes Batch

Generate batch of unique gift codes (Admin only)

Generates multiple unique codes for distribution without creating campaigns.
Codes can be used later when creating campaigns.

Requires: Admin authentication

Returns:
    {
        "success": true,
        "data": {
            "codes": ["NY2026-ABC12", "NY2026-XYZ78", ...],
            "count": 100
        }
    }

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/campaigns/admin/list`

**Summary:** List Campaigns Admin

List all gift campaigns (Admin only)

Returns paginated list of all campaigns with basic info.

Requires: Admin authentication

**Parameters:**

- `skip` (query): No description
- `limit` (query): No description

**Success Response (200):** Successful Response

---

### `GET /v1/campaigns/admin/{campaign_id}/stats`

**Summary:** Get Campaign Stats Admin

Get comprehensive statistics for a campaign (Admin only)

Returns detailed analytics including redemptions, clicks, conversion rate,
and upgrade tracking.

Requires: Admin authentication

Returns:
    {
        "success": true,
        "data": {
            "campaign_id": "uuid",
            "total_redemptions": 150,
            "active_redemptions": 120,
            "conversion_rate": 45,
            "upgraded_users": 12,
            ...
        }
    }

**Parameters:**

- `campaign_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `POST /v1/campaigns/info`

**Summary:** Get Gift Code Info

Get public information about a gift code (no authentication required)

Allows users to check what a gift code offers before signing up or logging in.

Returns:
    {
        "success": true,
        "data": {
            "campaign_name": "New Year 2026 Gift",
            "description": "30 days of all-access...",
            "access_level": "all_access",
            "duration_days": 30,
            "is_available": true,
            "reason": null,
            "features": [...]
        }
    }

Raises:
    404: Gift code not found

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/campaigns/my-campaigns`

**Summary:** Get My Active Campaigns

Get authenticated user's active campaigns

Returns all active campaign redemptions for the current user,
including expiration dates and access levels.

Requires: Authentication

Returns:
    {
        "success": true,
        "data": {
            "campaigns": [
                {
                    "id": "uuid",
                    "campaign_name": "New Year 2026 Gift",
                    "access_level": "all_access",
                    "expires_at": "2026-02-01T00:00:00Z",
                    "days_remaining": 25
                }
            ]
        }
    }

**Success Response (200):** Successful Response

---

### `POST /v1/campaigns/redeem`

**Summary:** Redeem Gift Code

Redeem a gift code to gain campaign access

This endpoint allows authenticated users to redeem promotional gift codes
for time-limited access to premium features.

Example codes:
- NY2026-XXXXX: New Year 2026 30-day all-access pass

Requires: Authentication

Returns:
    {
        "success": true,
        "data": {
            "redemption_id": "uuid",
            "campaign_name": "New Year 2026 Gift",
            "access_level": "all_access",
            "expires_at": "2026-02-01T00:00:00Z",
            "duration_days": 30,
            "message": "Gift code redeemed successfully!"
        }
    }

Raises:
    401: Not authenticated
    404: Gift code not found
    400: Code invalid/expired or already redeemed

**Request Body:** JSON

**Success Response (200):** Successful Response

---

## 🎪 PAI Palooza - Organizers


### `POST /v1/paipalooza/organizers`

**Summary:** Create organizer

Create a new PAI Palooza event organizer.

    **Requirements:**
    - Authenticated user
    - Valid organization details
    - Email address for Stripe Connect

    **Process:**
    1. Creates Stripe Connect Express account
    2. Stores organizer in ZeroDB `pai_organizers` table
    3. Sets default revenue share to 60%
    4. Status starts as 'pending' (requires verification)

    **Response:**
    - Organizer ID
    - Stripe Connect account ID
    - Organization details
    - Revenue share percentage (default 60%)

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/paipalooza/organizers/{organizer_id}`

**Summary:** Get organizer details

Retrieve organizer details by ID.

    **Authorization:**
    - User must own the organizer account OR
    - User must be admin

    **Response:**
    - Complete organizer profile
    - Stripe Connect account ID
    - Revenue share percentage
    - Verification status
    - Total revenue earned and payouts

**Parameters:**

- `organizer_id` (path) *(required)*: No description

**Success Response (200):** Successful Response

---

### `PATCH /v1/paipalooza/organizers/{organizer_id}`

**Summary:** Update organizer

Update organizer information.

    **Authorization:**
    - User must own the organizer account

    **Updatable Fields:**
    - organization_name
    - contact_email
    - contact_phone

    **Note:** Revenue share percentage can only be changed by admin

**Parameters:**

- `organizer_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Successful Response

---

### `GET /v1/paipalooza/organizers/{organizer_id}/revenue`

**Summary:** Get organizer revenue tracking

Retrieve revenue metrics and payout status for organizer.

    **Authorization:**
    - User must own the organizer account OR
    - User must be admin

    **Query Parameters:**
    - days: Time range to analyze (7, 30, or 90 days) [default: 7]

    **Revenue Calculation:**
    - Aggregates ad impressions from `ad_impressions` table
    - Calculates organizer share (60% by default)
    - Tracks pending balance (earned - paid out)
    - Determines payout eligibility ($100 threshold)

    **Response:**
    - Total revenue earned (all time)
    - Total payouts (all time)
    - Pending balance
    - Payout eligibility status
    - Revenue breakdown by event
    - Period-specific metrics (impressions, revenue)

**Parameters:**

- `organizer_id` (path) *(required)*: No description
- `days` (query): Number of days to look back

**Success Response (200):** Successful Response

---

## 🎯 PAI Palooza - Campaigns


### `POST /v1/paipalooza/ad-campaigns/`

**Summary:** Create ad campaign

Create a new ad campaign for a sponsor.

    **Requirements:**
    - All creatives must be approved
    - Sponsor must have sufficient ad credits
    - Start date must be in the future
    - End date must be after start date

    **Campaign Status:**
    - New campaigns start in `draft` status
    - Use `/campaigns/{campaign_id}/activate` to start serving ads

    **Budget:**
    - Budget is specified in credits (1 credit = $1)
    - Credits are reserved but not deducted until ads are served
    - Remaining credits shown in response

    **Targeting:**
    - Optional targeting by event type, topics, and locations
    - Null targeting = target all events

**Request Body:** JSON

**Success Response (201):** Campaign created successfully

---

### `GET /v1/paipalooza/ad-campaigns/`

**Summary:** List campaigns with advanced filtering

List campaigns with comprehensive filtering, sorting, and pagination.

    **Filters:**
    - `sponsor_id` (required): Filter by sponsor
    - `status`: Filter by campaign status (draft, active, paused, completed, cancelled)
    - `creative_id`: Filter campaigns using specific creative
    - `event_type`: Filter campaigns targeting specific event type
    - `start_date_from`: Filter campaigns starting on or after date
    - `start_date_to`: Filter campaigns starting on or before date
    - `search`: Search in campaign name

    **Sorting:**
    - `sort_by`: Sort field (created_at, start_date, budget_credits, name)
    - `sort_order`: Sort order (asc, desc)

    **Pagination:**
    - `offset`: Number of campaigns to skip (default: 0)
    - `limit`: Max campaigns to return (default: 20, max: 100)

**Parameters:**

- `sponsor_id` (query) *(required)*: No description
- `status` (query): No description
- `creative_id` (query): No description
- `event_type` (query): No description
- `start_date_from` (query): No description
- `start_date_to` (query): No description
- `search` (query): No description
- `sort_by` (query): No description
- `sort_order` (query): No description
- `offset` (query): No description
- `limit` (query): No description

**Success Response (200):** Campaigns list with pagination and filters

---

### `GET /v1/paipalooza/ad-campaigns/creative/{creative_id}/performance`

**Summary:** Get creative performance metrics

Get detailed performance analytics for a specific creative.

    **Metrics Included:**
    - Impressions, unique impressions, clicks, completions
    - CTR (click-through rate), completion rate
    - Total spend, average CPM, average CPC

    **Time Range Filters:**
    - `24h`: Last 24 hours
    - `7d`: Last 7 days (default)
    - `30d`: Last 30 days
    - `custom`: Custom date range (requires start_date and end_date)

    **Breakdowns:**
    - `include_daily`: Daily time series metrics (default: true)
    - `include_by_campaign`: Performance by campaign (default: true)

    **Use Cases:**
    - Analyze individual creative effectiveness
    - Track creative performance over time
    - Compare performance across campaigns

**Parameters:**

- `creative_id` (path) *(required)*: No description
- `time_range` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description
- `campaign_id` (query): No description
- `include_daily` (query): No description
- `include_by_campaign` (query): No description

**Success Response (200):** Creative performance metrics

---

### `GET /v1/paipalooza/ad-campaigns/creatives/compare`

**Summary:** Compare creatives side-by-side

Compare multiple creatives side-by-side to identify best performers.

    **Features:**
    - Compare up to 10 creatives at once
    - Ranked by CTR (best performer first)
    - Identifies best-performing creative

    **Metrics per Creative:**
    - Impressions, clicks, completions
    - CTR, completion rate
    - Spend
    - Rank (1 = best)

    **Use Cases:**
    - A/B testing analysis
    - Identify top-performing creatives
    - Optimize creative selection for campaigns

**Parameters:**

- `creative_ids` (query) *(required)*: List of creative IDs to compare (max 10)
- `time_range` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description

**Success Response (200):** Creative comparison with rankings

---

### `GET /v1/paipalooza/ad-campaigns/event/{event_id}/performance`

**Summary:** Get event performance metrics

Get detailed performance analytics for a specific event (organizer view).

    **Metrics Included:**
    - Impressions, unique impressions, clicks, completions
    - CTR (click-through rate), completion rate
    - Total revenue, average RPM (revenue per 1000 impressions)
    - Fill rate (filled slots / total slots)

    **Time Range Filters:**
    - `24h`: Last 24 hours
    - `7d`: Last 7 days (default)
    - `30d`: Last 30 days
    - `custom`: Custom date range (requires start_date and end_date)

    **Breakdowns:**
    - `include_daily`: Daily revenue time series (default: true)
    - `include_sponsors`: Top sponsors by spend (default: true)

    **Use Cases:**
    - View ad revenue for event
    - Track fill rate and revenue trends
    - Identify top sponsors

**Parameters:**

- `event_id` (path) *(required)*: No description
- `time_range` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description
- `include_daily` (query): No description
- `include_sponsors` (query): No description

**Success Response (200):** Event performance metrics

---

### `GET /v1/paipalooza/ad-campaigns/events/compare`

**Summary:** Compare events side-by-side

Compare multiple events side-by-side to identify best performers.

    **Features:**
    - Compare up to 10 events at once
    - Ranked by revenue (highest first)
    - Identifies top-performing event

    **Metrics per Event:**
    - Impressions, clicks
    - Revenue, fill rate
    - CTR
    - Rank (1 = highest revenue)

    **Use Cases:**
    - Compare event performance
    - Identify most profitable events
    - Optimize event monetization

**Parameters:**

- `event_ids` (query) *(required)*: List of event IDs to compare (max 10)
- `time_range` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description

**Success Response (200):** Event comparison with rankings

---

### `GET /v1/paipalooza/ad-campaigns/{campaign_id}`

**Summary:** Get campaign by ID

Retrieve campaign details by campaign ID

**Parameters:**

- `campaign_id` (path) *(required)*: No description

**Success Response (200):** Campaign found

---

### `PATCH /v1/paipalooza/ad-campaigns/{campaign_id}`

**Summary:** Update campaign

Update campaign details.

    **Restrictions:**
    - Only draft or paused campaigns can be updated
    - Cannot change start date (only extend end date)
    - Active or completed campaigns cannot be modified

    **Updatable fields:**
    - name
    - creative_ids (must be approved)
    - budget_credits (can increase budget)
    - end_date (can extend, not shorten)
    - targeting

**Parameters:**

- `campaign_id` (path) *(required)*: No description

**Request Body:** JSON

**Success Response (200):** Campaign updated successfully

---

### `POST /v1/paipalooza/ad-campaigns/{campaign_id}/activate`

**Summary:** Activate campaign

Activate a draft campaign to start serving ads.

    **Requirements:**
    - Campaign must be in `draft` status
    - Start date must be valid
    - All creatives must still be approved

    **Effect:**
    - Changes status from `draft` to `active`
    - Campaign will start serving ads based on targeting
    - Credits will be deducted as impressions are served

**Parameters:**

- `campaign_id` (path) *(required)*: No description

**Success Response (200):** Campaign activated successfully

---

### `POST /v1/paipalooza/ad-campaigns/{campaign_id}/pause`

**Summary:** Pause campaign

Pause an active campaign to stop serving ads.

    **Requirements:**
    - Campaign must be in `active` status
    - Must be campaign owner (sponsor authorization)

    **Effect:**
    - Changes status from `active` to `paused`
    - Stops serving new ad impressions immediately
    - Budget remains reserved
    - Sets paused_at timestamp
    - Publishes campaign.paused event
    - Can be resumed later

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `sponsor_id` (query) *(required)*: No description

**Success Response (200):** Campaign paused successfully

---

### `GET /v1/paipalooza/ad-campaigns/{campaign_id}/performance`

**Summary:** Get campaign performance metrics

Get comprehensive campaign performance dashboard.

    **Metrics Included:**
    - Impressions, clicks, completions
    - CTR (click-through rate), completion rate
    - Total spend, average CPM, average CPC

    **Time Range Filters:**
    - `24h`: Last 24 hours
    - `7d`: Last 7 days (default)
    - `30d`: Last 30 days
    - `custom`: Custom date range (requires start_date and end_date)

    **Breakdowns:**
    - `include_creatives`: Performance by creative (default: true)
    - `include_events`: Performance by event (default: true)

    **Use Cases:**
    - Monitor campaign ROI
    - Identify top-performing creatives
    - Optimize budget allocation by event

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `time_range` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description
- `include_creatives` (query): No description
- `include_events` (query): No description

**Success Response (200):** Campaign performance metrics

---

### `GET /v1/paipalooza/ad-campaigns/{campaign_id}/performance/export`

**Summary:** Export campaign performance as CSV

Export campaign performance metrics as a CSV file.

    **CSV Content:**
    - Campaign summary row
    - Creative-level breakdown (if include_creatives=true)
    - Event-level breakdown (if include_events=true)

    **Columns:**
    - type, id, name, impressions, clicks, completions,
      ctr, completion_rate, spend

    **Use Cases:**
    - Download for offline analysis
    - Import into spreadsheet tools
    - Create custom reports

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `time_range` (query): No description
- `start_date` (query): No description
- `end_date` (query): No description
- `include_creatives` (query): No description
- `include_events` (query): No description

**Success Response (200):** CSV export with filename and content

---

### `GET /v1/paipalooza/ad-campaigns/{campaign_id}/preview-targeting`

**Summary:** Preview targeting matches

Preview which events match the campaign's targeting criteria.

    **Returns:**
    - List of events that match targeting criteria
    - Total count of matching events
    - Semantic similarity scores (when topics are specified)

    **Use Cases:**
    - Verify targeting configuration before activating campaign
    - Estimate campaign reach
    - Fine-tune targeting criteria

    **Targeting Logic:**
    - Event types: Exact match
    - Locations: Case-insensitive exact match
    - Topics: Semantic similarity >= 0.7 (via ZeroDB vectors)
    - Attendees: Min/max threshold filters

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `limit` (query): No description

**Success Response (200):** Preview results with matching events

---

### `POST /v1/paipalooza/ad-campaigns/{campaign_id}/resume`

**Summary:** Resume paused campaign

Resume a paused campaign to restart serving ads.

    **Requirements:**
    - Campaign must be in `paused` status
    - Must be campaign owner (sponsor authorization)
    - Sponsor must have sufficient credits for daily budget

    **Effect:**
    - Changes status from `paused` to `active`
    - Resumes serving ad impressions immediately
    - Sets resumed_at timestamp
    - Publishes campaign.resumed event
    - Validates budget before resuming

**Parameters:**

- `campaign_id` (path) *(required)*: No description
- `sponsor_id` (query) *(required)*: No description

**Success Response (200):** Campaign resumed successfully

---

## 📊 PAI Palooza - Tracking


### `POST /v1/paipalooza/tracking/click`

**Summary:** Track ad click

Track when a user clicks on an ad.

    **Public endpoint** - No authentication required (for tracking pixels).

    **Rate Limited:** 1000 requests/minute per IP address.

    **Validation:**
    - Impression must exist (click must link to impression)
    - Campaign must exist and be ACTIVE
    - Creative must exist and be APPROVED
    - Duplicate clicks (same impression clicked twice) are rejected

    **Click Metrics:**
    - Calculates time_to_click (seconds between impression and click)
    - Awards credit bonus if click occurs < 30 seconds (engagement quality indicator)
    - Updates campaign CTR (Click-Through Rate)

    **Returns:**
    - 201 Created: Click tracked successfully (with redirect_url for 302 redirect)
    - 400 Bad Request: Campaign inactive, creative unapproved, or validation failed
    - 404 Not Found: Impression, campaign, or creative not found
    - 409 Conflict: Duplicate click detected (impression already clicked)
    - 429 Too Many Requests: Rate limit exceeded
    - 500 Internal Server Error: Tracking service unavailable

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `POST /v1/paipalooza/tracking/completion`

**Summary:** Track video ad completion

Track video ad completion milestones for engagement metrics.

    **Public endpoint** - No authentication required (for tracking pixels).

    **Rate Limited:** 1000 requests/minute per IP address.

    **Validation:**
    - Impression must exist (completion must link to impression)
    - Campaign must exist and be ACTIVE
    - Creative must exist and be APPROVED
    - Creative must be VIDEO type (completions only for video ads)
    - Duplicate milestones (same impression + milestone) are rejected

    **Engagement Scoring:**
    - 0% (started): 0.0
    - 25%: 0.25
    - 50%: 0.5
    - 75%: 0.75
    - 100%: 1.0

    **Credit Bonus:**
    - Only 100% completion receives $0.01 credit bonus

    **Metrics Updated:**
    - completions_count: Incremented by 1
    - completion_rate: completions_count / impressions_count
    - engagement_score: Weighted average of all completion scores

    **Returns:**
    - 201 Created: Completion tracked successfully
    - 400 Bad Request: Campaign inactive, creative unapproved, or not video type
    - 404 Not Found: Impression, campaign, or creative not found
    - 409 Conflict: Duplicate milestone detected
    - 429 Too Many Requests: Rate limit exceeded
    - 500 Internal Server Error: Tracking service unavailable

**Request Body:** JSON

**Success Response (201):** Successful Response

---

### `GET /v1/paipalooza/tracking/health`

**Summary:** Tracking service health check

Check if tracking service is available and operational

**Success Response (200):** Successful Response

---

### `POST /v1/paipalooza/tracking/impression`

**Summary:** Track ad impression

Track when an ad is displayed to a user.

    **Public endpoint** - No authentication required (for tracking pixels).

    **Rate Limited:** 1000 requests/minute per IP address.

    **Validation:**
    - Campaign must exist and be ACTIVE
    - Creative must exist and be APPROVED
    - Creative must be assigned to campaign
    - Event must exist
    - Duplicate impressions (same user + campaign within 24h) are rejected

    **Billing:**
    - Credits are deducted from campaign budget based on placement type
    - Header: $0.02, Sidebar: $0.01, Content: $0.015, Video: $0.03, Footer: $0.005

    **Fraud Prevention:**
    - Authenticated users cannot see same ad twice within 24 hours
    - Anonymous users are not deduplicated (rely on client-side controls)
    - IP addresses logged for fraud detection

    **Returns:**
    - 201 Created: Impression tracked successfully
    - 400 Bad Request: Campaign inactive, creative unapproved, or validation failed
    - 404 Not Found: Campaign, creative, or event not found
    - 409 Conflict: Duplicate impression detected
    - 429 Too Many Requests: Rate limit exceeded
    - 500 Internal Server Error: Tracking service unavailable

**Request Body:** JSON

**Success Response (201):** Successful Response

---

---
*Auto-generated from OpenAPI specification*
*For latest updates, run: `/api-catalog-sync`*
