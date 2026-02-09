/**
 * URL Validator Utility
 * Issue #345: Prevent SSRF attacks on webhook URLs
 *
 * Validates webhook URLs to prevent Server-Side Request Forgery (SSRF) attacks
 * by blocking internal/private IP addresses and hostnames.
 */
const { URL } = require('url');

/**
 * Patterns for blocked internal/private hosts
 * These patterns match hostnames that should never receive webhook requests
 */
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\./,                           // Loopback
  /^10\./,                            // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,   // Private Class B
  /^192\.168\./,                      // Private Class C
  /^169\.254\./,                      // Link-local (AWS metadata)
  /^0\./,                             // "This" network
  /\.local$/i,                        // mDNS local
  /\.internal$/i,                     // Internal domains
  /\.localhost$/i,                    // Localhost subdomains
  /^::1$/,                            // IPv6 loopback
  /^fc00:/i,                          // IPv6 private
  /^fe80:/i,                          // IPv6 link-local
  /^fd[0-9a-f]{2}:/i,                 // IPv6 unique local
  /^\[::1\]$/,                        // IPv6 loopback in URL format
  /^\[fc00:/i,                        // IPv6 private in URL format
  /^\[fe80:/i,                        // IPv6 link-local in URL format
  /^\[fd[0-9a-f]{2}:/i,               // IPv6 unique local in URL format
  /^metadata\.google\.internal$/i,   // GCP metadata service
  /^instance-data\.ec2\.internal$/i, // AWS EC2 metadata
];

/**
 * Validate a webhook URL for SSRF protection
 *
 * @param {string} urlString - The URL to validate
 * @returns {string} The validated URL string
 * @throws {Error} If the URL is invalid or points to a blocked host
 */
function validateWebhookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('URL is required');
  }

  let url;
  try {
    url = new URL(urlString);
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      throw new Error('Invalid URL format');
    }
    throw error;
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP/HTTPS protocols allowed');
  }

  // Require HTTPS in production
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('Only HTTPS allowed in production');
  }

  // Block internal/private hosts
  const hostname = url.hostname;
  for (const pattern of BLOCKED_HOSTS) {
    if (pattern.test(hostname)) {
      throw new Error('Internal URLs not allowed');
    }
  }

  // Additional check: Block URLs with username/password (can be used for port scanning)
  if (url.username || url.password) {
    throw new Error('URLs with credentials not allowed');
  }

  // Block common internal ports that could be exploited
  const blockedPorts = ['22', '23', '25', '110', '143', '389', '636', '3389'];
  if (url.port && blockedPorts.includes(url.port)) {
    throw new Error('URLs with restricted ports not allowed');
  }

  return url.toString();
}

/**
 * Check if a URL is safe for webhook delivery (non-throwing version)
 *
 * @param {string} urlString - The URL to check
 * @returns {boolean} True if the URL is safe, false otherwise
 */
function isWebhookUrlSafe(urlString) {
  try {
    validateWebhookUrl(urlString);
    return true;
  } catch {
    return false;
  }
}

module.exports = { validateWebhookUrl, isWebhookUrlSafe, BLOCKED_HOSTS };
