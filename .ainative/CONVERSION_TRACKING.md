# Conversion Tracking System - AI Agent Context

**Last Updated**: 2025-12-27
**Status**: Production Ready
**Coverage**: 69/69 pages (100%)

---

## Overview

The AINative Studio conversion tracking system is a comprehensive server-side tracking solution that captures user behavior, campaign attribution, and conversion funnel progression across all marketing properties.

**Key Capabilities:**
- Server-side event tracking (not client-side only)
- UTM parameter capture and persistence
- Session-based user tracking
- Multi-stage conversion funnel
- Retargeting pixel integration (Meta, Google Ads, LinkedIn)
- Device and browser detection
- CORS-compliant API with Kong Gateway support

---

## Architecture Snapshot

### High-Level Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                  │
├──────────────────────────────────────────────────────────────────────┤
│  1. Page Load → usePageViewTracking() hook executes                 │
│  2. ConversionTrackingService singleton initialized                  │
│  3. UTM params captured from URL → sessionStorage                   │
│  4. Session ID generated → sessionStorage                            │
│  5. Device/browser detected from user agent                          │
│  6. POST /v1/events/track via apiClient                              │
│     - withCredentials: true (for auth users)                         │
│     - Authorization header if token exists                           │
│     - CORS preflight (OPTIONS) → handled by backend                  │
│  7. Retargeting pixels fire (fbq, gtag, lintrk)                     │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                              │
│  - Serves static frontend (React SPA)                                │
│  - No server-side rendering (yet - SSG planned)                      │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│                     KONG API GATEWAY (Railway)                        │
│  - Receives: OPTIONS /v1/events/track (CORS preflight)               │
│  - Returns: 200 OK with CORS headers                                 │
│  - Receives: POST /v1/events/track (actual event)                    │
│  - Forwards to FastAPI backend                                       │
│  - Rate limiting applied                                              │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Railway)                          │
│  /v1/events/track endpoint:                                           │
│  1. Validates ConversionEventRequest schema                          │
│  2. Classifies traffic source (paid/organic/direct/referral)        │
│  3. Gets client IP from X-Forwarded-For                              │
│  4. Inserts into conversion_events table (PostgreSQL)                │
│     - Uses json.dumps() for JSONB fields                             │
│     - Uses CAST(:param AS jsonb) for SQL                             │
│  5. Updates conversion_funnel table if funnel stage                  │
│  6. Returns event_id                                                  │
└──────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL (Railway)                               │
│  Tables:                                                              │
│  - conversion_events (main tracking table)                           │
│  - conversion_funnel (funnel stage tracking)                         │
│                                                                       │
│  Indexes:                                                             │
│  - session_id, user_id, event_type, created_at                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

### Core Files

**Service Layer:**
- `/AINative-website/src/services/ConversionTrackingService.ts` (510 lines)
  - Singleton pattern
  - Session management
  - UTM capture and persistence
  - Device detection
  - Pixel event firing

**React Hooks:**
- `/AINative-website/src/hooks/useConversionTracking.ts` (74 lines)
  - `useConversionTracking()` - Returns tracking functions
  - `usePageViewTracking()` - Auto-tracks page views on mount

**API Client:**
- `/AINative-website/src/utils/apiClient.ts`
  - Axios instance with `withCredentials: true`
  - Automatic Authorization header injection
  - CORS configuration
  - Token refresh on 401

### Integration Pattern

**Standard Page Integration:**
```typescript
import { usePageViewTracking } from '@/hooks/useConversionTracking';

export default function MyPage() {
  // Conversion tracking - add at top of component
  usePageViewTracking();

  // Rest of component...
  return <div>...</div>;
}
```

**Form Tracking:**
```typescript
import { useConversionTracking } from '@/hooks/useConversionTracking';

export default function SignupForm() {
  const { trackFormSubmit } = useConversionTracking();

  const handleSubmit = async (data) => {
    await trackFormSubmit('signup_form', {
      email: data.email,
      source: 'homepage'
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Checkout Tracking:**
```typescript
const { trackCheckoutStart, trackPurchase } = useConversionTracking();

// When user clicks "Subscribe"
await trackCheckoutStart(29.99, stripeSessionId);

