/**
 * Secure Headers Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for security headers middleware
 * Target coverage: 90%+ (security-critical)
 */

const secureHeaders = require('../../../middleware/secureHeadersMiddleware');

describe('Secure Headers Middleware', () => {
  let req;
  let res;
  let next;
  let setHeaderCalls;

  beforeEach(() => {
    setHeaderCalls = {};

    req = {};

    res = {
      setHeader: jest.fn((name, value) => {
        setHeaderCalls[name] = value;
      })
    };

    next = jest.fn();
  });

  describe('Default Configuration', () => {
    let middleware;

    beforeEach(() => {
      middleware = secureHeaders();
    });

    it('should set Content-Security-Policy header', () => {
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should include script-src in CSP', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("script-src 'self'");
    });

    it('should include style-src in CSP', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("style-src 'self'");
    });

    it('should include img-src in CSP', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("img-src 'self'");
    });

    it('should include font-src in CSP', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("font-src 'self'");
    });

    it('should include connect-src in CSP', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("connect-src 'self'");
    });

    it('should include media-src in CSP', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("media-src 'self'");
    });

    it('should block object-src', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("object-src 'none'");
    });

    it('should block frame-src', () => {
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("frame-src 'none'");
    });

    it('should set X-Content-Type-Options header', () => {
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options header', () => {
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection header', () => {
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set Strict-Transport-Security header', () => {
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    });

    it('should set Referrer-Policy header', () => {
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should call next', () => {
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Custom Configuration', () => {
    it('should allow custom X-Frame-Options', () => {
      const middleware = secureHeaders({
        xFrameOptions: 'SAMEORIGIN'
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    });

    it('should allow custom X-Content-Type-Options', () => {
      const middleware = secureHeaders({
        xContentTypeOptions: 'custom-value'
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'custom-value');
    });

    it('should allow custom X-XSS-Protection', () => {
      const middleware = secureHeaders({
        xXssProtection: '0'
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '0');
    });

    it('should allow custom Strict-Transport-Security', () => {
      const middleware = secureHeaders({
        strictTransportSecurity: 'max-age=86400'
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=86400');
    });

    it('should allow custom Referrer-Policy', () => {
      const middleware = secureHeaders({
        referrerPolicy: 'no-referrer'
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    });

    it('should merge custom CSP directives', () => {
      const middleware = secureHeaders({
        contentSecurityPolicy: {
          directives: {
            'script-src': ["'self'", 'cdn.example.com']
          }
        }
      });
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("script-src 'self' cdn.example.com");
    });

    it('should override default CSP directives with custom ones', () => {
      const middleware = secureHeaders({
        contentSecurityPolicy: {
          directives: {
            'img-src': ["'self'", 'images.example.com', 'data:']
          }
        }
      });
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("img-src 'self' images.example.com data:");
    });
  });

  describe('Edge Cases', () => {
    it('should handle null options', () => {
      const middleware = secureHeaders(null);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalled();
    });

    it('should handle undefined options', () => {
      const middleware = secureHeaders(undefined);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle empty options object', () => {
      const middleware = secureHeaders({});
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // Should use all defaults
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should handle empty CSP directives', () => {
      const middleware = secureHeaders({
        contentSecurityPolicy: {
          directives: {}
        }
      });
      middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String)
      );
    });

    it('should handle empty directive arrays', () => {
      const middleware = secureHeaders({
        contentSecurityPolicy: {
          directives: {
            'custom-directive': []
          }
        }
      });
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).not.toContain('custom-directive');
    });

    it('should filter out empty formatted directives', () => {
      const middleware = secureHeaders({
        contentSecurityPolicy: {
          directives: {
            'test-directive': []
          }
        }
      });
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).not.toContain('test-directive');
    });
  });

  describe('CSP Formatting', () => {
    it('should format CSP directives correctly', () => {
      const middleware = secureHeaders();
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];

      // Should use semicolon separator
      expect(csp).toContain(';');

      // Should have proper directive format
      expect(csp).toMatch(/[a-z-]+\s'[a-z]+'/);
    });

    it('should include base-uri directive', () => {
      const middleware = secureHeaders();
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("base-uri 'self'");
    });

    it('should include form-action directive', () => {
      const middleware = secureHeaders();
      middleware(req, res, next);

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("form-action 'self'");
    });
  });

  describe('Security Compliance', () => {
    let middleware;

    beforeEach(() => {
      middleware = secureHeaders();
    });

    it('should protect against XSS attacks', () => {
      middleware(req, res, next);

      // X-XSS-Protection header
      expect(setHeaderCalls['X-XSS-Protection']).toBe('1; mode=block');

      // CSP script-src
      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("script-src 'self'");
    });

    it('should protect against clickjacking', () => {
      middleware(req, res, next);

      expect(setHeaderCalls['X-Frame-Options']).toBe('DENY');

      const csp = setHeaderCalls['Content-Security-Policy'];
      expect(csp).toContain("frame-src 'none'");
    });

    it('should protect against MIME sniffing', () => {
      middleware(req, res, next);

      expect(setHeaderCalls['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should enforce HTTPS', () => {
      middleware(req, res, next);

      expect(setHeaderCalls['Strict-Transport-Security']).toBeDefined();
      expect(setHeaderCalls['Strict-Transport-Security']).toContain('max-age=');
      expect(setHeaderCalls['Strict-Transport-Security']).toContain('includeSubDomains');
    });

    it('should control referrer information', () => {
      middleware(req, res, next);

      expect(setHeaderCalls['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set all required security headers', () => {
      middleware(req, res, next);

      const requiredHeaders = [
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Referrer-Policy'
      ];

      requiredHeaders.forEach(header => {
        expect(setHeaderCalls[header]).toBeDefined();
      });
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple sequential requests', () => {
      const middleware = secureHeaders();

      // First request
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset
      jest.clearAllMocks();

      // Second request
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should apply same headers to all requests', () => {
      const middleware = secureHeaders();
      const headers1 = {};
      const headers2 = {};

      const res1 = {
        setHeader: jest.fn((name, value) => {
          headers1[name] = value;
        })
      };
      const res2 = {
        setHeader: jest.fn((name, value) => {
          headers2[name] = value;
        })
      };

      middleware(req, res1, next);
      middleware(req, res2, next);

      expect(headers1).toEqual(headers2);
    });
  });
});
