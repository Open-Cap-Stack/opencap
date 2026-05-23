/**
 * Shared HTTP client with auth and error handling.
 */
import axios from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getBaseUrl } from './auth.js';
import { formatMcpError } from './errors.js';
export function createClient(apiKey) {
    const client = axios.create({
        baseURL: getBaseUrl(),
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        timeout: 30_000,
    });
    client.interceptors.response.use((response) => response, (error) => {
        const status = error.response?.status;
        const code = status === 401 || status === 403 || status === 404 || status === 400
            ? ErrorCode.InvalidRequest
            : ErrorCode.InternalError;
        throw new McpError(code, formatMcpError(error));
    });
    return client;
}
//# sourceMappingURL=client.js.map