// After successful payment
await trackPurchase(29.99, stripeSessionId, userId);
```

### Pages with Tracking (69/69 = 100%)

**Marketing Pages:**
- HomePage, PricingPage, ContactPage, AboutPage
- PrivacyPage, TermsPage, SupportPage
- IntegrationsPage, FAQPage

**Product Pages:**
- AIKitPage, QNNPage, ZeroDBPage, DownloadPage
- AgentSwarmPage, LoadTestingPage, MCPHostingPage
- DeveloperToolsPage, ProductsPageEnhanced
- QNNDashboardPage, QNNSignaturesPage

**Dashboard Pages (12):**
- DashboardPage, DashboardLandingPage, BillingPage
- AccountPage, SettingsPage, ProfilePage
- NotificationsPage, InvoicesPage, InvoiceDetailPage
- PlanManagementPage, CreditHistoryPage, CreditRefillsPage
- AutomaticRefillsPage, CreateInvoicePage

**Developer Pages (3):**
- APIReferencePage, APISandboxPage, DeveloperSettingsPage

**Community Pages (18):**
- CommunityHome, CommunityHubPage, CommunityVideosPage
- BlogListing, BlogDetail, TutorialListing, TutorialDetail
- TutorialDetailPage, TutorialWatchPage
- ShowcaseListing, ShowcaseDetail
- EventsCalendar, WebinarsPage, WebinarDetailPage
- ResourcesPage, DevResourcesPage, SearchPage, VideoWatchPage

**Auth Pages:**
- LoginPage, SignupPage, ForgotPasswordPage, OAuthCallbackPage

**Demo/Example Pages:**
- DesignSystemShowcase, CompletionStatisticsDemo
- CompletionTimeSummaryDemo, StageIndicatorDemo
- ExamplesGalleryPage, GettingStartedGuidePage

---

## Backend Implementation

### API Endpoints

**File:** `/src/backend/app/api/v1/endpoints/conversion_tracking.py` (450+ lines)

**Endpoints:**

1. **POST /v1/events/track** - Main conversion tracking endpoint
   - **Public** (no auth required)
   - Accepts: ConversionEventRequest
   - Returns: event_id
   - Side effects: Updates conversion_funnel if applicable

2. **OPTIONS /v1/events/track** - CORS preflight handler
   - **Critical for browser support**
   - Returns: `{"allow": "POST, OPTIONS"}`
   - Fixes Kong Gateway 405 errors

3. **POST /v1/events/funnel** - Explicit funnel stage update
   - **Public** (no auth required)
   - Accepts: FunnelStageRequest
   - Returns: success status

4. **OPTIONS /v1/events/funnel** - CORS preflight handler

### Request Schema

```python
class ConversionEventRequest(BaseModel):
    # Session tracking
    session_id: str
    user_id: Optional[str] = None

    # Event details
    event_type: str  # page_view, form_submit, signup, etc.
    event_name: str

    # UTM attribution
    utm_params: Optional[UTMParams] = None

    # Page context
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    referrer: Optional[str] = None

    # Form data (JSONB)
    form_data: Optional[Dict[str, Any]] = None

    # Conversion value
    conversion_value: Optional[float] = None
    currency: Optional[str] = "USD"

    # Analytics IDs
    ga_client_id: Optional[str] = None
    ga_session_id: Optional[str] = None

    # Stripe integration
    stripe_session_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None

    # Device info
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None

    # Retargeting pixels
    fb_pixel_id: Optional[str] = None
    fb_event_id: Optional[str] = None
    google_ads_click_id: Optional[str] = None
    linkedin_partner_id: Optional[str] = None

    # Custom metadata (JSONB)
    metadata: Optional[Dict[str, Any]] = None
