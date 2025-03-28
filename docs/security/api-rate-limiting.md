# OpenCap API Rate Limiting

## Overview

This document describes the enhanced rate limiting system implemented in OpenCap to prevent API abuse, ensure fair usage, and protect the service from potential DoS attacks.

## Rate Limiting Features

The OpenCap API implements a comprehensive rate limiting system with the following features:

### 1. Basic Rate Limiting

- Default limit: 100 requests per 15 minutes per IP address
- Authentication endpoints: 10 requests per hour per IP address
- All rate-limited responses return HTTP 429 with a Retry-After header

### 2. Route-Specific Rate Limiting

Different API routes can have different rate limits. For example:

- `/api/*` routes: 20 requests per 5 minutes
- `/admin/*` routes: 10 requests per 10 minutes

### 3. API Key Based Rate Limiting

Rate limits can be applied based on API keys rather than IP addresses. This allows:

- More precise tracking of usage
- Better differentiation between users sharing the same IP (e.g., behind NAT)
- Consistent limit enforcement across different client locations

### 4. Tiered Rate Limiting

API usage limits based on subscription tier:

| Tier | Requests | Time Window |
|------|----------|-------------|
| Basic | 100 | 15 minutes |
| Standard | 500 | 15 minutes |
| Premium | 1,000 | 15 minutes |
| Enterprise | 5,000 | 15 minutes |

### 5. Burst Prevention (Token Bucket)

A token bucket algorithm is implemented to handle bursts of traffic more gracefully:

- Each client has a "bucket" with tokens
- Tokens are consumed with each request
- Tokens are replenished at a steady rate
- Allows for occasional bursts while maintaining long-term rate limits

### 6. Advanced Headers

Rate limit responses include detailed headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the period
- `X-RateLimit-Remaining`: Remaining requests in the current period
- `X-RateLimit-Reset`: Seconds until the limit resets
- `X-RateLimit-Reset-Human`: Human-readable ISO timestamp for reset time
- `X-RateLimit-Policy`: Link to rate limit documentation
- `Retry-After`: Seconds to wait before retry when rate limited (HTTP 429)

## Implementation

Rate limiting is implemented using the following components:

1. **Default Middleware**: Applied globally to all routes
2. **Auth Middleware**: More strict limits for authentication endpoints
3. **Route-Specific Middleware**: Custom limits for specific API paths
4. **API Key Middleware**: Limits based on API keys rather than IP
5. **Tiered Middleware**: Limits based on user subscription tier

## Example Usage

### Basic Usage

The default rate limiter is applied to all routes:

```javascript
app.use(rateLimiter);
```

### Route-Specific Rate Limiting

```javascript
const apiLimiter = createRouteRateLimit('api', 20, 5 * 60 * 1000);
app.use('/api', apiLimiter);
```

### API Key Based Rate Limiting

```javascript
const apiKeyLimiter = createApiKeyRateLimit(50, 10 * 60 * 1000);
app.use('/api', apiKeyLimiter);
```

### Tiered Rate Limiting

```javascript
const premiumLimiter = createTieredRateLimit('premium');
app.use('/api/premium', premiumLimiter);
```

### Token Bucket for Burst Handling

```javascript
const tokenBucketLimiter = createTokenBucketRateLimit(20, 1);
app.use('/api/critical', tokenBucketLimiter);
```

### Advanced Headers

```javascript
app.use(includeAdvancedHeaders());
```

## Client Response Handling

Clients should check for HTTP 429 status codes and respect the `Retry-After` header when rate limited. Example client code:

```javascript
async function fetchWithRateLimit(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    if (error.status === 429) {
      const retryAfter = error.headers.get('retry-after') || 60;
      console.log(`Rate limited. Retrying after ${retryAfter} seconds`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return fetchWithRateLimit(url);
    }
    throw error;
  }
}
```

## Configuration

Rate limits can be updated dynamically:

```javascript
updateRateLimitConfig('api', { max: 200 });
```

## Future Enhancements

- Redis-based distributed rate limiting for multi-server deployments
- Rate limit dashboard for administrators
- Client-specific rate limit negotiation
