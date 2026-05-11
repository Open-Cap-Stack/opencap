/**
 * Authentication utilities for the OpenCap MCP server.
 * Reads OPENCAP_API_KEY and OPENCAP_BASE_URL from the environment.
 */

export function getApiKey(): string {
  const key = process.env.OPENCAP_API_KEY;
  if (!key) {
    throw new Error(
      'Set OPENCAP_API_KEY to your OpenCap JWT token. ' +
        'Get one at https://api.opencapstack.com/api/v1/auth/login'
    );
  }
  return key;
}

export function getBaseUrl(): string {
  return process.env.OPENCAP_BASE_URL ?? 'https://api.opencapstack.com';
}