```

### Database Schema

**Table: conversion_events**
```sql
CREATE TABLE conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    user_id UUID,
    session_id VARCHAR(255) NOT NULL,

    -- Event
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,

    -- Attribution
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    source_type VARCHAR(50),  -- paid, organic, direct, referral, social
    referrer TEXT,

    -- Page context
    page_url TEXT,
    page_title VARCHAR(500),
    form_data JSONB,  -- Must use json.dumps() and CAST(:param AS jsonb)

    -- Conversion value
    conversion_value DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Analytics
    ga_client_id VARCHAR(255),
    ga_session_id VARCHAR(255),
    converted BOOLEAN DEFAULT FALSE,

    -- Stripe
    stripe_session_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),

    -- Device
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),

    -- Retargeting
    fb_pixel_id VARCHAR(255),
    fb_event_id VARCHAR(255),
    google_ads_click_id VARCHAR(255),
    linkedin_partner_id VARCHAR(255),

    -- Metadata
    metadata JSONB,  -- Must use json.dumps() and CAST(:param AS jsonb)

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    INDEX idx_utm_campaign (utm_campaign)
);
```

**Table: conversion_funnel**
```sql
CREATE TABLE conversion_funnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID,

    -- Funnel stages (boolean flags)
    visited_homepage BOOLEAN DEFAULT FALSE,
    visited_pricing BOOLEAN DEFAULT FALSE,
    visited_docs BOOLEAN DEFAULT FALSE,
    started_signup BOOLEAN DEFAULT FALSE,
    completed_signup BOOLEAN DEFAULT FALSE,
    started_checkout BOOLEAN DEFAULT FALSE,
    completed_checkout BOOLEAN DEFAULT FALSE,
    subscription_created BOOLEAN DEFAULT FALSE,

    -- Attribution
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),

    -- Conversion
    converted BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    UNIQUE(session_id)
);
```

### Critical SQL Patterns

**❌ WRONG - Causes syntax errors with Kong/PostgreSQL:**
```python
# DO NOT USE str() for JSONB
"form_data": str(event.form_data)

# DO NOT USE :: shorthand with named parameters
f":form_data::jsonb"
```

**✅ CORRECT - Use json.dumps() and CAST():**
```python
import json

# Serialize dicts to JSON strings
"form_data": json.dumps(event.form_data) if event.form_data else None
"metadata": json.dumps(event.metadata) if event.metadata else None

# Use CAST() function in SQL
f"CAST(:form_data AS jsonb)"
f"CAST(:metadata AS jsonb)"
```

### Traffic Source Classification

```python
def classify_traffic_source(utm_params, referrer):
    """
    Classify traffic source into categories:
    - paid: Has UTM source/medium indicating paid campaign
    - organic: Search engine referrer with no paid params
    - direct: No referrer or UTM params
    - referral: External website referrer
    - social: Social media referrer
    """
    if utm_params:
        if any(term in (utm_params.utm_medium or "").lower()
               for term in ["cpc", "ppc", "paid", "ad"]):
            return "paid"
        if any(term in (utm_params.utm_source or "").lower()
               for term in ["google", "bing", "search"]):
            return "organic"

    if referrer:
        if any(domain in referrer.lower()
               for domain in ["google.com", "bing.com"]):
            return "organic"
        if any(domain in referrer.lower()
               for domain in ["facebook.com", "twitter.com", "linkedin.com"]):
            return "social"
        return "referral"

    return "direct"
```

---

## CORS Configuration

### The Kong Gateway Challenge

**Problem:** Kong API Gateway sits in front of FastAPI and intercepts all requests. When browsers use `withCredentials: true`, they send an OPTIONS preflight request first. Without explicit OPTIONS handlers, Kong returns `405 Method Not Allowed`, blocking all tracking.

**Solution:** Add explicit OPTIONS route handlers for CORS preflight.

### Backend CORS Setup

**FastAPI Middleware (main.py):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5177",  # Local dev
        "https://www.ainative.studio",  # Production
        "https://ainative.studio",
        # ... other origins
    ],
    allow_credentials=True,  # Matches withCredentials: true
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Content-Type",
        "Authorization",
        "Origin",
        "X-Requested-With",
    ]
)
```

**Explicit OPTIONS Handlers:**
```python
@router.options("/track")
async def track_options():
    """
    Handle CORS preflight for conversion tracking endpoint

    This is CRITICAL when Kong Gateway is in front of FastAPI.
    Without this, browsers get 405 errors on preflight.
    """
    return {"allow": "POST, OPTIONS"}
```

### Frontend CORS Setup

**API Client Configuration:**
```typescript
const apiClient = axios.create({
  baseURL: 'https://api.ainative.studio',
  timeout: 15000,
  withCredentials: true,  // Triggers CORS preflight
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
```

### Testing CORS

