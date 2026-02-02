# Conversion Tracking System - AI Agent Context

**Last Updated**: 2025-12-27
**Status**: Production Ready
**Coverage**: 69/69 pages (100%)

## Overview

AINative Studio conversion tracking system: server-side tracking solution capturing user behavior, campaign attribution, and conversion funnel progression.

**Key Capabilities:**
- Server-side event tracking
- UTM parameter capture
- Session-based tracking
- Multi-stage conversion funnel
- Retargeting pixel integration
- Device/browser detection
- CORS-compliant API

## Architecture Snapshot

### High-Level Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                  │
├──────────────────────────────────────────────────────────────────────┤
│  1. Page Load → usePageViewTracking() hook                           │
│  2. ConversionTrackingService singleton init                         │
│  3. UTM params captured from URL                                     │
│  4. Session ID generated                                             │
│  5. Device/browser detected                                          │
│  6. POST /v1/events/track via apiClient                              │
│     - withCredentials: true                                          │
│     - Authorization header                                           │
│     - CORS preflight handled                                         │
│  7. Retargeting pixels fire                                          │
└──────────────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### Core Files
- `/AINative-website/src/services/ConversionTrackingService.ts`
- `/AINative-website/src/hooks/useConversionTracking.ts`
- `/AINative-website/src/utils/apiClient.ts`

### Integration Pattern

**Standard Page Integration:**
```typescript
import { usePageViewTracking } from '@/hooks/useConversionTracking';

export default function MyPage() {
  usePageViewTracking();
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

### Pages with Tracking (100%)
- 69 pages across marketing, product, dashboard, developer, community, auth categories

## Backend Implementation

### API Endpoints
1. **POST /v1/events/track** - Main conversion tracking
2. **OPTIONS /v1/events/track** - CORS preflight
3. **POST /v1/events/funnel** - Funnel stage update
4. **OPTIONS /v1/events/funnel** - CORS preflight

### Request Schema
```python
class ConversionEventRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    event_type: str
    event_name: str
    utm_params: Optional[UTMParams] = None
    page_url: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    conversion_value: Optional[float] = None
    # ... additional fields
```

### Database Schema
**Tables:**
- `conversion_events`
- `conversion_funnel`

## Session Management

### Session ID Generation
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

## Retargeting Pixel Integration

### Supported Platforms
1. Meta Pixel
2. Google Analytics 4
3. LinkedIn Insight Tag

## Conversion Funnel Stages

### Standard Funnel
```
visited_homepage → visited_pricing → visited_docs
→ started_signup → completed_signup
→ started_checkout → completed_checkout
→ subscription_created
```

## Deployment Workflow

### Frontend (Vercel)
```bash
npm run build
git commit -m "Update conversion tracking"
git push origin main
```

### Backend (Railway)
```bash
pytest tests/test_conversion_tracking.py
git commit -m "Fix conversion tracking CORS"
git push origin main
```

## AI Agent Guidelines

### Critical Rules
1. Always test changes locally
2. Never break production tracking
3. Maintain backward compatibility
4. Document all changes
5. Follow established patterns

## File References

### Frontend
- `ConversionTrackingService.ts`
- `useConversionTracking.ts`
- `apiClient.ts`

### Backend
- `conversion_tracking.py`
- `main.py`

---