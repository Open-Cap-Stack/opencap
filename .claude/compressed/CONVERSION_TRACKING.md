# Conversion Tracking System - AI Agent Context

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

**Page Tracking:**
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

## Backend Implementation

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
    device_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
```

### Database Schema
```sql
CREATE TABLE conversion_events (
    id UUID PRIMARY KEY,
    user_id UUID,
    session_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    utm_source VARCHAR(100),
    page_url TEXT,
    form_data JSONB,
    conversion_value DECIMAL(10,2),
    device_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

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

### Frontend Deployment
```bash
# Build and deploy
npm run build
git commit -m "Update conversion tracking"
git push origin main
```

### Backend Deployment
```bash
# Run tests
pytest tests/test_conversion_tracking.py -v

# Commit and push
git commit -m "Fix conversion tracking CORS"
git push origin main
```

## AI Agent Guidelines

### Working on Conversion Tracking
1. Always test changes locally
2. Never break production tracking
3. Maintain backward compatibility
4. Document all changes
5. Follow established patterns

## File References

### Frontend Files
- `/AINative-website/src/services/ConversionTrackingService.ts`
- `/AINative-website/src/hooks/useConversionTracking.ts`
- `/AINative-website/src/utils/apiClient.ts`

### Backend Files
- `/src/backend/app/api/v1/endpoints/conversion_tracking.py`
- `/src/backend/app/main.py`