```bash
# Test OPTIONS preflight
curl -X OPTIONS https://api.ainative.studio/v1/events/track -i

# Should return:
# HTTP/2 200
# access-control-allow-credentials: true
# access-control-allow-origin: https://www.ainative.studio

# Test actual POST request
curl -X POST https://api.ainative.studio/v1/events/track \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.ainative.studio" \
  -d '{"session_id":"test","event_type":"page_view","event_name":"Test"}'

# Should return:
# {"success":true,"event_id":"...","message":"Event tracked successfully"}
```

---

## Session Management

### Session ID Generation

**Location:** `ConversionTrackingService.ts`

```typescript
private getOrCreateSessionId(): string {
  const storageKey = 'ainative_session_id';
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}
```

**Format:** `session_1703721234567_abc123def456`

**Lifetime:** Browser session (cleared on tab close)

**Purpose:**
- Anonymously track users before login
- Link events within same session
- Calculate session-based metrics
- Join with conversion_funnel table

### UTM Parameter Persistence

```typescript
private captureUTMParams(): UTMParams | null {
  const storageKey = 'ainative_utm_params';

  // Try to get from sessionStorage first
  const stored = sessionStorage.getItem(storageKey);
  if (stored) {
    return JSON.parse(stored);
  }

  // Capture from current URL
  const params = new URLSearchParams(window.location.search);
  const utmParams: UTMParams = {};

  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    .forEach(key => {
      const value = params.get(key);
      if (value) utmParams[key] = value;
    });

  // Persist for entire session
  if (Object.keys(utmParams).length > 0) {
    sessionStorage.setItem(storageKey, JSON.stringify(utmParams));
    return utmParams;
  }

  return null;
}
```

**Example UTM Flow:**
1. User clicks Google Ad: `?utm_source=google&utm_medium=cpc&utm_campaign=q4_2024`
2. UTM params captured on first page load
3. Stored in sessionStorage
4. Sent with EVERY event in that session
5. User navigates to `/pricing` - same UTM params applied
6. User signs up - UTM attribution preserved

---

## Retargeting Pixel Integration

### Supported Platforms

1. **Meta Pixel (Facebook Ads)**
2. **Google Analytics 4 / Google Ads**
3. **LinkedIn Insight Tag**

### How Pixels Fire

**Service Method:**
```typescript
private firePixelEvents(
  event_type: string,
  event_name: string,
  conversion_value?: number
) {
  // Meta Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    switch (event_type) {
      case 'page_view':
        window.fbq('track', 'PageView');
        break;
      case 'form_submit':
        window.fbq('track', 'Lead');
        break;
      case 'signup':
        window.fbq('track', 'CompleteRegistration');
        break;
      case 'checkout_start':
        window.fbq('track', 'InitiateCheckout', {
          value: conversion_value,
          currency: 'USD'
        });
        break;
      case 'subscription_created':
        window.fbq('track', 'Purchase', {
          value: conversion_value,
          currency: 'USD'
        });
        break;
    }
  }

  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    switch (event_type) {
      case 'page_view':
        window.gtag('event', 'page_view', {
          page_path: window.location.pathname
        });
        break;
      case 'signup':
        window.gtag('event', 'sign_up', { method: 'email' });
        break;
      case 'subscription_created':
        window.gtag('event', 'purchase', {
          transaction_id: this.sessionId,
          value: conversion_value,
          currency: 'USD'
        });
        break;
    }
  }

  // LinkedIn Insight Tag
  if (typeof window !== 'undefined' && window.lintrk) {
    switch (event_type) {
      case 'signup':
        window.lintrk('track', { conversion_id: 'signup' });
        break;
      case 'subscription_created':
        window.lintrk('track', { conversion_id: 'purchase' });
        break;
    }
  }
}
```

### Pixel Initialization

**Location:** `index.html` or tracking service

```html
<!-- Meta Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
</script>

<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- LinkedIn Insight Tag -->
<script>
_linkedin_partner_id = "YOUR_PARTNER_ID";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script async src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>
```

---

## Conversion Funnel Stages

### Standard Funnel

```
visited_homepage (page_view on /)
    ↓
visited_pricing (page_view on /pricing)
    ↓
visited_docs (page_view on /documentation)
    ↓
started_signup (form_submit on /signup)
    ↓
completed_signup (signup event)
    ↓
started_checkout (checkout_start event)
    ↓
completed_checkout (checkout_complete event)
    ↓
subscription_created (subscription_created event)
```

