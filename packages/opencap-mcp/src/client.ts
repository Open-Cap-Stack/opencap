/**
 * Shared HTTP client with auth and error handling.
 */

import axios, { type AxiosInstance } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getBaseUrl } from './auth.js';

export function createClient(apiKey: string): AxiosInstance {
  const client = axios.create({
    baseURL: getBaseUrl(),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;

      if (status === 401) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'API key rejected or expired — regenerate at https://app.opencapstack.com/settings'
        );
      }

      if (status === 403) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Access denied — check your account permissions'
        );
      }

      // Re-throw other errors with the server message when available
      const message =
        error.response?.data?.message ?? error.message ?? 'Unknown API error';
      throw new McpError(ErrorCode.InternalError, `OpenCap API error: ${message}`);
    }
  );

  return client;
}
