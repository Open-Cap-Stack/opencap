/**
 * Secure Headers Middleware
 * [Feature] OCAE-304: Set up secure header configuration
 * 
 * This middleware adds security-related HTTP headers to all responses
 * to help protect against common web vulnerabilities:
 * 
 * - Content-Security-Policy (CSP): Prevents XSS attacks by controlling resources
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-XSS-Protection: Additional protection against XSS in older browsers
 * - Strict-Transport-Security (HSTS): Ensures HTTPS connection
 * - Referrer-Policy: Controls information in the Referer header
 * 
 * Based on OWASP security best practices and following Semantic Seed standards
 */

/**
 * Creates a middleware function that sets security headers
 * @param {Object} options - Configuration options for security headers
 * @returns {Function} Express middleware function
 */
function secureHeaders(options = {}) {
  // Default configuration
  const config = {
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'"],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        ...((options.contentSecurityPolicy && options.contentSecurityPolicy.directives) || {})
      }
    },
    xContentTypeOptions: options.xContentTypeOptions || 'nosniff',
    xFrameOptions: options.xFrameOptions || 'DENY',
    xXssProtection: options.xXssProtection || '1; mode=block',
    strictTransportSecurity: options.strictTransportSecurity || 'max-age=31536000; includeSubDomains',
    referrerPolicy: options.referrerPolicy || 'strict-origin-when-cross-origin'
  };

  /**
   * Formats CSP directives into the proper header string
   * @param {Object} directives - CSP directive object
   * @returns {String} Formatted CSP header value
   */
  function formatCspDirectives(directives) {
    return Object.entries(directives)
      .map(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          return `${key} ${values.join(' ')}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('; ');
  }

  // Return the middleware function
  return function(req, res, next) {
    // Content Security Policy
    const cspHeaderValue = formatCspDirectives(config.contentSecurityPolicy.directives);
    res.setHeader('Content-Security-Policy', cspHeaderValue);
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', config.xContentTypeOptions);
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', config.xFrameOptions);
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', config.xXssProtection);
    
    // Strict-Transport-Security (HSTS)
    res.setHeader('Strict-Transport-Security', config.strictTransportSecurity);
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', config.referrerPolicy);
    
    next();
  };
}

module.exports = secureHeaders;