### Funnel Update Logic

```python
async def update_conversion_funnel(
    session_id: str,
    event_type: str,
    user_id: Optional[str] = None,
    utm_params: Optional[UTMParams] = None,
    conversion_value: Optional[float] = None,
    db: Session = None
):
    """
    Update conversion funnel stage for a session

    Creates funnel record if doesn't exist, updates stage flags
    """
    # Map event types to funnel stages
    stage_mapping = {
        "visited_homepage": "visited_homepage",
        "visited_pricing": "visited_pricing",
        "visited_docs": "visited_docs",
        "started_signup": "started_signup",
        "completed_signup": "completed_signup",
        "started_checkout": "started_checkout",
        "completed_checkout": "completed_checkout",
        "subscription_created": "subscription_created"
    }

    stage_column = stage_mapping.get(event_type)
    if not stage_column:
        return  # Not a funnel event

    # Upsert funnel record
    query = text(f"""
        INSERT INTO conversion_funnel (
            session_id, user_id, {stage_column},
            utm_source, utm_medium, utm_campaign,
            converted, conversion_value, created_at, updated_at
        ) VALUES (
            :session_id, :user_id, TRUE,
            :utm_source, :utm_medium, :utm_campaign,
            :converted, :conversion_value, NOW(), NOW()
        )
        ON CONFLICT (session_id) DO UPDATE SET
            {stage_column} = TRUE,
            user_id = COALESCE(conversion_funnel.user_id, :user_id),
            converted = :converted,
            conversion_value = :conversion_value,
            updated_at = NOW()
    """)

    db.execute(query, {
        "session_id": session_id,
        "user_id": user_id,
        "utm_source": utm_params.utm_source if utm_params else None,
        "utm_medium": utm_params.utm_medium if utm_params else None,
        "utm_campaign": utm_params.utm_campaign if utm_params else None,
        "converted": stage_column == "subscription_created",
        "conversion_value": conversion_value
    })

    db.commit()
```

---

## Common Issues & Solutions

### Issue 1: Kong Gateway 405 on OPTIONS

**Symptom:**
```bash
$ curl -X OPTIONS https://api.ainative.studio/v1/events/track
HTTP/2 405 Method Not Allowed
```

**Root Cause:** Kong intercepts OPTIONS requests before FastAPI sees them. Without explicit OPTIONS handler, Kong rejects with 405.

**Solution:** Add explicit OPTIONS route handlers
```python
@router.options("/track")
async def track_options():
    return {"allow": "POST, OPTIONS"}
```

**Commits:** 94e922b2

### Issue 2: PostgreSQL JSONB Syntax Error

**Symptom:**
```
psycopg2.errors.SyntaxError: syntax error at or near ":"
LINE 16: 'https://test.com', 'Test', :form_data::...
```

**Root Cause:** Using `::jsonb` PostgreSQL shorthand with SQLAlchemy named parameters causes syntax errors.

**Wrong:**
```python
"form_data": str(event.form_data)  # ❌ Creates invalid JSON
f":form_data::jsonb"  # ❌ Syntax error with named params
```

**Correct:**
```python
import json
"form_data": json.dumps(event.form_data)  # ✅ Valid JSON string
f"CAST(:form_data AS jsonb)"  # ✅ Works with named params
```

**Commits:** f12aa302, cd654436

### Issue 3: Tracking Not Firing in Browser

**Symptom:** Events work via curl but not in browser DevTools.

**Debugging Steps:**
1. Open browser DevTools → Console
2. Look for: `🚀 AINative API Client configured with base URL: https://api.ainative.studio`
3. Check Network tab → Filter XHR/Fetch
4. Look for `/v1/events/track` requests
5. Check Status (should be 200, not 405 or CORS error)
6. Check Response for `event_id`

**Common Causes:**
- CORS preflight failing (fixed by OPTIONS handlers)
- Authorization header causing 401 (tracking endpoint is public, should work without auth)
- `withCredentials: true` without proper CORS headers
- AdBlockers blocking tracking requests (users need to whitelist)

---

## Analytics & Reporting

### Key Metrics

**Acquisition:**
- Traffic source breakdown (paid/organic/direct/referral/social)
- UTM campaign performance
- Landing page performance

