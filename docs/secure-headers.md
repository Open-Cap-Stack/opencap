# Secure HTTP Headers

**Feature**: OCAE-304: Set up secure header configuration

## Overview

This document describes the secure HTTP headers implemented in the OpenCap platform to protect against common web vulnerabilities. Following the Semantic Seed Venture Studio Coding Standards, we've implemented a comprehensive set of security headers that help mitigate various attack vectors.

## Implementation

The secure headers are implemented as Express middleware in `/middleware/secureHeadersMiddleware.js`. This middleware is applied globally to all routes in the application in `app.js`.

### Security Headers Applied

| Header | Purpose | Default Value |
|--------|---------|---------------|
| Content-Security-Policy | Prevents XSS attacks by controlling which resources can be loaded | `default-src 'self'` (and more specific directives) |
| X-Content-Type-Options | Prevents MIME-sniffing attacks | `nosniff` |
| X-Frame-Options | Prevents clickjacking attacks | `DENY` |
| X-XSS-Protection | Additional protection against XSS in older browsers | `1; mode=block` |
| Strict-Transport-Security | Ensures HTTPS connection | `max-age=31536000; includeSubDomains` |
| Referrer-Policy | Controls information in the Referer header | `strict-origin-when-cross-origin` |

## Content Security Policy Details

The Content Security Policy (CSP) is particularly important as it provides fine-grained control over which resources can be loaded by the browser. Our default CSP configuration is:

```
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self';
font-src 'self';
connect-src 'self';
media-src 'self';
object-src 'none';
frame-src 'none';
base-uri 'self';
form-action 'self'
```

This restrictive policy ensures that resources can only be loaded from the same origin, significantly reducing the risk of XSS attacks.

## Customization

The secure headers middleware can be customized by passing options when it's initialized:

```javascript
app.use(secureHeadersMiddleware({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'trusted-cdn.com'],
      'img-src': ["'self'", 'img.example.com'],
    }
  },
  xFrameOptions: 'SAMEORIGIN', // Instead of DENY
  // More customizations...
}));
```

## Testing

The secure headers implementation is thoroughly tested with:

1. **Unit tests**: Testing the middleware in isolation (`__tests__/middleware/secureHeadersMiddleware.test.js`)
2. **Integration tests**: Verifying headers are correctly applied to API responses (`__tests__/middleware/secureHeadersIntegration.test.js`)

## Security Standards Compliance

This implementation follows the OWASP Secure Headers Project recommendations and aligns with Semantic Seed Venture Studio Coding Standards for security best practices.

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HTTP Strict Transport Security (HSTS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
