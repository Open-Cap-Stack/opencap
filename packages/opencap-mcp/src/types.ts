/**
 * Shared types used across tools and the server.
 */

import { type z } from 'zod';
import { type AxiosInstance } from 'axios';
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolResult = CallToolResult;

export interface ToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TSchema;
  handler: (input: z.infer<TSchema>, client: AxiosInstance) => Promise<ToolResult>;
}