**Engagement:**
- Pages per session
- Time on site (calculated from event timestamps)
- Bounce rate (single-page sessions)

**Conversion:**
- Funnel conversion rates (stage-to-stage)
- Overall conversion rate (homepage → subscription)
- Average order value
- Revenue by campaign/source

### Example Queries

**Conversion Rate by Campaign:**
```sql
SELECT
    utm_campaign,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(DISTINCT CASE WHEN converted THEN session_id END) as conversions,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN converted THEN session_id END) /
        NULLIF(COUNT(DISTINCT session_id), 0),
        2
    ) as conversion_rate,
    SUM(conversion_value) as total_revenue
FROM conversion_funnel
WHERE utm_campaign IS NOT NULL
GROUP BY utm_campaign
ORDER BY total_revenue DESC;
```

**Funnel Drop-off Analysis:**
```sql
SELECT
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN visited_homepage THEN 1 END) as homepage,
    COUNT(CASE WHEN visited_pricing THEN 1 END) as pricing,
    COUNT(CASE WHEN started_signup THEN 1 END) as signup_start,
    COUNT(CASE WHEN completed_signup THEN 1 END) as signup_complete,
    COUNT(CASE WHEN started_checkout THEN 1 END) as checkout_start,
    COUNT(CASE WHEN subscription_created THEN 1 END) as subscribed,

    -- Drop-off percentages
    ROUND(100.0 * COUNT(CASE WHEN visited_pricing THEN 1 END) / COUNT(*), 1) as homepage_to_pricing_pct,
    ROUND(100.0 * COUNT(CASE WHEN started_signup THEN 1 END) / NULLIF(COUNT(CASE WHEN visited_pricing THEN 1 END), 0), 1) as pricing_to_signup_pct,
    ROUND(100.0 * COUNT(CASE WHEN subscription_created THEN 1 END) / NULLIF(COUNT(CASE WHEN started_signup THEN 1 END), 0), 1) as signup_to_subscription_pct
FROM conversion_funnel
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

## Testing & Verification

### Local Testing

```bash
# 1. Start frontend
cd /Users/aideveloper/core/AINative-website
npm run dev

# 2. Open browser
open http://localhost:5177

# 3. Open DevTools → Console
# Should see: "🚀 AINative API Client configured..."

# 4. Navigate to a page
# Should see: "API Request: POST /v1/events/track"
# Should see: "API Response Success: POST /v1/events/track"

# 5. Check Network tab
# Find: /v1/events/track
# Status: 200 OK
# Response: {"success":true,"event_id":"..."}
```

### Production Testing

```bash
# Test OPTIONS preflight
curl -X OPTIONS https://api.ainative.studio/v1/events/track -i
# Expected: HTTP/2 200

# Test POST event tracking
curl -X POST https://api.ainative.studio/v1/events/track \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-session","event_type":"page_view","event_name":"Test Event"}' \
  | jq

# Expected:
# {
#   "success": true,
#   "event_id": "uuid-here",
#   "message": "Event 'Test Event' tracked successfully"
# }
```

### Database Verification

```sql
-- Check recent events
SELECT
    event_name,
    event_type,
    session_id,
    utm_source,
    utm_campaign,
    created_at
FROM conversion_events
ORDER BY created_at DESC
LIMIT 10;

-- Check funnel progression
SELECT
    session_id,
    visited_homepage,
    visited_pricing,
    started_signup,
    completed_signup,
    subscription_created,
    utm_campaign,
    conversion_value
FROM conversion_funnel
ORDER BY created_at DESC
LIMIT 10;
```

---

## Deployment Workflow

### Frontend Deployment (Vercel)

```bash
# 1. Make changes to tracking code
cd /Users/aideveloper/core/AINative-website

# 2. Test locally
npm run dev

# 3. Build for production
npm run build

# 4. Commit changes
git add .
git commit -m "Update conversion tracking

- Description of changes

Refs #164"

# 5. Push to main (auto-deploys to Vercel)
git push origin main

# 6. Wait 2-3 minutes for Vercel build
# Check: https://vercel.com/dashboard

# 7. Verify on production
open https://www.ainative.studio
# Check DevTools console and network tab
```

### Backend Deployment (Railway)

```bash
# 1. Make changes to API
cd /Users/aideveloper/core

