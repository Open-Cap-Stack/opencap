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
      const message =
        error.response?.data?.message ??
        error.response?.data?.error ??
        error.message ??
        'Unknown error';
      const path = error.config?.url ?? '';

      if (status === 401) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'API key rejected or expired. Regenerate at https://app.opencapstack.com/settings, or run the whoami tool to test your current key.'
        );
      }

      if (status === 403) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Access denied. Check that your token companyId matches the companyId in your request.'
        );
      }

      if (status === 404) {
        const idHint = path.match(/\/([^/]+)$/)
          ? ' Make sure you are using the domain ID field (e.g. safeId, row_id) from a list_* call, not the _id field.'
          : '';
        throw new McpError(ErrorCode.InvalidRequest, `Record not found.${idHint}`);
      }

      if (status === 500) {
        throw new McpError(
          ErrorCode.InternalError,
          `Server error saving record: ${message}. Check that all referenced IDs exist (e.g. equityPlanId, employeeId, companyId) and try again.`
        );
      }

      throw new McpError(ErrorCode.InternalError, `OpenCap API error (${status}): ${message}`);
    }
  );

  return client;
}
