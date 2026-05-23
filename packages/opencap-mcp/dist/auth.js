/**
 * Authentication utilities for the OpenCap MCP server.
 * Reads OPENCAP_API_KEY and OPENCAP_BASE_URL from the environment.
 */
export function getApiKey() {
    const key = process.env.OPENCAP_API_KEY;
    if (!key) {
        throw new Error('Set OPENCAP_API_KEY to your OpenCap JWT token. ' +
            'Get one at https://api.opencapstack.com/api/v1/auth/login');
    }
    return key;
}
export function getBaseUrl() {
    let url = process.env.OPENCAP_BASE_URL ?? 'https://api.opencapstack.com';
    // Guard: strip accidental /api/v1 suffix — tools already prefix this path
    if (/\/api\/v1\/?$/.test(url)) {
        process.stderr.write(`Warning: OPENCAP_BASE_URL should not include /api/v1 — stripping it automatically. Original value: ${url}\n`);
        url = url.replace(/\/api\/v1\/?$/, '');
    }
    return url;
}
//# sourceMappingURL=auth.js.map