# 2. Run tests (MANDATORY)
cd src/backend
pytest tests/test_conversion_tracking.py -v

# 3. Commit changes
git add src/backend/app/api/v1/endpoints/conversion_tracking.py
git commit -m "Fix conversion tracking CORS

- Add OPTIONS handlers for /track and /funnel
- Fixes Kong Gateway 405 errors

Refs #390"

# 4. Push to main (auto-deploys to Railway)
git push origin main

# 5. Wait 8-10 minutes for Railway build
# Monitor: https://railway.app/project/core

# 6. Verify API is live
curl -X OPTIONS https://api.ainative.studio/v1/events/track -i
# Should return: HTTP/2 200
```

---

## Related GitHub Issues

### Completed Issues

**Frontend:**
- Issue #164: [FEATURE] Add conversion tracking to all website pages
  - Status: Closed
  - Commits: 39f7512, 726f574, e4c889d, 0281d12, 8da6520, 9e278ee, a52e008, edb419f, 4bf73d0

**Backend:**
- Issue #390: [FEATURE] Conversion tracking API endpoints
  - Status: Closed
  - Commits: c95cbd3a (initial), f12aa302 (JSONB fix), cd654436 (CAST fix), 94e922b2 (CORS fix)

### Related Work

- Issue #138: Email service (sends conversion notifications)
- Issue #142: Notification system (alerts on conversions)
- Issue #92: Invoice automation (integrates with checkout tracking)

---

## AI Agent Guidelines

### When Working on Conversion Tracking

1. **ALWAYS test changes locally before committing**
   - Frontend: `npm run dev` and check browser console
   - Backend: `pytest tests/test_conversion_tracking.py`

2. **NEVER break the tracking on production**
   - All 69 pages depend on this system
   - Breaking changes affect revenue attribution
   - Test CORS preflight with curl before deploying

3. **MAINTAIN backward compatibility**
   - Don't change ConversionEventRequest schema without migration
   - Don't remove event types (add new ones instead)
   - Don't change session ID format

4. **DOCUMENT all changes**
   - Update this file if adding new features
   - Update frontend implementation guide
   - Add inline comments for complex logic

5. **FOLLOW the established patterns**
   - Use `usePageViewTracking()` for simple page tracking
   - Use `useConversionTracking()` for custom events
   - Always pass full context (UTM, device, etc.)

### Common Tasks

**Add tracking to a new page:**
```typescript
import { usePageViewTracking } from '@/hooks/useConversionTracking';

export default function NewPage() {
  usePageViewTracking();
  // ... rest of component
}
```

**Add a new event type:**
1. Add to ConversionEventRequest schema (backend)
2. Add to ConversionTrackingService methods (frontend)
3. Add to pixel event mapping if needed
4. Update funnel stages if applicable
5. Test end-to-end

**Debug tracking issues:**
1. Check browser console for errors
2. Check Network tab for /v1/events/track status
3. Check backend logs: `railway logs`
4. Query database: `SELECT * FROM conversion_events ORDER BY created_at DESC LIMIT 10`
5. Verify CORS: `curl -X OPTIONS https://api.ainative.studio/v1/events/track`

---

## File References

### Frontend Files
- `/AINative-website/src/services/ConversionTrackingService.ts` (510 lines) - Core service
- `/AINative-website/src/hooks/useConversionTracking.ts` (74 lines) - React hooks
- `/AINative-website/src/utils/apiClient.ts` (220 lines) - API client with CORS

### Backend Files
- `/src/backend/app/api/v1/endpoints/conversion_tracking.py` (450+ lines) - API endpoints
- `/src/backend/app/main.py` (CORS configuration)
- `/src/backend/alembic/versions/xxx_add_conversion_tracking.py` - Database migration

### Documentation
- `.ainative/CONVERSION_TRACKING.md` (this file) - AI agent context
- `docs/development-guides/FRONTEND_CONVERSION_TRACKING.md` - Implementation guide
- `docs/api/CONVERSION_TRACKING_API.md` - API documentation

### Tests
- `/src/backend/tests/test_conversion_tracking.py` - Backend API tests
- `/AINative-website/src/services/__tests__/ConversionTrackingService.test.ts` - Frontend tests

---

**End of Document**
